import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button.jsx'

describe('Button', () => {
  it('renders the label correctly', () => {
    render(<Button label="Click me" onClick={() => {}} />)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button label="Press" onClick={handleClick} />)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies the correct CSS class for variant: primary', () => {
    render(<Button label="Primary" onClick={() => {}} variant="primary" />)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/primary/)
  })

  it('applies the correct CSS class for variant: secondary', () => {
    render(<Button label="Secondary" onClick={() => {}} variant="secondary" />)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/secondary/)
  })

  it('applies the correct CSS class for variant: correct', () => {
    render(<Button label="Correct" onClick={() => {}} variant="correct" />)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/correct/)
  })

  it('applies the correct CSS class for variant: wrong', () => {
    render(<Button label="Wrong" onClick={() => {}} variant="wrong" />)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/wrong/)
  })
})
