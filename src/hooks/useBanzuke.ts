import { useState, useEffect, useRef, useCallback } from 'react'
import type { BanzukePayload, BanzukeSnapshot, Language } from '../types/banzuke'
import {
  normalizeLanguage,
  pickPayloadForLanguage,
  describeSnapshot,
  DEFAULT_LANGUAGE,
} from '../utils/formatting'
import { isValidBanzukeSnapshot } from '../utils/validation'

// Use Vite's BASE_URL to handle deployment base paths (e.g., /banzuke-app/)
const DATA_URL = `${import.meta.env.BASE_URL}latest-banzuke.json`
const SAMPLE_URL = `${import.meta.env.BASE_URL}sample-data.json`
const LANGUAGE_STORAGE_KEY = 'banzuke-language'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

interface UseBanzukeResult {
  data: BanzukePayload | null
  loading: boolean
  error: string | null
  sourceLabel: string
  language: Language
  setLanguage: (lang: Language) => void
}

/**
 * Retrieves the initial language preference from localStorage, URL params, or default.
 */
function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  
  // Check URL params first (allows sharing links with language)
  const searchParams = new URLSearchParams(window.location.search)
  const langParam = searchParams.get('lang')
  if (langParam) {
    return normalizeLanguage(langParam)
  }
  
  // Then check localStorage
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored) {
      return normalizeLanguage(stored)
    }
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
  
  return DEFAULT_LANGUAGE
}

/**
 * Persists language preference to localStorage.
 */
function saveLanguagePreference(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/** Error types for more specific error handling */
type FetchErrorType = 'network' | 'http' | 'parse' | 'validation' | 'abort' | 'unknown'

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
        throw new BanzukeError('Request aborted', 'abort')
      }
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
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new BanzukeError('Request aborted', 'abort')
      }
      if (err instanceof BanzukeError) {
        if (err.type === 'abort') {
          throw err
        }
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
    if (attempt < retries - 1 && lastError?.type !== 'abort') {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1))
      )
    }
  }

  throw lastError || new BanzukeError('Fetch failed after retries', 'network')
}

export function useBanzuke(): UseBanzukeResult {
  const [data, setData] = useState<BanzukePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const cachedSnapshot = useRef<BanzukeSnapshot | null>(null)

  const setLanguage = useCallback((lang: Language) => {
    const normalized = normalizeLanguage(lang)
    setLanguageState(normalized)
    saveLanguagePreference(normalized)
    updateLanguageContext(normalized)
  }, [])

  // Handle language context updates
  useEffect(() => {
    updateLanguageContext(language)
  }, [language])

  // Handle data fetching and language-based payload selection
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function loadBanzuke() {
      // If we have cached data, use it without showing loading state
      const snapshot = cachedSnapshot.current
      if (snapshot) {
        const payload = pickPayloadForLanguage(snapshot, language)
        if (payload) {
          setData(payload)
          setSourceLabel(describeSnapshot(snapshot, language))
          setError(null)
          return
        }
      }

      // No cached data, need to fetch
      setLoading(true)
      setError(null)

      try {
        const response = await fetchWithRetry(DATA_URL, {
          cache: 'no-store',
          signal: controller.signal,
        })

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

        // Cache the validated snapshot
        cachedSnapshot.current = fetchedSnapshot

        const payload = pickPayloadForLanguage(fetchedSnapshot, language)
        if (!payload) {
          throw new BanzukeError(
            `No data available for language "${language}"`,
            'validation'
          )
        }

        if (!cancelled) {
          setData(payload)
          setSourceLabel(describeSnapshot(fetchedSnapshot, language))
          setLoading(false)
        }
      } catch (err) {
        if (err instanceof BanzukeError && err.type === 'abort') {
          return
        }
        const errorMessage = getErrorMessage(err)
        console.warn('Static snapshot load failed:', errorMessage, err)

        try {
          const fallbackResponse = await fetchWithRetry(SAMPLE_URL, {
            signal: controller.signal,
          })

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
          if (fallbackErr instanceof BanzukeError && fallbackErr.type === 'abort') {
            return
          }
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
      controller.abort()
    }
  }, [language])

  return { data, loading, error, sourceLabel, language, setLanguage }
}

function updateLanguageContext(language: Language) {
  if (typeof document === 'undefined') return

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'useBanzuke.ts:updateLanguageContext:before',message:'Update language context start',data:{language,bodyClassList:Array.from(document.body.classList),htmlLang:document.documentElement.lang},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (language === 'jp') {
    document.documentElement.lang = 'ja'
    document.body.classList.add('lang-jp')
  } else {
    document.documentElement.lang = 'en'
    document.body.classList.remove('lang-jp')
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'useBanzuke.ts:updateLanguageContext:after',message:'Update language context end',data:{language,bodyClassList:Array.from(document.body.classList),htmlLang:document.documentElement.lang},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}
