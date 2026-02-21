/**
 * SessionScreen.test.jsx
 * All heavy dependencies (audioEngine, useQuizSession, storage) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SessionScreen from '../SessionScreen.jsx'

// ─── Mock react-router-dom navigate ──────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ─── Mock storage ─────────────────────────────────────────────────────────────

vi.mock('../../storage/settingsStore.js', () => ({
  getSetting: vi.fn(),
}))
import { getSetting } from '../../storage/settingsStore.js'

// ─── Mock intervalStatsStore ──────────────────────────────────────────────────

vi.mock('../../storage/intervalStatsStore.js', () => ({
  getAllIntervalStats: vi.fn(),
}))
import { getAllIntervalStats } from '../../storage/intervalStatsStore.js'

// ─── Mock phaseProgression ────────────────────────────────────────────────────

vi.mock('../../logic/phaseProgression.js', async () => {
  const actual = await vi.importActual('../../logic/phaseProgression.js')
  return {
    ...actual,
    getActiveIntervalsForPhase: vi.fn(actual.getActiveIntervalsForPhase),
  }
})
import { getActiveIntervalsForPhase } from '../../logic/phaseProgression.js'

// ─── Mock audio engine ────────────────────────────────────────────────────────

vi.mock('../../audio/audioEngine.js', () => ({
  default: {
    init:             vi.fn(),
    isReady:          vi.fn(),
    getError:         vi.fn(),
    setMode:          vi.fn(),
    playInterval:     vi.fn(),
    playCurrentQuestion: vi.fn(),
  },
}))
import audioEngine from '../../audio/audioEngine.js'

// ─── Mock useQuizSession ──────────────────────────────────────────────────────

vi.mock('../../hooks/useQuizSession.js', () => ({
  useQuizSession: vi.fn(),
}))
import { useQuizSession } from '../../hooks/useQuizSession.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_INTERVALS = [
  { id: 'root',          displayName: 'Root (Unison)',  name: 'Root',          semitones: 0, phase: 1 },
  { id: 'perfect_fifth', displayName: 'Perfect 5th',   name: 'Perfect Fifth', semitones: 7, phase: 1 },
  { id: 'perfect_fourth',displayName: 'Perfect 4th',   name: 'Perfect Fourth',semitones: 5, phase: 1 },
]

const MOCK_QUESTIONS = [
  { key: 'C', intervalId: 'perfect_fifth',  rootHz: 261.63, intervalHz: 392.00 },
  { key: 'G', intervalId: 'root',           rootHz: 392.00, intervalHz: 392.00 },
  { key: 'A', intervalId: 'perfect_fourth', rootHz: 440.00, intervalHz: 587.33 },
]

/** Build a mock quiz session object */
function makeMockQuiz(overrides = {}) {
  return {
    questions:          MOCK_QUESTIONS,
    currentIndex:       0,
    phase:              'answering',
    selectedAnswer:     null,
    isCorrect:          null,
    retryUsed:          false,
    sessionResults:     [],
    startSession:       vi.fn(),
    playCurrentQuestion: vi.fn(),
    submitAnswer:       vi.fn(),
    advanceToNext:      vi.fn(),
    getCurrentQuestion: vi.fn(() => MOCK_QUESTIONS[0]),
    getAnswerChoices:   vi.fn(() => MOCK_INTERVALS),
    ...overrides,
  }
}

// ─── Setup helpers ────────────────────────────────────────────────────────────

function setupDefaultMocks(quizOverrides = {}) {
  // Storage: fast-resolve defaults
  getSetting.mockImplementation((key, def) => Promise.resolve(def))
  getAllIntervalStats.mockResolvedValue([])

  // Audio: init resolves immediately
  audioEngine.init.mockResolvedValue(undefined)
  audioEngine.isReady.mockReturnValue(true)
  audioEngine.getError.mockReturnValue(null)

  // Hook: return controllable mock
  const mockQuiz = makeMockQuiz(quizOverrides)
  useQuizSession.mockReturnValue(mockQuiz)
  return mockQuiz
}

