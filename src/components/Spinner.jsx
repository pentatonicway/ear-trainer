/**
 * Spinner.jsx
 * Accessible CSS loading spinner.
 * Used on any screen that waits for async data.
 */

import styles from './Spinner.module.css'

export default function Spinner({ size = 'md', label = 'Loading' }) {
  return (
    <div
      className={`${styles.spinner} ${styles[size]}`}
      role="status"
      aria-label={label}
      data-testid="spinner"
    >
      <span className={styles.srOnly}>{label}</span>
    </div>
  )
}
