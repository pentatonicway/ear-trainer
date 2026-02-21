/**
 * phaseProgression.test.js
 * Pure unit tests — no React, no storage, no mocks needed.
 */

import { describe, it, expect } from 'vitest'
import {
  PHASE_MASTERY_THRESHOLD,
  PHASE_MASTERY_SESSIONS,
  checkPhaseUnlock,
  getActiveIntervalsForPhase,
} from '../phaseProgression.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** 5/5 = 100% accuracy */
const S_PERFECT  = { score: 5, total: 5, date: '2024-01-01T00:00:00.000Z' }

/** 4/5 = 80% accuracy — exactly at threshold */
const S_THRESHOLD = { score: 4, total: 5, date: '2024-01-01T00:00:00.000Z' }

/** 3/5 = 60% accuracy — below threshold */
const S_WEAK     = { score: 3, total: 5, date: '2024-01-01T00:00:00.000Z' }

/** 0/5 = 0% accuracy */
const S_ZERO     = { score: 0, total: 5, date: '2024-01-01T00:00:00.000Z' }

/** Three sessions all exactly at 80% */
const THREE_MASTERED = [S_THRESHOLD, S_THRESHOLD, S_THRESHOLD]

/** Three sessions all at 100% */
const THREE_PERFECT  = [S_PERFECT, S_PERFECT, S_PERFECT]

// ─── PHASE_MASTERY_THRESHOLD ──────────────────────────────────────────────────

describe('PHASE_MASTERY_THRESHOLD', () => {
  it('equals 0.8', () => {
    expect(PHASE_MASTERY_THRESHOLD).toBe(0.8)
  })
})

describe('PHASE_MASTERY_SESSIONS', () => {
  it('equals 3', () => {
    expect(PHASE_MASTERY_SESSIONS).toBe(3)
  })
})

// ─── checkPhaseUnlock ─────────────────────────────────────────────────────────

describe('checkPhaseUnlock()', () => {

  // ── Successful unlock scenarios ──────────────────────────────────────────

  it('returns 2 when 3 sessions all >= 80% on phase 1', () => {
    expect(checkPhaseUnlock(THREE_MASTERED, 1)).toBe(2)
  })

  it('returns 2 when 3 sessions all at 100% on phase 1', () => {
    expect(checkPhaseUnlock(THREE_PERFECT, 1)).toBe(2)
  })

  it('returns 3 when 3 sessions all >= 80% on phase 2', () => {
    expect(checkPhaseUnlock(THREE_MASTERED, 2)).toBe(3)
  })

  it('uses only the first PHASE_MASTERY_SESSIONS sessions (newest first)', () => {
    // First 3 are mastered; 4th is weak — should still unlock
    const sessions = [S_PERFECT, S_PERFECT, S_PERFECT, S_ZERO]
    expect(checkPhaseUnlock(sessions, 1)).toBe(2)
  })

  // ── Blocked unlock scenarios ──────────────────────────────────────────────

  it('returns null when fewer than 3 sessions provided', () => {
    expect(checkPhaseUnlock([S_PERFECT, S_PERFECT], 1)).toBeNull()
  })

  it('returns null when only 2 sessions are >= 80%', () => {
    const sessions = [S_PERFECT, S_PERFECT, S_WEAK]
    expect(checkPhaseUnlock(sessions, 1)).toBeNull()
  })

  it('returns null when 3 sessions but one is below threshold', () => {
    const sessions = [S_PERFECT, S_WEAK, S_PERFECT]
    expect(checkPhaseUnlock(sessions, 1)).toBeNull()
  })

  it('returns null when all sessions are at 0%', () => {
    expect(checkPhaseUnlock([S_ZERO, S_ZERO, S_ZERO], 1)).toBeNull()
  })

  it('returns null when already on phase 10 (max phase)', () => {
    expect(checkPhaseUnlock(THREE_MASTERED, 10)).toBeNull()
  })

  it('returns null when sessions array is empty', () => {
    expect(checkPhaseUnlock([], 1)).toBeNull()
  })

  it('returns null when sessions is null', () => {
    expect(checkPhaseUnlock(null, 1)).toBeNull()
  })

  it('returns null when sessions is undefined', () => {
    expect(checkPhaseUnlock(undefined, 1)).toBeNull()
  })

  // ── Boundary accuracy ─────────────────────────────────────────────────────

  it('exactly 80% (4/5) counts as mastered', () => {
    expect(checkPhaseUnlock([S_THRESHOLD, S_THRESHOLD, S_THRESHOLD], 1)).toBe(2)
  })

  it('just below 80% does not count as mastered', () => {
    // 3/4 = 75%
    const justBelow = { score: 3, total: 4, date: '2024-01-01T00:00:00.000Z' }
    expect(checkPhaseUnlock([justBelow, S_PERFECT, S_PERFECT], 1)).toBeNull()
  })

  it('session with total=0 does not count as mastered', () => {
    const noData = { score: 0, total: 0, date: '2024-01-01T00:00:00.000Z' }
    expect(checkPhaseUnlock([noData, S_PERFECT, S_PERFECT], 1)).toBeNull()
  })
})

