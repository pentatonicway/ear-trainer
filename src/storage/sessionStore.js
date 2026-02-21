/**
 * sessionStore.js
 * CRUD helpers for the 'sessions' object store.
 */

import { openDB } from './db.js'

/**
 * Saves a completed session.
 *
 * @param {{ date: string, score: number, total: number, intervalBreakdown: Record<string,{correct:number,total:number}> }} sessionData
 * @param {Function} [onStorageFull]  Called (with no args) when IndexedDB quota is exceeded.
 * @returns {Promise<number|null>} The auto-generated session id, or null if storage is full.
 */
export async function saveSession(sessionData, onStorageFull) {
  try {
    const db = await openDB()
    return await db.add('sessions', {
      date:               sessionData.date,
      score:              sessionData.score,
      total:              sessionData.total,
      intervalBreakdown:  sessionData.intervalBreakdown ?? {},
    })
  } catch (err) {
    // QuotaExceededError fires when the browser storage limit is hit
    const isQuota = err.name === 'QuotaExceededError' ||
                    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                    (err.message && err.message.toLowerCase().includes('quota'))
    if (isQuota && typeof onStorageFull === 'function') {
      onStorageFull()
      return null
    }
    throw err
  }
}

/**
 * Returns the last `n` sessions ordered by date descending.
 *
 * @param {number} n
 * @returns {Promise<Array>}
 */
export async function getRecentSessions(n) {
  const db   = await openDB()
  const all  = await db.getAllFromIndex('sessions', 'date')
  // getAllFromIndex returns records in ascending key order; reverse for desc
  const desc = all.slice().reverse()
  return desc.slice(0, n)
}

/**
 * Returns all sessions with only their `date` field (for streak calculation).
 *
 * @returns {Promise<Array<{ id: number, date: string }>>}
 */
export async function getSessionsForStreakCalc() {
  const db   = await openDB()
  const all  = await db.getAll('sessions')
  return all.map(({ id, date }) => ({ id, date }))
}

/**
 * Deletes all session records.
 * Used by the Reset Progress flow in SettingsScreen.
 *
 * @returns {Promise<void>}
 */
export async function clearAllSessions() {
  const db = await openDB()
  await db.clear('sessions')
}

/**
 * Returns the total number of session records.
 *
 * @returns {Promise<number>}
 */
export async function getSessionCount() {
  const db = await openDB()
  return db.count('sessions')
}

/**
 * Deletes all session records.
 * Alias kept consistent with intervalStatsStore naming convention.
 *
 * @returns {Promise<void>}
 */
export async function clearAll() {
  const db = await openDB()
  await db.clear('sessions')
}
