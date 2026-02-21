import { describe, it, expect } from 'vitest'
import { NOTE_FREQUENCIES, getRootFrequency, getIntervalFrequency } from '../noteUtils.js'

describe('NOTE_FREQUENCIES', () => {
  it('contains 24 entries covering C3–B4', () => {
    expect(Object.keys(NOTE_FREQUENCIES)).toHaveLength(24)
  })

  it('A4 is exactly 440 Hz', () => {
    expect(NOTE_FREQUENCIES['A4']).toBeCloseTo(440, 5)
  })

  it('C4 (middle C) is approximately 261.63 Hz', () => {
    expect(NOTE_FREQUENCIES['C4']).toBeCloseTo(261.63, 1)
  })

  it('all frequencies are positive numbers', () => {
    for (const [, freq] of Object.entries(NOTE_FREQUENCIES)) {
      expect(typeof freq).toBe('number')
      expect(freq).toBeGreaterThan(0)
    }
  })
})

describe('getRootFrequency', () => {
  it('returns ~440 Hz for key A', () => {
    const freq = getRootFrequency('A')
    expect(Math.abs(freq - 440)).toBeLessThan(1)
  })

  it('returns ~261.63 Hz for key C (middle C)', () => {
    const freq = getRootFrequency('C')
    expect(Math.abs(freq - 261.63)).toBeLessThan(1)
  })

  it('returns ~392 Hz for key G', () => {
    const freq = getRootFrequency('G')
    expect(Math.abs(freq - 392)).toBeLessThan(1)
  })

  it('throws for an unknown key', () => {
    expect(() => getRootFrequency('X')).toThrow()
  })
})

describe('getIntervalFrequency', () => {
  it('0 semitones returns the root frequency unchanged', () => {
    expect(getIntervalFrequency(440, 0)).toBeCloseTo(440, 5)
  })

  it('7 semitones (perfect fifth) above A4 is ~659.26 Hz', () => {
    // A4 (440) → E5 ≈ 659.26
    const result = getIntervalFrequency(440, 7)
    expect(Math.abs(result - 659.26)).toBeLessThan(1)
  })

  it('12 semitones (octave) doubles the frequency', () => {
    expect(getIntervalFrequency(440, 12)).toBeCloseTo(880, 3)
  })

  it('4 semitones (major third) above A4 is ~554.37 Hz', () => {
    const result = getIntervalFrequency(440, 4)
    expect(Math.abs(result - 554.37)).toBeLessThan(1)
  })

  it('throws for negative semitones', () => {
    expect(() => getIntervalFrequency(440, -1)).toThrow()
  })
})
