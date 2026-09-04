import { useState, useEffect } from 'react'
import type { Banzuke, DataSource } from '../types/banzuke'
import { validateSnapshot } from '../data/schema'
import { normalizeSnapshot } from '../data/normalize'

// Use Vite's BASE_URL to handle deployment base paths (e.g., /banzuke-app/)
const DATA_URL = `${import.meta.env.BASE_URL}latest-banzuke.json`
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-data.json`
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface UseBanzukeResult {
  data: Banzuke | null
  loading: boolean
  error: string | null
}

/** Error types for more specific error handling */
type FetchErrorType = 'network' | 'http' | 'parse' | 'validation' | 'abort' | 'unknown'

class BanzukeError extends Error {
  type: FetchErrorType
  /** Whether another attempt could plausibly succeed. */
  retryable: boolean

  constructor(message: string, type: FetchErrorType, retryable = true) {
    super(message)
    this.name = 'BanzukeError'
    this.type = type
    this.retryable = retryable
  }
}

/**
 * Converts an error to a user-friendly message with context.
 */
function getErrorMessage(err: unknown): string {
  if (err instanceof BanzukeError) {
    switch (err.type) {
      case 'network':
        return 'Network error: Unable to connect. Check your internet connection.'
      case 'http':
        return `Server error: ${err.message}`
      case 'parse':
        return 'Data error: The server returned invalid data format.'
      case 'validation':
        return `Data error: ${err.message}`
      case 'abort':
        return 'Request was cancelled.'
      default:
        return err.message
    }
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'An unexpected error occurred.'
}

/**
 * Fetches data with retry logic for transient failures.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: BanzukeError | null = null

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (options?.signal?.aborted) {
        throw new BanzukeError('Request aborted', 'abort', false)
      }
      const response = await fetch(url, options)
      if (response.ok) {
        return response
      }
      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new BanzukeError(
          `HTTP ${response.status}: ${response.statusText || 'Client error'}`,
          'http',
          false
        )
      }
      lastError = new BanzukeError(
        `HTTP ${response.status}: ${response.statusText || 'Server error'}`,
        'http'
      )
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new BanzukeError('Request aborted', 'abort', false)
      }
      if (err instanceof BanzukeError) {
        if (!err.retryable) {
          throw err
        }
        lastError = err
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        // Network errors (offline, CORS, etc.)
        lastError = new BanzukeError('Failed to connect to server', 'network')
      } else {
        lastError = new BanzukeError(err instanceof Error ? err.message : String(err), 'unknown')
      }
    }

    // Wait before retrying (exponential backoff)
    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
    }
  }

  throw lastError || new BanzukeError('Fetch failed after retries', 'network')
}

/**
 * Fetches, validates and normalizes a snapshot file.
 */
async function loadSnapshot(
  url: string,
  source: DataSource,
  signal: AbortSignal,
  retries = MAX_RETRIES
): Promise<Banzuke> {
  const response = await fetchWithRetry(url, { cache: 'no-store', signal }, retries)

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    throw new BanzukeError('Invalid JSON response from server', 'parse')
  }

  const validation = validateSnapshot(parsed)
  if (!validation.ok) {
    throw new BanzukeError(validation.errors[0] ?? 'Snapshot is invalid', 'validation')
  }

  const banzuke = normalizeSnapshot(validation.snapshot, source)
  if (banzuke.rikishi.length === 0) {
    throw new BanzukeError('No wrestlers in snapshot', 'validation')
  }
  return banzuke
}

function isAbort(err: unknown): boolean {
  return err instanceof BanzukeError && err.type === 'abort'
}

export function useBanzuke(): UseBanzukeResult {
  const [data, setData] = useState<Banzuke | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadBanzuke() {
      setLoading(true)
      setError(null)

      try {
        const banzuke = await loadSnapshot(DATA_URL, 'live', controller.signal)
        if (!cancelled) {
          setData(banzuke)
          setLoading(false)
        }
      } catch (err) {
        if (isAbort(err)) return
        console.warn('Static snapshot load failed:', getErrorMessage(err), err)

        try {
          const sample = await loadSnapshot(SAMPLE_URL, 'sample', controller.signal, 1)
          if (!cancelled) {
            setData(sample)
            setError('Live data unavailable. Showing bundled sample data.')
            setLoading(false)
          }
        } catch (fallbackErr) {
          if (isAbort(fallbackErr)) return
          console.error('Unable to load bundled sample data:', getErrorMessage(fallbackErr))
          if (!cancelled) {
            setError(
              'Could not load the banzuke. Please check your connection and refresh to try again.'
            )
            setLoading(false)
          }
        }
      }
    }

    loadBanzuke()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return { data, loading, error }
}
