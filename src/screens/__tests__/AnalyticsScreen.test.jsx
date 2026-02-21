/**
 * AnalyticsScreen.test.jsx
 * All storage modules mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AnalyticsScreen from '../AnalyticsScreen.jsx'

// ─── Mock navigate ────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ─── Mock storage modules ─────────────────────────────────────────────────────

vi.mock('../../storage/intervalStatsStore.js', () => ({
  getAllIntervalStats: vi.fn(),
}))
vi.mock('../../storage/sessionStore.js', () => ({
  getRecentSessions:        vi.fn(),
  getSessionsForStreakCalc: vi.fn(),
}))
vi.mock('../../storage/streakUtils.js', () => ({
  calculateStreak: vi.fn(),
}))

import { getAllIntervalStats }                     from '../../storage/intervalStatsStore.js'
import { getRecentSessions, getSessionsForStreakCalc } from '../../storage/sessionStore.js'
import { calculateStreak }                         from '../../storage/streakUtils.js'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_STATS = [
  { intervalId: 'root',           correct: 8, total: 10, accuracy: 0.8  },
  { intervalId: 'perfect_fifth',  correct: 3, total: 10, accuracy: 0.3  },
  { intervalId: 'perfect_fourth', correct: 6, total: 10, accuracy: 0.6  },
]

const MOCK_SESSIONS = [
  { id: 3, score: 7, total: 8,  date: '2024-06-15T10:00:00.000Z' },
  { id: 2, score: 5, total: 8,  date: '2024-06-14T10:00:00.000Z' },
  { id: 1, score: 8, total: 10, date: '2024-06-13T10:00:00.000Z' },
]

const MOCK_STREAK_DATES = MOCK_SESSIONS.map(s => ({ id: s.id, date: s.date }))

// ─── Setup helpers ────────────────────────────────────────────────────────────

function setupDefaultMocks({
  stats    = MOCK_STATS,
  sessions = MOCK_SESSIONS,
  streak   = 3,
} = {}) {
  getAllIntervalStats.mockResolvedValue(stats)
  getRecentSessions.mockResolvedValue(sessions)
  getSessionsForStreakCalc.mockResolvedValue(MOCK_STREAK_DATES)
  calculateStreak.mockReturnValue(streak)
}

function renderAnalytics() {
  return render(
    <MemoryRouter>
      <AnalyticsScreen />
    </MemoryRouter>
  )
}

// Wait for the loading spinner to go away
async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('shows loading indicator while data loads', () => {
    getAllIntervalStats.mockReturnValue(new Promise(() => {}))
    getRecentSessions.mockReturnValue(new Promise(() => {}))
    getSessionsForStreakCalc.mockReturnValue(new Promise(() => {}))
    calculateStreak.mockReturnValue(0)

    renderAnalytics()
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('hides loading indicator after data loads', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})

// ── Empty state ───────────────────────────────────────────────────────────────

describe('empty state', () => {
  it('shows empty state when no sessions and no stats', async () => {
    setupDefaultMocks({ stats: [], sessions: [] })
    renderAnalytics()
    await waitFor(() =>
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    )
  })

  it('shows correct empty state message', async () => {
    setupDefaultMocks({ stats: [], sessions: [] })
    renderAnalytics()
    await waitFor(() =>
      expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument()
    )
  })

  it('shows Start Session button in empty state', async () => {
    setupDefaultMocks({ stats: [], sessions: [] })
    renderAnalytics()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /start session/i })).toBeInTheDocument()
    )
  })

  it('Start Session navigates to /session', async () => {
    setupDefaultMocks({ stats: [], sessions: [] })
    renderAnalytics()
    await waitFor(() => screen.getByRole('button', { name: /start session/i }))
    await userEvent.click(screen.getByRole('button', { name: /start session/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/session')
  })

  it('does NOT show empty state when data exists', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
  })
})

// ── Stats row ─────────────────────────────────────────────────────────────────

describe('stats row', () => {
  it('renders streak card', async () => {
    setupDefaultMocks({ streak: 5 })
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('streak-value')).toHaveTextContent('5')
  })

  it('renders total sessions card', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    // MOCK_SESSIONS has 3 sessions
    expect(screen.getByTestId('sessions-value')).toHaveTextContent('3')
  })

  it('renders overall accuracy card', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    // total correct: 8+3+6=17, total answers: 30 → 57%
    expect(screen.getByTestId('accuracy-value')).toHaveTextContent('57%')
  })

  it('streak card shows 0 when no streak', async () => {
    setupDefaultMocks({ streak: 0 })
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('streak-value')).toHaveTextContent('0')
  })

  it('overall accuracy is 0% when no stats', async () => {
    setupDefaultMocks({ stats: [], sessions: MOCK_SESSIONS })
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('accuracy-value')).toHaveTextContent('0%')
  })
})

// ── Interval accuracy table ───────────────────────────────────────────────────

describe('interval accuracy table', () => {
  it('renders the accuracy table', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('accuracy-table')).toBeInTheDocument()
  })

  it('renders a row for each interval stat', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('stat-row-root')).toBeInTheDocument()
    expect(screen.getByTestId('stat-row-perfect_fifth')).toBeInTheDocument()
    expect(screen.getByTestId('stat-row-perfect_fourth')).toBeInTheDocument()
  })

  it('shows interval display names', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getAllByText('Perfect 5th').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Perfect 4th').length).toBeGreaterThan(0)
  })

  it('shows correct accuracy percentage per row', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    // perfect_fifth: 3/10 = 30%
    const fifthRow = screen.getByTestId('stat-row-perfect_fifth')
    expect(fifthRow).toHaveTextContent('30%')
  })

  it('weakest interval row has the weak row class', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    // perfect_fifth at 30% is weakest
    const weakRow = screen.getByTestId('stat-row-perfect_fifth')
    expect(weakRow.className).toMatch(/weakRow/)
  })

  it('rows are sorted ascending by accuracy (weakest first)', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()

    const table = screen.getByTestId('accuracy-table')
    const rows  = table.querySelectorAll('tbody tr')

    // First row should be weakest (perfect_fifth at 30%)
    expect(rows[0]).toHaveAttribute('data-testid', 'stat-row-perfect_fifth')
  })

  it('does not render table when no stats', async () => {
    setupDefaultMocks({ stats: [], sessions: MOCK_SESSIONS })
    renderAnalytics()
    await waitForLoaded()
    expect(screen.queryByTestId('accuracy-table')).not.toBeInTheDocument()
  })
})

// ── Session history ───────────────────────────────────────────────────────────

describe('session history', () => {
  it('renders history list', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('history-list')).toBeInTheDocument()
  })

  it('shows one item per session (up to 10)', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    const items = screen.getAllByTestId(/^history-item-/)
    expect(items).toHaveLength(MOCK_SESSIONS.length)
  })

  it('shows score in "X/Y correct" format', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('history-item-0')).toHaveTextContent('7/8 correct')
  })

  it('shows formatted date', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    // Date should contain a month abbreviation or similar formatted output
    const item = screen.getByTestId('history-item-0')
    // The formatted date should not be the raw ISO string
    expect(item.textContent).not.toContain('2024-06-15T')
  })

  it('limits history to 10 items even when more sessions exist', async () => {
    const manySessions = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      score: 5,
      total: 8,
      date: `2024-06-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
    }))
    setupDefaultMocks({ sessions: manySessions })
    renderAnalytics()
    await waitForLoaded()
    const items = screen.getAllByTestId(/^history-item-/)
    expect(items).toHaveLength(10)
  })
})

// ── Focus callout card ────────────────────────────────────────────────────────

describe('focus callout card', () => {
  it('shows focus card when weakest interval accuracy < 60%', async () => {
    setupDefaultMocks()  // perfect_fifth at 30% < 60%
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('focus-card')).toBeInTheDocument()
  })

  it('shows the weakest interval name in the focus card', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('focus-name')).toHaveTextContent('Perfect 5th')
  })

  it('shows tip text in the focus card', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    expect(screen.getByTestId('focus-tip')).toHaveTextContent(/sing this interval/i)
  })

  it('does NOT show focus card when all intervals are >= 60%', async () => {
    const strongStats = [
      { intervalId: 'root',           correct: 8, total: 10, accuracy: 0.8 },
      { intervalId: 'perfect_fifth',  correct: 7, total: 10, accuracy: 0.7 },
      { intervalId: 'perfect_fourth', correct: 6, total: 10, accuracy: 0.6 },
    ]
    setupDefaultMocks({ stats: strongStats })
    renderAnalytics()
    await waitForLoaded()
    expect(screen.queryByTestId('focus-card')).not.toBeInTheDocument()
  })

  it('does NOT show focus card when no stats', async () => {
    setupDefaultMocks({ stats: [], sessions: MOCK_SESSIONS })
    renderAnalytics()
    await waitForLoaded()
    expect(screen.queryByTestId('focus-card')).not.toBeInTheDocument()
  })
})

// ── Navigation ────────────────────────────────────────────────────────────────

describe('navigation', () => {
  it('Back button navigates to /', async () => {
    setupDefaultMocks()
    renderAnalytics()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('back-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('Back button present in empty state too', async () => {
    setupDefaultMocks({ stats: [], sessions: [] })
    renderAnalytics()
    await waitFor(() => screen.getByTestId('back-btn'))
    await userEvent.click(screen.getByTestId('back-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
