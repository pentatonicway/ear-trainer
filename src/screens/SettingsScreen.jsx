/**
 * SettingsScreen.jsx
 *
 * Loads current settings on mount, renders controls for playback mode,
 * session length, visual aids, and active intervals.  Every change is
 * immediately persisted via saveSetting.  Includes a "Reset Progress" flow
 * backed by a confirmation modal.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate }                       from 'react-router-dom'
import { getSetting, saveSetting }           from '../storage/settingsStore.js'
import { clearAllSessions }                  from '../storage/sessionStore.js'
import { clearAllIntervalStats }             from '../storage/intervalStatsStore.js'
import { getIntervalsForPhase }              from '../logic/intervals.js'
import Modal                                 from '../components/Modal.jsx'
import Button                                from '../components/Button.jsx'
import styles                                from './SettingsScreen.module.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYBACK_OPTIONS = [
  { value: 'sequential', label: 'Sequential'     },
  { value: 'sustained',  label: 'Sustained Root' },
  { value: 'stacked',    label: 'Stacked'        },
]

const LENGTH_OPTIONS = [5, 6, 7, 8]

const DEFAULTS = {
  playbackMode:    'sequential',
  sessionLength:   6,
  visualAids:      false,
  activeIntervalIds: null,   // null → "all available" sentinel
  currentPhase:    1,
  phase2Unlocked:  false,
  phase3Unlocked:  false,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigate = useNavigate()

  const [loading,           setLoading]           = useState(true)
  const [playbackMode,      setPlaybackMode]       = useState(DEFAULTS.playbackMode)
  const [sessionLength,     setSessionLength]      = useState(DEFAULTS.sessionLength)
  const [visualAids,        setVisualAids]         = useState(DEFAULTS.visualAids)
  const [activeIntervalIds, setActiveIntervalIds]  = useState([])
  const [availableIntervals, setAvailableIntervals] = useState([])
  const [resetOpen,         setResetOpen]          = useState(false)

  // ── Load settings on mount ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [
          playback,
          length,
          aids,
          activeIds,
          currentPhase,
        ] = await Promise.all([
          getSetting('playbackMode',    DEFAULTS.playbackMode),
          getSetting('sessionLength',   DEFAULTS.sessionLength),
          getSetting('visualAids',      DEFAULTS.visualAids),
          getSetting('activeIntervalIds', null),
          getSetting('currentPhase',    DEFAULTS.currentPhase),
        ])

        if (cancelled) return

        const available = getIntervalsForPhase(currentPhase)
        const allIds    = available.map(i => i.id)

        // If no activeIds stored yet, default to "all available"
        const resolved = Array.isArray(activeIds) && activeIds.length > 0
          ? activeIds
          : allIds

        setPlaybackMode(playback ?? DEFAULTS.playbackMode)
        setSessionLength(Number(length) || DEFAULTS.sessionLength)
        setVisualAids(Boolean(aids))
        setAvailableIntervals(available)
        setActiveIntervalIds(resolved)
      } catch (err) {
        console.warn('[SettingsScreen] load failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── Change handlers ───────────────────────────────────────────────────────

  const handlePlaybackChange = useCallback(async (value) => {
    setPlaybackMode(value)
    await saveSetting('playbackMode', value)
  }, [])

  const handleLengthChange = useCallback(async (value) => {
    const n = Number(value)
    setSessionLength(n)
    await saveSetting('sessionLength', n)
  }, [])

  const handleVisualAidsToggle = useCallback(async () => {
    setVisualAids(prev => {
      const next = !prev
      saveSetting('visualAids', next)
      return next
    })
  }, [])

  const handleIntervalToggle = useCallback(async (intervalId) => {
    // Root is always locked on
    if (intervalId === 'root') return

    setActiveIntervalIds(prev => {
      const next = prev.includes(intervalId)
        ? prev.filter(id => id !== intervalId)
        : [...prev, intervalId]

      // Always keep root in the list
      const withRoot = next.includes('root') ? next : ['root', ...next]
      saveSetting('activeIntervalIds', withRoot)
      return withRoot
    })
  }, [])

  // ── Reset progress ────────────────────────────────────────────────────────

  const handleConfirmReset = useCallback(async () => {
    try {
      await Promise.all([
        clearAllSessions(),
        clearAllIntervalStats(),
        saveSetting('playbackMode',      DEFAULTS.playbackMode),
        saveSetting('sessionLength',     DEFAULTS.sessionLength),
        saveSetting('visualAids',        DEFAULTS.visualAids),
        saveSetting('currentPhase',      1),
        saveSetting('phase2Unlocked',    false),
        saveSetting('phase3Unlocked',    false),
        saveSetting('activeIntervalIds', null),
      ])
    } catch (err) {
      console.warn('[SettingsScreen] reset failed:', err)
    }
    navigate('/')
  }, [navigate])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.screen}>

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/')}
          aria-label="Back to home"
          data-testid="back-btn"
        >
          ←
        </button>
        <span className={styles.topTitle}>Settings</span>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)', paddingTop: 'var(--space-xl)' }}>
            Loading settings…
          </p>
        ) : (
          <>
            {/* ── Playback ── */}
            <span className={styles.sectionLabel}>Audio</span>

            <div className={styles.row}>
              <div className={styles.rowMeta}>
                <p className={styles.rowLabel}>Playback Mode</p>
                <p className={styles.rowDesc}>How the two notes are played for each question</p>
              </div>
              <div className={styles.rowControl}>
                <div className={styles.segment} data-testid="playback-segment" role="group" aria-label="Playback mode">
                  {PLAYBACK_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`${styles.segBtn}${playbackMode === opt.value ? ` ${styles.segActive}` : ''}`}
                      onClick={() => handlePlaybackChange(opt.value)}
                      aria-pressed={playbackMode === opt.value}
                      data-testid={`playback-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Session length ── */}
            <div className={styles.row}>
              <div className={styles.rowMeta}>
                <p className={styles.rowLabel}>Session Length</p>
                <p className={styles.rowDesc}>Number of questions per session</p>
              </div>
              <div className={styles.rowControl}>
                <div className={styles.segment} data-testid="length-segment" role="group" aria-label="Session length">
                  {LENGTH_OPTIONS.map(n => (
                    <button
                      key={n}
                      className={`${styles.segBtn}${sessionLength === n ? ` ${styles.segActive}` : ''}`}
                      onClick={() => handleLengthChange(n)}
                      aria-pressed={sessionLength === n}
                      data-testid={`length-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Visual aids toggle ── */}
            <span className={styles.sectionLabel}>Display</span>

            <div className={styles.row}>
              <div className={styles.rowMeta}>
                <p className={styles.rowLabel}>Show Visual Aids</p>
                <p className={styles.rowDesc}>Display on-screen cues during sessions (coming soon)</p>
              </div>
              <div className={styles.rowControl}>
                <button
                  className={`${styles.toggleTrack}${visualAids ? ` ${styles.on}` : ''}`}
                  onClick={handleVisualAidsToggle}
                  role="switch"
                  aria-checked={visualAids}
                  aria-label="Show visual aids"
                  data-testid="visual-aids-toggle"
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>

            {/* ── Active intervals ── */}
            <span className={styles.sectionLabel}>Intervals</span>

            <div style={{ paddingBottom: 'var(--space-md)' }}>
              <p className={styles.rowDesc} style={{ paddingTop: 'var(--space-md)' }}>
                Choose which intervals appear in your sessions
              </p>
              <div className={styles.checkGrid} data-testid="interval-grid">
                {availableIntervals.map(interval => {
                  const isRoot    = interval.id === 'root'
                  const isChecked = activeIntervalIds.includes(interval.id)
                  return (
                    <label
                      key={interval.id}
                      className={[
                        styles.checkItem,
                        isChecked   ? styles.checkChecked  : '',
                        isRoot      ? styles.checkDisabled : '',
                      ].join(' ')}
                      data-testid={`interval-${interval.id}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkNative}
                        checked={isChecked}
                        disabled={isRoot}
                        onChange={() => handleIntervalToggle(interval.id)}
                        data-testid={`checkbox-${interval.id}`}
                        aria-label={interval.displayName}
                      />
                      <span className={styles.checkBox}>
                        {isChecked && <span className={styles.checkMark}>✓</span>}
                      </span>
                      <span className={styles.checkLabel}>{interval.displayName}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* ── Danger zone ── */}
            <div className={styles.dangerZone}>
              <p className={styles.dangerLabel}>Danger Zone</p>
              <button
                className={styles.resetBtn}
                onClick={() => setResetOpen(true)}
                data-testid="reset-btn"
              >
                Reset Progress
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Reset confirmation modal ── */}
      <Modal isOpen={resetOpen} onClose={() => setResetOpen(false)}>
        <p className={styles.modalTitle}>Reset all progress?</p>
        <p className={styles.modalBody}>
          This will permanently delete all your session history, interval stats,
          and unlock progress. This action cannot be undone.
        </p>
        <div className={styles.modalActions}>
          <button
            className={styles.resetBtn}
            onClick={handleConfirmReset}
            data-testid="confirm-reset-btn"
          >
            Yes, Reset Everything
          </button>
          <Button
            label="Cancel"
            variant="secondary"
            onClick={() => setResetOpen(false)}
          />
        </div>
      </Modal>

    </div>
  )
}
