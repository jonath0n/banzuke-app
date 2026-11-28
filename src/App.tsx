import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useBanzuke } from './hooks/useBanzuke'
import { useLowerBanzuke } from './hooks/useLowerBanzuke'
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
import { useDocumentTitle } from './app/useDocumentTitle'
import { useEverTrue } from './app/useEverTrue'
import { useArchiveViewer } from './app/useArchiveViewer'
import { useArchiveIndex } from './hooks/useArchive'
import { BashoPicker } from './components/BashoPicker/BashoPicker'
import { Hero } from './components/Hero/Hero'
import { SearchBar } from './components/SearchBar/SearchBar'
import { DivisionTabs } from './components/DivisionTabs/DivisionTabs'
import { PANEL_ID, tabId } from './components/DivisionTabs/ids'
import { BanzukeGrid, BanzukeGridSkeleton } from './components/BanzukeGrid/BanzukeGrid'
import { ChangesToggle } from './components/ChangesToggle/ChangesToggle'
import { ResultsToggle } from './components/ResultsToggle/ResultsToggle'
import { Departed } from './components/Departed/Departed'
import { Bouts } from './components/Bouts/Bouts'
import { TodayStrip } from './components/TodayStrip/TodayStrip'
import { Footer } from './components/Footer/Footer'
import { DialogFallback } from './components/ErrorBoundary/DialogFallback'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { ScrollToTop } from './components/ScrollToTop/ScrollToTop'
import { DIVISIONS, isLowerDivision, LOWER_DIVISIONS } from './data/schema'
import { divisionsIn } from './data/divisions'
import type { BanzukeSet, Division, Rikishi } from './types/banzuke'
import styles from './App.module.css'

// The two dialogs are not on the first paint: each arrives as its own chunk
// the first time it is needed (the wrestler dialog carries the glossary and
// kimarite tables with it).
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

/** How long the entrance cascade may run after the banzuke first renders. */
const ENTRANCE_MS = 1200

/** The division named in the URL, when it is on offer. */
function resolveDivision(param: string | null, offered: readonly Division[]): Division {
  return offered.find((division) => division === param) ?? 'makuuchi'
}

/** Whether a wrestler id is in the loaded set (cheap enough per render for ~70 sekitori). */
function knows(set: BanzukeSet | null, id: string | null): boolean {
  if (!set || !id) return false
  return divisionsIn(set).some((d) => set[d]?.rikishi.some((r) => String(r.id) === id))
}

/**
 * The page: URL state in, the hooks under src/app/ for each concern, and the
 * render tree. Nothing here reads upstream fields or decides a tournament
 * rule; those live in the hooks and the utilities they call.
 */
