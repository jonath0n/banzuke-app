import type { RankLevel } from '../types/banzuke'

/**
 * Rank code values from the Sumo Association API.
 * These numeric codes identify the rank tier in the banzuke.
 */
export const RANK_CODES = {
  YOKOZUNA: 100,
  OZEKI: 200,
  SEKIWAKE: 300,
  KOMUSUBI: 400,
  MAEGASHIRA: 500,
  JURYO: 600,
} as const

/** Short labels for the un-numbered sanyaku ranks, used in compact displays. */
const SANYAKU_LABELS: Record<number, string> = {
  [RANK_CODES.YOKOZUNA]: 'Y',
  [RANK_CODES.OZEKI]: 'O',
  [RANK_CODES.SEKIWAKE]: 'S',
  [RANK_CODES.KOMUSUBI]: 'K',
}

/** Prefix for the numbered ranks. */
const NUMBERED_PREFIX: Record<number, string> = {
  [RANK_CODES.MAEGASHIRA]: 'M',
  [RANK_CODES.JURYO]: 'J',
}

const RANK_LEVELS: Record<number, RankLevel> = {
  [RANK_CODES.YOKOZUNA]: 'yokozuna',
  [RANK_CODES.OZEKI]: 'ozeki',
  [RANK_CODES.SEKIWAKE]: 'sekiwake',
  [RANK_CODES.KOMUSUBI]: 'komusubi',
  [RANK_CODES.MAEGASHIRA]: 'maegashira',
  [RANK_CODES.JURYO]: 'juryo',
}

/** English tier names, keyed by RankLevel. */
export const RANK_LEVEL_NAMES: Record<RankLevel, string> = {
  yokozuna: 'Yokozuna',
  ozeki: 'Ozeki',
  sekiwake: 'Sekiwake',
  komusubi: 'Komusubi',
  maegashira: 'Maegashira',
  juryo: 'Juryo',
}

/** Japanese tier names, keyed by RankLevel. */
export const RANK_LEVEL_KANJI: Record<RankLevel, string> = {
  yokozuna: '横綱',
  ozeki: '大関',
  sekiwake: '関脇',
  komusubi: '小結',
  maegashira: '前頭',
  juryo: '十両',
}

/** Maps rank codes to their corresponding RankLevel type. */
export function getRankLevelFromCode(rankCode: number): RankLevel {
  return RANK_LEVELS[rankCode] ?? 'maegashira'
}

/** True for Yokozuna through Komusubi. */
export function isSanyaku(rankCode: number): boolean {
  return rankCode in SANYAKU_LABELS
}

/**
 * Gets the short label for a rank code, e.g. "Y", "O", "M1", "J3".
 */
export function getRankLabel(rankCode: number, number?: string | number): string {
  if (SANYAKU_LABELS[rankCode]) {
    return SANYAKU_LABELS[rankCode]
  }
  const prefix = NUMBERED_PREFIX[rankCode]
  if (prefix) {
    const numStr = number != null && number !== '' ? String(number) : ''
    return `${prefix}${numStr}`
  }
  return ''
}
