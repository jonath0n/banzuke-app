import { useState, useEffect, useRef } from 'react'
import type { BanzukePayload, BanzukeSnapshot, Language } from '../types/banzuke'
import {
  normalizeLanguage,
  pickPayloadForLanguage,
  describeSnapshot,
  DEFAULT_LANGUAGE,
} from '../utils/formatting'

const DATA_URL = '/latest-banzuke.json'
const SAMPLE_URL = '/sample-data.json'

interface UseBanzukeResult {
  data: BanzukePayload | null
  loading: boolean
  error: string | null
  sourceLabel: string
  language: Language
  setLanguage: (lang: Language) => void
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE
  const searchParams = new URLSearchParams(window.location.search)
  const langParam = searchParams.get('lang')
  return normalizeLanguage(langParam)
}

export function useBanzuke(): UseBanzukeResult {
  const [data, setData] = useState<BanzukePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const cachedSnapshot = useRef<BanzukeSnapshot | null>(null)

  const setLanguage = (lang: Language) => {
    const normalized = normalizeLanguage(lang)
    setLanguageState(normalized)
    updateLanguageContext(normalized)
  }

  useEffect(() => {
    let cancelled = false

    async function loadBanzuke() {
      setLoading(true)
      setError(null)

      try {
        if (!cachedSnapshot.current) {
          const response = await fetch(DATA_URL, { cache: 'no-store' })
          if (!response.ok) {
            throw new Error(`Static JSON failed with ${response.status}`)
          }
          cachedSnapshot.current = await response.json()
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
          const fallbackResponse = await fetch(SAMPLE_URL)
          if (!fallbackResponse.ok) {
            throw new Error(`Fallback fetch failed with ${fallbackResponse.status}`)
          }
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
