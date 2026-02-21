/**
 * intervalStatsStore.js
 * Upsert-based stats tracking per interval.
 *
 * Schema: { intervalId, correct, total, accuracy }
 * accuracy = correct / total  (0 if total === 0)
 */

import { openDB } from './db.js'

/**
 * Upserts a stat record for the given interval.
 * Increments `correct` (if wasCorrect) and always increments `total`.
 * Recalculates `accuracy` after each update.
 *
 * @param {string}  intervalId
 * @param {boolean} wasCorrect
 * @returns {Promise<void>}
 */
export async function updateIntervalStat(intervalId, wasCorrect) {
  const db      = await openDB()
  const existing = await db.get('intervalStats', intervalId)

  const prev = existing ?? { intervalId, correct: 0, total: 0, accuracy: 0 }

  const correct  = prev.correct + (wasCorrect ? 1 : 0)
  const total    = prev.total + 1
  const accuracy = total > 0 ? correct / total : 0

  await db.put('intervalStats', { intervalId, correct, total, accuracy })
}

/**
 * Returns all interval stat records.
 * @returns {Promise<Array<{ intervalId: string, correct: number, total: number, accuracy: number }>>}
 */
export async function getAllIntervalStats() {
  const db = await openDB()
  return db.getAll('intervalStats')
}

/**
 * Returns a single stat record, or null if none exists.
 * @param {string} intervalId
 * @returns {Promise<{ intervalId: string, correct: number, total: number, accuracy: number } | null>}
 */
export async function getIntervalStat(intervalId) {
  const db     = await openDB()
  const record = await db.get('intervalStats', intervalId)
  return record ?? null
}

/**
 * Deletes all interval stat records.
 * Used by the Reset Progress flow in SettingsScreen.
 *
 * @returns {Promise<void>}
 */
export async function clearAllIntervalStats() {
  const db = await openDB()
  await db.clear('intervalStats')
}

/**
 * Deletes all interval stat records.
 * Named clearAll for consistency with sessionStore.
 *
 * @returns {Promise<void>}
 */
export async function clearAll() {
  const db = await openDB()
  await db.clear('intervalStats')
}
