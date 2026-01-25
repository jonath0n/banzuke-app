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

/**
 * Fetches data with retry logic for transient failures.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) {
        return response
      }
      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Request failed with ${response.status}`)
      }
      lastError = new Error(`Request failed with ${response.status}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
    
    // Wait before retrying (exponential backoff)
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
    }
  }
  
  throw lastError || new Error('Fetch failed after retries')
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

  useEffect(() => {
    let cancelled = false

    async function loadBanzuke() {
      setLoading(true)
      setError(null)

      try {
        if (!cachedSnapshot.current) {
          const response = await fetchWithRetry(DATA_URL, { cache: 'no-store' })
          const snapshot = await response.json()
          
          // Validate the response structure
          if (!isValidBanzukeSnapshot(snapshot)) {
            throw new Error('Invalid banzuke data structure received')
          }
          
          cachedSnapshot.current = snapshot
        }

        const payload = pickPayloadForLanguage(cachedSnapshot.current!, language)
        if (!payload) {
          throw new Error(`No payload available for language "${language}"`)
        }

        if (!cancelled) {
          setData(payload)
          setSourceLabel(describeSnapshot(cachedSnapshot.current!, language))
          setLoading(false)
        }
      } catch (err) {
        console.warn('Static snapshot load failed', err)

        try {
          const fallbackResponse = await fetchWithRetry(SAMPLE_URL)
          const fallbackPayload = await fallbackResponse.json()

          if (!cancelled) {
            setData(fallbackPayload)
            setSourceLabel('Sample data')
            setError('Static snapshot unavailable. Showing bundled sample data.')
            setLoading(false)
          }
        } catch (fallbackErr) {
          console.error('Unable to load bundled sample data', fallbackErr)
          if (!cancelled) {
            setError('Could not load the banzuke. Please refresh to try again.')
            setLoading(false)
          }
        }
      }
    }

    updateLanguageContext(language)
    loadBanzuke()

    return () => {
      cancelled = true
    }
  }, [language])

  return { data, loading, error, sourceLabel, language, setLanguage }
}

function updateLanguageContext(language: Language) {
  if (typeof document === 'undefined') return

  if (language === 'jp') {
    document.documentElement.lang = 'ja'
    document.body.classList.add('lang-jp')
  } else {
    document.documentElement.lang = 'en'
    document.body.classList.remove('lang-jp')
  }
}
