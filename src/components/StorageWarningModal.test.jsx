/**
 * StorageWarningModal.test.jsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StorageWarningModal from './StorageWarningModal.jsx'

function renderModal(props = {}) {
  const defaults = {
    isOpen:    true,
    onClear:   vi.fn(),
    onDismiss: vi.fn(),
    ...props,
  }
  render(<StorageWarningModal {...defaults} />)
  return defaults
}

describe('StorageWarningModal', () => {
  describe('when isOpen is true', () => {
    it('renders the modal title', () => {
      renderModal()
      expect(screen.getByTestId('storage-modal-title')).toBeInTheDocument()
    })

    it('renders the storage full message', () => {
      renderModal()
      expect(screen.getByTestId('storage-modal-body')).toHaveTextContent(
        'Storage is full'
      )
    })

    it('body mentions clearing session history', () => {
      renderModal()
      expect(screen.getByTestId('storage-modal-body')).toHaveTextContent(
        'Clear old session history'
      )
    })

    it('renders the Clear History button', () => {
      renderModal()
      expect(screen.getByTestId('storage-clear-btn')).toBeInTheDocument()
    })

    it('Clear History button has correct label', () => {
      renderModal()
      expect(screen.getByTestId('storage-clear-btn')).toHaveTextContent('Clear History')
    })

    it('clicking Clear History calls onClear', async () => {
      const { onClear } = renderModal()
      await userEvent.click(screen.getByTestId('storage-clear-btn'))
      expect(onClear).toHaveBeenCalledOnce()
    })

    it('renders a Dismiss button', () => {
      renderModal()
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    })

    it('clicking Dismiss calls onDismiss', async () => {
      const { onDismiss } = renderModal()
      await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
      expect(onDismiss).toHaveBeenCalledOnce()
    })

    it('pressing Escape calls onDismiss (via Modal)', async () => {
      const { onDismiss } = renderModal()
      await userEvent.keyboard('{Escape}')
      expect(onDismiss).toHaveBeenCalledOnce()
    })
  })

  describe('when isOpen is false', () => {
    it('does not render any content', () => {
      renderModal({ isOpen: false })
      expect(screen.queryByTestId('storage-modal-title')).not.toBeInTheDocument()
      expect(screen.queryByTestId('storage-modal-body')).not.toBeInTheDocument()
      expect(screen.queryByTestId('storage-clear-btn')).not.toBeInTheDocument()
    })
  })
})
