export interface SeasonGate {
  phase: 'upcoming' | 'live' | 'finished' | 'out'
  inSeason: boolean
  /** 1–15 while live; 0 otherwise. */
  day: number
  bashoId: number
  yyyymm: string
  daysUntil: number
  daysSince: number
}

export function seasonPhase(snapshot: unknown, now?: Date): SeasonGate
