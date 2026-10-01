import type { Banzuke, Division } from '../types/banzuke'
import type { ResultsFile, RikishiRecord } from '../data/results'
import { useResults, type ResultsState } from '../hooks/useResults'
import type { TournamentPhase } from './useTournamentPhase'

export interface ResultsOverlay {
  results: ResultsState
  /** The file while the overlay is on; null when the visitor turned it off. */
  file: ResultsFile | null
  /** Records once day 1 is fought: before that every record is 0–0 and says nothing. */
  records: Record<string, RikishiRecord> | null
  champions: Partial<Record<Division, number>> | undefined
  on: boolean
}

/** The results file for the tournament on screen, and what of it the page shows. */
export function useResultsOverlay(
  banzuke: Banzuke | null,
  phase: TournamentPhase,
  resultsParam: string | null
): ResultsOverlay {
  const results = useResults(phase.inSeason && banzuke ? banzuke.basho.id : null, {
    live: phase.live,
  })
  const on = resultsParam !== '0'
  const file = on ? results.results : null
  const records = file && file.day > 0 ? file.records : null
  return { results, file, records, champions: file?.yusho, on }
}
