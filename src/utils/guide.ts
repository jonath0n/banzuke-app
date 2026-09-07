/**
 * Where the guide's numbered marks go. Pure: given the rows on screen and
 * which overlays are on, choose the columns that best show each feature and
 * number the marks in legend order, skipping features the sheet lacks today
 * (no Yokozuna → no gold item). The legend lists `items` in the same order,
 * so mark 3 on the sheet is item 3 beneath it.
 */
import type { Rikishi } from '../types/banzuke'
import { RANK_CODES } from '../constants/ranks'

export type GuideZone =
  'sideMark' | 'top' | 'rank' | 'numeral' | 'origin' | 'name' | 'movement' | 'record'

export type GuideKey =
  'size' | 'east' | 'tier' | 'numeral' | 'origin' | 'name' | 'gold' | 'changes' | 'results'

export interface GuideMark {
  n: number
  key: GuideKey
  zone: GuideZone
  /** The column that carries the mark; null for the East side mark. */
  rikishiId: number | null
}

export interface Guide {
  marks: GuideMark[]
  /** Legend items, in mark order. */
  items: GuideKey[]
}

export const GUIDE_KEYS: readonly GuideKey[] = [
  'size',
  'east',
  'tier',
  'numeral',
  'origin',
  'name',
  'gold',
  'changes',
  'results',
]

const numbered = (r: Rikishi) => r.rankCode >= RANK_CODES.MAEGASHIRA

export function buildGuide(
  rows: Rikishi[],
  overlays: { movements: boolean; records: boolean }
): Guide {
  if (rows.length === 0) return { marks: [], items: [] }
  const top = rows.find((r) => r.side === 'east') ?? rows[0]
  const east = rows.filter((r) => r.side === 'east')
  const numberedEast = east.filter(numbered)
  // The lowest numbered rank shows the tier band and the numeral; the first
  // numbered rank shows the name — the two ends of the ladder.
  const low = numberedEast.at(-1) ?? east.at(-1) ?? rows.at(-1)!
  const first = numberedEast[0] ?? low

  const candidates: Array<[GuideKey, GuideZone, number | null] | null> = [
    ['size', 'name', top.id],
    east.length > 0 ? ['east', 'sideMark', null] : null,
    ['tier', 'rank', low.id],
    numbered(low) ? ['numeral', 'numeral', low.id] : null,
    ['origin', 'origin', low.id],
    ['name', 'name', first.id],
    top.rankLevel === 'yokozuna' ? ['gold', 'top', top.id] : null,
    overlays.movements ? ['changes', 'movement', top.id] : null,
    overlays.records ? ['results', 'record', top.id] : null,
  ]
  const marks: GuideMark[] = []
  for (const candidate of candidates) {
    if (!candidate) continue
    const [key, zone, rikishiId] = candidate
    marks.push({ n: marks.length + 1, key, zone, rikishiId })
  }
  return { marks, items: marks.map((m) => m.key) }
}
