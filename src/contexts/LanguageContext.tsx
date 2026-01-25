import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Language } from '../types/banzuke'

const LANGUAGE_STORAGE_KEY = 'banzuke-language'
const DEFAULT_LANGUAGE: Language = 'en'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'jp' ? 'jp' : 'en'
}

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

function saveLanguagePreference(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Silently fail if localStorage is unavailable
  }
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

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  const setLanguage = useCallback((lang: Language) => {
    const normalized = normalizeLanguage(lang)
    setLanguageState(normalized)
    saveLanguagePreference(normalized)
  }, [])

  useEffect(() => {
    updateLanguageContext(language)
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
