/**
 * adaptiveWeighting.test.js
 * Pure unit tests — no React, no storage, no audio.
 */

import { describe, it, expect } from 'vitest'
import {
  getWeight,
  buildWeightedPool,
  pickFromWeightedPool,
} from '../adaptiveWeighting.js'
import { generateAdaptiveSession } from '../questionGenerator.js'

// ─── getWeight ────────────────────────────────────────────────────────────────

describe('getWeight()', () => {
  it('returns 3 for null (no data)', () => {
    expect(getWeight(null)).toBe(3)
  })

  it('returns 3 for undefined (no data)', () => {
    expect(getWeight(undefined)).toBe(3)
  })

  it('returns 5 for accuracy 0 (0%)', () => {
    expect(getWeight(0)).toBe(5)
  })

  it('returns 5 for accuracy 0.3 (30%)', () => {
    expect(getWeight(0.3)).toBe(5)
  })

  it('returns 5 for accuracy just below 0.5', () => {
    expect(getWeight(0.499)).toBe(5)
  })

  it('returns 3 for accuracy exactly 0.5 (50%)', () => {
    expect(getWeight(0.5)).toBe(3)
  })

  it('returns 3 for accuracy 0.65 (65%)', () => {
    expect(getWeight(0.65)).toBe(3)
  })

  it('returns 3 for accuracy just below 0.8', () => {
    expect(getWeight(0.799)).toBe(3)
  })

  it('returns 1 for accuracy exactly 0.8 (80%)', () => {
    expect(getWeight(0.8)).toBe(1)
  })

  it('returns 1 for accuracy 1.0 (100%)', () => {
    expect(getWeight(1.0)).toBe(1)
  })

  it('returns 1 for accuracy 0.95 (95%)', () => {
    expect(getWeight(0.95)).toBe(1)
  })
})

// ─── buildWeightedPool ────────────────────────────────────────────────────────

describe('buildWeightedPool()', () => {
  // ── Weight counts ──────────────────────────────────────────────────────────

  it('0% accuracy interval appears 5 times', () => {
    const pool = buildWeightedPool(['root'], [{ intervalId: 'root', accuracy: 0 }])
    expect(pool.filter(id => id === 'root')).toHaveLength(5)
  })

  it('100% accuracy interval appears 1 time', () => {
    const pool = buildWeightedPool(
      ['perfect_fifth'],
      [{ intervalId: 'perfect_fifth', accuracy: 1.0 }]
    )
    expect(pool.filter(id => id === 'perfect_fifth')).toHaveLength(1)
  })

  it('null accuracy (no stat) interval appears 3 times', () => {
    const pool = buildWeightedPool(['root'], [{ intervalId: 'root', accuracy: null }])
    expect(pool.filter(id => id === 'root')).toHaveLength(3)
  })

  it('missing stat entry (intervalId not in stats array) defaults to 3', () => {
    const pool = buildWeightedPool(['root'], [])  // no stats at all
    expect(pool.filter(id => id === 'root')).toHaveLength(3)
  })

  it('50% accuracy interval appears 3 times', () => {
    const pool = buildWeightedPool(['root'], [{ intervalId: 'root', accuracy: 0.5 }])
    expect(pool.filter(id => id === 'root')).toHaveLength(3)
  })

  it('80% accuracy interval appears 1 time', () => {
    const pool = buildWeightedPool(['root'], [{ intervalId: 'root', accuracy: 0.8 }])
    expect(pool.filter(id => id === 'root')).toHaveLength(1)
  })

  // ── Pool shape ─────────────────────────────────────────────────────────────

  it('returns a flat array of strings', () => {
    const pool = buildWeightedPool(
      ['root', 'perfect_fifth'],
      [
        { intervalId: 'root',          accuracy: 1.0 },
        { intervalId: 'perfect_fifth', accuracy: 0   },
      ]
    )
    expect(Array.isArray(pool)).toBe(true)
    pool.forEach(item => expect(typeof item).toBe('string'))
  })

  it('total pool length equals sum of individual weights', () => {
    // root 100% → weight 1; fifth 0% → weight 5; fourth no data → weight 3
    const pool = buildWeightedPool(
      ['root', 'perfect_fifth', 'perfect_fourth'],
      [
        { intervalId: 'root',          accuracy: 1.0 },
        { intervalId: 'perfect_fifth', accuracy: 0   },
        // perfect_fourth intentionally absent from stats
      ]
    )
    expect(pool).toHaveLength(1 + 5 + 3)  // = 9
  })

  it('pool only contains ids from activeIntervalIds', () => {
    const activeIds = ['root', 'perfect_fifth']
    const pool = buildWeightedPool(activeIds, [])
    pool.forEach(id => expect(activeIds).toContain(id))
  })

  it('returns empty array for empty activeIntervalIds', () => {
    const pool = buildWeightedPool([], [])
    expect(pool).toHaveLength(0)
  })

  it('handles undefined intervalStats gracefully (treats all as no-data)', () => {
    const pool = buildWeightedPool(['root', 'perfect_fifth'], undefined)
    // Both default to weight 3
    expect(pool).toHaveLength(6)
  })

  it('multiple active intervals all represented', () => {
    const ids  = ['root', 'perfect_fifth', 'perfect_fourth']
    const pool = buildWeightedPool(ids, [])
    const seen = new Set(pool)
    ids.forEach(id => expect(seen.has(id)).toBe(true))
  })
})

