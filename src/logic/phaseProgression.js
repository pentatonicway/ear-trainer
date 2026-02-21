/**
 * phaseProgression.js
 * Centralized phase progression logic.
 * Pure functions — no React, no storage, no side effects.
 */

import { getIntervalsForPhase, getIntervalById, INTERVALS } from './intervals.js'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Accuracy required (0–1) to count a session toward mastery. */
export const PHASE_MASTERY_THRESHOLD = 0.8

/** Number of consecutive qualifying sessions needed to unlock the next phase. */
export const PHASE_MASTERY_SESSIONS = 3

/** Maximum phase number available. */
const MAX_PHASE = 10

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns accuracy as a 0–1 fraction for a session object.
 * @param {{ score: number, total: number }} session
 * @returns {number}
 */
function sessionAccuracy(session) {
  if (!session || !session.total) return 0
  return session.score / session.total
}

// ─── Exports ──────────────────────────────────────────────────────────────────

/**
 * Determines whether the user should advance to the next phase.
 *
 * @param {Array<{ score: number, total: number, date: string }>} recentSessions
 *   The most recent sessions in descending date order (newest first).
 *   Only the first PHASE_MASTERY_SESSIONS entries are examined.
 *
 * @param {number} currentPhase  The user's current phase (1, 2, or 3).
 *
 * @returns {number|null}
 *   The newly unlocked phase number, or null if no unlock should happen.
 */
export function checkPhaseUnlock(recentSessions, currentPhase) {
  // Already at max phase — nothing to unlock
  if (currentPhase >= MAX_PHASE) return null

  // Need at least PHASE_MASTERY_SESSIONS sessions to evaluate
  if (!recentSessions || recentSessions.length < PHASE_MASTERY_SESSIONS) return null

  // Check the most recent N sessions
  const window = recentSessions.slice(0, PHASE_MASTERY_SESSIONS)
  const allMastered = window.every(
    s => sessionAccuracy(s) >= PHASE_MASTERY_THRESHOLD
  )

  if (!allMastered) return null

  return currentPhase + 1
}

/**
 * Returns the interval objects that should be active for a session.
 *
 * @param {number}   phase           The user's current phase.
 * @param {string[]|null} customActiveIds
 *   IDs the user has explicitly selected in Settings. If provided and
 *   non-empty, they take priority (filtered to only valid phase intervals).
 *   Pass null / undefined / [] to use all available phase intervals.
 *
 * @returns {Array<{ id: string, displayName: string, semitones: number, phase: number }>}
 */
export function getActiveIntervalsForPhase(phase, customActiveIds) {
  const phaseIntervals = getIntervalsForPhase(phase)

  if (Array.isArray(customActiveIds) && customActiveIds.length > 0) {
    // Build a set of valid IDs for this phase for O(1) lookup
    const validIds = new Set(phaseIntervals.map(i => i.id))

    const filtered = customActiveIds
      .filter(id => validIds.has(id))
      .map(id => getIntervalById(id))
      .filter(Boolean)

    // Fall back to all phase intervals if the custom list filtered to nothing
    if (filtered.length > 0) return filtered
  }

  return phaseIntervals
}
