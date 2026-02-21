/**
 * SummaryScreen.test.jsx
 * All storage modules mocked. Uses MemoryRouter with initialEntries to inject
 * location.state without needing a real navigation sequence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SummaryScreen from '../SummaryScreen.jsx'

// ─── Mock react-router-dom navigate ──────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ─── Mock storage modules ─────────────────────────────────────────────────────

vi.mock('../../storage/sessionStore.js', () => ({
  saveSession:        vi.fn(),
  getRecentSessions:  vi.fn(),
}))
vi.mock('../../storage/intervalStatsStore.js', () => ({
  updateIntervalStat: vi.fn(),
}))
vi.mock('../../storage/settingsStore.js', () => ({
  getSetting:  vi.fn(),
  saveSetting: vi.fn(),
}))

import { saveSession, getRecentSessions }  from '../../storage/sessionStore.js'
import { updateIntervalStat }              from '../../storage/intervalStatsStore.js'
import { getSetting, saveSetting }         from '../../storage/settingsStore.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const RESULTS_3_CORRECT = [
  { intervalId: 'perfect_fifth',  correct: true,  usedRetry: false },
  { intervalId: 'perfect_fourth', correct: true,  usedRetry: false },
  { intervalId: 'root',           correct: false, usedRetry: true  },
]

const BREAKDOWN_3 = {
  perfect_fifth:  { correct: 2, total: 2 },
  perfect_fourth: { correct: 1, total: 1 },
  root:           { correct: 0, total: 1 },
}

/** Session state passed via router location */
function makeState({ score = 3, total = 5, breakdown = BREAKDOWN_3, results = RESULTS_3_CORRECT } = {}) {
  return {
    sessionResults: {
      score,
      total,
      intervalBreakdown: breakdown,
      results,
    },
  }
}

// ─── Render helpers ───────────────────────────────────────────────────────────

/**
 * Renders SummaryScreen inside a MemoryRouter that starts at /summary with
 * the given location state, matching how SessionScreen navigates to it.
 */
function renderSummary(state = makeState()) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/summary', state }]}>
      <Routes>
        <Route path="/summary" element={<SummaryScreen />} />
        <Route path="/"        element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ─── Default mock setup ───────────────────────────────────────────────────────

function setupDefaultMocks() {
  saveSession.mockResolvedValue(1)
  updateIntervalStat.mockResolvedValue(undefined)
  getRecentSessions.mockResolvedValue([
    { id: 1, score: 3, total: 5, date: '2024-01-01T00:00:00.000Z' },
  ])
  getSetting.mockImplementation((key, def) => {
    if (key === 'currentPhase') return Promise.resolve(1)
    return Promise.resolve(def)
  })
  saveSetting.mockResolvedValue(undefined)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  setupDefaultMocks()
})

// ── Score display ─────────────────────────────────────────────────────────────

describe('score display', () => {
  it('renders score from location state', async () => {
    renderSummary(makeState({ score: 4, total: 5 }))
    const display = await screen.findByTestId('score-display')
    expect(display).toHaveTextContent('4')
    expect(display).toHaveTextContent('5')
  })

  it('renders accuracy badge with correct percentage', async () => {
    renderSummary(makeState({ score: 4, total: 5 }))
    const badge = await screen.findByTestId('accuracy-badge')
    expect(badge).toHaveTextContent('80%')
  })

  it('rounds accuracy to nearest integer', async () => {
    renderSummary(makeState({ score: 2, total: 3 }))
    const badge = await screen.findByTestId('accuracy-badge')
    expect(badge).toHaveTextContent('67%')
  })

  it('shows 0% when score is 0', async () => {
    renderSummary(makeState({ score: 0, total: 5 }))
    const badge = await screen.findByTestId('accuracy-badge')
    expect(badge).toHaveTextContent('0%')
  })
})

// ── Motivational messages ─────────────────────────────────────────────────────

describe('motivational messages', () => {
  it('shows excellent message at >=80% accuracy', async () => {
    renderSummary(makeState({ score: 5, total: 5 }))
    await waitFor(() =>
      expect(screen.getByTestId('motivation-message')).toHaveTextContent(
        "Excellent work! You're building a great ear."
      )
    )
  })

  it('shows good message at 60-79% accuracy', async () => {
    renderSummary(makeState({ score: 3, total: 5 }))  // 60%
    await waitFor(() =>
      expect(screen.getByTestId('motivation-message')).toHaveTextContent(
        'Good effort! Keep practicing to sharpen your ear.'
      )
    )
  })

  it('shows keep-going message below 60% accuracy', async () => {
    renderSummary(makeState({ score: 1, total: 5 }))  // 20%
    await waitFor(() =>
      expect(screen.getByTestId('motivation-message')).toHaveTextContent(
        'Keep going! Consistency is the key to ear training.'
      )
    )
  })

  it('shows excellent message at exactly 80%', async () => {
    renderSummary(makeState({ score: 4, total: 5 }))
    await waitFor(() =>
      expect(screen.getByTestId('motivation-message')).toHaveTextContent('Excellent work!')
    )
  })

  it('shows good message at exactly 60%', async () => {
    renderSummary(makeState({ score: 3, total: 5 }))
    await waitFor(() =>
      expect(screen.getByTestId('motivation-message')).toHaveTextContent('Good effort!')
    )
  })
})

