import { useState, useCallback, useMemo } from 'react'
import { useBanzuke } from './hooks/useBanzuke'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Hero } from './components/Hero/Hero'
import { BanzukeGrid, BanzukeGridSkeleton } from './components/BanzukeGrid/BanzukeGrid'
import { WrestlerModal } from './components/WrestlerModal/WrestlerModal'
import { Footer } from './components/Footer/Footer'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { ScrollToTop } from './components/ScrollToTop/ScrollToTop'
import type { Rikishi } from './types/banzuke'
import styles from './App.module.css'

function App() {
  return (
    <LanguageProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </LanguageProvider>
  )
}

const EMPTY: Rikishi[] = []

/** Case-insensitive substring match across names, readings, stables and regions. */
function matchesQuery(rikishi: Rikishi, query: string): boolean {
  const q = query.toLowerCase()
  const haystack = [
    rikishi.shikona.en,
    rikishi.shikona.jp,
    rikishi.reading ?? '',
    rikishi.heya.en,
    rikishi.heya.jp,
    rikishi.pref.en,
    rikishi.pref.jp,
  ]
  return haystack.some((value) => value.toLowerCase().includes(q))
}

function AppContent() {
  const { data, loading, error } = useBanzuke()
  const { language, setLanguage } = useLanguage()
  const [selectedRikishi, setSelectedRikishi] = useState<Rikishi | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelectRikishi = useCallback((rikishi: Rikishi) => {
    setSelectedRikishi(rikishi)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedRikishi(null)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
  }, [])

  const handleToggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'jp' : 'en')
  }, [language, setLanguage])

  const handleFocusSearch = useCallback(() => {
    const input = document.querySelector('[data-search-input]') as HTMLInputElement
    input?.focus()
  }, [])

  const handleEscape = useCallback(() => {
    if (selectedRikishi) {
      setSelectedRikishi(null)
    } else if (searchQuery) {
      setSearchQuery('')
    }
  }, [selectedRikishi, searchQuery])

  useKeyboardShortcuts({
    onToggleLanguage: handleToggleLanguage,
    onFocusSearch: handleFocusSearch,
    onEscape: handleEscape,
  })

  const allRows = data?.rikishi ?? EMPTY
  const trimmedQuery = searchQuery.trim()
  const filteredRows = useMemo(
    () => (trimmedQuery ? allRows.filter((r) => matchesQuery(r, trimmedQuery)) : allRows),
    [allRows, trimmedQuery]
  )

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to the banzuke
      </a>
      <Hero data={data} />
      <main id="main" tabIndex={-1}>
        {data && allRows.length > 0 && (
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            totalCount={allRows.length}
            filteredCount={trimmedQuery ? filteredRows.length : 0}
          />
        )}
        {loading && !data && <BanzukeGridSkeleton />}
        {error && !data && (
          <div role="alert" className={`${styles.status} ${styles.error}`}>
            {error}
          </div>
        )}
        {error && data && (
          <div role="status" className={`${styles.status} ${styles.warning}`}>
            {error}
          </div>
        )}
        {data && (
          <ErrorBoundary>
            <BanzukeGrid
              rows={filteredRows}
              onSelectRikishi={handleSelectRikishi}
              emptyReason={trimmedQuery ? 'no-matches' : 'no-data'}
              onClearSearch={handleClearSearch}
            />
          </ErrorBoundary>
        )}
      </main>
      <Footer />
      <ScrollToTop />
      <WrestlerModal rikishi={selectedRikishi} onClose={handleCloseModal} />
    </>
  )
}

function SearchBar({
  query,
  onQueryChange,
  totalCount,
  filteredCount,
}: {
  query: string
  onQueryChange: (q: string) => void
  totalCount: number
  filteredCount: number
}) {
  const isFiltering = query.trim().length > 0

  return (
    <div className={styles.searchBar} role="search">
      <div className={styles.searchInputWrapper}>
        <svg
          className={styles.searchIcon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search wrestlers, stables, or regions..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search wrestlers"
          aria-keyshortcuts="/"
          autoComplete="off"
          data-search-input
        />
        {isFiltering && (
          <button
            className={styles.searchClear}
            onClick={() => onQueryChange('')}
            type="button"
            aria-label="Clear search"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
      <span className={styles.searchCount} role="status" aria-live="polite">
        {isFiltering ? `${filteredCount} of ${totalCount} wrestlers` : ''}
      </span>
    </div>
  )
}

export default App
