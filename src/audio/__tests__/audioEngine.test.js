/**
 * audioEngine.test.js
 * Tests for the audio engine with Tone.js fully mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Tone.js — must use vi.mock at top level, factory refs via vi.hoisted
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  const triggerAttackRelease = vi.fn()
  const releaseAll           = vi.fn()
  let capturedOptions        = null
  let nowValue               = 0

  // Return a plain object; the Sampler class is defined below using `function`
  return {
    triggerAttackRelease,
    releaseAll,
    getCapturedOptions: () => capturedOptions,
    setCapturedOptions: (v) => { capturedOptions = v },
    getNow: () => nowValue,
    setNow: (v) => { nowValue = v },
  }
})

vi.mock('tone', () => {
  function Sampler(options) {
    mocks.setCapturedOptions(options)
    this.triggerAttackRelease = mocks.triggerAttackRelease
    this.releaseAll           = mocks.releaseAll
    this.toDestination        = () => this
  }

  return {
    Sampler,
    now: () => mocks.getNow(),
  }
})

// Import engine AFTER mock registration
import audioEngine from '../audioEngine.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function simulateLoad() {
  const opts = mocks.getCapturedOptions()
  if (opts && opts.onload) opts.onload()
}

function simulateError(msg = 'Network error') {
  const opts = mocks.getCapturedOptions()
  if (opts && opts.onerror) opts.onerror(new Error(msg))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mocks.setNow(0)
})

// ── init() ──────────────────────────────────────────────────────────────────

describe('init()', () => {
  it('passes the correct Salamander baseUrl', async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    expect(mocks.getCapturedOptions().baseUrl).toBe(
      'https://tonejs.github.io/audio/salamander/'
    )
  })

  it('passes required sample keys: C4, D#4, F#4, A4, C5', async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    const urls = mocks.getCapturedOptions().urls
    expect(urls).toHaveProperty('C4')
    expect(urls).toHaveProperty('D#4')
    expect(urls).toHaveProperty('F#4')
    expect(urls).toHaveProperty('A4')
    expect(urls).toHaveProperty('C5')
  })

  it('resolves on successful load', async () => {
    const p = audioEngine.init()
    simulateLoad()
    await expect(p).resolves.toBeUndefined()
  })

  it('rejects on load error', async () => {
    const p = audioEngine.init()
    simulateError('404 Not Found')
    await expect(p).rejects.toThrow('404 Not Found')
  })

  it('sets isReady() true after success', async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    expect(audioEngine.isReady()).toBe(true)
  })

  it('sets isReady() false after failure', async () => {
    const p = audioEngine.init()
    simulateError()
    await p.catch(() => {})
    expect(audioEngine.isReady()).toBe(false)
  })
})

// ── getError() ───────────────────────────────────────────────────────────────

describe('getError()', () => {
  it('returns null after successful init', async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    expect(audioEngine.getError()).toBeNull()
  })

  it('returns the error message after failed init', async () => {
    const p = audioEngine.init()
    simulateError('Samples unavailable')
    await p.catch(() => {})
    expect(audioEngine.getError()).toBe('Samples unavailable')
  })
})

// ── playSequential() ─────────────────────────────────────────────────────────

describe('playSequential()', () => {
  beforeEach(async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    mocks.setNow(0)
  })

  it('calls triggerAttackRelease exactly twice', () => {
    audioEngine.playSequential(440, 659.26)
    expect(mocks.triggerAttackRelease).toHaveBeenCalledTimes(2)
  })

  it('plays root note at time = now (0)', () => {
    audioEngine.playSequential(440, 659.26)
    const [, , t] = mocks.triggerAttackRelease.mock.calls[0]
    expect(t).toBe(0)
  })

  it('plays interval note after NOTE_DUR + GAP = 2.0 s', () => {
    audioEngine.playSequential(440, 659.26)
    const [, , t] = mocks.triggerAttackRelease.mock.calls[1]
    expect(t).toBeCloseTo(2.0, 3)
  })
})

// ── playSustained() ──────────────────────────────────────────────────────────

describe('playSustained()', () => {
  beforeEach(async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    mocks.setNow(0)
  })

  it('calls triggerAttackRelease exactly twice', () => {
    audioEngine.playSustained(440, 659.26)
    expect(mocks.triggerAttackRelease).toHaveBeenCalledTimes(2)
  })

  it('plays both notes at the same time', () => {
    audioEngine.playSustained(440, 659.26)
    const [, , t1] = mocks.triggerAttackRelease.mock.calls[0]
    const [, , t2] = mocks.triggerAttackRelease.mock.calls[1]
    expect(t1).toBe(t2)
  })
})

// ── playStacked() ────────────────────────────────────────────────────────────

describe('playStacked()', () => {
  beforeEach(async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    mocks.setNow(0)
  })

  it('calls triggerAttackRelease exactly four times', () => {
    audioEngine.playStacked(440, 659.26)
    expect(mocks.triggerAttackRelease).toHaveBeenCalledTimes(4)
  })

  it('follows timing: root@0, interval@1, both@2', () => {
    audioEngine.playStacked(440, 659.26)
    const times = mocks.triggerAttackRelease.mock.calls.map(([, , t]) => t)
    expect(times[0]).toBeCloseTo(0,   3)
    expect(times[1]).toBeCloseTo(1.0, 3)
    expect(times[2]).toBeCloseTo(2.0, 3)
    expect(times[3]).toBeCloseTo(2.0, 3)
  })
})

// ── setMode() + playInterval() ───────────────────────────────────────────────

describe('setMode() and playInterval()', () => {
  beforeEach(async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p
    mocks.setNow(0)
  })

  it('routes to playSequential: 2 triggers, second at 2.0 s', () => {
    audioEngine.setMode('sequential')
    audioEngine.playInterval(440, 659.26)
    expect(mocks.triggerAttackRelease).toHaveBeenCalledTimes(2)
    const [, , t] = mocks.triggerAttackRelease.mock.calls[1]
    expect(t).toBeCloseTo(2.0, 3)
  })

  it('routes to playSustained: 2 triggers at same time', () => {
    audioEngine.setMode('sustained')
    audioEngine.playInterval(440, 659.26)
    expect(mocks.triggerAttackRelease).toHaveBeenCalledTimes(2)
    const [, , t1] = mocks.triggerAttackRelease.mock.calls[0]
    const [, , t2] = mocks.triggerAttackRelease.mock.calls[1]
    expect(t1).toBe(t2)
  })

  it('routes to playStacked: 4 triggers', () => {
    audioEngine.setMode('stacked')
    audioEngine.playInterval(440, 659.26)
    expect(mocks.triggerAttackRelease).toHaveBeenCalledTimes(4)
  })

  it('setMode persists: calling twice accumulates correctly', () => {
    audioEngine.setMode('stacked')
    audioEngine.playInterval(440, 659.26)
    audioEngine.playInterval(440, 659.26)
    expect(mocks.triggerAttackRelease).toHaveBeenCalledTimes(8)
  })

  it('throws for an unrecognised mode', () => {
    expect(() => audioEngine.setMode('arpeggio')).toThrow()
  })
})

// ── no-op when not ready ─────────────────────────────────────────────────────

describe('no-op when not ready', () => {
  beforeEach(async () => {
    const p = audioEngine.init()
    simulateError('bad load')
    await p.catch(() => {})
    vi.clearAllMocks()  // clear the constructor call counts
  })

  it('playInterval does not call triggerAttackRelease', () => {
    audioEngine.playInterval(440, 659.26)
    expect(mocks.triggerAttackRelease).not.toHaveBeenCalled()
  })

  it('playNote does not call triggerAttackRelease', () => {
    audioEngine.playNote(440, 1)
    expect(mocks.triggerAttackRelease).not.toHaveBeenCalled()
  })

  it('playSequential does not call triggerAttackRelease', () => {
    audioEngine.playSequential(440, 659.26)
    expect(mocks.triggerAttackRelease).not.toHaveBeenCalled()
  })
})

// ── stopAll() ────────────────────────────────────────────────────────────────

describe('stopAll()', () => {
  it('calls releaseAll when the engine is ready', async () => {
    const p = audioEngine.init()
    simulateLoad()
    await p

    audioEngine.stopAll()
    expect(mocks.releaseAll).toHaveBeenCalledOnce()
  })
})