// ── Interval breakdown table ──────────────────────────────────────────────────

describe('interval breakdown', () => {
  it('renders the breakdown table', async () => {
    renderSummary()
    expect(await screen.findByTestId('breakdown-table')).toBeInTheDocument()
  })

  it('renders a row for each interval in the breakdown', async () => {
    renderSummary()
    await screen.findByTestId('breakdown-table')
    expect(screen.getByTestId('row-perfect_fifth')).toBeInTheDocument()
    expect(screen.getByTestId('row-perfect_fourth')).toBeInTheDocument()
    expect(screen.getByTestId('row-root')).toBeInTheDocument()
  })

  it('shows interval display names', async () => {
    renderSummary()
    await screen.findByTestId('breakdown-table')
    expect(screen.getByText('Perfect 5th')).toBeInTheDocument()
    expect(screen.getByText('Perfect 4th')).toBeInTheDocument()
    expect(screen.getAllByText('Root (Unison)').length).toBeGreaterThan(0)
  })

  it('shows correct count, total, and accuracy for each interval', async () => {
    renderSummary()
    const row = await screen.findByTestId('row-perfect_fifth')
    expect(row).toHaveTextContent('2')   // correct
    expect(row).toHaveTextContent('100%') // 2/2 = 100%
  })

  it('calculates 0% accuracy for interval with 0 correct', async () => {
    renderSummary()
    const row = await screen.findByTestId('row-root')
    expect(row).toHaveTextContent('0%')
  })
})

// ── Weakest interval card ─────────────────────────────────────────────────────

describe('weakest interval', () => {
  it('shows weakest-card for the interval with lowest accuracy', async () => {
    renderSummary()
    expect(await screen.findByTestId('weakest-card')).toBeInTheDocument()
  })

  it('shows the name of the weakest interval', async () => {
    renderSummary()
    // root has 0% accuracy — the weakest
    expect(await screen.findByTestId('weakest-name')).toHaveTextContent('Root (Unison)')
  })

  it('shows a practice tip for the weakest interval', async () => {
    renderSummary()
    const tip = await screen.findByTestId('weakest-tip')
    expect(tip.textContent.length).toBeGreaterThan(10)
  })

  it('does not show weakest card when all intervals are 100%', async () => {
    renderSummary(makeState({
      score: 3,
      total: 3,
      breakdown: {
        root:           { correct: 1, total: 1 },
        perfect_fifth:  { correct: 1, total: 1 },
        perfect_fourth: { correct: 1, total: 1 },
      },
    }))
    // wait for render to settle, then confirm absence
    await screen.findByTestId('motivation-message')
    expect(screen.queryByTestId('weakest-card')).not.toBeInTheDocument()
  })
})

// ── Storage calls ─────────────────────────────────────────────────────────────

describe('storage calls on mount', () => {
  it('calls saveSession once on mount', async () => {
    renderSummary()
    await waitFor(() => expect(saveSession).toHaveBeenCalledOnce())
  })

  it('calls saveSession with score, total, and date', async () => {
    renderSummary(makeState({ score: 4, total: 5 }))
    await waitFor(() => expect(saveSession).toHaveBeenCalledOnce())
    const arg = saveSession.mock.calls[0][0]
    expect(arg.score).toBe(4)
    expect(arg.total).toBe(5)
    expect(arg.date).toBeDefined()
  })

  it('calls updateIntervalStat for each result', async () => {
    renderSummary()
    await waitFor(() =>
      expect(updateIntervalStat).toHaveBeenCalledTimes(RESULTS_3_CORRECT.length)
    )
  })

  it('calls updateIntervalStat with correct intervalId and wasCorrect', async () => {
    renderSummary()
    await waitFor(() => expect(updateIntervalStat).toHaveBeenCalledTimes(3))
    expect(updateIntervalStat).toHaveBeenCalledWith('perfect_fifth', true)
    expect(updateIntervalStat).toHaveBeenCalledWith('perfect_fourth', true)
    expect(updateIntervalStat).toHaveBeenCalledWith('root', false)
  })

  it('does not call saveSession twice in Strict Mode (ref guard)', async () => {
    renderSummary()
    await waitFor(() => expect(saveSession).toHaveBeenCalled())
    // Small delay to confirm no second call
    await new Promise(r => setTimeout(r, 50))
    expect(saveSession).toHaveBeenCalledOnce()
  })
})

// ── Redirect on missing state ─────────────────────────────────────────────────

