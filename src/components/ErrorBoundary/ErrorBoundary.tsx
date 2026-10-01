import { Component, ReactNode } from 'react'
import { useStrings } from '../../i18n/useStrings'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Converts an unknown error value to an Error object.
 * React may throw non-Error types, so we need to handle them defensively.
 */
function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value
  }
  if (typeof value === 'string') {
    return new Error(value)
  }
  if (value && typeof value === 'object' && 'message' in value) {
    return new Error(String(value.message))
  }
  return new Error(String(value))
}

/** The default fallback, in the UI language: the boundary sits inside LanguageProvider. */
function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const strings = useStrings()
  return (
    <div className={styles['error-container']} role="alert">
      <h2 className={styles.title}>{strings.errorTitle}</h2>
      <p className={styles.message}>{strings.errorMessage}</p>
      {error && (
        <details className={styles.details}>
          <summary>{strings.errorDetails}</summary>
          <pre className={styles['error-text']}>{error.message}</pre>
        </details>
      )}
      <button className={styles['retry-button']} onClick={onRetry} type="button">
        {strings.errorRetry}
      </button>
    </div>
  )
}

/**
 * Error boundary component that catches JavaScript errors in child components,
 * logs them, and displays a fallback UI instead of crashing the app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: unknown): State {
    // React may throw non-Error types, so we normalize to Error
    return { hasError: true, error: toError(error) }
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    // Normalize error before logging
    const normalizedError = toError(error)
    console.error('ErrorBoundary caught an error:', normalizedError, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}
