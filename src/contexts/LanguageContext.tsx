import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Language } from '../types/banzuke'
import { setUrlParam } from '../hooks/useUrlState'

const LANGUAGE_STORAGE_KEY = 'banzuke-language'
const DEFAULT_LANGUAGE: Language = 'en'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function normalizeLanguage(value: string | null | undefined): Language {
  return value?.toLowerCase() === 'jp' || value?.toLowerCase() === 'ja' ? 'jp' : 'en'
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE

  // The URL wins (shared links), then the stored preference.
  const langParam = new URLSearchParams(window.location.search).get('lang')
  if (langParam) {
    return normalizeLanguage(langParam)
  }

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

function saveLanguagePreference(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function updateDocumentLanguage(language: Language) {
  if (typeof document === 'undefined') return

  if (language === 'jp') {
    document.documentElement.lang = 'ja'
    document.body.classList.add('lang-jp')
  } else {
    document.documentElement.lang = 'en'
    document.body.classList.remove('lang-jp')
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = useCallback((lang: Language) => {
    const normalized = normalizeLanguage(lang)
    setLanguageState(normalized)
    saveLanguagePreference(normalized)
    // Keep the URL shareable in the chosen language.
    setUrlParam('lang', normalized)
  }, [])

  useEffect(() => {
    updateDocumentLanguage(language)
  }, [language])

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
