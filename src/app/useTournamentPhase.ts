import type { Banzuke } from '../types/banzuke'
import { getTournamentStatus, type TournamentStatus } from '../utils/dates'

export interface TournamentPhase {
  status: TournamentStatus | null
  /** From the day before day 1 to the next banzuke: when results are worth loading. */
  inSeason: boolean
  live: boolean
}

/** Where today stands relative to the tournament on screen, from its dates. */
export function useTournamentPhase(banzuke: Banzuke | null): TournamentPhase {
  const status = banzuke ? getTournamentStatus(banzuke.basho) : null
  // Results only make sense while the tournament is running or has just
  // finished (until the next banzuke replaces it) or is about to start.
  const inSeason =
    status != null &&
    (status.kind === 'live' ||
      status.kind === 'finished' ||
      (status.kind === 'upcoming' && status.daysUntil <= 1))
  return { status, inSeason, live: status?.kind === 'live' }
}
