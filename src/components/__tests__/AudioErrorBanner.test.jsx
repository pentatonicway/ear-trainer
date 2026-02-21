/**
 * AudioErrorBanner.test.jsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AudioErrorBanner from '../AudioErrorBanner.jsx'

function renderBanner(props = {}) {
  const defaults = {
    message: 'Audio failed to load',
    onRetry: vi.fn(),
    ...props,
  }
  render(<AudioErrorBanner {...defaults} />)
  return defaults
}

describe('AudioErrorBanner', () => {
  it('renders the banner element', () => {
    renderBanner()
    expect(screen.getByTestId('audio-error-banner')).toBeInTheDocument()
  })

  it('displays "Audio unavailable:" prefix', () => {
    renderBanner({ message: 'Audio failed to load' })
    expect(screen.getByTestId('audio-error-banner')).toHaveTextContent('Audio unavailable:')
  })

  it('displays the provided message string', () => {
    renderBanner({ message: 'Audio failed to load' })
    expect(screen.getByTestId('audio-error-banner')).toHaveTextContent('Audio failed to load')
  })

  it('displays a different message when one is passed', () => {
    renderBanner({ message: 'Network timeout' })
    expect(screen.getByTestId('audio-error-banner')).toHaveTextContent('Network timeout')
  })

  it('mentions interval names as fallback', () => {
    renderBanner()
    expect(screen.getByTestId('audio-error-banner')).toHaveTextContent(
      'Interval names will be shown instead'
    )
  })

  it('renders a Retry button', () => {
    renderBanner()
    expect(screen.getByTestId('audio-retry-btn')).toBeInTheDocument()
  })

  it('Retry button calls onRetry when clicked', async () => {
    const { onRetry } = renderBanner()
    await userEvent.click(screen.getByTestId('audio-retry-btn'))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('Retry button calls onRetry each time it is clicked', async () => {
    const { onRetry } = renderBanner()
    await userEvent.click(screen.getByTestId('audio-retry-btn'))
    await userEvent.click(screen.getByTestId('audio-retry-btn'))
    expect(onRetry).toHaveBeenCalledTimes(2)
  })

  it('has role="alert" for accessibility', () => {
    renderBanner()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
