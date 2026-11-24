import type { Division, RankLevel } from '../types/banzuke'

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
  MAKUSHITA: 700,
  SANDANME: 800,
  JONIDAN: 900,
  JONOKUCHI: 1000,
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
  [RANK_CODES.MAKUSHITA]: 'Ms',
  [RANK_CODES.SANDANME]: 'Sd',
  [RANK_CODES.JONIDAN]: 'Jd',
  [RANK_CODES.JONOKUCHI]: 'Jk',
}

/**
 * A division's short English label, the prefix its ranks carry (M5, J3, Ms12…):
 * what an English tab shows when the full names do not fit.
 */
export const DIVISION_PREFIX: Record<Division, string> = {
  makuuchi: 'M',
  juryo: 'J',
  makushita: 'Ms',
  sandanme: 'Sd',
  jonidan: 'Jd',
  jonokuchi: 'Jk',
}

const RANK_LEVELS: Record<number, RankLevel> = {
  [RANK_CODES.YOKOZUNA]: 'yokozuna',
  [RANK_CODES.OZEKI]: 'ozeki',
  [RANK_CODES.SEKIWAKE]: 'sekiwake',
  [RANK_CODES.KOMUSUBI]: 'komusubi',
  [RANK_CODES.MAEGASHIRA]: 'maegashira',
  [RANK_CODES.JURYO]: 'juryo',
  [RANK_CODES.MAKUSHITA]: 'makushita',
  [RANK_CODES.SANDANME]: 'sandanme',
  [RANK_CODES.JONIDAN]: 'jonidan',
  [RANK_CODES.JONOKUCHI]: 'jonokuchi',
}

/** English tier names, keyed by RankLevel. */
export const RANK_LEVEL_NAMES: Record<RankLevel, string> = {
  yokozuna: 'Yokozuna',
  ozeki: 'Ozeki',
  sekiwake: 'Sekiwake',
  komusubi: 'Komusubi',
  maegashira: 'Maegashira',
  juryo: 'Juryo',
  makushita: 'Makushita',
  sandanme: 'Sandanme',
  jonidan: 'Jonidan',
  jonokuchi: 'Jonokuchi',
}

/** Japanese tier names, keyed by RankLevel. */
export const RANK_LEVEL_KANJI: Record<RankLevel, string> = {
  yokozuna: '横綱',
  ozeki: '大関',
  sekiwake: '関脇',
  komusubi: '小結',
  maegashira: '前頭',
  juryo: '十両',
  makushita: '幕下',
  sandanme: '三段目',
  jonidan: '序二段',
  jonokuchi: '序ノ口',
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
 * Gets the short label for a rank code, e.g. "Y", "O", "M1", "J3", "Ms12", "Jd100".
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