// ─── pickFromWeightedPool ─────────────────────────────────────────────────────

describe('pickFromWeightedPool()', () => {
  it('returns a value present in the pool', () => {
    const pool   = ['root', 'root', 'root', 'perfect_fifth']
    const result = pickFromWeightedPool(pool)
    expect(pool).toContain(result)
  })

  it('returns a string', () => {
    expect(typeof pickFromWeightedPool(['root'])).toBe('string')
  })

  it('works with a single-element pool', () => {
    expect(pickFromWeightedPool(['root'])).toBe('root')
  })

  it('throws if pool is empty', () => {
    expect(() => pickFromWeightedPool([])).toThrow()
  })

  it('throws if pool is null', () => {
    expect(() => pickFromWeightedPool(null)).toThrow()
  })

  it('only returns values present in the pool', () => {
    const pool    = ['root', 'perfect_fifth', 'perfect_fifth', 'perfect_fifth']
    const allowed = new Set(pool)

    for (let i = 0; i < 50; i++) {
      expect(allowed.has(pickFromWeightedPool(pool))).toBe(true)
    }
  })
})

// ─── generateAdaptiveSession ──────────────────────────────────────────────────

const KEYS = ['C', 'G', 'D', 'A', 'E']

describe('generateAdaptiveSession()', () => {
  it('returns exactly the requested number of questions', () => {
    const questions = generateAdaptiveSession(
      ['root', 'perfect_fifth'],
      KEYS,
      5,
      []
    )
    expect(questions).toHaveLength(5)
  })

  it('each question has key, intervalId, rootHz, intervalHz', () => {
    const questions = generateAdaptiveSession(
      ['root', 'perfect_fifth'],
      KEYS,
      3,
      []
    )
    questions.forEach(q => {
      expect(q).toHaveProperty('key')
      expect(q).toHaveProperty('intervalId')
      expect(q).toHaveProperty('rootHz')
      expect(q).toHaveProperty('intervalHz')
    })
  })

  it('only generates questions from active interval ids', () => {
    const activeIds = ['root', 'perfect_fifth']
    const questions = generateAdaptiveSession(activeIds, KEYS, 20, [])
    questions.forEach(q => expect(activeIds).toContain(q.intervalId))
  })

  it('only generates questions using keys from availableKeys', () => {
    const questions = generateAdaptiveSession(['root', 'perfect_fifth'], KEYS, 20, [])
    questions.forEach(q => expect(KEYS).toContain(q.key))
  })

  it('throws for non-positive count', () => {
    expect(() => generateAdaptiveSession(['root'], KEYS, 0, [])).toThrow()
  })

  it('throws for non-integer count', () => {
    expect(() => generateAdaptiveSession(['root'], KEYS, 2.5, [])).toThrow()
  })

  // ── Probabilistic weight test ──────────────────────────────────────────────
  // Run 1000 adaptive sessions (1 question each) with:
  //   - 'root'          at 0%  accuracy → weight 5
  //   - 'perfect_fifth' at 100% accuracy → weight 1
  // Expected ratio ~5:1, test requires >2x more root appearances.

  it('struggling interval appears significantly more often than mastered interval', () => {
    const stats = [
      { intervalId: 'root',          accuracy: 0   },  // weight 5
      { intervalId: 'perfect_fifth', accuracy: 1.0 },  // weight 1
    ]
    const activeIds = ['root', 'perfect_fifth']
    const TRIALS    = 1000
    let rootCount   = 0

    for (let i = 0; i < TRIALS; i++) {
      const [q] = generateAdaptiveSession(activeIds, KEYS, 1, stats)
      if (q.intervalId === 'root') rootCount++
    }

    const fifthCount = TRIALS - rootCount
    // With weights 5:1 we expect ~833 root vs ~167 fifth.
    // Require at least 2× to give statistical headroom.
    expect(rootCount).toBeGreaterThan(fifthCount * 2)
  })

  it('no-data intervals get baseline weight and appear proportionally', () => {
    // All three intervals have no data → weight 3 each → roughly equal
    const activeIds = ['root', 'perfect_fifth', 'perfect_fourth']
    const counts    = { root: 0, perfect_fifth: 0, perfect_fourth: 0 }
    const TRIALS    = 900

    for (let i = 0; i < TRIALS; i++) {
      const [q] = generateAdaptiveSession(activeIds, KEYS, 1, [])
      counts[q.intervalId]++
    }

    // Each should appear roughly 300 times; allow wide margin (±50%)
    Object.values(counts).forEach(c => {
      expect(c).toBeGreaterThan(100)
      expect(c).toBeLessThan(500)
    })
  })
})
