/**
 * settingsStore.test.js
 */
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { _resetDBCache } from '../db.js'
import { saveSetting, getSetting, getAllSettings } from '../settingsStore.js'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  _resetDBCache()
})

describe('saveSetting + getSetting', () => {
  it('saves a string value and retrieves it', async () => {
    await saveSetting('theme', 'dark')
    expect(await getSetting('theme')).toBe('dark')
  })

  it('saves a number value and retrieves it', async () => {
    await saveSetting('volume', 0.75)
    expect(await getSetting('volume')).toBe(0.75)
  })

  it('saves a boolean value and retrieves it', async () => {
    await saveSetting('soundEnabled', false)
    expect(await getSetting('soundEnabled')).toBe(false)
  })

  it('saves an object value and retrieves it', async () => {
    const activeIntervals = ['root', 'perfect_fifth']
    await saveSetting('activeIntervals', activeIntervals)
    expect(await getSetting('activeIntervals')).toEqual(activeIntervals)
  })

  it('overwrites an existing value', async () => {
    await saveSetting('theme', 'light')
    await saveSetting('theme', 'dark')
    expect(await getSetting('theme')).toBe('dark')
  })

  it('returns defaultValue when key has not been saved', async () => {
    expect(await getSetting('nonExistentKey', 'fallback')).toBe('fallback')
  })

  it('returns null as default when no defaultValue provided', async () => {
    expect(await getSetting('missingKey')).toBeNull()
  })

  it('returns the stored value even if it is falsy (0)', async () => {
    await saveSetting('streak', 0)
    expect(await getSetting('streak', 99)).toBe(0)
  })

  it('returns the stored value even if it is false', async () => {
    await saveSetting('enabled', false)
    expect(await getSetting('enabled', true)).toBe(false)
  })
})

describe('getAllSettings', () => {
  it('returns empty object when no settings exist', async () => {
    expect(await getAllSettings()).toEqual({})
  })

  it('returns all settings as a flat key-value object', async () => {
    await saveSetting('theme', 'dark')
    await saveSetting('volume', 0.8)
    expect(await getAllSettings()).toEqual({ theme: 'dark', volume: 0.8 })
  })

  it('reflects updates after saveSetting overwrites a key', async () => {
    await saveSetting('theme', 'light')
    await saveSetting('theme', 'dark')
    const all = await getAllSettings()
    expect(all.theme).toBe('dark')
    expect(Object.keys(all)).toHaveLength(1)
  })
})
