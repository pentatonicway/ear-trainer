/**
 * SettingsScreen.test.jsx
 * All storage modules and navigation are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SettingsScreen from '../SettingsScreen.jsx'

// ─── Mock navigate ────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ─── Mock storage ─────────────────────────────────────────────────────────────

vi.mock('../../storage/settingsStore.js', () => ({
  getSetting:  vi.fn(),
  saveSetting: vi.fn(),
}))
vi.mock('../../storage/sessionStore.js', () => ({
  clearAllSessions: vi.fn(),
}))
vi.mock('../../storage/intervalStatsStore.js', () => ({
  clearAllIntervalStats: vi.fn(),
}))

import { getSetting, saveSetting }   from '../../storage/settingsStore.js'
import { clearAllSessions }          from '../../storage/sessionStore.js'
import { clearAllIntervalStats }     from '../../storage/intervalStatsStore.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupDefaultMocks({
  playbackMode  = 'sequential',
  sessionLength = 6,
  visualAids    = false,
  activeIds     = null,
  currentPhase  = 1,
} = {}) {
  getSetting.mockImplementation((key, def) => {
    const map = {
      playbackMode,
      sessionLength,
      visualAids,
      activeIntervalIds: activeIds,
      currentPhase,
    }
    return Promise.resolve(key in map ? map[key] : def)
  })
  saveSetting.mockResolvedValue(undefined)
  clearAllSessions.mockResolvedValue(undefined)
  clearAllIntervalStats.mockResolvedValue(undefined)
}

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsScreen />
    </MemoryRouter>
  )
}

// Wait for the loading state to disappear (settings have loaded)
async function waitForLoaded() {
  await waitFor(() =>
    expect(screen.queryByText(/loading settings/i)).not.toBeInTheDocument()
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  setupDefaultMocks()
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('initial rendering', () => {
  it('shows loading state while settings load', () => {
    getSetting.mockReturnValue(new Promise(() => {}))
    renderSettings()
    expect(screen.getByText(/loading settings/i)).toBeInTheDocument()
  })

  it('renders the playback mode segment control', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('playback-segment')).toBeInTheDocument()
  })

  it('renders Sequential, Sustained Root, and Stacked playback options', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('playback-sequential')).toBeInTheDocument()
    expect(screen.getByTestId('playback-sustained')).toBeInTheDocument()
    expect(screen.getByTestId('playback-stacked')).toBeInTheDocument()
  })

  it('renders the session length segment control', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('length-segment')).toBeInTheDocument()
  })

  it('renders session length options 5–8', async () => {
    renderSettings()
    await waitForLoaded()
    ;[5, 6, 7, 8].forEach(n =>
      expect(screen.getByTestId(`length-${n}`)).toBeInTheDocument()
    )
  })

  it('renders the visual aids toggle', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('visual-aids-toggle')).toBeInTheDocument()
  })

  it('renders the interval checkbox grid', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('interval-grid')).toBeInTheDocument()
  })

  it('renders root, perfect_fifth, perfect_fourth for phase 1', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('interval-root')).toBeInTheDocument()
    expect(screen.getByTestId('interval-perfect_fifth')).toBeInTheDocument()
    expect(screen.getByTestId('interval-perfect_fourth')).toBeInTheDocument()
  })

  it('renders Reset Progress button', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('reset-btn')).toBeInTheDocument()
  })
})

// ── Loaded state reflects stored values ───────────────────────────────────────

describe('loaded state', () => {
  it('marks the stored playback mode as active', async () => {
    setupDefaultMocks({ playbackMode: 'sustained' })
    renderSettings()
    await waitForLoaded()
    const btn = screen.getByTestId('playback-sustained')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks the stored session length as active', async () => {
    setupDefaultMocks({ sessionLength: 7 })
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('length-7')).toHaveAttribute('aria-pressed', 'true')
  })

  it('visual aids toggle reflects stored value (off)', async () => {
    setupDefaultMocks({ visualAids: false })
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('visual-aids-toggle')).toHaveAttribute('aria-checked', 'false')
  })

  it('visual aids toggle reflects stored value (on)', async () => {
    setupDefaultMocks({ visualAids: true })
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('visual-aids-toggle')).toHaveAttribute('aria-checked', 'true')
  })

  it('root checkbox is always checked', async () => {
    renderSettings()
    await waitForLoaded()
    const checkbox = screen.getByTestId('checkbox-root')
    expect(checkbox).toBeChecked()
  })

  it('root checkbox is disabled', async () => {
    renderSettings()
    await waitForLoaded()
    expect(screen.getByTestId('checkbox-root')).toBeDisabled()
  })
})

// ── Playback mode changes ─────────────────────────────────────────────────────

describe('playback mode control', () => {
  it('clicking "Stacked" calls saveSetting with correct args', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('playback-stacked'))
    expect(saveSetting).toHaveBeenCalledWith('playbackMode', 'stacked')
  })

  it('clicking "Sustained Root" calls saveSetting', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('playback-sustained'))
    expect(saveSetting).toHaveBeenCalledWith('playbackMode', 'sustained')
  })

  it('updates active button immediately on click', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('playback-stacked'))
    expect(screen.getByTestId('playback-stacked')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('playback-sequential')).toHaveAttribute('aria-pressed', 'false')
  })
})

// ── Session length changes ────────────────────────────────────────────────────

describe('session length control', () => {
  it('clicking length 8 calls saveSetting', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('length-8'))
    expect(saveSetting).toHaveBeenCalledWith('sessionLength', 8)
  })

  it('updates active button immediately on click', async () => {
    setupDefaultMocks({ sessionLength: 6 })
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('length-5'))
    expect(screen.getByTestId('length-5')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('length-6')).toHaveAttribute('aria-pressed', 'false')
  })
})

// ── Visual aids toggle ────────────────────────────────────────────────────────

describe('visual aids toggle', () => {
  it('clicking toggle calls saveSetting with toggled value', async () => {
    setupDefaultMocks({ visualAids: false })
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('visual-aids-toggle'))
    expect(saveSetting).toHaveBeenCalledWith('visualAids', true)
  })

  it('toggling twice saves false then true', async () => {
    setupDefaultMocks({ visualAids: false })
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('visual-aids-toggle'))
    await userEvent.click(screen.getByTestId('visual-aids-toggle'))
    const calls = saveSetting.mock.calls.filter(c => c[0] === 'visualAids')
    expect(calls[0][1]).toBe(true)
    expect(calls[1][1]).toBe(false)
  })
})

// ── Active intervals ──────────────────────────────────────────────────────────

describe('active intervals', () => {
  it('clicking a non-root interval toggles it off', async () => {
    setupDefaultMocks({ activeIds: ['root', 'perfect_fifth', 'perfect_fourth'] })
    renderSettings()
    await waitForLoaded()

    // perfect_fifth is checked; clicking should uncheck it
    await userEvent.click(screen.getByTestId('interval-perfect_fifth'))

    await waitFor(() =>
      expect(saveSetting).toHaveBeenCalledWith(
        'activeIntervalIds',
        expect.not.arrayContaining(['perfect_fifth'])
      )
    )
  })

  it('clicking an unchecked interval adds it', async () => {
    setupDefaultMocks({ activeIds: ['root'] })
    renderSettings()
    await waitForLoaded()

    await userEvent.click(screen.getByTestId('interval-perfect_fifth'))

    await waitFor(() =>
      expect(saveSetting).toHaveBeenCalledWith(
        'activeIntervalIds',
        expect.arrayContaining(['root', 'perfect_fifth'])
      )
    )
  })

  it('root is always included in saved activeIntervalIds', async () => {
    setupDefaultMocks({ activeIds: ['root', 'perfect_fifth'] })
    renderSettings()
    await waitForLoaded()

    await userEvent.click(screen.getByTestId('interval-perfect_fifth'))

    await waitFor(() =>
      expect(saveSetting).toHaveBeenCalledWith(
        'activeIntervalIds',
        expect.arrayContaining(['root'])
      )
    )
  })

  it('phase 1 shows exactly 3 intervals (root, 5th, 4th)', async () => {
    setupDefaultMocks({ currentPhase: 1 })
    renderSettings()
    await waitForLoaded()

    const grid = screen.getByTestId('interval-grid')
    const labels = grid.querySelectorAll('label')
    expect(labels).toHaveLength(3)
  })
})

// ── Navigation ────────────────────────────────────────────────────────────────

describe('navigation', () => {
  it('Back button navigates to /', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('back-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

// ── Reset progress ────────────────────────────────────────────────────────────

describe('reset progress', () => {
  it('clicking Reset Progress opens confirmation modal', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    expect(screen.getByText(/reset all progress/i)).toBeInTheDocument()
  })

  it('modal contains a confirm button', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    expect(screen.getByTestId('confirm-reset-btn')).toBeInTheDocument()
  })

  it('confirming reset calls clearAllSessions', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    await userEvent.click(screen.getByTestId('confirm-reset-btn'))
    await waitFor(() => expect(clearAllSessions).toHaveBeenCalledOnce())
  })

  it('confirming reset calls clearAllIntervalStats', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    await userEvent.click(screen.getByTestId('confirm-reset-btn'))
    await waitFor(() => expect(clearAllIntervalStats).toHaveBeenCalledOnce())
  })

  it('confirming reset saves default settings', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    await userEvent.click(screen.getByTestId('confirm-reset-btn'))
    await waitFor(() =>
      expect(saveSetting).toHaveBeenCalledWith('playbackMode', 'sequential')
    )
    expect(saveSetting).toHaveBeenCalledWith('currentPhase', 1)
    expect(saveSetting).toHaveBeenCalledWith('phase2Unlocked', false)
    expect(saveSetting).toHaveBeenCalledWith('phase3Unlocked', false)
  })

  it('confirming reset navigates to /', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    await userEvent.click(screen.getByTestId('confirm-reset-btn'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))
  })

  it('cancelling reset does NOT navigate', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('cancelling reset closes the modal', async () => {
    renderSettings()
    await waitForLoaded()
    await userEvent.click(screen.getByTestId('reset-btn'))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByText(/reset all progress/i)).not.toBeInTheDocument()
  })
})
