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
  MAEGASHIRA_START: 500,
} as const

/**
 * Short labels for each rank tier, used in compact displays.
 */
export const RANK_LABELS: Record<number, string> = {
  [RANK_CODES.YOKOZUNA]: 'Y',
  [RANK_CODES.OZEKI]: 'O',
  [RANK_CODES.SEKIWAKE]: 'S',
  [RANK_CODES.KOMUSUBI]: 'K',
}

/**
 * Maps rank codes to their corresponding RankLevel type.
 */
export function getRankLevelFromCode(rankCode: number): RankLevel {
  switch (rankCode) {
    case RANK_CODES.YOKOZUNA:
      return 'yokozuna'
    case RANK_CODES.OZEKI:
      return 'ozeki'
    case RANK_CODES.SEKIWAKE:
      return 'sekiwake'
    case RANK_CODES.KOMUSUBI:
      return 'komusubi'
    default:
      return 'maegashira'
  }
}

/**
 * Gets the short label for a rank code, with Maegashira number support.
 */
export function getRankLabel(rankCode: number, number?: string | number): string {
  if (RANK_LABELS[rankCode]) {
    return RANK_LABELS[rankCode]
  }
  if (rankCode >= RANK_CODES.MAEGASHIRA_START) {
    const numStr = number != null && number !== '' ? String(number) : ''
    return `M${numStr}`
  }
  return ''
}
