/**
 * db.js
 * Opens and configures the IndexedDB database.
 */

import { openDB as idbOpenDB } from 'idb'

const DB_NAME    = 'ear-training-db'
const DB_VERSION = 1

let _dbPromise = null

export function openDB() {
  if (_dbPromise) return _dbPromise

  _dbPromise = idbOpenDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        const sessionStore = db.createObjectStore('sessions', {
          keyPath: 'id',
          autoIncrement: true,
        })
        sessionStore.createIndex('date', 'date', { unique: false })
      }
      if (!db.objectStoreNames.contains('intervalStats')) {
        db.createObjectStore('intervalStats', { keyPath: 'intervalId' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    },
  })

  return _dbPromise
}

export function _resetDBCache() {
  _dbPromise = null
}
