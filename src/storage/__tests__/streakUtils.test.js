/**
 * streakUtils.test.js
 * Uses vi.setSystemTime to control "today" for deterministic tests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateStreak } from '../streakUtils.js'

// Pin "today" to a known UTC date for all tests
const TODAY = '2024-06-15T12:00:00.000Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(TODAY))
})

afterEach(() => {
  vi.useRealTimers()
})

/** Shorthand: build ISO date string for N days before TODAY */
function daysAgo(n) {
  const d = new Date(TODAY)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

describe('calculateStreak', () => {
  it('returns 0 for an empty array', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('returns 0 for null / undefined input', () => {
    expect(calculateStreak(null)).toBe(0)
    expect(calculateStreak(undefined)).toBe(0)
  })

  it('returns 1 when only today has a session', () => {
    expect(calculateStreak([daysAgo(0)])).toBe(1)
  })

  it('returns 1 when only yesterday has a session', () => {
    expect(calculateStreak([daysAgo(1)])).toBe(1)
  })

  it('returns 0 when the most recent session was 2+ days ago', () => {
    expect(calculateStreak([daysAgo(2)])).toBe(0)
    expect(calculateStreak([daysAgo(7)])).toBe(0)
  })

  it('returns 3 for three consecutive days ending today', () => {
    const dates = [daysAgo(0), daysAgo(1), daysAgo(2)]
    expect(calculateStreak(dates)).toBe(3)
  })

  it('returns 3 for three consecutive days ending yesterday', () => {
    const dates = [daysAgo(1), daysAgo(2), daysAgo(3)]
    expect(calculateStreak(dates)).toBe(3)
  })

  it('resets streak at a gap in the sequence', () => {
    // today + yesterday + (gap) + 4 days ago  → streak = 2
    const dates = [daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(4)]
    expect(calculateStreak(dates)).toBe(2)
  })

  it('handles duplicate sessions on the same day (counts as one day)', () => {
    // Three sessions today, plus yesterday → streak = 2 (not 4)
    const dates = [daysAgo(0), daysAgo(0), daysAgo(0), daysAgo(1)]
    expect(calculateStreak(dates)).toBe(2)
  })

  it('handles unsorted input correctly', () => {
    const dates = [daysAgo(2), daysAgo(0), daysAgo(1)]
    expect(calculateStreak(dates)).toBe(3)
  })

  it('returns the correct streak when dates extend far into the past', () => {
    // 7-day streak ending today
    const dates = Array.from({ length: 7 }, (_, i) => daysAgo(i))
    expect(calculateStreak(dates)).toBe(7)
  })

  it('stops counting at the first gap even if older sessions are consecutive', () => {
    // today, yesterday, (gap), then 5 consecutive old days
    const dates = [
      daysAgo(0), daysAgo(1),
      daysAgo(3), daysAgo(4), daysAgo(5), daysAgo(6), daysAgo(7),
    ]
    expect(calculateStreak(dates)).toBe(2)
  })
})
