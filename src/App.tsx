import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBanzuke } from './hooks/useBanzuke'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { clearUrlParam, useUrlParam } from './hooks/useUrlState'
import { useStrings } from './i18n/useStrings'
import { buildSearchIndex, filterRikishi } from './utils/search'
import { Hero } from './components/Hero/Hero'
import { SearchBar } from './components/SearchBar/SearchBar'
import { DivisionTabs } from './components/DivisionTabs/DivisionTabs'
import { PANEL_ID, tabId } from './components/DivisionTabs/ids'
import { BanzukeGrid, BanzukeGridSkeleton } from './components/BanzukeGrid/BanzukeGrid'
import { WrestlerModal } from './components/WrestlerModal/WrestlerModal'
import { ShortcutsHelp } from './components/ShortcutsHelp/ShortcutsHelp'
import { Footer } from './components/Footer/Footer'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { ScrollToTop } from './components/ScrollToTop/ScrollToTop'
import type { BanzukeSet, Division, Rikishi } from './types/banzuke'
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

/** The division named in the URL, when the data actually has it. */
function resolveDivision(param: string | null, data: BanzukeSet | null): Division {
  return param === 'juryo' && data?.juryo ? 'juryo' : 'makuuchi'
}

function AppContent() {
  const { data, status, problem } = useBanzuke()
  const { language, setLanguage } = useLanguage()
  const strings = useStrings()
  const [searchQuery, setSearchQuery] = useUrlParam('q')
  const [divisionParam, setDivisionParam] = useUrlParam('div')
  const [selectedId, setSelectedId] = useUrlParam('rikishi', 'push')
  const [helpOpen, setHelpOpen] = useState(false)

  const division = resolveDivision(divisionParam, data)
  const banzuke = data ? (division === 'juryo' ? data.juryo : data.makuuchi) : null
  const allRows = banzuke?.rikishi ?? EMPTY
  const query = searchQuery ?? ''
  const index = useMemo(() => buildSearchIndex(allRows), [allRows])
  const filteredRows = useMemo(() => filterRikishi(index, query), [index, query])
  const isFiltering = query.trim().length > 0

  // A deep link may point at a wrestler in either division.
  const selectedRikishi = useMemo(() => {
    if (!selectedId || !data) return null
    const everyone = data.juryo ? [...data.makuuchi.rikishi, ...data.juryo.rikishi] : allRows
    return everyone.find((r) => String(r.id) === selectedId) ?? null
  }, [allRows, data, selectedId])

  const counts = useMemo(
    () => ({
      makuuchi: data?.makuuchi.rikishi.length,
      juryo: data?.juryo?.rikishi.length,
    }),
    [data]
  )
  const showTabs = data?.juryo != null

  const handleSelectRikishi = useCallback(
    (rikishi: Rikishi) => setSelectedId(String(rikishi.id)),
    [setSelectedId]
  )

  // Undo the pushed entry (or replace a deep link) so Back never reopens it.
  const handleCloseModal = useCallback(() => clearUrlParam('rikishi'), [])

  const handleClearSearch = useCallback(() => setSearchQuery(null), [setSearchQuery])

  const handleChangeDivision = useCallback(
    (next: Division) => setDivisionParam(next === 'makuuchi' ? null : next),
    [setDivisionParam]
  )

  const handleToggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'jp' : 'en')
  }, [language, setLanguage])

  const handleFocusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('[data-search-input]')
    input?.focus()
    input?.select()
  }, [])

  const handleEscape = useCallback(() => {
    // The native <dialog> closes itself on Escape and reports through onClose.
    if (selectedRikishi) return
    if (helpOpen) setHelpOpen(false)
    else if (query) setSearchQuery(null)
  }, [selectedRikishi, helpOpen, query, setSearchQuery])

  const handleToggleHelp = useCallback(() => setHelpOpen((open) => !open), [])

  useKeyboardShortcuts({
    onToggleLanguage: handleToggleLanguage,
    onFocusSearch: handleFocusSearch,
    onEscape: handleEscape,
    onToggleHelp: handleToggleHelp,
  })

  useEffect(() => {
    const bashoName = banzuke ? banzuke.basho.name[language] || banzuke.basho.name.en : ''
    document.title = bashoName ? `${strings.appTitle} · ${bashoName}` : strings.appTitle
  }, [banzuke, language, strings.appTitle])

  const problemMessage =
    problem === 'sample'
      ? strings.errorSample
      : problem === 'stale'
        ? strings.errorStale
        : problem === 'unavailable'
          ? strings.errorNone
          : null

  return (
    <>
      <a href="#main" className="skip-link" data-print="hide">
        {strings.skipLink}
      </a>
      <Hero data={banzuke} />
      <main id="main" tabIndex={-1}>
        {banzuke && allRows.length > 0 && (
          <SearchBar
            value={query}
            onChange={(value) => setSearchQuery(value || null)}
            totalCount={allRows.length}
            matchedCount={filteredRows.length}
          />
        )}
        {status === 'loading' && <BanzukeGridSkeleton />}
        {problemMessage && !data && (
          <div role="alert" className={`${styles.status} ${styles.error}`}>
            {problemMessage}
          </div>
        )}
        {problemMessage && data && (
          <div role="status" className={`${styles.status} ${styles.warning}`}>
            {problemMessage}
          </div>
        )}
        {showTabs && (
          <DivisionTabs value={division} onChange={handleChangeDivision} counts={counts} />
        )}
        {banzuke && (
          <ErrorBoundary>
            <div
              id={PANEL_ID}
              role={showTabs ? 'tabpanel' : undefined}
              aria-labelledby={showTabs ? tabId(division) : undefined}
            >
              <BanzukeGrid
                key={division}
                rows={filteredRows}
                onSelectRikishi={handleSelectRikishi}
                emptyReason={isFiltering ? 'no-matches' : 'no-data'}
                onClearSearch={handleClearSearch}
              />
            </div>
          </ErrorBoundary>
        )}
        {banzuke && <ShortcutsHelp open={helpOpen} onToggle={setHelpOpen} />}
      </main>
      <Footer />
      <ScrollToTop />
      <WrestlerModal rikishi={selectedRikishi} onClose={handleCloseModal} />
    </>
  )
}

export default App
