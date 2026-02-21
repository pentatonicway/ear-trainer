import { describe, it, expect } from 'vitest'
import { generateQuestion, generateSession } from '../questionGenerator.js'
import { KEYS } from '../intervals.js'

const ACTIVE_IDS   = ['root', 'perfect_fifth', 'perfect_fourth']
const AVAILABLE_KEYS = KEYS // ['C', 'G', 'D', 'A', 'E']

describe('generateQuestion', () => {
  it('returns an object with key, intervalId, rootHz, intervalHz', () => {
    const q = generateQuestion(ACTIVE_IDS, AVAILABLE_KEYS)
    expect(q).toHaveProperty('key')
    expect(q).toHaveProperty('intervalId')
    expect(q).toHaveProperty('rootHz')
    expect(q).toHaveProperty('intervalHz')
  })

  it('key is always from availableKeys', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(ACTIVE_IDS, AVAILABLE_KEYS)
      expect(AVAILABLE_KEYS).toContain(q.key)
    }
  })

  it('intervalId is always from activeIntervalIds', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateQuestion(ACTIVE_IDS, AVAILABLE_KEYS)
      expect(ACTIVE_IDS).toContain(q.intervalId)
    }
  })

  it('rootHz is a positive number', () => {
    const q = generateQuestion(ACTIVE_IDS, AVAILABLE_KEYS)
    expect(typeof q.rootHz).toBe('number')
    expect(q.rootHz).toBeGreaterThan(0)
  })

  it('intervalHz is >= rootHz (all test intervals are ascending)', () => {
    for (let i = 0; i < 20; i++) {
      const q = generateQuestion(ACTIVE_IDS, AVAILABLE_KEYS)
      expect(q.intervalHz).toBeGreaterThanOrEqual(q.rootHz)
    }
  })

  it('root interval returns intervalHz === rootHz', () => {
    // Force a question with root interval
    const q = generateQuestion(['root'], ['A'])
    expect(q.intervalHz).toBeCloseTo(q.rootHz, 5)
  })

  it('throws when activeIntervalIds is empty', () => {
    expect(() => generateQuestion([], AVAILABLE_KEYS)).toThrow()
  })

  it('throws for an unknown intervalId', () => {
    expect(() => generateQuestion(['unknown_interval'], AVAILABLE_KEYS)).toThrow()
  })
})

describe('generateSession', () => {
  it('returns an array of the requested count', () => {
    const session = generateSession(ACTIVE_IDS, AVAILABLE_KEYS, 10)
    expect(Array.isArray(session)).toBe(true)
    expect(session).toHaveLength(10)
  })

  it('every question has key, intervalId, rootHz, intervalHz', () => {
    const session = generateSession(ACTIVE_IDS, AVAILABLE_KEYS, 20)
    for (const q of session) {
      expect(q).toHaveProperty('key')
      expect(q).toHaveProperty('intervalId')
      expect(q).toHaveProperty('rootHz')
      expect(q).toHaveProperty('intervalHz')
    }
  })

  it('every intervalId is from activeIntervalIds', () => {
    const session = generateSession(ACTIVE_IDS, AVAILABLE_KEYS, 30)
    for (const q of session) {
      expect(ACTIVE_IDS).toContain(q.intervalId)
    }
  })

  it('every key is from availableKeys', () => {
    const session = generateSession(ACTIVE_IDS, AVAILABLE_KEYS, 30)
    for (const q of session) {
      expect(AVAILABLE_KEYS).toContain(q.key)
    }
  })

  it('works for count = 1', () => {
    const session = generateSession(ACTIVE_IDS, AVAILABLE_KEYS, 1)
    expect(session).toHaveLength(1)
  })

  it('throws for count = 0', () => {
    expect(() => generateSession(ACTIVE_IDS, AVAILABLE_KEYS, 0)).toThrow()
  })

  it('throws for non-integer count', () => {
    expect(() => generateSession(ACTIVE_IDS, AVAILABLE_KEYS, 2.5)).toThrow()
  })
})
