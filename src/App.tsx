import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useBanzuke } from './hooks/useBanzuke'
import { loadProfiles } from './hooks/useProfiles'
import { loadStables } from './hooks/useStables'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useShortcutSetting } from './hooks/useShortcutSetting'
import { useUrlParam } from './hooks/useUrlState'
import { useStrings } from './i18n/useStrings'
import { useTournamentPhase } from './app/useTournamentPhase'
import { useResultsOverlay } from './app/useResultsOverlay'
import { useSearch } from './app/useSearch'
import { useSelection } from './app/useSelection'
import { useChanges } from './app/useChanges'
import { useGuide } from './app/useGuide'
import { useDocumentTitle } from './app/useDocumentTitle'
import { Hero } from './components/Hero/Hero'
import { SearchBar } from './components/SearchBar/SearchBar'
import { DivisionTabs } from './components/DivisionTabs/DivisionTabs'
import { PANEL_ID, tabId } from './components/DivisionTabs/ids'
import { BanzukeGrid, BanzukeGridSkeleton } from './components/BanzukeGrid/BanzukeGrid'
import { BanzukeSheet, BanzukeSheetSkeleton } from './components/BanzukeSheet/BanzukeSheet'
import { ViewToggle, type View } from './components/ViewToggle/ViewToggle'
import { ChangesToggle } from './components/ChangesToggle/ChangesToggle'
import { ResultsToggle } from './components/ResultsToggle/ResultsToggle'
import { Guide, GuideLink } from './components/Guide/Guide'
import { Departed } from './components/Departed/Departed'
import { Bouts } from './components/Bouts/Bouts'
import { TodayStrip } from './components/TodayStrip/TodayStrip'
import { Footer } from './components/Footer/Footer'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { ScrollToTop } from './components/ScrollToTop/ScrollToTop'
import type { BanzukeSet, Division, Rikishi } from './types/banzuke'
import styles from './App.module.css'

// The two dialogs are not on the first paint: each arrives as its own chunk
// the first time it is needed (the wrestler dialog carries the glossary and
// kimarite tables with it). The guide's legend shares a module with the link
// beside the controls, so it stays in the main chunk.
const WrestlerModal = lazy(() =>
  import('./components/WrestlerModal/WrestlerModal').then((m) => ({ default: m.WrestlerModal }))
)
const StableModal = lazy(() =>
  import('./components/StableModal/StableModal').then((m) => ({ default: m.StableModal }))
)

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