function renderSession() {
  return render(
    <MemoryRouter>
      <SessionScreen />
    </MemoryRouter>
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('shows loading screen while audio initialises', async () => {
    // Audio init never resolves → stays in loading
    getSetting.mockImplementation((key, def) => Promise.resolve(def))
    audioEngine.init.mockReturnValue(new Promise(() => {}))
    useQuizSession.mockReturnValue(makeMockQuiz({ phase: 'idle' }))

    renderSession()
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument()
  })

  it('shows loading text while initialising', async () => {
    getSetting.mockImplementation((key, def) => Promise.resolve(def))
    audioEngine.init.mockReturnValue(new Promise(() => {}))
    useQuizSession.mockReturnValue(makeMockQuiz({ phase: 'idle' }))

    renderSession()
    expect(screen.getByText(/loading audio/i)).toBeInTheDocument()
  })

  it('transitions out of loading once audio is ready', async () => {
    setupDefaultMocks()

    renderSession()
    await waitFor(() =>
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument()
    )
  })
})

// ── Session renders correctly ─────────────────────────────────────────────────

describe('active session UI', () => {
  it('renders answer buttons once session starts', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('answer-grid')).toBeInTheDocument()
    )

    expect(screen.getByTestId('answer-root')).toBeInTheDocument()
    expect(screen.getByTestId('answer-perfect_fifth')).toBeInTheDocument()
    expect(screen.getByTestId('answer-perfect_fourth')).toBeInTheDocument()
  })

  it('renders interval display names on buttons', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() =>
      expect(screen.getByText('Root (Unison)')).toBeInTheDocument()
    )
    expect(screen.getByText('Perfect 5th')).toBeInTheDocument()
    expect(screen.getByText('Perfect 4th')).toBeInTheDocument()
  })

  it('renders progress text', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('progress-text')).toBeInTheDocument()
    )
    expect(screen.getByTestId('progress-text')).toHaveTextContent('Question 1 of 3')
  })

  it('renders the play button', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('play-btn')).toBeInTheDocument()
    )
  })

  it('calls startSession once audio is ready', async () => {
    const mockQuiz = setupDefaultMocks()
    renderSession()

    await waitFor(() =>
      expect(mockQuiz.startSession).toHaveBeenCalledOnce()
    )
  })

  it('calls playCurrentQuestion when play button clicked', async () => {
    const mockQuiz = setupDefaultMocks()
    renderSession()

    await waitFor(() => screen.getByTestId('play-btn'))
    await userEvent.click(screen.getByTestId('play-btn'))

    expect(mockQuiz.playCurrentQuestion).toHaveBeenCalled()
  })
})

// ── Correct answer feedback ───────────────────────────────────────────────────

describe('correct answer feedback', () => {
  it('shows "Correct!" message after correct answer', async () => {
    setupDefaultMocks({
      phase:          'feedback',
      isCorrect:      true,
      selectedAnswer: 'perfect_fifth',
      retryUsed:      false,
    })

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('feedback-message')).toHaveTextContent('Correct!')
    )
  })

  it('answer buttons are disabled after submitting', async () => {
    setupDefaultMocks({
      phase:          'feedback',
      isCorrect:      true,
      selectedAnswer: 'perfect_fifth',
    })

    renderSession()

    await waitFor(() => screen.getByTestId('answer-root'))
    expect(screen.getByTestId('answer-root')).toBeDisabled()
    expect(screen.getByTestId('answer-perfect_fifth')).toBeDisabled()
  })

  it('calls submitAnswer with the clicked interval id', async () => {
    const mockQuiz = setupDefaultMocks()
    renderSession()

    await waitFor(() => screen.getByTestId('answer-root'))
    await userEvent.click(screen.getByTestId('answer-root'))

    expect(mockQuiz.submitAnswer).toHaveBeenCalledWith('root')
  })
})

// ── Wrong answer feedback ─────────────────────────────────────────────────────

describe('wrong answer feedback', () => {
  it('shows "Try Again!" when wrong answer with retry available', async () => {
    setupDefaultMocks({
      phase:          'feedback',
      isCorrect:      false,
      selectedAnswer: 'root',
      retryUsed:      true,   // retryUsed flips true immediately after first wrong
    })

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('feedback-message')).toHaveTextContent('Try Again!')
    )
  })

  it('disables all answer buttons after wrong answer', async () => {
    setupDefaultMocks({
      phase:          'feedback',
      isCorrect:      false,
      selectedAnswer: 'root',
      retryUsed:      true,
    })

    renderSession()

    await waitFor(() => screen.getByTestId('answer-root'))
    expect(screen.getByTestId('answer-root')).toBeDisabled()
    expect(screen.getByTestId('answer-perfect_fifth')).toBeDisabled()
  })

  it('no feedback message shown during answering phase', async () => {
    setupDefaultMocks({ phase: 'answering' })
    renderSession()

    await waitFor(() => screen.getByTestId('feedback-message'))
    expect(screen.getByTestId('feedback-message')).toHaveTextContent('')
  })
})

