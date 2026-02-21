/**
 * AudioErrorBanner.jsx
 * Amber warning strip shown when audio fails to load.
 * The session continues in text-only fallback mode.
 */

import styles from './AudioErrorBanner.module.css'

export default function AudioErrorBanner({ message, onRetry }) {
  return (
    <div className={styles.banner} role="alert" data-testid="audio-error-banner">
      <span className={styles.icon} aria-hidden="true">⚠️</span>
      <div className={styles.body}>
        <p className={styles.message}>
          Audio unavailable: {message}.
        </p>
        <p className={styles.sub}>
          Interval names will be shown instead.
        </p>
      </div>
      <button
        className={styles.retryBtn}
        onClick={onRetry}
        data-testid="audio-retry-btn"
      >
        Retry
      </button>
    </div>
  )
}
