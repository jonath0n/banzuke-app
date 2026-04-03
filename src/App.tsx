import { useState, useCallback } from 'react'
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

function AppContent() {
  const { data, loading, error, sourceLabel } = useBanzuke()
  const { language, setLanguage } = useLanguage()
  const [selectedRikishi, setSelectedRikishi] = useState<Rikishi | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSelectRikishi = useCallback((rikishi: Rikishi) => {
    setSelectedRikishi(rikishi)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedRikishi(null)
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

  // Filter rows based on search query
  const allRows = data?.BanzukeTable || []
  const filteredRows = searchQuery.trim()
    ? allRows.filter((r) => {
        const q = searchQuery.toLowerCase()
        return (
          r.shikona?.toLowerCase().includes(q) ||
          r.shikona_en?.toLowerCase().includes(q) ||
          r.shikona_jp?.includes(searchQuery) ||
          r.heya_name?.toLowerCase().includes(q) ||
          r.pref_name?.toLowerCase().includes(q)
        )
      })
    : allRows

  return (
    <>
      <Hero data={data} sourceLabel={sourceLabel} />
      <main>
        {data && allRows.length > 0 && (
          <SearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            totalCount={allRows.filter((r) => r.shikona?.trim()).length}
            filteredCount={
              searchQuery.trim() ? filteredRows.filter((r) => r.shikona?.trim()).length : 0
            }
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
            <BanzukeGrid rows={filteredRows} onSelectRikishi={handleSelectRikishi} />
          </ErrorBoundary>
        )}
      </main>
      <Footer />
      <ScrollToTop />
      <WrestlerModal rikishi={selectedRikishi} onClose={handleCloseModal} />
    </>
  )
}

/* Inline SearchBar to avoid circular dependency issues — will extract if needed */
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
    <div className={styles.searchBar}>
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
          type="text"
          className={styles.searchInput}
          placeholder="Search wrestlers, stables, or regions..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Search wrestlers"
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
      {isFiltering && (
        <span className={styles.searchCount}>
          {filteredCount} of {totalCount} wrestlers
        </span>
      )}
    </div>
  )
}

export default App