/**
 * The page: URL state in, the hooks under src/app/ for each concern, and the
 * render tree. Nothing here reads upstream fields or decides a tournament
 * rule; those live in the hooks and the utilities they call.
 */
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
  const [guideParam, setGuideParam] = useUrlParam('guide')
  const [heyaParam] = useUrlParam('heya', 'push')
  const [boutsDay, setBoutsDay] = useState<number | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [singleKeys, setSingleKeys] = useShortcutSetting()
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

  const phase = useTournamentPhase(banzuke)
  const tournamentStatus = phase.status
  const {
    results,
    file,
    records,
    champions,
    on: resultsOn,
  } = useResultsOverlay(banzuke, phase, resultsParam)
  // Defaults to the latest fought day; the stepper's › reaches a later
  // published card via lastSteppableDay inside Bouts.
  const day = boutsDay ?? (results.results ? Math.max(1, results.results.day) : 1)

  const search = useSearch(data, division, query)
  const { highlight, isFiltering, matchedCount, otherDivision, otherHits, counts } = search
  const showTabs = data?.juryo != null
  // Nothing on the sheet: no data at all, or a search this division cannot answer.
  const nothingToShow = allRows.length === 0 || (highlight !== null && highlight.size === 0)

  const selection = useSelection(data, selectedId, heyaParam)
  const { rankById, selectedRikishi, neighbours, selectedHeyaId, roster, stable, stableLoading } =
    selection

  const changes = useChanges(data, banzuke, phase, diffParam, language)
  const { prevEntry, changesDefault, diffOn, diffWanted, previous, sinceLabel, diff } = changes
  const { movements, kadoban } = changes

  const guideState = useGuide(
    guideParam,
    setGuideParam,
    view === 'sheet' && !nothingToShow && !isFiltering,
    allRows,
    movements != null,
    records != null
  )
  const {
    on: guideOn,
    guide,
    linkRef: guideLinkRef,
    onToggle: handleToggleGuide,
    openedHere: guideOpenedHere,
  } = guideState

  const handleSelectRikishi = useCallback(
    (rikishi: Rikishi) => setSelectedId(String(rikishi.id)),
    [setSelectedId]
  )
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
    if (selectedRikishi || selectedHeyaId != null) return
    if (helpOpen) setHelpOpen(false)
    else if (query) setSearchQuery(null)
  }, [selectedRikishi, selectedHeyaId, helpOpen, query, setSearchQuery])
  const handleToggleHelp = useCallback(() => setHelpOpen((open) => !open), [])
  useKeyboardShortcuts({
    onToggleLanguage: handleToggleLanguage,
    onFocusSearch: handleFocusSearch,
    onEscape: handleEscape,
    onToggleHelp: handleToggleHelp,
    singleKeys,
  })

  // Warm the profiles file on the first sign of interest in a wrestler, so the
  // dialog almost always opens with the profile already there.
  const prefetchProfiles = useCallback(() => {
    void loadProfiles()
    void loadStables()
  }, [])

  useDocumentTitle(banzuke, selectedRikishi, roster, language, strings)

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
      <Hero
        data={banzuke}
        resultsFetchedAt={results.results?.fetchedAt ?? null}
        results={file}
        rankById={rankById}
      />
      <main id="main" tabIndex={-1} data-entered={entered || undefined}>
        {banzuke && allRows.length > 0 && (
          <SearchBar
            value={query}
            onChange={(value) => setSearchQuery(value || null)}
            totalCount={allRows.length}
            matchedCount={matchedCount}
          />
        )}
        {status === 'loading' &&
          (view === 'sheet' ? <BanzukeSheetSkeleton /> : <BanzukeGridSkeleton />)}
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
            <ViewToggle view={view} onViewChange={handleChangeView} />
            {prevEntry && (
              <ChangesToggle
                on={diffOn}
                onChange={(on) => setDiffParam(on === changesDefault ? null : on ? '1' : '0')}
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
            {/* Read once, not left on: once open, the legend beneath the paper
                carries its own close link, so this one steps aside rather than
                doubling it. */}
            {view === 'sheet' && !nothingToShow && !isFiltering && !guideOn && (
              <GuideLink ref={guideLinkRef} on={false} onToggle={handleToggleGuide} />
            )}
          </div>
        )}
        {/* In season, today's line: the day, the card so far, the leader, the freshness. */}
        {banzuke && file && tournamentStatus?.kind === 'live' && (
          <TodayStrip
            results={file}
            division={division}
            rows={allRows}
            day={tournamentStatus.day}
            totalDays={tournamentStatus.totalDays}
          />
        )}
        {/* The tabs are cut as paper tabs — open along the bottom — so they
            belong against the top edge of the sheet, not in the controls row
            above it, where a wrap left them floating with that edge open. The
            tablist also reads better immediately before the panel it labels. */}
        {banzuke && showTabs && (
          <DivisionTabs
            value={division}
            onChange={handleChangeDivision}
            counts={counts}
            matched={search.matchedByDivision}
          />
        )}
        {banzuke && (
          <ErrorBoundary>
            <div
              id={PANEL_ID}
              className={showTabs ? styles.seated : undefined}
              role={showTabs ? 'tabpanel' : undefined}
              aria-labelledby={showTabs ? tabId(division) : undefined}
              onPointerEnter={prefetchProfiles}
              onFocus={prefetchProfiles}
            >
              {/* The division as a heading for readers walking the outline; the
                  tab already names it for the eye. */}
              <h2 className="visually-hidden">{strings.division[division]}</h2>
              {/* Both views share the grid's empty state, so the copy and the
                  "show N in Juryo" offer stay identical whichever is showing. */}
              {view === 'sheet' && !nothingToShow ? (
                <BanzukeSheet
                  key={division}
                  rows={allRows}
                  highlight={highlight}
                  movements={movements}
                  kadoban={kadoban}
                  records={records}
                  champions={champions}
                  guide={guide}
                  onSelectRikishi={handleSelectRikishi}
                />
              ) : (
                <BanzukeGrid
                  key={division}
                  rows={allRows}
                  highlight={highlight}
                  movements={movements}
                  kadoban={kadoban}
                  records={records}
                  champions={champions}
                  onSelectRikishi={handleSelectRikishi}
                  onSelectStable={selection.onSelectStable}
                  emptyReason={isFiltering ? 'no-matches' : 'no-data'}
                  query={query}
                  otherMatches={otherMatches}
                  onClearSearch={handleClearSearch}
                />
              )}
              {guide && (
                <Guide
                  items={guide.items}
                  onClose={() => handleToggleGuide(false)}
                  focusOnOpen={guideOpenedHere}
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
      <Footer
        helpOpen={helpOpen}
        onToggleHelp={setHelpOpen}
        singleKeys={singleKeys}
        onSingleKeysChange={setSingleKeys}
      />
      <ScrollToTop />
      <Suspense fallback={null}>
        <WrestlerModal
          rikishi={selectedRikishi}
          onClose={selection.onCloseWrestler}
          record={selectedRikishi ? (records?.[String(selectedRikishi.id)] ?? null) : null}
          results={file}
          rankById={rankById}
          kadoban={selectedRikishi ? kadoban.has(selectedRikishi.id) : false}
          neighbours={neighbours}
          onStep={selection.onStep}
          onSelectStable={selection.onSelectStable}
        />
        <StableModal
          heyaId={selectedHeyaId}
          roster={roster}
          stable={stable}
          stableLoading={stableLoading}
          movements={movements}
          kadoban={kadoban}
          records={records}
          champions={champions}
          onClose={selection.onCloseStable}
          onSelectRikishi={selection.onSelectMember}
          onShowOnBanzuke={selection.onShowOnBanzuke}
        />
      </Suspense>
    </>
  )
}

export default App
