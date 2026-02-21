/**
 * audioEngine.js
 * Guitar audio engine built on Tone.js.
 * Framework-agnostic — no React imports.
 */

import * as Tone from 'tone'
import { frequencyToSamplerNote } from './audioUtils.js'

// ---------------------------------------------------------------------------
// Sample map — Salamander Guitar samples hosted on tonejs.github.io
// ---------------------------------------------------------------------------
const BASE_URL = 'https://tonejs.github.io/audio/salamander/'

export const SAMPLE_MAP = {
  A0:    'A0.[mp3|ogg]',
  C1:    'C1.[mp3|ogg]',
  'D#1': 'Ds1.[mp3|ogg]',
  'F#1': 'Fs1.[mp3|ogg]',
  A1:    'A1.[mp3|ogg]',
  C2:    'C2.[mp3|ogg]',
  'D#2': 'Ds2.[mp3|ogg]',
  'F#2': 'Fs2.[mp3|ogg]',
  A2:    'A2.[mp3|ogg]',
  C3:    'C3.[mp3|ogg]',
  'D#3': 'Ds3.[mp3|ogg]',
  'F#3': 'Fs3.[mp3|ogg]',
  A3:    'A3.[mp3|ogg]',
  C4:    'C4.[mp3|ogg]',
  'D#4': 'Ds4.[mp3|ogg]',
  'F#4': 'Fs4.[mp3|ogg]',
  A4:    'A4.[mp3|ogg]',
  C5:    'C5.[mp3|ogg]',
  'D#5': 'Ds5.[mp3|ogg]',
  'F#5': 'Fs5.[mp3|ogg]',
  A5:    'A5.[mp3|ogg]',
  C6:    'C6.[mp3|ogg]',
  'D#6': 'Ds6.[mp3|ogg]',
  'F#6': 'Fs6.[mp3|ogg]',
  A6:    'A6.[mp3|ogg]',
  C7:    'C7.[mp3|ogg]',
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
let _sampler = null
let _ready   = false
let _error   = null
let _mode    = 'sequential'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _trigger(note, duration, time) {
  if (!_sampler || !_ready) return
  const t = time !== undefined ? time : Tone.now()
  try {
    _sampler.triggerAttackRelease(note, duration, t)
  } catch (e) {
    console.warn('[audioEngine] playback error:', e.message)
  }
}

function _noteFromHz(hz) {
  return frequencyToSamplerNote(hz)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const LOAD_TIMEOUT_MS = 8000

const audioEngine = {
  init(onLoadError) {
    _error = null
    _ready = false

    return new Promise((resolve, reject) => {
      let settled = false

      function fail(message) {
        if (settled) return
        settled = true
        _error = message
        _ready = false
        const err = new Error(message)
        if (typeof onLoadError === 'function') onLoadError(message)
        reject(err)
      }

      // Timeout guard — if samples don't load within 8s, fail gracefully
      const timeout = setTimeout(() => {
        fail('Audio failed to load')
      }, LOAD_TIMEOUT_MS)

      try {
        _sampler = new Tone.Sampler({
          urls: SAMPLE_MAP,
          baseUrl: BASE_URL,
          onload: () => {
            if (settled) return
            settled = true
            clearTimeout(timeout)
            _ready = true
            resolve()
          },
          onerror: (err) => {
            clearTimeout(timeout)
            fail((err && err.message) ? err.message : 'Failed to load audio samples')
          },
        }).toDestination()
      } catch (err) {
        clearTimeout(timeout)
        fail((err && err.message) ? err.message : 'Failed to initialise audio engine')
      }
    })
  },

  isReady() {
    return _ready
  },

  getError() {
    return _error
  },

  playNote(frequency, duration) {
    if (!_ready) return
    _trigger(_noteFromHz(frequency), duration)
  },

  playSequential(rootHz, intervalHz) {
    if (!_ready) return
    const now     = Tone.now()
    const NOTE_DUR = 1.5
    const GAP      = 0.5
    _trigger(_noteFromHz(rootHz),     NOTE_DUR, now)
    _trigger(_noteFromHz(intervalHz), NOTE_DUR, now + NOTE_DUR + GAP)
  },

  playSustained(rootHz, intervalHz) {
    if (!_ready) return
    const now  = Tone.now()
    const HOLD = 3.0
    _trigger(_noteFromHz(rootHz),     HOLD, now)
    _trigger(_noteFromHz(intervalHz), HOLD, now)
  },

  playStacked(rootHz, intervalHz) {
    if (!_ready) return
    const now      = Tone.now()
    const NOTE_DUR = 1.0
    const TOGETHER = 2.0
    _trigger(_noteFromHz(rootHz),     NOTE_DUR, now)
    _trigger(_noteFromHz(intervalHz), NOTE_DUR, now + NOTE_DUR)
    _trigger(_noteFromHz(rootHz),     TOGETHER, now + NOTE_DUR * 2)
    _trigger(_noteFromHz(intervalHz), TOGETHER, now + NOTE_DUR * 2)
  },

  stopAll() {
    if (!_sampler) return
    try {
      _sampler.releaseAll()
    } catch (e) {
      console.warn('[audioEngine] stopAll error:', e.message)
    }
  },

  setMode(mode) {
    const valid = ['sequential', 'sustained', 'stacked']
    if (!valid.includes(mode)) {
      throw new Error(`Invalid mode "${mode}". Must be one of: ${valid.join(', ')}`)
    }
    _mode = mode
  },

  playInterval(rootHz, intervalHz) {
    if (!_ready) return
    switch (_mode) {
      case 'sequential': return this.playSequential(rootHz, intervalHz)
      case 'sustained':  return this.playSustained(rootHz, intervalHz)
      case 'stacked':    return this.playStacked(rootHz, intervalHz)
    }
  },
}

export default audioEngine