// ── Session completion ────────────────────────────────────────────────────────

describe('session completion', () => {
  it('navigates to /summary when onSessionComplete fires', async () => {
    // Capture the onSessionComplete callback passed to useQuizSession
    let capturedCallback
    useQuizSession.mockImplementation((config) => {
      capturedCallback = config.onSessionComplete
      return makeMockQuiz()
    })
    getSetting.mockImplementation((key, def) => Promise.resolve(def))
    audioEngine.init.mockResolvedValue(undefined)

    renderSession()

    // Wait for the hook to be called with onSessionComplete
    await waitFor(() => expect(capturedCallback).toBeDefined())

    const results = {
      questions: MOCK_QUESTIONS,
      results: [{ intervalId: 'perfect_fifth', correct: true, usedRetry: false }],
      score: 1,
      total: 1,
      intervalBreakdown: { perfect_fifth: { correct: 1, total: 1 } },
    }

    act(() => capturedCallback(results))

    expect(mockNavigate).toHaveBeenCalledWith('/summary', {
      state: { sessionResults: results },
    })
  })
})

// ── Quit modal ────────────────────────────────────────────────────────────────

describe('quit modal', () => {
  it('shows quit confirmation modal when Quit clicked', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() => screen.getByTestId('quit-btn'))
    await userEvent.click(screen.getByTestId('quit-btn'))

    expect(screen.getByText(/quit session/i)).toBeInTheDocument()
  })

  it('navigates to / when "Yes, Quit" confirmed', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() => screen.getByTestId('quit-btn'))
    await userEvent.click(screen.getByTestId('quit-btn'))
    await userEvent.click(screen.getByRole('button', { name: /yes, quit/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('closes modal without navigating when "Keep Playing" clicked', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() => screen.getByTestId('quit-btn'))
    await userEvent.click(screen.getByTestId('quit-btn'))
    await userEvent.click(screen.getByRole('button', { name: /keep playing/i }))

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.queryByText(/quit session/i)).not.toBeInTheDocument()
  })
})

// ── Audio setup ───────────────────────────────────────────────────────────────

describe('audio setup', () => {
  it('calls audioEngine.init() on mount', async () => {
    setupDefaultMocks()
    renderSession()

    await waitFor(() => expect(audioEngine.init).toHaveBeenCalledOnce())
  })

  it('calls audioEngine.setMode with loaded playbackMode setting', async () => {
    getSetting.mockImplementation((key, def) => {
      if (key === 'playbackMode') return Promise.resolve('sustained')
      return Promise.resolve(def)
    })
    audioEngine.init.mockResolvedValue(undefined)
    useQuizSession.mockReturnValue(makeMockQuiz())

    renderSession()

    await waitFor(() =>
      expect(audioEngine.setMode).toHaveBeenCalledWith('sustained')
    )
  })

  it('shows AudioErrorBanner when audioEngine.init() rejects', async () => {
    getSetting.mockImplementation((key, def) => Promise.resolve(def))
    getAllIntervalStats.mockResolvedValue([])
    audioEngine.init.mockRejectedValue(new Error('Audio context blocked'))
    audioEngine.getError.mockReturnValue('Audio context blocked')
    audioEngine.isReady.mockReturnValue(false)
    useQuizSession.mockReturnValue(makeMockQuiz({ phase: 'answering' }))

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('audio-error-banner')).toBeInTheDocument()
    )
    expect(screen.getByTestId('audio-error-banner')).toHaveTextContent('Audio context blocked')
  })

  it('shows AudioErrorBanner with retry button when audio fails', async () => {
    getSetting.mockImplementation((key, def) => Promise.resolve(def))
    getAllIntervalStats.mockResolvedValue([])
    audioEngine.init.mockRejectedValue(new Error('Network timeout'))
    audioEngine.getError.mockReturnValue('Network timeout')
    audioEngine.isReady.mockReturnValue(false)
    useQuizSession.mockReturnValue(makeMockQuiz({ phase: 'answering' }))

    renderSession()

    await waitFor(() =>
      expect(screen.getByTestId('audio-error-banner')).toBeInTheDocument()
    )
    expect(screen.getByTestId('audio-retry-btn')).toBeInTheDocument()
  })
})

