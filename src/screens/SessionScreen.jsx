/**
 * SessionScreen.jsx
 * Loads settings + audio engine, runs a quiz session via useQuizSession,
 * and navigates to /summary when the session ends.
 *
 * Audio fallback: if the engine fails to load, the session continues in
 * text-only mode — the current interval name is shown as the question instead
 * of being played as audio.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizSession }    from '../hooks/useQuizSession.js'
import audioEngine           from '../audio/audioEngine.js'
import { getSetting }        from '../storage/settingsStore.js'
import { getAllIntervalStats } from '../storage/intervalStatsStore.js'
import { INTERVALS }          from '../logic/intervals.js'
import { getActiveIntervalsForPhase } from '../logic/phaseProgression.js'
import { getIntervalById }   from '../logic/intervals.js'
import AudioErrorBanner      from '../components/AudioErrorBanner.jsx'
import Modal                 from '../components/Modal.jsx'
import Button                from '../components/Button.jsx'
import styles                from './SessionScreen.module.css'

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_INTERVAL_IDS = ['root', 'perfect_fifth', 'perfect_fourth']
const DEFAULT_KEYS         = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const AUTO_ADVANCE_MS      = 1200

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const navigate = useNavigate()

  // ── Settings + audio init state ────────────────────────────────────────────
  const [audioReady,    setAudioReady]    = useState(false)
  const [audioError,    setAudioError]    = useState(null)
  const [sessionConfig, setSessionConfig] = useState(null)
  const [intervalStats, setIntervalStats] = useState([])
  const [quitOpen,      setQuitOpen]      = useState(false)

  // Tracks whether we've already called startSession to avoid double-starts
  const sessionStarted  = useRef(false)
  // Saved settings needed for retry without re-reading storage
  const savedConfig     = useRef(null)

  // ── Load settings and initialise audio on mount ────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        // Load all settings in parallel
        const [playbackMode, sessionLength, activeIntervalIds, currentPhase, stats] =
          await Promise.all([
            getSetting('playbackMode',      'sequential'),
            getSetting('sessionLength',      5),
            getSetting('activeIntervalIds',  DEFAULT_INTERVAL_IDS),
            getSetting('currentPhase',       1),
            getAllIntervalStats(),
          ])

        if (cancelled) return

        setIntervalStats(stats ?? [])

        // Resolve which interval IDs to use — respects user's custom selection
        const activeIntervals = getActiveIntervalsForPhase(currentPhase, activeIntervalIds)
        const intervalIds     = activeIntervals.map(i => i.id)

        const config = {
          intervalIds,
          keys:          DEFAULT_KEYS,
          sessionLength: Math.max(5, Math.min(8, Number(sessionLength) || 5)),
          playbackMode,
          currentPhase,
        }

        // Stash for retry use
        savedConfig.current = { config, playbackMode }

        // Initialise audio — failures are caught by the onLoadError callback
        // so the session can continue in text-only fallback mode.
        try {
          await audioEngine.init()
        } catch (audioErr) {
          // Audio failed — set error state but DON'T throw; continue to set
          // up the session in text-only mode.
          if (!cancelled) setAudioError(audioEngine.getError() ?? audioErr.message)
        }

        if (cancelled) return

        // Only set the mode if audio actually loaded
        if (audioEngine.isReady()) {
          audioEngine.setMode(playbackMode)
        }

        setSessionConfig(config)
        setAudioReady(true)   // "ready" here means "config is resolved", not "audio works"
      } catch (err) {
        if (!cancelled) {
          console.error('[SessionScreen] bootstrap failed:', err)
          setAudioError(err.message || 'Failed to initialise audio')
        }
      }
    }

    bootstrap()
    return () => { cancelled = true }
  }, [])

  // ── Retry audio handler ────────────────────────────────────────────────────
  const handleAudioRetry = useCallback(async () => {
    setAudioError(null)
    try {
      await audioEngine.init()
      if (audioEngine.isReady() && savedConfig.current) {
        audioEngine.setMode(savedConfig.current.playbackMode)
      }
      setAudioError(audioEngine.getError())   // null on success
    } catch (err) {
      setAudioError(audioEngine.getError() ?? err.message)
    }
  }, [])

  // ── Session completion handler ─────────────────────────────────────────────
  const handleSessionComplete = useCallback((results) => {
    navigate('/summary', { state: { sessionResults: results } })
  }, [navigate])

  // ── Quiz session hook ──────────────────────────────────────────────────────
  const quiz = useQuizSession({
    intervalIds:       sessionConfig?.intervalIds ?? DEFAULT_INTERVAL_IDS,
    keys:              DEFAULT_KEYS,
    sessionLength:     sessionConfig?.sessionLength ?? 5,
    audioEngine,
    onSessionComplete: handleSessionComplete,
    intervalStats,
  })

  // ── Auto-start once config is ready ───────────────────────────────────────
  useEffect(() => {
    if (audioReady && !sessionStarted.current) {
      sessionStarted.current = true
      quiz.startSession()
    }
  }, [audioReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-advance after correct or final-wrong feedback ────────────────────
  useEffect(() => {
    if (quiz.phase !== 'feedback') return
    const shouldAdvance = quiz.isCorrect || quiz.retryUsed
    if (!shouldAdvance) return

    const t = setTimeout(() => quiz.advanceToNext(), AUTO_ADVANCE_MS)
    return () => clearTimeout(t)
  }, [quiz.phase, quiz.isCorrect, quiz.retryUsed]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ─────────────────────────────────────────────────────────
  const total           = quiz.questions.length
  const current         = quiz.currentIndex + 1
  const progressPct     = total > 0 ? ((current - 1) / total) * 100 : 0
  const answerChoices   = quiz.getAnswerChoices()
  const currentQuestion = quiz.getCurrentQuestion()
  const buttonsDisabled = quiz.phase === 'feedback' || quiz.phase === 'complete'
  const audioFallback   = !audioEngine.isReady()   // text-only mode when audio not ready

  // Interval name for text-based fallback question display
  const currentIntervalName = currentQuestion
    ? (getIntervalById(currentQuestion.intervalId)?.displayName ?? currentQuestion.intervalId)
    : null

  // ── Feedback message text ──────────────────────────────────────────────────
  let feedbackText  = ''
  let feedbackClass = ''
  if (quiz.phase === 'feedback') {
    if (quiz.isCorrect) {
      feedbackText  = 'Correct!'
      feedbackClass = styles.correct
    } else {
      feedbackText  = 'Try Again!'
      feedbackClass = styles.wrong
    }
  }

  // ── Loading state (settings not yet resolved) ──────────────────────────────
  if (!audioReady || quiz.phase === 'idle') {
    return (
      <div className={styles.screen} data-testid="loading-screen">
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading audio…</p>
        </div>
      </div>
    )
  }

  // ── Session UI ─────────────────────────────────────────────────────────────
  return (
    <div className={styles.screen}>

      {/* Audio error banner — shown when audio failed, session continues in text mode */}
      {audioError && (
        <AudioErrorBanner
          message={audioError}
          onRetry={handleAudioRetry}
        />
      )}

      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.progressText} data-testid="progress-text">
          Question {Math.min(current, total)} of {total}
        </span>
        <button
          className={styles.quitBtn}
          onClick={() => setQuitOpen(true)}
          data-testid="quit-btn"
        >
          Quit
        </button>
      </div>

      {/* Progress rail */}
      <div className={styles.progressRail}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Main content */}
      <main className={styles.main}>

        {/* Question area: audio button OR text-fallback */}
        {audioFallback ? (
          <div className={styles.listenArea}>
            <span className={styles.listenLabel}>Identify this interval</span>
            {currentIntervalName && (
              <p className={styles.fallbackQuestion} data-testid="fallback-question">
                What interval is: <strong>{currentIntervalName}</strong>?
              </p>
            )}
          </div>
        ) : (
          <div className={styles.listenArea}>
            <span className={styles.listenLabel}>Listen to the interval</span>
            <button
              className={styles.playBtn}
              onClick={quiz.playCurrentQuestion}
              aria-label="Play interval again"
              data-testid="play-btn"
            >
              ▶
            </button>
          </div>
        )}

        {/* Feedback */}
        <div
          className={`${styles.feedbackMessage} ${feedbackClass}`}
          data-testid="feedback-message"
          aria-live="polite"
        >
          {feedbackText}
        </div>

        {/* Answer choices */}
        <div className={styles.answerGrid} data-testid="answer-grid">
          {answerChoices.map((interval) => {
            const isSelected     = quiz.selectedAnswer === interval.id
            const isCorrectAnswer = currentQuestion?.intervalId === interval.id

            let btnClass = styles.answerBtn
            if (isSelected && quiz.phase === 'feedback') {
              btnClass += quiz.isCorrect ? ` ${styles.selected} ${styles.correct}` : ` ${styles.selected} ${styles.wrong}`
            } else if (
              quiz.phase === 'feedback' &&
              !quiz.isCorrect &&
              quiz.retryUsed &&
              isCorrectAnswer
            ) {
              btnClass += ` ${styles.revealCorrect}`
            }

            return (
              <button
                key={interval.id}
                className={btnClass}
                onClick={() => quiz.submitAnswer(interval.id)}
                disabled={buttonsDisabled}
                aria-label={`Answer: ${interval.displayName}`}
                data-testid={`answer-${interval.id}`}
                data-interval-id={interval.id}
              >
                {interval.displayName}
              </button>
            )
          })}
        </div>

      </main>

      {/* Quit confirmation modal */}
      <Modal isOpen={quitOpen} onClose={() => setQuitOpen(false)}>
        <p className={styles.quitModalTitle}>Quit session?</p>
        <p className={styles.quitModalBody}>
          Your progress will be lost. Are you sure you want to leave?
        </p>
        <div className={styles.quitModalActions}>
          <Button
            label="Yes, Quit"
            variant="secondary"
            onClick={() => navigate('/')}
          />
          <Button
            label="Keep Playing"
            variant="primary"
            onClick={() => setQuitOpen(false)}
          />
        </div>
      </Modal>

    </div>
  )
}
