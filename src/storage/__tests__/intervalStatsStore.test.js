/**
 * intervalStatsStore.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { _resetDBCache } from '../db.js'
import { updateIntervalStat, getAllIntervalStats, getIntervalStat } from '../intervalStatsStore.js'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  _resetDBCache()
})

describe('updateIntervalStat', () => {
  it('creates a new record on first call (correct answer)', async () => {
    await updateIntervalStat('perfect_fifth', true)
    const stat = await getIntervalStat('perfect_fifth')
    expect(stat).not.toBeNull()
    expect(stat.intervalId).toBe('perfect_fifth')
    expect(stat.correct).toBe(1)
    expect(stat.total).toBe(1)
    expect(stat.accuracy).toBe(1)
  })

  it('creates a new record on first call (wrong answer)', async () => {
    await updateIntervalStat('minor_third', false)
    const stat = await getIntervalStat('minor_third')
    expect(stat.correct).toBe(0)
    expect(stat.total).toBe(1)
    expect(stat.accuracy).toBe(0)
  })

  it('increments correct and total on correct answer', async () => {
    await updateIntervalStat('root', true)
    await updateIntervalStat('root', true)
    const stat = await getIntervalStat('root')
    expect(stat.correct).toBe(2)
    expect(stat.total).toBe(2)
  })

  it('increments only total on wrong answer', async () => {
    await updateIntervalStat('major_third', true)
    await updateIntervalStat('major_third', false)
    const stat = await getIntervalStat('major_third')
    expect(stat.correct).toBe(1)
    expect(stat.total).toBe(2)
  })

  it('recalculates accuracy after each update', async () => {
    await updateIntervalStat('perfect_fourth', true)   // 1/1 = 1.0
    await updateIntervalStat('perfect_fourth', false)  // 1/2 = 0.5
    await updateIntervalStat('perfect_fourth', true)   // 2/3 ≈ 0.667
    const stat = await getIntervalStat('perfect_fourth')
    expect(stat.accuracy).toBeCloseTo(2 / 3, 5)
  })

  it('keeps separate records for different intervals', async () => {
    await updateIntervalStat('root', true)
    await updateIntervalStat('perfect_fifth', false)
    const root  = await getIntervalStat('root')
    const fifth = await getIntervalStat('perfect_fifth')
    expect(root.total).toBe(1)
    expect(fifth.total).toBe(1)
    expect(root.correct).toBe(1)
    expect(fifth.correct).toBe(0)
  })
})

describe('getAllIntervalStats', () => {
  it('returns empty array when no stats exist', async () => {
    const stats = await getAllIntervalStats()
    expect(stats).toEqual([])
  })

  it('returns all stored interval stats', async () => {
    await updateIntervalStat('root', true)
    await updateIntervalStat('perfect_fifth', true)
    const stats = await getAllIntervalStats()
    expect(stats).toHaveLength(2)
    const ids = stats.map((s) => s.intervalId)
    expect(ids).toContain('root')
    expect(ids).toContain('perfect_fifth')
  })
})

describe('getIntervalStat', () => {
  it('returns null for an unknown interval', async () => {
    const stat = await getIntervalStat('tritone')
    expect(stat).toBeNull()
  })

  it('returns the correct record for a known interval', async () => {
    await updateIntervalStat('major_sixth', true)
    const stat = await getIntervalStat('major_sixth')
    expect(stat.intervalId).toBe('major_sixth')
  })
})

import { clearAll, clearAllIntervalStats } from '../intervalStatsStore.js'

describe('clearAll()', () => {
  it('deletes all interval stat records', async () => {
    await updateIntervalStat('root', true)
    await updateIntervalStat('perfect_fifth', false)
    await clearAll()
    expect(await getAllIntervalStats()).toHaveLength(0)
  })

  it('is a no-op when store is already empty', async () => {
    await expect(clearAll()).resolves.not.toThrow()
    expect(await getAllIntervalStats()).toHaveLength(0)
  })

  it('individual stats are gone after clearAll', async () => {
    await updateIntervalStat('root', true)
    await clearAll()
    expect(await getIntervalStat('root')).toBeNull()
  })
})

describe('clearAllIntervalStats() (alias)', () => {
  it('also clears all stats', async () => {
    await updateIntervalStat('root', true)
    await clearAllIntervalStats()
    expect(await getAllIntervalStats()).toHaveLength(0)
  })
})
