/**
 * What changed since the previous banzuke. Pure functions over the current
 * normalized rows and an archived tournament; the UI only renders the result.
 *
 * Movement is expressed as the rank a wrestler came from, never as a step
 * count: steps are well defined inside Maegashira, fuzzy across sanyaku and
 * undefined across the Juryo line, and fans say 「前頭五枚目から」, not "+3".
 */
import type { Division, Language, Rikishi, Side } from '../types/banzuke'
import type { ArchivedBanzuke, ArchivedRikishi } from '../data/archive'
import { getRankLabel, getRankLevelFromCode, RANK_LEVEL_KANJI } from '../constants/ranks'
import { jpRankShort } from '../data/kanji'

export type MovementKind = 'up' | 'down' | 'same' | 'new'

export interface PreviousRank {
  division: Division
  rankCode: number
  rankNumber: number
  seat: number
  side: Side
}

export interface Movement {
  kind: MovementKind
  /** Null only for 'new'. */
  previous: PreviousRank | null
  /** East ↔ West at an otherwise identical rank. */
  sideChanged: boolean
}

export interface Departure {
  was: ArchivedRikishi
  /** The current row when the wrestler is still on the sheet in the other division. */
  now: Rikishi | null
}

export interface Departures {
  /** Left this division for the other one. */
  moved: Departure[]
  /** On neither division now: retired, injured, or below Juryo. */
  gone: Departure[]
}

export interface BanzukeDiff {
  previousBashoId: number
  movements: Map<number, Movement>
  byDivision: Record<Division, Departures>
}

export interface CurrentRow {
  rikishi: Rikishi
  division: Division
}

/**
 * A single number that orders the whole ladder: tier first, then position.
 * Sanyaku seats are the same rank (two Ozeki are both Ozeki), so they do not
 * enter into it.
 */
export function rankPosition(r: { rankCode: number; rankNumber: number }): number {
  return r.rankCode * 100 + (r.rankCode >= 500 ? r.rankNumber : 0)
}

export function compareMovement(
  current: { rankCode: number; rankNumber: number },
  previous: { rankCode: number; rankNumber: number }
): Exclude<MovementKind, 'new'> {
  const now = rankPosition(current)
  const then = rankPosition(previous)
  if (now < then) return 'up'
  if (now > then) return 'down'
  return 'same'
}

function previousRank(entry: ArchivedRikishi): PreviousRank {
  const { division, rankCode, rankNumber, seat, side } = entry
  return { division, rankCode, rankNumber, seat, side }
}

export function diffBanzuke(current: CurrentRow[], previous: ArchivedBanzuke): BanzukeDiff {
  const previousById = new Map(previous.rikishi.map((r) => [r.id, r]))
  const currentById = new Map(current.map((row) => [row.rikishi.id, row]))

  const movements = new Map<number, Movement>()
  for (const { rikishi } of current) {
    const before = previousById.get(rikishi.id)
    if (!before) {
      movements.set(rikishi.id, { kind: 'new', previous: null, sideChanged: false })
      continue
    }
    const kind = compareMovement(rikishi, before)
    movements.set(rikishi.id, {
      kind,
      previous: previousRank(before),
      sideChanged: kind === 'same' && before.side !== rikishi.side,
    })
  }

  const byDivision: Record<Division, Departures> = {
    makuuchi: { moved: [], gone: [] },
    juryo: { moved: [], gone: [] },
  }
  for (const was of previous.rikishi) {
    const now = currentById.get(was.id)
    if (now && now.division === was.division) continue
    const bucket = byDivision[was.division]
    if (now) bucket.moved.push({ was, now: now.rikishi })
    else bucket.gone.push({ was, now: null })
  }

  return { previousBashoId: previous.bashoId, movements, byDivision }
}

/** 'M5' / 'K' / 'J2' in English; 前頭五 / 小結 / 十両二 in Japanese. */
export function previousRankLabel(previous: PreviousRank, language: Language): string {
  if (language === 'jp') {
    return (
      jpRankShort(previous.rankCode, previous.rankNumber) ||
      RANK_LEVEL_KANJI[getRankLevelFromCode(previous.rankCode)]
    )
  }
  return getRankLabel(previous.rankCode, previous.rankNumber)
}

const SIDE_EN: Record<Side, string> = { east: 'East', west: 'West' }
const SIDE_JA: Record<Side, string> = { east: '東', west: '西' }

/** A sentence for accessible names and the list view. */
export function describeMovement(movement: Movement, language: Language): string {
  const { kind, previous, sideChanged } = movement
  if (language === 'jp') {
    if (kind === 'new' || !previous) return '番付外から'
    const from = previousRankLabel(previous, 'jp')
    if (kind === 'same') {
      return sideChanged
        ? `${SIDE_JA[previous.side]}から${SIDE_JA[previous.side === 'east' ? 'west' : 'east']}へ`
        : '変動なし'
    }
    return `${from}から`
  }
  if (kind === 'new' || !previous) return 'New to the sheet'
  const from = previousRankLabel(previous, 'en')
  if (kind === 'same') {
    if (!sideChanged) return 'Unchanged'
    const to = previous.side === 'east' ? 'west' : 'east'
    return `Unchanged, ${SIDE_EN[previous.side]} to ${SIDE_EN[to]}`
  }
  return `${kind === 'up' ? 'Up' : 'Down'} from ${from}`
}