describe('redirect when no state', () => {
  it('redirects to "/" when navigated to directly without state', () => {
    render(
      <MemoryRouter initialEntries={['/summary']}>
        <Routes>
          <Route path="/summary" element={<SummaryScreen />} />
          <Route path="/"        element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('does not render summary content when no state', () => {
    render(
      <MemoryRouter initialEntries={['/summary']}>
        <Routes>
          <Route path="/summary" element={<SummaryScreen />} />
          <Route path="/"        element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.queryByTestId('score-display')).not.toBeInTheDocument()
  })
})

// ── Navigation buttons ────────────────────────────────────────────────────────

describe('navigation buttons', () => {
  it('renders Practice Again button', async () => {
    renderSummary()
    expect(await screen.findByRole('button', { name: /practice again/i })).toBeInTheDocument()
  })

  it('renders Home button', async () => {
    renderSummary()
    expect(await screen.findByRole('button', { name: /home/i })).toBeInTheDocument()
  })

  it('Practice Again navigates to /session', async () => {
    renderSummary()
    await userEvent.click(await screen.findByRole('button', { name: /practice again/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/session')
  })

  it('Home navigates to /', async () => {
    renderSummary()
    await userEvent.click(await screen.findByRole('button', { name: /home/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

// ── Phase unlock modal ────────────────────────────────────────────────────────

describe('phase unlock modal', () => {
  function setupMasteryMocks({ phase2 = false, phase3 = false } = {}) {
    saveSession.mockResolvedValue(1)
    updateIntervalStat.mockResolvedValue(undefined)
    saveSetting.mockResolvedValue(undefined)

    // Three sessions all at >=80% accuracy
    getRecentSessions.mockResolvedValue([
      { id: 3, score: 5, total: 5, date: '2024-01-03T00:00:00.000Z' },
      { id: 2, score: 4, total: 5, date: '2024-01-02T00:00:00.000Z' },
      { id: 1, score: 5, total: 5, date: '2024-01-01T00:00:00.000Z' },
    ])

    // Derive currentPhase from the unlock flags (matches new SummaryScreen contract)
    const currentPhase = phase3 ? 3 : phase2 ? 2 : 1

    getSetting.mockImplementation((key, def) => {
      if (key === 'currentPhase') return Promise.resolve(currentPhase)
      if (key === 'phase2Unlocked') return Promise.resolve(phase2)
      if (key === 'phase3Unlocked') return Promise.resolve(phase3)
      return Promise.resolve(def)
    })
  }

  it('shows unlock modal when phase 2 mastery conditions are met', async () => {
    setupMasteryMocks({ phase2: false, phase3: false })
    renderSummary()
    expect(await screen.findByTestId('unlock-modal-body')).toBeInTheDocument()
  })

  it('modal body mentions the newly unlocked phase', async () => {
    setupMasteryMocks({ phase2: false })
    renderSummary()
    const body = await screen.findByTestId('unlock-modal-body')
    expect(body).toHaveTextContent('Phase 2')
  })

  it('unlocks phase 3 when phase 2 already unlocked and 3 sessions mastered', async () => {
    setupMasteryMocks({ phase2: true, phase3: false })
    renderSummary()
    const body = await screen.findByTestId('unlock-modal-body')
    expect(body).toHaveTextContent('Phase 3')
  })

  it('does NOT show unlock modal when fewer than 3 sessions', async () => {
    saveSession.mockResolvedValue(1)
    updateIntervalStat.mockResolvedValue(undefined)
    getRecentSessions.mockResolvedValue([
      { id: 1, score: 5, total: 5, date: '2024-01-01T00:00:00.000Z' },
    ])
    getSetting.mockImplementation((key, def) => {
      if (key === 'currentPhase') return Promise.resolve(1)
      return Promise.resolve(def)
    })

    renderSummary()
    // Wait for async storage calls to complete, then assert absence
    await waitFor(() => expect(saveSession).toHaveBeenCalled())
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByTestId('unlock-modal-body')).not.toBeInTheDocument()
  })

  it('does NOT show unlock modal when sessions have low accuracy', async () => {
    saveSession.mockResolvedValue(1)
    updateIntervalStat.mockResolvedValue(undefined)
    getRecentSessions.mockResolvedValue([
      { id: 3, score: 2, total: 5, date: '2024-01-03T00:00:00.000Z' },  // 40%
      { id: 2, score: 3, total: 5, date: '2024-01-02T00:00:00.000Z' },  // 60%
      { id: 1, score: 5, total: 5, date: '2024-01-01T00:00:00.000Z' },  // 100%
    ])
    getSetting.mockImplementation((key, def) => {
      if (key === 'currentPhase') return Promise.resolve(1)
      return Promise.resolve(def)
    })

    renderSummary()
    await waitFor(() => expect(saveSession).toHaveBeenCalled())
    await new Promise(r => setTimeout(r, 50))
    expect(screen.queryByTestId('unlock-modal-body')).not.toBeInTheDocument()
  })

  it('calls saveSetting when phase unlock occurs', async () => {
    setupMasteryMocks({ phase2: false })
    renderSummary()
    await waitFor(() => expect(saveSetting).toHaveBeenCalledWith('phase2Unlocked', true))
  })
})
