/**
 * settingsStore.js
 * Key-value settings persistence.
 *
 * Schema: { key: string, value: any }
 */

import { openDB } from './db.js'

/**
 * Saves or updates a setting.
 *
 * @param {string} key
 * @param {*}      value  Must be structured-clone-able
 * @returns {Promise<void>}
 */
export async function saveSetting(key, value) {
  const db = await openDB()
  await db.put('settings', { key, value })
}

/**
 * Returns the stored value for `key`, or `defaultValue` if not set.
 *
 * @param {string} key
 * @param {*}      defaultValue
 * @returns {Promise<*>}
 */
export async function getSetting(key, defaultValue = null) {
  const db     = await openDB()
  const record = await db.get('settings', key)
  return record !== undefined ? record.value : defaultValue
}

/**
 * Returns all settings as a plain `{ key: value }` object.
 *
 * @returns {Promise<Record<string, *>>}
 */
export async function getAllSettings() {
  const db      = await openDB()
  const records = await db.getAll('settings')
  return Object.fromEntries(records.map(({ key, value }) => [key, value]))
}
