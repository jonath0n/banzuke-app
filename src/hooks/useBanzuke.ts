import { useEffect, useReducer } from 'react'
import type { Banzuke, DataSource } from '../types/banzuke'
import { validateSnapshot } from '../data/schema'
import { normalizeSnapshot } from '../data/normalize'

// Use Vite's BASE_URL to handle deployment base paths (e.g., /banzuke-app/)
const DATA_URL = `${import.meta.env.BASE_URL}latest-banzuke.json`
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-data.json`
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
/** localStorage key for the last good banzuke; bump when the model changes. */
export const CACHE_KEY = 'banzuke:v2:makuuchi'

/**
 * What went wrong, if anything. The UI turns these into localized messages.
 * - sample: live data failed, the bundled sample is shown
 * - stale: live data failed, the last saved copy is shown
 * - unavailable: nothing could be loaded
 */
export type DataProblem = 'sample' | 'stale' | 'unavailable'

export interface BanzukeState {
  status: 'loading' | 'ready' | 'error'
  data: Banzuke | null
  /** True while a saved copy is displayed and a fresh fetch is in flight. */
  refreshing: boolean
  problem: DataProblem | null
}

type Action =
  | { type: 'cached'; data: Banzuke }
  | { type: 'loaded'; data: Banzuke }
  | { type: 'sample'; data: Banzuke }
  | { type: 'failed' }

function reducer(state: BanzukeState, action: Action): BanzukeState {
  switch (action.type) {
    case 'cached':
      return { status: 'ready', data: action.data, refreshing: true, problem: null }
    case 'loaded':
      return { status: 'ready', data: action.data, refreshing: false, problem: null }
    case 'sample':
      return { status: 'ready', data: action.data, refreshing: false, problem: 'sample' }
    case 'failed':
      return state.data
        ? { ...state, refreshing: false, problem: 'stale' }
        : { status: 'error', data: null, refreshing: false, problem: 'unavailable' }
  }
}

const initialState: BanzukeState = {
  status: 'loading',
  data: null,
  refreshing: false,
  problem: null,
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

function describeError(err: unknown): string {
  if (err instanceof BanzukeError) return `${err.type}: ${err.message}`
  if (err instanceof Error) return err.message
  return String(err)
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
  const response = await fetchWithRetry(url, { signal }, retries)

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

/** The last good live banzuke saved in this browser, if any. */
export function readCachedBanzuke(): Banzuke | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as Banzuke).rikishi) &&
      (parsed as Banzuke).rikishi.length > 0 &&
      typeof (parsed as Banzuke).basho === 'object' &&
      typeof (parsed as Banzuke).fetchedAt === 'string'
    ) {
      return parsed as Banzuke
    }
  } catch {
    // Unavailable or corrupt storage: behave as if nothing was cached.
  }
  return null
}

function writeCachedBanzuke(banzuke: Banzuke): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(banzuke))
  } catch {
    // Quota or privacy mode: caching is best effort.
  }
}

/**
 * Loads the banzuke. Shows the last saved copy immediately when there is
 * one, then refreshes from the live snapshot; falls back to the bundled
 * sample when nothing else is available.
 */
export function useBanzuke(): BanzukeState {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const cached = readCachedBanzuke()
    if (cached) dispatch({ type: 'cached', data: cached })

    async function load() {
      try {
        const live = await loadSnapshot(DATA_URL, 'live', controller.signal)
        if (cancelled) return
        writeCachedBanzuke(live)
        dispatch({ type: 'loaded', data: live })
        return
      } catch (err) {
        if (isAbort(err)) return
        console.warn('Live banzuke unavailable:', describeError(err))
      }

      if (cached) {
        if (!cancelled) dispatch({ type: 'failed' })
        return
      }

      try {
        const sample = await loadSnapshot(SAMPLE_URL, 'sample', controller.signal, 1)
        if (!cancelled) dispatch({ type: 'sample', data: sample })
      } catch (err) {
        if (isAbort(err)) return
        console.error('Bundled sample data unavailable:', describeError(err))
        if (!cancelled) dispatch({ type: 'failed' })
      }
    }

    load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return state
}
