import { useState, useEffect } from 'react'
import type { BanzukePayload, BanzukeSnapshot, Rikishi } from '../types/banzuke'
import { isValidBanzukeSnapshot } from '../utils/validation'

// Use Vite's BASE_URL to handle deployment base paths (e.g., /banzuke-app/)
const DATA_URL = `${import.meta.env.BASE_URL}latest-banzuke.json`
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-data.json`
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface UseBanzukeResult {
  data: BanzukePayload | null
  loading: boolean
  error: string | null
  sourceLabel: string
}

/** Error types for more specific error handling */
type FetchErrorType = 'network' | 'http' | 'parse' | 'validation' | 'unknown'

class BanzukeError extends Error {
  type: FetchErrorType

  constructor(message: string, type: FetchErrorType) {
    super(message)
    this.name = 'BanzukeError'
    this.type = type
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
        return 'Data error: The banzuke data structure is invalid or corrupted.'
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
      const response = await fetch(url, options)
      if (response.ok) {
        return response
      }
      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new BanzukeError(
          `HTTP ${response.status}: ${response.statusText || 'Client error'}`,
          'http'
        )
      }
      lastError = new BanzukeError(
        `HTTP ${response.status}: ${response.statusText || 'Server error'}`,
        'http'
      )
    } catch (err) {
      if (err instanceof BanzukeError) {
        lastError = err
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        // Network errors (offline, CORS, etc.)
        lastError = new BanzukeError('Failed to connect to server', 'network')
      } else {
        lastError = new BanzukeError(
          err instanceof Error ? err.message : String(err),
          'unknown'
        )
      }
    }

    // Wait before retrying (exponential backoff)
    if (attempt < retries - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
      )
    }
  }

  throw lastError || new BanzukeError('Fetch failed after retries', 'network')
}

/**
 * Merges English and Japanese payloads into a single payload with bilingual data.
 * Each rikishi gets both shikona_en and shikona_jp fields.
 */
function mergePayloads(snapshot: BanzukeSnapshot): BanzukePayload | null {
  const enPayload = snapshot.payloads?.['en']
  const jpPayload = snapshot.payloads?.['jp']
  
  // Use English as base, fall back to Japanese, then legacy payload
  const basePayload = enPayload || jpPayload || snapshot.payload
  if (!basePayload) return null

  // If we only have one language, return as-is
  if (!enPayload || !jpPayload) {
    return basePayload
  }

  // Create a lookup of JP rikishi by ID for fast merging
  const jpLookup = new Map<string | number, Rikishi>()
  jpPayload.BanzukeTable.forEach((r) => {
    jpLookup.set(r.rikishi_id, r)
  })

  // Merge: add both language names to each rikishi
  const mergedTable: Rikishi[] = enPayload.BanzukeTable.map((enRikishi) => {
    const jpRikishi = jpLookup.get(enRikishi.rikishi_id)
    return {
      ...enRikishi,
      shikona_en: enRikishi.shikona,
      shikona_jp: jpRikishi?.shikona || enRikishi.shikona,
      banzuke_name_en: enRikishi.banzuke_name,
      banzuke_name_jp: jpRikishi?.banzuke_name || enRikishi.banzuke_name,
    }
  })

  return {
    ...enPayload,
    BanzukeTable: mergedTable,
  }
}

function describeSnapshot(snapshot: BanzukeSnapshot): string {
  const parts = ['Static snapshot']
  if (snapshot?.fetchedAt) {
    try {
      const date = new Date(snapshot.fetchedAt)
      parts.push(
        Number.isNaN(date.getTime()) ? snapshot.fetchedAt : date.toLocaleString()
      )
    } catch {
      parts.push(snapshot.fetchedAt)
    }
  }
  return parts.join(' • ')
}

export function useBanzuke(): UseBanzukeResult {
  const [data, setData] = useState<BanzukePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadBanzuke() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchWithRetry(DATA_URL, { cache: 'no-store' })

        let fetchedSnapshot: unknown
        try {
          fetchedSnapshot = await response.json()
        } catch {
          throw new BanzukeError('Invalid JSON response from server', 'parse')
        }

        // Validate the response structure
        if (!isValidBanzukeSnapshot(fetchedSnapshot)) {
          throw new BanzukeError(
            'Banzuke data structure is invalid or corrupted',
            'validation'
          )
        }

        const payload = mergePayloads(fetchedSnapshot)
        if (!payload) {
          throw new BanzukeError(
            'No data available in snapshot',
            'validation'
          )
        }

        if (!cancelled) {
          setData(payload)
          setSourceLabel(describeSnapshot(fetchedSnapshot))
          setLoading(false)
        }
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        console.warn('Static snapshot load failed:', errorMessage, err)

        try {
          const fallbackResponse = await fetchWithRetry(SAMPLE_URL)

          let fallbackPayload: unknown
          try {
            fallbackPayload = await fallbackResponse.json()
          } catch {
            throw new BanzukeError('Invalid sample data format', 'parse')
          }

          if (!cancelled) {
            setData(fallbackPayload as BanzukePayload)
            setSourceLabel('Sample data')
            setError('Live data unavailable. Showing bundled sample data.')
            setLoading(false)
          }
        } catch (fallbackErr) {
          const fallbackMessage = getErrorMessage(fallbackErr)
          console.error('Unable to load bundled sample data:', fallbackMessage)
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
    }
  }, [])

  return { data, loading, error, sourceLabel }
}
