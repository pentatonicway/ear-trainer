/**
 * HomeScreen.test.jsx
 * All storage modules are mocked — no real IndexedDB required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import HomeScreen from '../HomeScreen.jsx'

// ── Mock react-router-dom's useNavigate ───────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ── Mock storage modules ──────────────────────────────────────────────────────

vi.mock('../../storage/sessionStore.js', () => ({
  getSessionsForStreakCalc: vi.fn(),
  getRecentSessions:        vi.fn(),
}))

vi.mock('../../storage/settingsStore.js', () => ({
  getSetting: vi.fn(),
}))

vi.mock('../../storage/streakUtils.js', () => ({
  calculateStreak: vi.fn(),
}))

import {
  getSessionsForStreakCalc,
  getRecentSessions,
} from '../../storage/sessionStore.js'
import { getSetting }    from '../../storage/settingsStore.js'
import { calculateStreak } from '../../storage/streakUtils.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderHome() {
  return render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>
  )
}

function setDefaultMocks({ streak = 3, sessions = 7, phase2 = false, phase3 = false } = {}) {
  getSessionsForStreakCalc.mockResolvedValue(
    Array.from({ length: sessions }, (_, i) => ({ id: i + 1, date: '2024-06-15T10:00:00.000Z' }))
  )
  getRecentSessions.mockResolvedValue(
    Array.from({ length: sessions }, (_, i) => ({ id: i + 1, date: '2024-06-15T10:00:00.000Z' }))
  )
  // Derive currentPhase from unlock flags — HomeScreen now reads 'currentPhase' directly
  const currentPhase = phase3 ? 3 : phase2 ? 2 : 1
  getSetting.mockImplementation((key, def) => {
    if (key === 'currentPhase') return Promise.resolve(currentPhase)
    return Promise.resolve(def)
  })
  calculateStreak.mockReturnValue(streak)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Suppress expected act() warnings — our sync-render tests intentionally
  // don't wait for the async useEffect to finish.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  setDefaultMocks()
})

// ── Static rendering ──────────────────────────────────────────────────────────

describe('static content', () => {
  it('renders the app name', () => {
    renderHome()
    expect(screen.getByText(/Pentatonic/i)).toBeInTheDocument()
    expect(screen.getByText(/Ear Trainer/i)).toBeInTheDocument()
  })

  it('renders "Start Session" button', () => {
    renderHome()
    expect(screen.getByRole('button', { name: /Start Session/i })).toBeInTheDocument()
  })

  it('renders "My Progress" button', () => {
    renderHome()
    expect(screen.getByRole('button', { name: /My Progress/i })).toBeInTheDocument()
  })

  it('renders "Settings" button', () => {
    renderHome()
    expect(screen.getByRole('button', { name: /Settings/i })).toBeInTheDocument()
  })
})

// ── Navigation ────────────────────────────────────────────────────────────────

describe('navigation', () => {
  it('"Start Session" navigates to /session', async () => {
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: /Start Session/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/session')
  })

  it('"My Progress" navigates to /analytics', async () => {
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: /My Progress/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/analytics')
  })

  it('"Settings" navigates to /settings', async () => {
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: /Settings/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })
})

// ── Async data loading ────────────────────────────────────────────────────────

describe('async data loading', () => {
  it('displays streak value after data loads', async () => {
    setDefaultMocks({ streak: 5 })
    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('streak-value')).toHaveTextContent('5')
    )
  })

  it('displays flame emoji alongside streak', async () => {
    setDefaultMocks({ streak: 3 })
    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('streak-value')).toHaveTextContent('🔥')
    )
  })

  it('displays total session count', async () => {
    setDefaultMocks({ sessions: 12 })
    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('session-count')).toHaveTextContent('12')
    )
  })

  it('displays streak of 0 when no sessions exist', async () => {
    getSessionsForStreakCalc.mockResolvedValue([])
    getRecentSessions.mockResolvedValue([])
    calculateStreak.mockReturnValue(0)

    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('streak-value')).toHaveTextContent('0')
    )
  })
})

// ── Phase display ─────────────────────────────────────────────────────────────

describe('phase label', () => {
  it('shows "Phase 1: Basics" when currentPhase is 1', async () => {
    setDefaultMocks({ phase2: false, phase3: false })
    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('phase-label')).toHaveTextContent('Phase 1')
    )
  })

  it('shows "Phase 2: Tritone" when currentPhase is 2', async () => {
    setDefaultMocks({ phase2: true, phase3: false })
    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('phase-label')).toHaveTextContent('Phase 2: Tritone')
    )
  })

  it('shows "Phase 3: Major 3rds" when currentPhase is 3', async () => {
    setDefaultMocks({ phase2: true, phase3: true })
    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('phase-label')).toHaveTextContent('Phase 3: Major 3rds')
    )
  })

  it('shows "Phase 3" when phase3 is true (regardless of phase2 flag)', async () => {
    setDefaultMocks({ phase2: false, phase3: true })
    renderHome()
    await waitFor(() =>
      expect(screen.getByTestId('phase-label')).toHaveTextContent('Phase 3')
    )
  })

  it('phase label is visible immediately (shows Phase 1 before data loads)', () => {
    // Storage never resolves — keeps component in loading state
    getSessionsForStreakCalc.mockReturnValue(new Promise(() => {}))
    getRecentSessions.mockReturnValue(new Promise(() => {}))
    getSetting.mockReturnValue(new Promise(() => {}))

    renderHome()
    expect(screen.getByTestId('phase-label')).toBeInTheDocument()
    expect(screen.getByTestId('phase-label')).toHaveTextContent('Phase 1')
  })
})

// ── Loading state ─────────────────────────────────────────────────────────────

describe('loading state', () => {
  it('hides stat values while loading', () => {
    getSessionsForStreakCalc.mockReturnValue(new Promise(() => {}))
    getRecentSessions.mockReturnValue(new Promise(() => {}))
    getSetting.mockReturnValue(new Promise(() => {}))

    renderHome()
    expect(screen.queryByTestId('streak-value')).not.toBeInTheDocument()
    expect(screen.queryByTestId('session-count')).not.toBeInTheDocument()
  })

  it('shows stat values after loading completes', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByTestId('streak-value')).toBeInTheDocument()
      expect(screen.getByTestId('session-count')).toBeInTheDocument()
    })
  })

  it('shows Spinner while data is loading', () => {
    getSessionsForStreakCalc.mockReturnValue(new Promise(() => {}))
    getRecentSessions.mockReturnValue(new Promise(() => {}))
    getSetting.mockReturnValue(new Promise(() => {}))

    renderHome()
    expect(screen.getByTestId('home-loading-spinner')).toBeInTheDocument()
  })

  it('hides Spinner after data finishes loading', async () => {
    renderHome()
    await waitFor(() =>
      expect(screen.queryByTestId('home-loading-spinner')).not.toBeInTheDocument()
    )
  })

  it('handles storage errors gracefully (shows zeros)', async () => {
    getSessionsForStreakCalc.mockRejectedValue(new Error('IDB unavailable'))
    getRecentSessions.mockRejectedValue(new Error('IDB unavailable'))
    getSetting.mockRejectedValue(new Error('IDB unavailable'))

    // Also suppress the expected console.warn from the component
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    renderHome()
    await waitFor(() => {
      expect(screen.getByTestId('streak-value')).toHaveTextContent('0')
      expect(screen.getByTestId('session-count')).toHaveTextContent('0')
    })
  })
})
