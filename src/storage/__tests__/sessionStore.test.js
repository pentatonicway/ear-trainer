/**
 * sessionStore.test.js
 * Uses a fresh fake-indexeddb instance per test for full isolation.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { _resetDBCache } from '../db.js'
import { saveSession, getRecentSessions, getSessionsForStreakCalc } from '../sessionStore.js'

beforeEach(() => {
  // New in-memory IDB instance → complete isolation between tests
  globalThis.indexedDB = new IDBFactory()
  _resetDBCache()
})

const makeSession = (overrides = {}) => ({
  date:              new Date().toISOString(),
  score:             7,
  total:             10,
  intervalBreakdown: { perfect_fifth: { correct: 4, total: 5 } },
  ...overrides,
})

describe('saveSession + getRecentSessions', () => {
  it('saves a session and retrieves it', async () => {
    await saveSession(makeSession())
    const results = await getRecentSessions(10)
    expect(results).toHaveLength(1)
    expect(results[0].score).toBe(7)
    expect(results[0].total).toBe(10)
  })

  it('returns sessions ordered by date descending', async () => {
    await saveSession(makeSession({ date: '2024-01-01T10:00:00.000Z', score: 1 }))
    await saveSession(makeSession({ date: '2024-01-03T10:00:00.000Z', score: 3 }))
    await saveSession(makeSession({ date: '2024-01-02T10:00:00.000Z', score: 2 }))

    const results = await getRecentSessions(10)
    expect(results[0].score).toBe(3)
    expect(results[1].score).toBe(2)
    expect(results[2].score).toBe(1)
  })

  it('getRecentSessions(1) returns only the most recent session', async () => {
    await saveSession(makeSession({ date: '2024-01-01T10:00:00.000Z', score: 1 }))
    await saveSession(makeSession({ date: '2024-01-02T10:00:00.000Z', score: 2 }))

    const results = await getRecentSessions(1)
    expect(results).toHaveLength(1)
    expect(results[0].score).toBe(2)
  })

  it('returns empty array when no sessions exist', async () => {
    const results = await getRecentSessions(10)
    expect(results).toEqual([])
  })

  it('preserves intervalBreakdown', async () => {
    const breakdown = { root: { correct: 3, total: 3 }, minor_third: { correct: 1, total: 2 } }
    await saveSession(makeSession({ intervalBreakdown: breakdown }))
    const [session] = await getRecentSessions(1)
    expect(session.intervalBreakdown).toEqual(breakdown)
  })
})

describe('getSessionsForStreakCalc', () => {
  it('returns only id and date fields', async () => {
    await saveSession(makeSession({ score: 5 }))
    const results = await getSessionsForStreakCalc()
    expect(results).toHaveLength(1)
    expect(results[0]).toHaveProperty('id')
    expect(results[0]).toHaveProperty('date')
    expect(results[0].score).toBeUndefined()
  })

  it('returns one entry per saved session', async () => {
    await saveSession(makeSession())
    await saveSession(makeSession())
    await saveSession(makeSession())
    const results = await getSessionsForStreakCalc()
    expect(results).toHaveLength(3)
  })
})

import { clearAll, clearAllSessions, getSessionCount } from '../sessionStore.js'

describe('getSessionCount()', () => {
  it('returns 0 when no sessions exist', async () => {
    expect(await getSessionCount()).toBe(0)
  })

  it('returns correct count after saving sessions', async () => {
    await saveSession(makeSession())
    await saveSession(makeSession())
    await saveSession(makeSession())
    expect(await getSessionCount()).toBe(3)
  })

  it('reflects count after adding more sessions', async () => {
    await saveSession(makeSession())
    expect(await getSessionCount()).toBe(1)
    await saveSession(makeSession())
    expect(await getSessionCount()).toBe(2)
  })
})

describe('clearAll()', () => {
  it('deletes all sessions', async () => {
    await saveSession(makeSession())
    await saveSession(makeSession())
    await clearAll()
    expect(await getSessionCount()).toBe(0)
  })

  it('getRecentSessions returns empty array after clearAll', async () => {
    await saveSession(makeSession())
    await clearAll()
    expect(await getRecentSessions(10)).toHaveLength(0)
  })

  it('is a no-op when store is already empty', async () => {
    await expect(clearAll()).resolves.not.toThrow()
    expect(await getSessionCount()).toBe(0)
  })
})

describe('clearAllSessions() (alias)', () => {
  it('also clears all sessions', async () => {
    await saveSession(makeSession())
    await clearAllSessions()
    expect(await getSessionCount()).toBe(0)
  })
})