function AppContent() {
  const live = useBanzuke()
  const { language, setLanguage } = useLanguage()
  const strings = useStrings()
  const [searchQuery, setSearchQuery] = useUrlParam('q')
  const [divisionParam, setDivisionParam] = useUrlParam('div')
  const [selectedId, setSelectedId] = useUrlParam('rikishi', 'push')
  const [diffParam, setDiffParam] = useUrlParam('diff')
  const [resultsParam, setResultsParam] = useUrlParam('results')
  const [heyaParam] = useUrlParam('heya', 'push')
  const [bashoParam, setBashoParam] = useUrlParam('basho')
  const [boutsDay, setBoutsDay] = useState<number | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [singleKeys, setSingleKeys] = useShortcutSetting()
  // Entrance animations play once, on the first render of the banzuke; later renders (tab
  // switches, search) must not replay the cascade.
  const [entered, setEntered] = useState(false)

  // ?basho= shows an earlier tournament from the archive in place of the live one.
  const archiveIndex = useArchiveIndex()
  const liveBashoId = live.data?.makuuchi.basho.id ?? null

  // The divisions below Juryo come from their own file, fetched when something
  // asks for them (a lower tab, a search, a link to a wrestler or stable not
  // among the sekitori) or once the page is idle. The sample has none.
  const query = searchQuery ?? ''
  const wantLower =
    (divisionParam != null && (LOWER_DIVISIONS as readonly string[]).includes(divisionParam)) ||
    query.trim() !== '' ||
    heyaParam != null ||
    (selectedId != null && live.data != null && !knows(live.data, selectedId))
  const liveHasLower = live.data?.makuuchi.source === 'live'
  const lower = useLowerBanzuke(liveHasLower ? liveBashoId : null, wantLower)

  const archive = useArchiveViewer(bashoParam, archiveIndex, liveBashoId, wantLower)
  const liveData = useMemo(
    () => (live.data && lower.data ? { ...live.data, ...lower.data } : live.data),
    [live.data, lower.data]
  )
  const data = archive.entry ? archive.data : liveData
  const status = archive.entry ? (archive.loading ? 'loading' : live.status) : live.status
  const problem = archive.entry ? null : live.problem
  const hasLower = archive.entry ? archive.hasLower : liveHasLower
  const lowerStatus = archive.entry ? archive.lowerStatus : lower.status
  // Settled: a link to someone below Juryo can now be judged unknown.
  const lowerSettled = !hasLower || lowerStatus === 'ready' || lowerStatus === 'unavailable'
  const handleChangeBasho = useCallback(
    (id: number | null) => setBashoParam(id === null ? null : String(id)),
    [setBashoParam]
  )

  useEffect(() => {
    if (!data || entered) return
    const timer = window.setTimeout(() => setEntered(true), ENTRANCE_MS)
    return () => window.clearTimeout(timer)
  }, [data, entered])

  // Every division the data has, plus the lower ones while their file is on its way.
  const offered = useMemo(
    () =>
      data
        ? DIVISIONS.filter(
            (d) => data[d] != null || (hasLower && isLowerDivision(d) && lowerStatus !== 'ready')
          )
        : [],
    [data, hasLower, lowerStatus]
  )
  const division = resolveDivision(divisionParam, offered)
  const lowerTab = isLowerDivision(division)
  // The division on screen; null for a lower tab whose file has not arrived.
  const shown = data?.[division] ?? null
  // The tournament itself (dates, phase, title) is the same in every division.
  const banzuke = shown ?? data?.makuuchi ?? null
  const allRows = shown?.rikishi ?? EMPTY

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
  const showTabs = offered.length > 1
  // Results are kept for the sekitori only: the lower divisions show the banzuke alone.
  const overlayRecords = lowerTab ? null : records
  const lowerMessage =
    !lowerTab || shown ? null : lowerStatus === 'unavailable' ? 'unavailable' : 'loading'

  const selection = useSelection(data, selectedId, heyaParam, lowerSettled)
  const { rankById, selectedRikishi, neighbours, selectedHeyaId, roster, stable, stableLoading } =
    selection

  const changes = useChanges(data, banzuke, phase, diffParam, language)
  const { prevEntry, changesDefault, diffOn, diffWanted, previous, sinceLabel, diff } = changes
  const { movements, kadoban } = changes

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
  const otherMatches = useMemo(
    () =>
      isFiltering && otherDivision && otherHits > 0
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
  const wrestlerMounted = useEverTrue(selectedRikishi !== null)
  const stableMounted = useEverTrue(selectedHeyaId != null)

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
        {/* Search and the overlay switches as one toolbar: a single row on a
            wide screen, stacked on a phone. */}
        <div className={styles.toolbar}>
          {banzuke && allRows.length > 0 && (
            <SearchBar
              value={query}
              onChange={(value) => setSearchQuery(value || null)}
              totalCount={allRows.length}
              matchedCount={matchedCount}
            />
          )}
          {banzuke && (
            <div className={styles.controls}>
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
              {archiveIndex && archiveIndex.basho.length > 0 && (
                <BashoPicker
                  current={archive.entry}
                  previous={archive.previous}
                  next={archive.next}
                  nextIsLive={archive.nextIsLive}
                  onChange={handleChangeBasho}
                />
              )}
            </div>
          )}
        </div>
        {/* In season, today's line: the day, the card so far, the leader, the freshness. */}
        {banzuke && file && !lowerTab && tournamentStatus?.kind === 'live' && (
          <TodayStrip
            results={file}
            division={division}
            rows={allRows}
            day={tournamentStatus.day}
            totalDays={tournamentStatus.totalDays}
          />
        )}
        {/* The tabs sit on the top edge of the list, not in the controls row
            above it, and the tablist reads best immediately before the panel
            it labels. Tabs and panel share a wrapper so that, beside a side
            rail, the tabs keep the sheet's width. */}
        <div className={styles.board}>
          {banzuke && showTabs && (
            <DivisionTabs
              value={division}
              onChange={handleChangeDivision}
              divisions={offered}
              counts={counts}
              matched={search.matchedByDivision}
            />
          )}
          {banzuke && (
            <ErrorBoundary>
              <div
                id={PANEL_ID}
                className={`${styles.panel} ${showTabs ? styles.seated : ''}`}
                role={showTabs ? 'tabpanel' : undefined}
                aria-labelledby={showTabs ? tabId(division) : undefined}
                onPointerEnter={prefetchProfiles}
                onFocus={prefetchProfiles}
              >
                {/* The division as a heading for readers walking the outline; the
                  tab already names it for the eye. */}
                <h2 className="visually-hidden">{strings.division[division]}</h2>
                {lowerMessage === 'loading' && (
                  <div role="status" className={styles.status}>
                    {strings.lowerLoading}
                  </div>
                )}
                {lowerMessage === 'unavailable' && (
                  <div role="alert" className={`${styles.status} ${styles.warning}`}>
                    {strings.lowerUnavailable}
                  </div>
                )}
                {lowerMessage === 'loading' && <BanzukeGridSkeleton />}
                {!lowerMessage && (
                  <BanzukeGrid
                    key={division}
                    rows={allRows}
                    highlight={highlight}
                    movements={movements}
                    kadoban={kadoban}
                    records={overlayRecords}
                    champions={champions}
                    onSelectRikishi={handleSelectRikishi}
                    onSelectStable={selection.onSelectStable}
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
                {((diffWanted && diff && !isFiltering) || (file && !isFiltering && !lowerTab)) && (
                  // Who left and the day's bouts: beside the sheet on a wide
                  // screen, after it otherwise (App.module.css).
                  <div className={styles.aside} data-aside="">
                    {diffWanted && diff && !isFiltering && (
                      <Departed
                        division={division}
                        departures={diff.byDivision[division]}
                        sinceLabel={sinceLabel}
                        lowerLoaded={data != null && divisionsIn(data).some(isLowerDivision)}
                        onSelectRikishi={handleSelectRikishi}
                      />
                    )}
                    {file && !isFiltering && !lowerTab && (
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
                )}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </main>
      <Footer
        helpOpen={helpOpen}
        onToggleHelp={setHelpOpen}
        singleKeys={singleKeys}
        onSingleKeysChange={setSingleKeys}
      />
      <ScrollToTop />
      {/* Each dialog's chunk is fetched on its first open, not with the page, and
          stays mounted afterwards for the close transition. Its own boundary
          keeps a lost chunk from taking the banzuke down with it. */}
      {wrestlerMounted && (
        <ErrorBoundary fallback={<DialogFallback />}>
          <Suspense fallback={null}>
            <WrestlerModal
              rikishi={selectedRikishi}
              onClose={selection.onCloseWrestler}
              record={selectedRikishi ? (records?.[String(selectedRikishi.id)] ?? null) : null}
              results={file}
              rankById={rankById}
              kadoban={selectedRikishi ? kadoban.has(selectedRikishi.id) : false}
              champion={
                selectedRikishi
                  ? Object.values(champions ?? {}).includes(selectedRikishi.id)
                  : false
              }
              neighbours={neighbours}
              onStep={selection.onStep}
              onSelectStable={selection.onSelectStable}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      {stableMounted && (
        <ErrorBoundary fallback={<DialogFallback />}>
          <Suspense fallback={null}>
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
        </ErrorBoundary>
      )}
    </>
  )
}

export default App
