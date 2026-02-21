/**
 * HomeScreen.jsx
 * Entry point of the ear training app.
 * Loads streak, session count, and phase from storage, then displays them.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button.jsx'
import Spinner from '../components/Spinner.jsx'
import { getSessionsForStreakCalc, getRecentSessions } from '../storage/sessionStore.js'
import { getSetting } from '../storage/settingsStore.js'
import { calculateStreak } from '../storage/streakUtils.js'
import styles from './HomeScreen.module.css'

// ── Phase labels ──────────────────────────────────────────────────────────────

const PHASE_LABELS = {
  1:  'Phase 1: Basics',
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigate = useNavigate()

  const [loading, setLoading]           = useState(true)
  const [streak, setStreak]             = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [phase, setPhase]               = useState(1)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [sessionDates, recentSessions, currentPhase] = await Promise.all([
          getSessionsForStreakCalc(),
          getRecentSessions(1000),
          getSetting('currentPhase', 1),
        ])

        if (cancelled) return

        const dates = sessionDates.map(s => s.date)
        setStreak(calculateStreak(dates))
        setSessionCount(recentSessions.length)
        setPhase(Number(currentPhase) || 1)
      } catch (err) {
        console.warn('[HomeScreen] failed to load stats:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className={styles.screen}>
      <div className={styles.inner}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <a
            href="https://members.pentatonicway.com/"
            className={styles.dashboardLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            ← Back to Dashboard
          </a>
          <h1 className={styles.appName}>
            Pentatonic Way<br />
            <span>Ear Trainer</span>
          </h1>
          <span className={styles.phaseLabel} data-testid="phase-label">
            {PHASE_LABELS[phase]}
          </span>
        </header>

        {/* ── Loading spinner ── */}
        {loading && (
          <div className={styles.spinnerWrap} data-testid="home-loading-spinner">
            <Spinner size="md" label="Loading stats" />
          </div>
        )}

        {/* ── Stats ── */}
        <div className={styles.stats}>
          {/* Streak */}
          <div className={`${styles.stat} ${styles.statStreak}`}>
            {loading ? (
              <>
                <div className={`${styles.skeleton} ${styles.skeletonValue}`} aria-hidden="true" />
                <div className={`${styles.skeleton} ${styles.skeletonLabel}`} aria-hidden="true" />
              </>
            ) : (
              <>
                <div className={styles.statValue} data-testid="streak-value">
                  🔥 {streak}
                </div>
                <div className={styles.statLabel}>Day Streak</div>
              </>
            )}
          </div>

          {/* Sessions */}
          <div className={styles.stat}>
            {loading ? (
              <>
                <div className={`${styles.skeleton} ${styles.skeletonValue}`} aria-hidden="true" />
                <div className={`${styles.skeleton} ${styles.skeletonLabel}`} aria-hidden="true" />
              </>
            ) : (
              <>
                <div className={styles.statValue} data-testid="session-count">
                  {sessionCount}
                </div>
                <div className={styles.statLabel}>Sessions</div>
              </>
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className={styles.actions}>
          <Button
            label="Start Session"
            variant="primary"
            onClick={() => navigate('/session')}
          />
          <Button
            label="My Progress"
            variant="secondary"
            onClick={() => navigate('/analytics')}
          />
          <Button
            label="Settings"
            variant="secondary"
            onClick={() => navigate('/settings')}
          />
        </div>

      </div>
    </div>
  )
}
