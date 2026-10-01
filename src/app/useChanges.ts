import { useMemo } from 'react'
import type { Banzuke, BanzukeSet, Language } from '../types/banzuke'
import { previousEntry, type ArchiveIndexEntry } from '../data/archive'
import { jpBashoName, jpEraYear } from '../data/kanji'
import type { RikishiRecord } from '../data/results'
import { useArchiveIndex, useArchivedBanzuke, type ArchivedBanzukeState } from '../hooks/useArchive'
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
  const previous = useArchivedBanzuke(prevEntry)
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
