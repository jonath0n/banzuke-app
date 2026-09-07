import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBanzuke } from './hooks/useBanzuke'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { clearUrlParam, useUrlParam } from './hooks/useUrlState'
import { useStrings } from './i18n/useStrings'
import { buildSearchIndex, matchingIds } from './utils/search'
import { Hero } from './components/Hero/Hero'
import { SearchBar } from './components/SearchBar/SearchBar'
import { DivisionTabs } from './components/DivisionTabs/DivisionTabs'
import { PANEL_ID, tabId } from './components/DivisionTabs/ids'
import { BanzukeGrid, BanzukeGridSkeleton } from './components/BanzukeGrid/BanzukeGrid'
import { BanzukeSheet } from './components/BanzukeSheet/BanzukeSheet'
import { ViewToggle, type View } from './components/ViewToggle/ViewToggle'
import { WrestlerModal } from './components/WrestlerModal/WrestlerModal'
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

/** How long the entrance cascade may run after the first sheet renders. */
const ENTRANCE_MS = 1200

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
  const [viewParam, setViewParam] = useUrlParam('view')
  const [selectedId, setSelectedId] = useUrlParam('rikishi', 'push')
  const [helpOpen, setHelpOpen] = useState(false)
  // Entrance animations play once, on the first sheet; later renders (tab
  // switches, search) must not replay the cascade.
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (!data || entered) return
    const timer = window.setTimeout(() => setEntered(true), ENTRANCE_MS)
    return () => window.clearTimeout(timer)
  }, [data, entered])

  // The sheet is the default: the first thing to see is the artifact itself.
  const view: View = viewParam === 'list' ? 'list' : 'sheet'
  const division = resolveDivision(divisionParam, data)
  const banzuke = data ? (division === 'juryo' ? data.juryo : data.makuuchi) : null
  const allRows = banzuke?.rikishi ?? EMPTY
  const query = searchQuery ?? ''

  // The search runs over both divisions so the tabs can say where the matches are.
  const indexes = useMemo(
    () => ({
      makuuchi: buildSearchIndex(data?.makuuchi.rikishi ?? EMPTY),
      juryo: buildSearchIndex(data?.juryo?.rikishi ?? EMPTY),
    }),
    [data]
  )
  const matches = useMemo(
    () => ({
      makuuchi: matchingIds(indexes.makuuchi, query),
      juryo: data?.juryo ? matchingIds(indexes.juryo, query) : null,
    }),
    [indexes, query, data]
  )
  const highlight = matches[division]
  const isFiltering = highlight !== null
  const matchedCount = highlight ? highlight.size : allRows.length
  const otherDivision: Division = division === 'makuuchi' ? 'juryo' : 'makuuchi'
  const otherHits = matches[otherDivision]?.size ?? 0

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
  const matchedByDivision = isFiltering
    ? { makuuchi: matches.makuuchi?.size, juryo: matches.juryo?.size }
    : undefined
  const showTabs = data?.juryo != null
  // Nothing on the sheet: no data at all, or a search this division cannot answer.
  const nothingToShow = allRows.length === 0 || (highlight !== null && highlight.size === 0)

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

  // 'sheet' is the default, so it stays out of the URL.
  const handleChangeView = useCallback(
    (next: View) => setViewParam(next === 'sheet' ? null : next),
    [setViewParam]
  )

  const otherMatches = useMemo(
    () =>
      isFiltering && otherHits > 0
        ? {
            division: otherDivision,
            count: otherHits,
            onShow: () => handleChangeDivision(otherDivision),
          }
        : null,
    [isFiltering, otherHits, otherDivision, handleChangeDivision]
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
      <main id="main" tabIndex={-1} data-entered={entered || undefined}>
        {banzuke && allRows.length > 0 && (
          <SearchBar
            value={query}
            onChange={(value) => setSearchQuery(value || null)}
            totalCount={allRows.length}
            matchedCount={matchedCount}
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
        {banzuke && (
          <div className={styles.controls}>
            {showTabs && (
              <DivisionTabs
                value={division}
                onChange={handleChangeDivision}
                counts={counts}
                matched={matchedByDivision}
              />
            )}
            <ViewToggle view={view} onViewChange={handleChangeView} />
          </div>
        )}
        {banzuke && (
          <ErrorBoundary>
            <div
              id={PANEL_ID}
              role={showTabs ? 'tabpanel' : undefined}
              aria-labelledby={showTabs ? tabId(division) : undefined}
            >
              {/* Both views share the grid's empty state, so the copy and the
                  "show N in Juryo" offer stay identical whichever is showing. */}
              {view === 'sheet' && !nothingToShow ? (
                <BanzukeSheet
                  key={division}
                  rows={allRows}
                  highlight={highlight}
                  onSelectRikishi={handleSelectRikishi}
                />
              ) : (
                <BanzukeGrid
                  key={division}
                  rows={allRows}
                  highlight={highlight}
                  onSelectRikishi={handleSelectRikishi}
                  emptyReason={isFiltering ? 'no-matches' : 'no-data'}
                  query={query}
                  otherMatches={otherMatches}
                  onClearSearch={handleClearSearch}
                />
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>
      <Footer helpOpen={helpOpen} onToggleHelp={setHelpOpen} />
      <ScrollToTop />
      <WrestlerModal rikishi={selectedRikishi} onClose={handleCloseModal} />
    </>
  )
}

export default App
