/**
 * SummaryScreen.jsx
 *
 * Receives session results from location.state (set by SessionScreen after the
 * last question).  Persists data, checks for phase unlocks, then shows the
 * post-session debrief.
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate }    from 'react-router-dom'
import { saveSession, getRecentSessions, clearAll as clearAllSessions } from '../storage/sessionStore.js'
import { updateIntervalStat }             from '../storage/intervalStatsStore.js'
import { saveSetting, getSetting }        from '../storage/settingsStore.js'
import { getIntervalById }                from '../logic/intervals.js'
import { checkPhaseUnlock }               from '../logic/phaseProgression.js'
import StorageWarningModal                from '../components/StorageWarningModal.jsx'
import Modal                              from '../components/Modal.jsx'
import Button                             from '../components/Button.jsx'
import styles                             from './SummaryScreen.module.css'

// ─── Interval practice tips ───────────────────────────────────────────────────

const TIPS = {
  root:           'The root is your tonal anchor — hum it before guessing any interval.',
  perfect_fifth:  '"Star Wars" main theme: the brass opening leap is a perfect fifth.',
  perfect_fourth: '"Here Comes the Bride" starts on a perfect fourth — sol up to do.',
  major_third:    '"When the Saints Go Marching In" opens with a major third.',
  minor_third:    'Bittersweet and close. Think of the first two notes of "Smoke on the Water."',
  major_sixth:    '"My Bonnie Lies Over the Ocean" — the first big upward jump.',
  minor_sixth:    'Dramatic and wide. The opening of "The Entertainer" by Scott Joplin.',
  major_second:   'A whole step — two adjacent white piano keys. Think: going up a scale.',
  minor_second:   'The sharpest tension: a half-step. Film scores use it for suspense.',
  major_seventh:  'One semitone short of an octave — yearning, unresolved.',
  minor_seventh:  '"Somewhere" (West Side Story) opens with a minor seventh leap.',
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)

function motivationalMessage(accuracy) {
  if (accuracy >= 80) return "Excellent work! You're building a great ear."
  if (accuracy >= 60) return "Good effort! Keep practicing to sharpen your ear."
  return "Keep going! Consistency is the key to ear training."
}

function tierClass(accuracy) {
  if (accuracy >= 80) return styles.tierExcellent
  if (accuracy >= 60) return styles.tierGood
  return styles.tierKeep
}

function accClass(accuracy) {
  if (accuracy >= 80) return styles.accHigh
  if (accuracy >= 50) return styles.accMid
  return styles.accLow
}

// ─── Phase-unlock labels ──────────────────────────────────────────────────────

const PHASE_LABELS = {
  2:  'Phase 2: Tritone',
  3:  'Phase 3: Major 3rds',
  4:  'Phase 4: Minor 3rds',
  5:  'Phase 5: Major 6ths',
  6:  'Phase 6: Minor 6ths',
  7:  'Phase 7: Major 2nds',
  8:  'Phase 8: Minor 2nds',
  9:  'Phase 9: Major 7ths',
  10: 'Phase 10: Minor 7ths',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SummaryScreen() {
  const location = useLocation()
  const navigate = useNavigate()

  // Results come from SessionScreen via navigate('/summary', { state: { sessionResults: … } })
  // Support both { sessionResults: … } and the results object directly.
  const raw   = location.state
  const state = raw?.sessionResults ?? raw ?? null

  // Redirect immediately if no results present
  useEffect(() => {
    if (!state) navigate('/', { replace: true })
  }, [state, navigate])

  const [unlockedPhase,   setUnlockedPhase]   = useState(null)
  const [modalOpen,       setModalOpen]       = useState(false)
  const [storageFullOpen, setStorageFullOpen] = useState(false)
  const savedRef = useRef(false) // guard against double-invoke in React Strict Mode

  // Pending session data — used to retry saveSession after clearing history
  const pendingSessionRef = useRef(null)

  // ── Clear history + retry save ───────────────────────────────────────────
  const handleClearHistory = useCallback(async () => {
    try {
      await clearAllSessions()
      setStorageFullOpen(false)

      if (pendingSessionRef.current) {
        await saveSession(pendingSessionRef.current)
        pendingSessionRef.current = null
      }
    } catch (err) {
      console.warn('[SummaryScreen] clearHistory failed:', err)
    }
  }, [])

  // ── Persist on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!state || savedRef.current) return
    savedRef.current = true

    const { score, total, intervalBreakdown = {}, results = [] } = state

    async function persist() {
      try {
        // 1. Save session record
        const sessionData = {
          date:              new Date().toISOString(),
          score,
          total,
          intervalBreakdown,
        }
        pendingSessionRef.current = sessionData

        const saved = await saveSession(sessionData, () => {
          setStorageFullOpen(true)
        })

        // If storage was full, onStorageFull was called — skip the rest
        // until the user clears history and we retry.
        if (saved === null) return

        // 2. Update per-interval running stats
        await Promise.all(
          results.map(r => updateIntervalStat(r.intervalId, r.correct))
        )

        // 3. Phase unlock check — load recent sessions (now including the one
        //    just saved) and the user's current phase, then delegate to the
        //    pure checkPhaseUnlock function.
        const [recentSessions, currentPhase] = await Promise.all([
          getRecentSessions(3),
          getSetting('currentPhase', 1),
        ])

        const newPhase = checkPhaseUnlock(recentSessions, currentPhase)
        if (newPhase) {
          await Promise.all([
            saveSetting(`phase${newPhase}Unlocked`, true),
            saveSetting('currentPhase', newPhase),
          ])
          setUnlockedPhase(newPhase)
          setModalOpen(true)
        }
      } catch (err) {
        console.warn('[SummaryScreen] persist failed:', err)
      }
    }

    persist()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render anything while redirect is pending
  if (!state) return null

  const { score, total, intervalBreakdown = {} } = state
  const accuracy = pct(score, total)

  // Build sorted breakdown rows (worst accuracy first so weakest is index 0)
  const breakdownRows = Object.entries(intervalBreakdown)
    .map(([id, { correct, total: t }]) => ({
      id,
      interval: getIntervalById(id),
      correct,
      total: t,
      accuracy: pct(correct, t),
    }))
    .filter(r => r.interval)  // ignore any unknown ids
    .sort((a, b) => a.accuracy - b.accuracy)

  const weakest = breakdownRows[0] ?? null

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>

        {/* ── Score hero ─────────────────────────────────────────────── */}
        <header>
          <p className={styles.sessionLabel}>Session Complete</p>

          <div className={styles.scoreHero}>
            <p className={styles.scoreDisplay} data-testid="score-display">
              <span className={styles.scoreAccent}>{score}</span>
              <span className={styles.scoreDivider}>/</span>
              <span>{total}</span>
            </p>
            <p className={styles.scoreSubline}>correct</p>
            <span
              className={`${styles.accuracyBadge} ${tierClass(accuracy)}`}
              data-testid="accuracy-badge"
            >
              {accuracy}% accuracy
            </span>
          </div>
        </header>

        {/* ── Motivational message ────────────────────────────────────── */}
        <p className={styles.motivation} data-testid="motivation-message">
          {motivationalMessage(accuracy)}
        </p>

        {/* ── Per-interval breakdown ──────────────────────────────────── */}
        {breakdownRows.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Interval Breakdown</h2>
            <table
              className={styles.breakdownTable}
              data-testid="breakdown-table"
            >
              <thead>
                <tr>
                  <th>Interval</th>
                  <th>Correct</th>
                  <th>Total</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {breakdownRows.map(row => (
                  <tr key={row.id} data-testid={`row-${row.id}`}>
                    <td className={styles.intervalName}>
                      {row.interval.displayName}
                    </td>
                    <td>{row.correct}</td>
                    <td>{row.total}</td>
                    <td className={`${styles.accCell} ${accClass(row.accuracy)}`}>
                      {row.accuracy}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ── Weakest interval highlight ──────────────────────────────── */}
        {weakest && weakest.accuracy < 100 && (
          <div className={styles.weakestCard} data-testid="weakest-card">
            <span className={styles.weakestIcon} aria-hidden="true">🎯</span>
            <div>
              <p className={styles.weakestTag}>Focus Area</p>
              <p className={styles.weakestName} data-testid="weakest-name">
                {weakest.interval.displayName}
              </p>
              <p className={styles.weakestTip} data-testid="weakest-tip">
                {TIPS[weakest.id] ?? 'Keep listening and you&apos;ll get it.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div className={styles.actions}>
          <Button
            label="Practice Again"
            variant="primary"
            onClick={() => navigate('/session')}
          />
          <Button
            label="Home"
            variant="secondary"
            onClick={() => navigate('/')}
          />
        </div>

      </div>

      {/* ── Storage full modal ───────────────────────────────────────────── */}
      <StorageWarningModal
        isOpen={storageFullOpen}
        onClear={handleClearHistory}
        onDismiss={() => setStorageFullOpen(false)}
      />

      {/* ── Phase unlock modal ────────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className={styles.unlockContent}>
          <div className={styles.unlockEmoji}>🎉</div>
          <h2 className={styles.unlockTitle}>Phase Unlocked!</h2>
          <p className={styles.unlockBody} data-testid="unlock-modal-body">
            Three sessions mastered in a row!<br />
            <strong>{PHASE_LABELS[unlockedPhase]}</strong> is now available.
          </p>
          <Button
            label="Explore New Intervals"
            variant="primary"
            onClick={() => { setModalOpen(false); navigate('/settings') }}
          />
        </div>
      </Modal>
    </div>
  )
}
