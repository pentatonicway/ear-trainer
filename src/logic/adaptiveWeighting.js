/**
 * adaptiveWeighting.js
 * Builds a weighted interval pool based on per-interval accuracy stats.
 *
 * Higher weight = interval appears more often in generated sessions.
 * Pure logic — no React, no I/O, no side effects.
 */

// ─── Weight table ─────────────────────────────────────────────────────────────

/** Weight assigned when there is no stat data yet for an interval. */
const WEIGHT_NO_DATA   = 3  // baseline — treat as "needs work" until we know more

/** Weight for intervals the user is struggling with (accuracy < 50 %). */
const WEIGHT_STRUGGLING = 5

/** Weight for intervals the user is making progress on (50 % ≤ accuracy < 80 %). */
const WEIGHT_NEEDS_WORK = 3

/** Weight for well-mastered intervals (accuracy ≥ 80 %). Still appears, just less. */
const WEIGHT_STRONG    = 1

/**
 * Returns the sampling weight for an interval given its accuracy.
 *
 * @param {number|null|undefined} accuracy  0–1 floating point, or null/undefined if no data
 * @returns {number} weight (1, 3, or 5)
 */
export function getWeight(accuracy) {
  if (accuracy == null) return WEIGHT_NO_DATA
  if (accuracy < 0.5)  return WEIGHT_STRUGGLING
  if (accuracy < 0.8)  return WEIGHT_NEEDS_WORK
  return WEIGHT_STRONG
}

/**
 * Builds a flat weighted pool from the active interval IDs and their stats.
 *
 * Each intervalId is repeated `weight` times so that a uniform random pick
 * from the pool naturally samples proportionally to weight.
 *
 * @param {string[]} activeIntervalIds
 *   The interval IDs currently active for this user's session.
 *
 * @param {Array<{ intervalId: string, accuracy: number|null }>} intervalStats
 *   Per-interval stat records loaded from storage.  May be empty or missing
 *   entries for intervals the user has never seen.
 *
 * @returns {string[]} Flat array of intervalId strings, length = Σ weights.
 */
export function buildWeightedPool(activeIntervalIds, intervalStats) {
  // Build a quick lookup: intervalId → accuracy
  const statMap = new Map(
    (intervalStats ?? []).map(s => [s.intervalId, s.accuracy ?? null])
  )

  const pool = []

  for (const id of activeIntervalIds) {
    const accuracy = statMap.has(id) ? statMap.get(id) : null
    const weight   = getWeight(accuracy)

    for (let i = 0; i < weight; i++) {
      pool.push(id)
    }
  }

  return pool
}

/**
 * Picks a uniformly random element from the weighted pool.
 *
 * @param {string[]} pool  Non-empty array produced by buildWeightedPool.
 * @returns {string} An intervalId.
 * @throws {Error} If the pool is empty.
 */
export function pickFromWeightedPool(pool) {
  if (!pool || pool.length === 0) {
    throw new Error('pickFromWeightedPool: pool must not be empty')
  }
  return pool[Math.floor(Math.random() * pool.length)]
}
