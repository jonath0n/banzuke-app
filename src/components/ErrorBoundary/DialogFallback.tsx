import { useStrings } from '../../i18n/useStrings'
import styles from './ErrorBoundary.module.css'

interface Props {
  onReload?: () => void
}

/**
 * What stands in for a dialog whose code chunk failed to load (a dropped
 * connection, or a deploy that replaced the chunk under an open page). The
 * banzuke itself is unaffected; a failed `lazy()` import stays failed until the
 * page reloads, so the way out is a reload, not a retry.
 */
export function DialogFallback({ onReload = () => window.location.reload() }: Props) {
  const strings = useStrings()
  return (
    <div className={styles['error-container']} role="alert">
      <p className={styles.message}>{strings.errorDialog}</p>
      <button className={styles['retry-button']} onClick={onReload} type="button">
        {strings.errorReload}
      </button>
    </div>
  )
}
