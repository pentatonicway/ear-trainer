/**
 * streakUtils.js
 * Pure date-math utilities for calculating practice streaks.
 * No I/O, no side effects.
 */

/**
 * Normalises a date to midnight UTC as an integer (ms since epoch).
 * @param {string|Date} d
 * @returns {number}
 */
function toDay(d) {
  const date = typeof d === 'string' ? new Date(d) : d
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Calculates the current streak from an array of ISO date strings.
 *
 * Rules:
 * - A streak is a run of consecutive calendar days (UTC) ending on today or yesterday.
 * - Duplicate dates within the same day count as one.
 * - An empty array returns 0.
 *
 * @param {string[]} sessionDates  Array of ISO 8601 date strings
 * @returns {number} Current streak length
 */
export function calculateStreak(sessionDates) {
  if (!sessionDates || sessionDates.length === 0) return 0

  // Deduplicate by day, sort descending
  const uniqueDays = [...new Set(sessionDates.map(toDay))].sort((a, b) => b - a)

  const today     = toDay(new Date())
  const yesterday = today - ONE_DAY_MS

  // Streak must end today or yesterday
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0

  let streak    = 1
  let prevDay   = uniqueDays[0]

  for (let i = 1; i < uniqueDays.length; i++) {
    const gap = prevDay - uniqueDays[i]
    if (gap === ONE_DAY_MS) {
      streak++
      prevDay = uniqueDays[i]
    } else {
      break
    }
  }

  return streak
}
