/**
 * Spinner.test.jsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Spinner from './Spinner.jsx'

describe('Spinner', () => {
  it('renders the spinner element', () => {
    render(<Spinner />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  it('has role="status" for screen readers', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-label "Loading" by default', () => {
    render(<Spinner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading')
  })

  it('accepts a custom label', () => {
    render(<Spinner label="Loading stats" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading stats')
  })

  it('renders sr-only text matching the label', () => {
    render(<Spinner label="Loading" />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('renders with default medium size class', () => {
    render(<Spinner />)
    // data-testid exists regardless of size
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })
})
