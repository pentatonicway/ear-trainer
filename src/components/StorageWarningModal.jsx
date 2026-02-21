/**
 * StorageWarningModal.jsx
 * Shown when IndexedDB throws a QuotaExceededError during saveSession.
 * Gives the user a path to clear old history and continue.
 */

import Modal  from './Modal.jsx'
import Button from './Button.jsx'
import styles from './StorageWarningModal.module.css'

export default function StorageWarningModal({ isOpen, onClear, onDismiss }) {
  return (
    <Modal isOpen={isOpen} onClose={onDismiss}>
      <p className={styles.title} data-testid="storage-modal-title">
        Storage is full
      </p>
      <p className={styles.body} data-testid="storage-modal-body">
        Storage is full. Clear old session history to continue saving progress.
      </p>
      <div className={styles.actions}>
        <button
          className={styles.clearBtn}
          onClick={onClear}
          data-testid="storage-clear-btn"
        >
          Clear History
        </button>
        <Button
          label="Dismiss"
          variant="secondary"
          onClick={onDismiss}
          data-testid="storage-dismiss-btn"
        />
      </div>
    </Modal>
  )
}
