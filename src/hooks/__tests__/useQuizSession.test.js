/**
 * useQuizSession.test.js
 * Tests for the useQuizSession hook.
 * Audio engine is mocked — no real audio plays.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuizSession } from '../useQuizSession.js'

// ─── fixtures ─────────────────────────────────────────────────────────────────

const INTERVAL_IDS = ['root', 'perfect_fifth', 'perfect_fourth']
const KEYS         = ['C', 'G', 'A']
const SESSION_LEN  = 3

function makeMockAudio() {
  return { playInterval: vi.fn() }
}

function makeConfig(overrides = {}) {
  return {
    intervalIds:       INTERVAL_IDS,
    keys:              KEYS,
    sessionLength:     SESSION_LEN,
    audioEngine:       makeMockAudio(),
    onSessionComplete: vi.fn(),
    ...overrides,
  }
}

// ── helper: render hook, call startSession, flush microtasks ─────────────────

async function startedHook(overrides = {}) {
  const config = makeConfig(overrides)
  const { result } = renderHook(() => useQuizSession(config))

  await act(async () => {
    result.current.startSession()
  })

  return { result, config }
}

// ── helper: answer a question correctly ──────────────────────────────────────

async function answerCorrectly(result) {
  const correctId = result.current.questions[result.current.currentIndex].intervalId
  await act(async () => {
    result.current.submitAnswer(correctId)
  })
  return correctId
}

// ── helper: answer wrong (picks first ID that isn't the correct answer) ───────

function wrongId(result) {
  const correctId = result.current.questions[result.current.currentIndex].intervalId
  return INTERVAL_IDS.find(id => id !== correctId)
}

async function answerWrong(result) {
  const id = wrongId(result)
  await act(async () => {
    result.current.submitAnswer(id)
  })
  return id
}

// ─── tests ────────────────────────────────────────────────────────────────────

// ── idle / initial state ──────────────────────────────────────────────────────

describe('initial state (before startSession)', () => {
  it('phase is "idle"', () => {
    const { result } = renderHook(() => useQuizSession(makeConfig()))
    expect(result.current.phase).toBe('idle')
  })

  it('questions is empty array', () => {
    const { result } = renderHook(() => useQuizSession(makeConfig()))
    expect(result.current.questions).toEqual([])
  })

  it('currentIndex is 0', () => {
    const { result } = renderHook(() => useQuizSession(makeConfig()))
    expect(result.current.currentIndex).toBe(0)
  })

  it('selectedAnswer and isCorrect are null', () => {
    const { result } = renderHook(() => useQuizSession(makeConfig()))
    expect(result.current.selectedAnswer).toBeNull()
    expect(result.current.isCorrect).toBeNull()
  })

  it('retryUsed is false', () => {
    const { result } = renderHook(() => useQuizSession(makeConfig()))
    expect(result.current.retryUsed).toBe(false)
  })

  it('getCurrentQuestion returns null', () => {
    const { result } = renderHook(() => useQuizSession(makeConfig()))
    expect(result.current.getCurrentQuestion()).toBeNull()
  })
})

// ── startSession ──────────────────────────────────────────────────────────────

describe('startSession()', () => {
  it('sets phase to "answering"', async () => {
    const { result } = await startedHook()
    expect(result.current.phase).toBe('answering')
  })

  it('currentIndex is 0', async () => {
    const { result } = await startedHook()
    expect(result.current.currentIndex).toBe(0)
  })

  it('generates sessionLength questions', async () => {
    const { result } = await startedHook()
    expect(result.current.questions).toHaveLength(SESSION_LEN)
  })

  it('each question has key, intervalId, rootHz, intervalHz', async () => {
    const { result } = await startedHook()
    for (const q of result.current.questions) {
      expect(q).toHaveProperty('key')
      expect(q).toHaveProperty('intervalId')
      expect(q).toHaveProperty('rootHz')
      expect(q).toHaveProperty('intervalHz')
    }
  })

  it('calls audioEngine.playInterval for the first question', async () => {
    const config = makeConfig()
    const { result } = renderHook(() => useQuizSession(config))
    await act(async () => { result.current.startSession() })
    expect(config.audioEngine.playInterval).toHaveBeenCalledOnce()
  })

  it('getCurrentQuestion returns question 0 after start', async () => {
    const { result } = await startedHook()
    const q = result.current.getCurrentQuestion()
    expect(q).not.toBeNull()
    expect(q).toEqual(result.current.questions[0])
  })
})

// ── correct answer ─────────────────────────────────────────────────────────────

describe('submitAnswer() — correct answer', () => {
  it('advances currentIndex to 1', async () => {
    const { result } = await startedHook()
    await answerCorrectly(result)
    expect(result.current.currentIndex).toBe(1)
  })

  it('phase becomes "answering" for next question', async () => {
    const { result } = await startedHook()
    await answerCorrectly(result)
    expect(result.current.phase).toBe('answering')
  })

  it('records correct:true in sessionResults', async () => {
    const { result } = await startedHook()
    await answerCorrectly(result)
    expect(result.current.sessionResults).toHaveLength(1)
    expect(result.current.sessionResults[0].correct).toBe(true)
  })

  it('records usedRetry:false on first-try correct answer', async () => {
    const { result } = await startedHook()
    await answerCorrectly(result)
    expect(result.current.sessionResults[0].usedRetry).toBe(false)
  })

  it('resets selectedAnswer and isCorrect for next question', async () => {
    const { result } = await startedHook()
    await answerCorrectly(result)
    expect(result.current.selectedAnswer).toBeNull()
    expect(result.current.isCorrect).toBeNull()
  })

  it('plays audio for the next question after advancing', async () => {
    const config = makeConfig()
    const { result } = renderHook(() => useQuizSession(config))
    await act(async () => { result.current.startSession() })

    await act(async () => {
      const correctId = result.current.questions[0].intervalId
      result.current.submitAnswer(correctId)
    })

    // 1 for start + 1 for next question = 2
    expect(config.audioEngine.playInterval).toHaveBeenCalledTimes(2)
  })
})

// ── wrong answer (first attempt, retry available) ─────────────────────────────

describe('submitAnswer() — wrong answer (retry available)', () => {
  it('does NOT advance currentIndex', async () => {
    const { result } = await startedHook()
    await answerWrong(result)
    expect(result.current.currentIndex).toBe(0)
  })

  it('phase becomes "feedback"', async () => {
    const { result } = await startedHook()
    await answerWrong(result)
    expect(result.current.phase).toBe('feedback')
  })

  it('retryUsed becomes true', async () => {
    const { result } = await startedHook()
    await answerWrong(result)
    expect(result.current.retryUsed).toBe(true)
  })

  it('isCorrect becomes false', async () => {
    const { result } = await startedHook()
    await answerWrong(result)
    expect(result.current.isCorrect).toBe(false)
  })

  it('selectedAnswer is set to the wrong id', async () => {
    const { result } = await startedHook()
    const id = wrongId(result)
    await act(async () => { result.current.submitAnswer(id) })
    expect(result.current.selectedAnswer).toBe(id)
  })

  it('does NOT add to sessionResults yet', async () => {
    const { result } = await startedHook()
    await answerWrong(result)
    expect(result.current.sessionResults).toHaveLength(0)
  })

  it('replays audio (playInterval called a second time)', async () => {
    const config = makeConfig()
    const { result } = renderHook(() => useQuizSession(config))
    await act(async () => { result.current.startSession() })

    await act(async () => {
      const id = INTERVAL_IDS.find(
        id => id !== result.current.questions[0].intervalId
      )
      result.current.submitAnswer(id)
    })

    // 1 for start + 1 for retry replay
    expect(config.audioEngine.playInterval).toHaveBeenCalledTimes(2)
  })
})

// ── second wrong answer (retry used) ─────────────────────────────────────────

describe('submitAnswer() — second wrong answer (retry used)', () => {
  async function twoWrongAnswers() {
    const { result, config } = await startedHook()
    await answerWrong(result) // first wrong → retryUsed = true
    await answerWrong(result) // second wrong → advance
    return { result, config }
  }

  it('advances currentIndex to 1', async () => {
    const { result } = await twoWrongAnswers()
    expect(result.current.currentIndex).toBe(1)
  })

  it('records correct:false in sessionResults', async () => {
    const { result } = await twoWrongAnswers()
    expect(result.current.sessionResults[0].correct).toBe(false)
  })

  it('records usedRetry:true in sessionResults', async () => {
    const { result } = await twoWrongAnswers()
    expect(result.current.sessionResults[0].usedRetry).toBe(true)
  })

  it('sessionResults has exactly 1 entry', async () => {
    const { result } = await twoWrongAnswers()
    expect(result.current.sessionResults).toHaveLength(1)
  })

  it('phase returns to "answering"', async () => {
    const { result } = await twoWrongAnswers()
    expect(result.current.phase).toBe('answering')
  })
})

// ── session completion ────────────────────────────────────────────────────────

describe('session completion', () => {
  async function completeAllCorrectly(config) {
    const { result } = renderHook(() => useQuizSession(config))
    await act(async () => { result.current.startSession() })

    for (let i = 0; i < SESSION_LEN; i++) {
      await answerCorrectly(result)
    }
    return result
  }

  it('phase becomes "complete"', async () => {
    const config = makeConfig()
    const result = await completeAllCorrectly(config)
    expect(result.current.phase).toBe('complete')
  })

  it('calls onSessionComplete exactly once', async () => {
    const config = makeConfig()
    await completeAllCorrectly(config)
    expect(config.onSessionComplete).toHaveBeenCalledOnce()
  })

  it('payload has questions, results, score, total, intervalBreakdown', async () => {
    const config = makeConfig()
    await completeAllCorrectly(config)
    const payload = config.onSessionComplete.mock.calls[0][0]
    expect(payload).toHaveProperty('questions')
    expect(payload).toHaveProperty('results')
    expect(payload).toHaveProperty('score')
    expect(payload).toHaveProperty('total')
    expect(payload).toHaveProperty('intervalBreakdown')
  })

  it('score and total equal SESSION_LEN when all correct', async () => {
    const config = makeConfig()
    await completeAllCorrectly(config)
    const { score, total } = config.onSessionComplete.mock.calls[0][0]
    expect(score).toBe(SESSION_LEN)
    expect(total).toBe(SESSION_LEN)
  })

  it('results has one entry per question', async () => {
    const config = makeConfig()
    await completeAllCorrectly(config)
    const { results } = config.onSessionComplete.mock.calls[0][0]
    expect(results).toHaveLength(SESSION_LEN)
  })

  it('intervalBreakdown entries have correct and total fields', async () => {
    const config = makeConfig()
    await completeAllCorrectly(config)
    const { intervalBreakdown } = config.onSessionComplete.mock.calls[0][0]
    for (const key of Object.keys(intervalBreakdown)) {
      expect(INTERVAL_IDS).toContain(key)
      expect(intervalBreakdown[key]).toHaveProperty('correct')
      expect(intervalBreakdown[key]).toHaveProperty('total')
    }
  })

  it('sessionResults on hook equals results in callback', async () => {
    const config = makeConfig()
    const result = await completeAllCorrectly(config)
    const { results } = config.onSessionComplete.mock.calls[0][0]
    expect(result.current.sessionResults).toEqual(results)
  })
})

// ── getAnswerChoices ──────────────────────────────────────────────────────────

describe('getAnswerChoices()', () => {
  it('returns one entry per active intervalId', async () => {
    const { result } = await startedHook()
    expect(result.current.getAnswerChoices()).toHaveLength(INTERVAL_IDS.length)
  })

  it('each choice has id, name, semitones, phase, displayName', async () => {
    const { result } = await startedHook()
    for (const c of result.current.getAnswerChoices()) {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('semitones')
      expect(c).toHaveProperty('phase')
      expect(c).toHaveProperty('displayName')
    }
  })

  it('contains all active interval ids', async () => {
    const { result } = await startedHook()
    const choiceIds = result.current.getAnswerChoices().map(c => c.id)
    for (const id of INTERVAL_IDS) {
      expect(choiceIds).toContain(id)
    }
  })
})

// ── advanceToNext ─────────────────────────────────────────────────────────────

describe('advanceToNext()', () => {
  it('moves currentIndex forward', async () => {
    const { result } = await startedHook()
    await act(async () => { result.current.advanceToNext() })
    expect(result.current.currentIndex).toBe(1)
  })

  it('completes session when called on last question', async () => {
    const config = makeConfig()
    const { result } = renderHook(() => useQuizSession(config))
    await act(async () => { result.current.startSession() })

    // advance past all questions
    for (let i = 0; i < SESSION_LEN; i++) {
      await act(async () => { result.current.advanceToNext() })
    }

    expect(result.current.phase).toBe('complete')
    expect(config.onSessionComplete).toHaveBeenCalledOnce()
  })
})

// ── playCurrentQuestion ───────────────────────────────────────────────────────

describe('playCurrentQuestion()', () => {
  it('calls audioEngine.playInterval with current question frequencies', async () => {
    const config = makeConfig()
    const { result } = renderHook(() => useQuizSession(config))
    await act(async () => { result.current.startSession() })

    config.audioEngine.playInterval.mockClear()

    await act(async () => { result.current.playCurrentQuestion() })

    const q = result.current.questions[0]
    expect(config.audioEngine.playInterval).toHaveBeenCalledWith(q.rootHz, q.intervalHz)
  })
})

// ── Adaptive weighting ────────────────────────────────────────────────────────
// Mock both generators at the module level so we can assert which was called.

vi.mock('../../logic/questionGenerator.js', async () => {
  const actual = await vi.importActual('../../logic/questionGenerator.js')
  return {
    ...actual,
    generateSession:         vi.fn(actual.generateSession),
    generateAdaptiveSession: vi.fn(actual.generateAdaptiveSession),
  }
})

import {
  generateSession,
  generateAdaptiveSession,
} from '../../logic/questionGenerator.js'

describe('adaptive weighting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-wrap with real implementations so questions are valid
    generateSession.mockImplementation(
      (...args) => {
        const real = vi.importActual('../../logic/questionGenerator.js')
        // Call the real function via dynamic require for correct types
        const { generateSession: realGen } = require('../../logic/questionGenerator.js')
        return realGen(...args)
      }
    )
  })

  it('calls generateAdaptiveSession when intervalStats is non-empty', async () => {
    const stats = [
      { intervalId: 'root',          accuracy: 0.9 },
      { intervalId: 'perfect_fifth', accuracy: 0.4 },
    ]

    await startedHook({ intervalStats: stats })

    expect(generateAdaptiveSession).toHaveBeenCalledOnce()
    expect(generateSession).not.toHaveBeenCalled()
  })

  it('calls generateSession when intervalStats is empty array', async () => {
    await startedHook({ intervalStats: [] })

    expect(generateSession).toHaveBeenCalledOnce()
    expect(generateAdaptiveSession).not.toHaveBeenCalled()
  })

  it('calls generateSession when intervalStats is not provided', async () => {
    await startedHook({ intervalStats: undefined })

    expect(generateSession).toHaveBeenCalledOnce()
    expect(generateAdaptiveSession).not.toHaveBeenCalled()
  })

  it('passes intervalStats to generateAdaptiveSession', async () => {
    const stats = [{ intervalId: 'root', accuracy: 0.8 }]

    await startedHook({ intervalStats: stats })

    expect(generateAdaptiveSession).toHaveBeenCalledWith(
      INTERVAL_IDS,
      KEYS,
      SESSION_LEN,
      stats
    )
  })
})
