/**
 * Modal.jsx
 * Accessible modal dialog with:
 *   - Escape key to close
 *   - Focus trap: first focusable element receives focus on open
 *   - aria-modal + role="dialog"
 */

import { useEffect, useRef } from 'react'
import styles from './Modal.module.css'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Focus trap: move focus to first focusable element when modal opens
  useEffect(() => {
    if (!isOpen || !modalRef.current) return
    const first = modalRef.current.querySelector(FOCUSABLE)
    if (first) {
      // Defer one frame so the DOM is fully painted before focusing
      const id = requestAnimationFrame(() => first.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
