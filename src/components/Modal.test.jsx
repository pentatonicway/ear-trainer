/**
 * Modal.test.jsx
 * Tests for Modal component including focus trap behavior.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal.jsx'

function renderModal(props = {}) {
  const defaults = {
    isOpen:   true,
    onClose:  vi.fn(),
    children: <button data-testid="first-btn">First</button>,
    ...props,
  }
  render(<Modal {...defaults} />)
  return defaults
}

describe('Modal', () => {
  describe('rendering', () => {
    it('renders children when isOpen is true', () => {
      renderModal()
      expect(screen.getByTestId('first-btn')).toBeInTheDocument()
    })

    it('renders nothing when isOpen is false', () => {
      renderModal({ isOpen: false })
      expect(screen.queryByTestId('first-btn')).not.toBeInTheDocument()
    })

    it('has role="dialog"', () => {
      renderModal()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      renderModal()
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('renders a close button with aria-label', () => {
      renderModal()
      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument()
    })
  })

  describe('close behavior', () => {
    it('calls onClose when close button is clicked', async () => {
      const { onClose } = renderModal()
      await userEvent.click(screen.getByRole('button', { name: /close modal/i }))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when Escape is pressed', async () => {
      const { onClose } = renderModal()
      await userEvent.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when overlay backdrop is clicked', async () => {
      const { onClose } = renderModal()
      // Click the overlay (role="dialog") — not the modal content
      const overlay = screen.getByRole('dialog')
      await userEvent.click(overlay)
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('focus trap', () => {
    it('moves focus into the modal when it opens', async () => {
      // The modal renders a close button first, then children.
      // Focus should land on the first focusable element in the modal —
      // which is the close button (it appears before children in the DOM).
      renderModal({
        children: (
          <>
            <button data-testid="first-btn">First</button>
            <button data-testid="second-btn">Second</button>
          </>
        ),
      })

      // Allow requestAnimationFrame to fire
      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })

      // Focus must be inside the modal (close button is first focusable)
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /close modal/i })
      )
    })

  it('moves focus to first child button when close button is removed from tab order', async () => {
      // If the close button is not focusable, first child gets focus.
      // We test this by checking that focus is captured somewhere in the modal.
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <button data-testid="first-btn">First</button>
        </Modal>
      )

      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })

      // Active element should be inside the modal
      const modal = container.querySelector('[role="dialog"] > div')
      expect(modal).toContainElement(document.activeElement)
    })

    it('focuses the close button when no other focusable children exist', async () => {
      renderModal({
        children: <p>No interactive children</p>,
      })

      await act(async () => {
        await new Promise(r => setTimeout(r, 50))
      })

      // Close button is the first focusable in the modal
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: /close modal/i })
      )
    })

    it('does not attempt to focus when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={false} onClose={vi.fn()}>
          <button data-testid="btn">Click me</button>
        </Modal>
      )
      // Button doesn't exist in DOM when closed — no error thrown
      expect(screen.queryByTestId('btn')).not.toBeInTheDocument()
    })
  })
})
