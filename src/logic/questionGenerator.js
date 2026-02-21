/**
 * questionGenerator.js
 * Generates randomised ear-training questions and sessions.
 * Pure logic — no React, no audio, no side effects.
 */

import { getRootFrequency, getIntervalFrequency } from './noteUtils.js'
import { getIntervalById }                        from './intervals.js'
import { buildWeightedPool, pickFromWeightedPool } from './adaptiveWeighting.js'

/**
 * Picks a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
function randomPick(arr) {
  if (!arr || arr.length === 0) {
    throw new Error('Cannot pick from an empty array.')
  }
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generates a single ear-training question.
 *
 * @param {string[]} activeIntervalIds  Pool of interval ids to pick from
 * @param {string[]} availableKeys      Pool of root key names to pick from
 * @returns {{ key: string, intervalId: string, rootHz: number, intervalHz: number }}
 */
export function generateQuestion(activeIntervalIds, availableKeys) {
  const key        = randomPick(availableKeys)
  const intervalId = randomPick(activeIntervalIds)

  const interval   = getIntervalById(intervalId)
  if (!interval) {
    throw new Error(`Unknown intervalId: "${intervalId}"`)
  }

  const rootHz     = getRootFrequency(key)
  const intervalHz = getIntervalFrequency(rootHz, interval.semitones)

  return { key, intervalId, rootHz, intervalHz }
}

/**
 * Generates an array of `count` independent questions.
 *
 * @param {string[]} activeIntervalIds
 * @param {string[]} availableKeys
 * @param {number}   count
 * @returns {Array<{ key: string, intervalId: string, rootHz: number, intervalHz: number }>}
 */
export function generateSession(activeIntervalIds, availableKeys, count) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer, got ${count}`)
  }
  return Array.from({ length: count }, () =>
    generateQuestion(activeIntervalIds, availableKeys)
  )
}

/**
 * Generates a session where interval selection is weighted by accuracy stats.
 * Intervals the user struggles with appear more frequently.
 *
 * @param {string[]} activeIntervalIds
 * @param {string[]} availableKeys
 * @param {number}   count
 * @param {Array<{ intervalId: string, accuracy: number|null }>} intervalStats
 *   Per-interval accuracy stats from storage.  Missing entries default to
 *   the "no data" weight so new intervals are treated fairly.
 * @returns {Array<{ key: string, intervalId: string, rootHz: number, intervalHz: number }>}
 */
export function generateAdaptiveSession(activeIntervalIds, availableKeys, count, intervalStats) {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`count must be a positive integer, got ${count}`)
  }

  const pool = buildWeightedPool(activeIntervalIds, intervalStats ?? [])

  return Array.from({ length: count }, () => {
    const intervalId = pickFromWeightedPool(pool)
    const key        = availableKeys[Math.floor(Math.random() * availableKeys.length)]
    const interval   = getIntervalById(intervalId)

    if (!interval) throw new Error(`Unknown intervalId: "${intervalId}"`)

    const rootHz     = getRootFrequency(key)
    const intervalHz = getIntervalFrequency(rootHz, interval.semitones)

    return { key, intervalId, rootHz, intervalHz }
  })
}