// ── Adaptive interval loading ─────────────────────────────────────────────────

describe('adaptive interval stats loading', () => {
  it('calls getAllIntervalStats on mount', async () => {
    setupDefaultMocks()
    renderSession()
    await waitFor(() => expect(getAllIntervalStats).toHaveBeenCalledOnce())
  })

  it('passes intervalStats from storage into useQuizSession config', async () => {
    const mockStats = [
      { intervalId: 'root',          accuracy: 0.9 },
      { intervalId: 'perfect_fifth', accuracy: 0.3 },
    ]
    getAllIntervalStats.mockResolvedValue(mockStats)
    getSetting.mockImplementation((key, def) => Promise.resolve(def))
    audioEngine.init.mockResolvedValue(undefined)
    useQuizSession.mockReturnValue(makeMockQuiz())

    renderSession()

    await waitFor(() => {
      const calls = useQuizSession.mock.calls
      const lastConfig = calls[calls.length - 1][0]
      expect(lastConfig.intervalStats).toEqual(mockStats)
    })
  })

  it('passes empty intervalStats when storage returns empty array', async () => {
    getAllIntervalStats.mockResolvedValue([])
    getSetting.mockImplementation((key, def) => Promise.resolve(def))
    audioEngine.init.mockResolvedValue(undefined)
    useQuizSession.mockReturnValue(makeMockQuiz())

    renderSession()

    await waitFor(() => {
      const calls = useQuizSession.mock.calls
      const lastConfig = calls[calls.length - 1][0]
      expect(lastConfig.intervalStats).toEqual([])
    })
  })
})

// ── getActiveIntervalsForPhase integration ────────────────────────────────────

describe('interval resolution via getActiveIntervalsForPhase', () => {
  it('calls getActiveIntervalsForPhase with currentPhase and stored activeIntervalIds', async () => {
    const mockActiveIds = ['root', 'perfect_fifth']
    getSetting.mockImplementation((key, def) => {
      if (key === 'currentPhase')      return Promise.resolve(2)
      if (key === 'activeIntervalIds') return Promise.resolve(mockActiveIds)
      return Promise.resolve(def)
    })
    getAllIntervalStats.mockResolvedValue([])
    audioEngine.init.mockResolvedValue(undefined)
    useQuizSession.mockReturnValue(makeMockQuiz())

    renderSession()

    await waitFor(() =>
      expect(getActiveIntervalsForPhase).toHaveBeenCalledWith(2, mockActiveIds)
    )
  })

  it('passes intervalIds from getActiveIntervalsForPhase result into useQuizSession', async () => {
    // Phase 1 with no custom IDs → getActiveIntervalsForPhase returns all phase 1 intervals
    getSetting.mockImplementation((key, def) => {
      if (key === 'currentPhase') return Promise.resolve(1)
      return Promise.resolve(def)
    })
    getAllIntervalStats.mockResolvedValue([])
    audioEngine.init.mockResolvedValue(undefined)
    useQuizSession.mockReturnValue(makeMockQuiz())

    renderSession()

    await waitFor(() => {
      const calls = useQuizSession.mock.calls
      const lastConfig = calls[calls.length - 1][0]
      // Phase 1 intervals: root, perfect_fifth, perfect_fourth
      expect(lastConfig.intervalIds).toContain('root')
      expect(lastConfig.intervalIds).toContain('perfect_fifth')
      expect(lastConfig.intervalIds).toContain('perfect_fourth')
    })
  })

  it('uses custom activeIntervalIds when they are valid phase intervals', async () => {
    const custom = ['root', 'perfect_fifth']
    getSetting.mockImplementation((key, def) => {
      if (key === 'currentPhase')      return Promise.resolve(1)
      if (key === 'activeIntervalIds') return Promise.resolve(custom)
      return Promise.resolve(def)
    })
    getAllIntervalStats.mockResolvedValue([])
    audioEngine.init.mockResolvedValue(undefined)
    useQuizSession.mockReturnValue(makeMockQuiz())

    renderSession()

    await waitFor(() => {
      const calls = useQuizSession.mock.calls
      const lastConfig = calls[calls.length - 1][0]
      expect(lastConfig.intervalIds).toEqual(['root', 'perfect_fifth'])
    })
  })
})
