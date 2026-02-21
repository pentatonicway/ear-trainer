import { describe, it, expect } from 'vitest'
import { INTERVALS, KEYS, getIntervalById, getIntervalsForPhase } from '../intervals.js'

describe('INTERVALS', () => {
  it('exports an array with 12 intervals', () => {
    expect(Array.isArray(INTERVALS)).toBe(true)
    expect(INTERVALS).toHaveLength(12)
  })

  it('every interval has required fields: id, name, semitones, phase, displayName', () => {
    for (const interval of INTERVALS) {
      expect(interval).toHaveProperty('id')
      expect(interval).toHaveProperty('name')
      expect(interval).toHaveProperty('semitones')
      expect(interval).toHaveProperty('phase')
      expect(interval).toHaveProperty('displayName')

      expect(typeof interval.id).toBe('string')
      expect(typeof interval.name).toBe('string')
      expect(typeof interval.semitones).toBe('number')
      expect(typeof interval.phase).toBe('number')
      expect(typeof interval.displayName).toBe('string')
    }
  })

  it('semitone values are unique', () => {
    const semitones = INTERVALS.map((i) => i.semitones)
    const unique    = new Set(semitones)
    expect(unique.size).toBe(semitones.length)
  })
})

describe('KEYS', () => {
  it('exports ["C", "G", "D", "A", "E"]', () => {
    expect(KEYS).toEqual(['C', 'G', 'D', 'A', 'E'])
  })
})

describe('getIntervalById', () => {
  it('returns the correct interval for a known id', () => {
    const interval = getIntervalById('perfect_fifth')
    expect(interval).toBeDefined()
    expect(interval.semitones).toBe(7)
  })

  it('returns undefined for an unknown id', () => {
    expect(getIntervalById('unknown_interval')).toBeUndefined()
  })

  it('returns the correct interval for tritone', () => {
    const interval = getIntervalById('tritone')
    expect(interval).toBeDefined()
    expect(interval.semitones).toBe(6)
  })
})

describe('getIntervalsForPhase', () => {
  it('phase 1 returns exactly 3 intervals', () => {
    const result = getIntervalsForPhase(1)
    expect(result).toHaveLength(3)
  })

  it('phase 1 contains root, perfect_fifth, and perfect_fourth', () => {
    const result = getIntervalsForPhase(1)
    const ids    = result.map((i) => i.id)
    expect(ids).toContain('root')
    expect(ids).toContain('perfect_fifth')
    expect(ids).toContain('perfect_fourth')
  })

  it('phase 3 returns 5 intervals (root, p4, p5, tritone, major_third)', () => {
    const result = getIntervalsForPhase(3)
    expect(result).toHaveLength(5)
    const ids = result.map(i => i.id)
    expect(ids).toContain('tritone')
    expect(ids).toContain('major_third')
  })

  it('phase 10 returns all 12 intervals', () => {
    const result = getIntervalsForPhase(10)
    expect(result).toHaveLength(12)
  })

  it('phase 0 returns 0 intervals', () => {
    expect(getIntervalsForPhase(0)).toHaveLength(0)
  })
})
