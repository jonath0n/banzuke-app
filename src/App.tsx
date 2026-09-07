import { useCallback, useEffect, useMemo, useState } from 'react'
import { useBanzuke } from './hooks/useBanzuke'
import { loadProfiles } from './hooks/useProfiles'
import { useArchiveIndex, useArchivedBanzuke } from './hooks/useArchive'
import { useResults } from './hooks/useResults'
import { previousEntry } from './data/archive'
import { diffBanzuke, type CurrentRow } from './utils/diff'
import { getTournamentStatus } from './utils/dates'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { clearUrlParam, useUrlParam } from './hooks/useUrlState'
import { useStrings } from './i18n/useStrings'
import { buildSearchIndex, matchingIds } from './utils/search'
import { formatYearMonth } from './utils/profile'
import { jpBashoName, jpEraYear } from './data/kanji'
import { Hero } from './components/Hero/Hero'
import { SearchBar } from './components/SearchBar/SearchBar'
import { DivisionTabs } from './components/DivisionTabs/DivisionTabs'
import { PANEL_ID, tabId } from './components/DivisionTabs/ids'
import { BanzukeGrid, BanzukeGridSkeleton } from './components/BanzukeGrid/BanzukeGrid'
import { BanzukeSheet } from './components/BanzukeSheet/BanzukeSheet'
import { ViewToggle, type View } from './components/ViewToggle/ViewToggle'
import { ChangesToggle } from './components/ChangesToggle/ChangesToggle'
import { ResultsToggle } from './components/ResultsToggle/ResultsToggle'
import { Departed } from './components/Departed/Departed'
import { Bouts } from './components/Bouts/Bouts'
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
  const [diffParam, setDiffParam] = useUrlParam('diff')
  const [resultsParam, setResultsParam] = useUrlParam('results')
  const [boutsDay, setBoutsDay] = useState<number | null>(null)
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

  // Results only make sense while the tournament is running or has just
  // finished (until the next banzuke replaces it) or is about to start.
  const tournamentStatus = banzuke ? getTournamentStatus(banzuke.basho) : null
  const inSeason =
    tournamentStatus != null &&
    (tournamentStatus.kind === 'live' ||
      tournamentStatus.kind === 'finished' ||
      (tournamentStatus.kind === 'upcoming' && tournamentStatus.daysUntil <= 1))
  const results = useResults(inSeason && banzuke ? banzuke.basho.id : null)
  const resultsOn = resultsParam !== '0'
  const file = resultsOn ? results.results : null
  const records = file?.records ?? null
  const champions = file?.yusho
  // Defaults to the latest fought day; the stepper's › reaches a later
  // published card via lastSteppableDay inside Bouts.
  const day = boutsDay ?? (results.results ? Math.max(1, results.results.day) : 1)

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

  // The archive index says which tournament preceded this one, if any; the
  // toggle only appears when there is something to diff against.
  const index = useArchiveIndex()
  const prevEntry = banzuke && index ? previousEntry(index, banzuke.basho.id) : null
  const diffWanted = diffParam === '1' && prevEntry != null
  const previous = useArchivedBanzuke(diffWanted ? prevEntry : null)
  const jpEra =
    prevEntry && banzuke && prevEntry.year !== banzuke.basho.year ? jpEraYear(prevEntry.year) : ''
  const sinceLabel = prevEntry
    ? language === 'jp'
      ? `${jpEra}${jpBashoName(prevEntry.month)}`
      : formatYearMonth(
          `${prevEntry.year}-${String(prevEntry.month).padStart(2, '0')}`,
          'en',
          'long'
        )
    : ''

  const currentRows: CurrentRow[] = useMemo(
    () =>
      data
        ? [
            ...data.makuuchi.rikishi.map((rikishi) => ({ rikishi, division: 'makuuchi' as const })),
            ...(data.juryo?.rikishi ?? []).map((rikishi) => ({
              rikishi,
              division: 'juryo' as const,
            })),
          ]
        : [],
    [data]
  )
  const diff = useMemo(
    () => (previous.archive ? diffBanzuke(currentRows, previous.archive) : null),
    [currentRows, previous.archive]
  )
  const movements = diffWanted && diff ? diff.movements : null

  const handleSelectRikishi = useCallback(
    (rikishi: Rikishi) => setSelectedId(String(rikishi.id)),
    [setSelectedId]
  )

  // Undo the pushed entry (or replace a deep link) so Back never reopens it.
  const handleCloseModal = useCallback(() => clearUrlParam('rikishi'), [])

  const handleClearSearch = useCallback(() => setSearchQuery(null), [setSearchQuery])

  const handleChangeDivision = useCallback(
    (next: Division) => {
      setDivisionParam(next === 'makuuchi' ? null : next)
      setBoutsDay(null)
    },
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

  // Warm the profiles file on the first sign of interest in a wrestler, so the
  // dialog almost always opens with the profile already there.
  const prefetchProfiles = useCallback(() => {
    void loadProfiles()
  }, [])

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
            {prevEntry && (
              <ChangesToggle
                on={diffParam === '1'}
                onChange={(on) => setDiffParam(on ? '1' : null)}
                sinceLabel={sinceLabel}
              />
            )}
            {results.results && (
              <ResultsToggle
                on={resultsOn}
                onChange={(on) => setResultsParam(on ? null : '0')}
                day={results.results.day}
              />
            )}
          </div>
        )}
        {banzuke && (
          <ErrorBoundary>
            <div
              id={PANEL_ID}
              role={showTabs ? 'tabpanel' : undefined}
              aria-labelledby={showTabs ? tabId(division) : undefined}
              onPointerEnter={prefetchProfiles}
              onFocus={prefetchProfiles}
            >
              {/* Both views share the grid's empty state, so the copy and the
                  "show N in Juryo" offer stay identical whichever is showing. */}
              {view === 'sheet' && !nothingToShow ? (
                <BanzukeSheet
                  key={division}
                  rows={allRows}
                  highlight={highlight}
                  movements={movements}
                  records={records}
                  champions={champions}
                  onSelectRikishi={handleSelectRikishi}
                />
              ) : (
                <BanzukeGrid
                  key={division}
                  rows={allRows}
                  highlight={highlight}
                  movements={movements}
                  records={records}
                  champions={champions}
                  onSelectRikishi={handleSelectRikishi}
                  emptyReason={isFiltering ? 'no-matches' : 'no-data'}
                  query={query}
                  otherMatches={otherMatches}
                  onClearSearch={handleClearSearch}
                />
              )}
              {diffWanted && previous.status === 'loading' && (
                <div role="status" className="visually-hidden">
                  {strings.loading}
                </div>
              )}
              {diffWanted && previous.status === 'unavailable' && (
                <div role="status" className={`${styles.status} ${styles.warning}`}>
                  {strings.changesUnavailable}
                </div>
              )}
              {diffWanted && diff && !isFiltering && (
                <Departed
                  division={division}
                  departures={diff.byDivision[division]}
                  sinceLabel={sinceLabel}
                  onSelectRikishi={handleSelectRikishi}
                />
              )}
              {file && !isFiltering && (
                <Bouts
                  results={file}
                  division={division}
                  rows={allRows}
                  day={day}
                  onChangeDay={setBoutsDay}
                  onSelectRikishi={handleSelectRikishi}
                />
              )}
            </div>
          </ErrorBoundary>
        )}
      </main>
      <Footer helpOpen={helpOpen} onToggleHelp={setHelpOpen} />
      <ScrollToTop />
      <WrestlerModal
        rikishi={selectedRikishi}
        onClose={handleCloseModal}
        record={selectedRikishi ? (records?.[String(selectedRikishi.id)] ?? null) : null}
      />
    </>
  )
}

export default App
