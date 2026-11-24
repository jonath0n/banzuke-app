import { useMemo } from 'react'
import type { Banzuke, BanzukeSet, Language } from '../types/banzuke'
import { previousEntry, type ArchivedBanzuke, type ArchiveIndexEntry } from '../data/archive'
import { divisionsIn } from '../data/divisions'
import { isLowerDivision } from '../data/schema'
import { jpBashoName, jpEraYear } from '../data/kanji'
import type { RikishiRecord } from '../data/results'
import {
  useArchiveFile,
  useArchiveIndex,
  useArchivedBanzuke,
  type ArchivedBanzukeState,
} from '../hooks/useArchive'
import { useResults } from '../hooks/useResults'
import { diffBanzuke, type BanzukeDiff, type CurrentRow, type Movement } from '../utils/diff'
import { formatYearMonth } from '../utils/profile'
import { kadobanIds } from '../utils/stakes'
import type { TournamentPhase } from './useTournamentPhase'

export interface Changes {
  prevEntry: ArchiveIndexEntry | null
  /** What the toggle means when the URL says nothing. */
  changesDefault: boolean
  diffOn: boolean
  /** On, and with a previous tournament to diff against. */
  diffWanted: boolean
  previous: ArchivedBanzukeState
  sinceLabel: string
  diff: BanzukeDiff | null
  movements: Map<number, Movement> | null
  /** 角番: an Ozeki who was Ozeki last time and made make-koshi there. */
  kadoban: Set<number>
  previousRecords: Record<string, RikishiRecord> | null
}

/**
 * The previous tournament and what follows from it: the Changes overlay and
 * the kadoban mark. The archive index says which tournament preceded this
 * one; the previous banzuke and its results are small enough to load
 * whenever there is one.
 */
export function useChanges(
  data: BanzukeSet | null,
  banzuke: Banzuke | null,
  phase: TournamentPhase,
  diffParam: string | null,
  language: Language
): Changes {
  const index = useArchiveIndex()
  const prevEntry = banzuke && index ? previousEntry(index, banzuke.basho.id) : null
  // On by default from the banzuke's announcement until day 1 — the fortnight
  // when the sheet is new and the question is who moved — and off once the
  // tournament has a story of its own. ?diff=1 / ?diff=0 override either way.
  const changesDefault = phase.status?.kind === 'upcoming' && prevEntry != null
  const diffOn = diffParam === '1' || (diffParam !== '0' && changesDefault)
  const diffWanted = diffOn && prevEntry != null
  const sekitoriPrevious = useArchivedBanzuke(prevEntry)
  // The previous lower divisions join the comparison once the current ones are loaded.
  const lowerLoaded = data != null && divisionsIn(data).some(isLowerDivision)
  const lowerPrevious = useArchiveFile(lowerLoaded ? (prevEntry?.lowerFile ?? null) : null)
  // Keyed on the archives themselves: the hook hands back a fresh state object each render.
  const { status: previousStatus, archive: sekitoriArchive } = sekitoriPrevious
  const lowerArchive = lowerPrevious.archive
  const previous = useMemo(
    () => mergePrevious({ status: previousStatus, archive: sekitoriArchive }, lowerArchive),
    [previousStatus, sekitoriArchive, lowerArchive]
  )
  const previousResults = useResults(prevEntry ? prevEntry.bashoId : null)
  const previousRecords = previousResults.results?.records ?? null

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
        ? divisionsIn(data).flatMap((division) =>
            (data[division]?.rikishi ?? []).map((rikishi) => ({ rikishi, division }))
          )
        : [],
    [data]
  )
  const diff = useMemo(
    () => (previous.archive ? diffBanzuke(currentRows, previous.archive, previousRecords) : null),
    [currentRows, previous.archive, previousRecords]
  )
  const kadoban = useMemo(
    () =>
      kadobanIds(
        currentRows.map((row) => row.rikishi),
        previous.archive ?? null,
        previousRecords
      ),
    [currentRows, previous.archive, previousRecords]
  )

  return {
    prevEntry,
    changesDefault,
    diffOn,
    diffWanted,
    previous,
    sinceLabel,
    diff,
    movements: diffWanted && diff ? diff.movements : null,
    kadoban,
    previousRecords,
  }
}

/**
 * The sekitori archive with the lower one folded in when it has loaded; the
 * sekitori alone decide the status, so a missing lower file never hides Changes.
 */
function mergePrevious(
  sekitori: ArchivedBanzukeState,
  lower: ArchivedBanzuke | null
): ArchivedBanzukeState {
  if (!sekitori.archive || !lower) return sekitori
  const archive: ArchivedBanzuke = {
    ...sekitori.archive,
    divisions: [...sekitori.archive.divisions, ...lower.divisions],
    rikishi: [...sekitori.archive.rikishi, ...lower.rikishi],
  }
  return { status: sekitori.status, archive }
}
