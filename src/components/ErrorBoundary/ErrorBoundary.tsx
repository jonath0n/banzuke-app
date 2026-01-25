import { Component, ReactNode } from 'react'
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

      return (
        <div className={styles['error-container']} role="alert">
          <h2 className={styles.title}>Something went wrong</h2>
          <p className={styles.message}>
            An unexpected error occurred while displaying this content.
          </p>
          {this.state.error && (
            <details className={styles.details}>
              <summary>Error details</summary>
              <pre className={styles['error-text']}>
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            className={styles['retry-button']}
            onClick={this.handleRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