// ─── getActiveIntervalsForPhase ───────────────────────────────────────────────

describe('getActiveIntervalsForPhase()', () => {

  // ── No custom IDs ────────────────────────────────────────────────────────

  it('returns all phase 1 intervals when no customActiveIds', () => {
    const result = getActiveIntervalsForPhase(1, null)
    const ids = result.map(i => i.id)
    expect(ids).toContain('root')
    expect(ids).toContain('perfect_fifth')
    expect(ids).toContain('perfect_fourth')
  })

  it('returns only phase 1 intervals (not higher phases) by default', () => {
    const result = getActiveIntervalsForPhase(1, null)
    result.forEach(i => expect(i.phase).toBeLessThanOrEqual(1))
  })

  it('returns more intervals for phase 2 than phase 1', () => {
    const phase1 = getActiveIntervalsForPhase(1, null)
    const phase2 = getActiveIntervalsForPhase(2, null)
    expect(phase2.length).toBeGreaterThanOrEqual(phase1.length)
  })

  it('returns all intervals for phase 3', () => {
    const result = getActiveIntervalsForPhase(3, null)
    expect(result.length).toBeGreaterThan(3)
  })

  it('returns all phase intervals when customActiveIds is empty array', () => {
    const withNull  = getActiveIntervalsForPhase(1, null)
    const withEmpty = getActiveIntervalsForPhase(1, [])
    expect(withEmpty.map(i => i.id).sort()).toEqual(withNull.map(i => i.id).sort())
  })

  it('returns all phase intervals when customActiveIds is undefined', () => {
    const withNull = getActiveIntervalsForPhase(1, null)
    const withUndef = getActiveIntervalsForPhase(1, undefined)
    expect(withUndef.map(i => i.id).sort()).toEqual(withNull.map(i => i.id).sort())
  })

  // ── With custom IDs ──────────────────────────────────────────────────────

  it('returns only the specified custom IDs (filtered to valid phase intervals)', () => {
    const custom = ['root', 'perfect_fifth']
    const result = getActiveIntervalsForPhase(1, custom)
    const ids = result.map(i => i.id)
    expect(ids).toEqual(expect.arrayContaining(['root', 'perfect_fifth']))
    expect(ids).not.toContain('perfect_fourth')
  })

  it('filters out custom IDs that are not valid for the phase', () => {
    // 'major_third' is phase 3, not phase 1 — should be excluded
    const custom = ['root', 'perfect_fifth', 'major_third']
    const result = getActiveIntervalsForPhase(1, custom)
    const ids = result.map(i => i.id)
    expect(ids).not.toContain('major_third')
  })

  it('returns interval objects with expected shape', () => {
    const result = getActiveIntervalsForPhase(1, ['root', 'perfect_fifth'])
    result.forEach(interval => {
      expect(interval).toHaveProperty('id')
      expect(interval).toHaveProperty('displayName')
      expect(interval).toHaveProperty('semitones')
      expect(interval).toHaveProperty('phase')
    })
  })

  it('falls back to all phase intervals when all custom IDs are invalid', () => {
    // 'invalid_id' is not a real interval — filter produces empty, so fall back
    const result = getActiveIntervalsForPhase(1, ['invalid_id', 'another_bad_id'])
    expect(result.length).toBeGreaterThan(0)
    result.forEach(i => expect(i.phase).toBeLessThanOrEqual(1))
  })

  it('respects custom IDs that are valid for phase 3', () => {
    const custom = ['root', 'major_third', 'tritone']
    const result = getActiveIntervalsForPhase(3, custom)
    const ids = result.map(i => i.id)
    expect(ids).toContain('root')
    expect(ids).toContain('major_third')
    expect(ids).toContain('tritone')
  })
})
