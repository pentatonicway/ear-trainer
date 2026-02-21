/**
 * AnalyticsScreen.jsx
 *
 * Dashboard showing streak, accuracy stats per interval, recent session history,
 * and a focus callout for the weakest interval.
 */

import { useState, useEffect } from 'react'
import { useNavigate }          from 'react-router-dom'
import { getAllIntervalStats }   from '../storage/intervalStatsStore.js'
import { getRecentSessions, getSessionsForStreakCalc } from '../storage/sessionStore.js'
import { calculateStreak }      from '../storage/streakUtils.js'
import { getIntervalById }      from '../logic/intervals.js'
import Button                   from '../components/Button.jsx'
import styles                   from './AnalyticsScreen.module.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)

function accClass(accuracy) {
  if (accuracy >= 80) return styles.accHigh
  if (accuracy >= 50) return styles.accMid
  return styles.accLow
}

function histAccClass(accuracy) {
  if (accuracy >= 80) return styles.good
  if (accuracy >= 50) return styles.mid
  return styles.low
}

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day:   'numeric',
    })
  } catch {
    return isoString
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const navigate = useNavigate()

  const [loading,        setLoading]       = useState(true)
  const [intervalStats,  setIntervalStats] = useState([])
  const [sessions,       setSessions]      = useState([])
  const [streak,         setStreak]        = useState(0)

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [stats, recentSessions, streakDates] = await Promise.all([
          getAllIntervalStats(),
          getRecentSessions(30),
          getSessionsForStreakCalc(),
        ])

        if (cancelled) return

        const dates = streakDates.map(s => s.date)
        setStreak(calculateStreak(dates))
        setIntervalStats(stats)
        setSessions(recentSessions)
      } catch (err) {
        console.warn('[AnalyticsScreen] load failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.screen}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading…
        </div>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  const hasData = sessions.length > 0 || intervalStats.length > 0

  if (!hasData) {
    return (
      <div className={styles.screen}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => navigate('/')} data-testid="back-btn">←</button>
          <span className={styles.topTitle}>My Progress</span>
        </div>
        <div className={styles.body}>
          <div className={styles.empty} data-testid="empty-state">
            <span className={styles.emptyIcon}>📊</span>
            <p className={styles.emptyMessage}>
              No sessions yet. Start your first session!
            </p>
            <div className={styles.emptyAction}>
              <Button
                label="Start Session"
                variant="primary"
                onClick={() => navigate('/session')}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Computed values ────────────────────────────────────────────────────────

  // Overall accuracy: weighted by total questions per interval
  const totalCorrect = intervalStats.reduce((s, r) => s + r.correct, 0)
  const totalAnswers = intervalStats.reduce((s, r) => s + r.total,   0)
  const overallAccuracy = pct(totalCorrect, totalAnswers)

  // Breakdown rows sorted ascending by accuracy (weakest first)
  const breakdownRows = intervalStats
    .map(s => ({
      ...s,
      interval: getIntervalById(s.intervalId),
      accuracyPct: pct(s.correct, s.total),
    }))
    .filter(r => r.interval)
    .sort((a, b) => a.accuracyPct - b.accuracyPct)

  const weakest = breakdownRows[0] ?? null

  // Recent 10 sessions for history list
  const historyItems = sessions.slice(0, 10)

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
        <span className={styles.topTitle}>My Progress</span>
      </div>

      <div className={styles.body}>

        {/* ── Stats row ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Overview</h2>
          <div className={styles.statsRow}>

            <div className={`${styles.statCard} ${styles.streak}`} data-testid="streak-card">
              <span className={styles.statEmoji}>🔥</span>
              <span className={styles.statValue} data-testid="streak-value">{streak}</span>
              <span className={styles.statLabel}>Day Streak</span>
            </div>

            <div className={styles.statCard} data-testid="sessions-card">
              <span className={styles.statEmoji}>📅</span>
              <span className={styles.statValue} data-testid="sessions-value">{sessions.length}</span>
              <span className={styles.statLabel}>Total Sessions</span>
            </div>

            <div className={`${styles.statCard} ${styles.accuracy}`} data-testid="accuracy-card">
              <span className={styles.statEmoji}>🎯</span>
              <span className={styles.statValue} data-testid="accuracy-value">{overallAccuracy}%</span>
              <span className={styles.statLabel}>Overall Accuracy</span>
            </div>

          </div>
        </section>

        {/* ── Focus callout (only if weakest < 60%) ── */}
        {weakest && weakest.accuracyPct < 60 && (
          <div className={styles.focusCard} data-testid="focus-card">
            <span className={styles.focusIcon} aria-hidden="true">🎯</span>
            <div>
              <p className={styles.focusTag}>Focus Area</p>
              <p className={styles.focusName} data-testid="focus-name">
                {weakest.interval.displayName}
              </p>
              <p className={styles.focusTip} data-testid="focus-tip">
                Try to sing this interval and relate it to a song.
              </p>
            </div>
          </div>
        )}

        {/* ── Interval accuracy table ── */}
        {breakdownRows.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Interval Accuracy</h2>
            <table className={styles.table} data-testid="accuracy-table">
              <thead>
                <tr>
                  <th>Interval</th>
                  <th>Correct</th>
                  <th>Total</th>
                  <th>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {breakdownRows.map((row, i) => (
                  <tr
                    key={row.intervalId}
                    className={i === 0 ? styles.weakRow : ''}
                    data-testid={`stat-row-${row.intervalId}`}
                  >
                    <td className={styles.intervalName}>
                      {row.interval.displayName}
                    </td>
                    <td>{row.correct}</td>
                    <td>{row.total}</td>
                    <td className={`${styles.accCell} ${accClass(row.accuracyPct)}`}>
                      {row.accuracyPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* ── Session history ── */}
        {historyItems.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Sessions</h2>
            <ul className={styles.historyList} data-testid="history-list">
              {historyItems.map((session, i) => {
                const sessionPct = pct(session.score, session.total)
                return (
                  <li
                    key={session.id ?? i}
                    className={styles.historyItem}
                    data-testid={`history-item-${i}`}
                  >
                    <span className={styles.historyDate}>
                      {formatDate(session.date)}
                    </span>
                    <span className={styles.historyScore}>
                      {session.score}/{session.total} correct
                    </span>
                    <span className={`${styles.historyAccBadge} ${histAccClass(sessionPct)}`}>
                      {sessionPct}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

      </div>
    </div>
  )
}
