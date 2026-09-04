/**
 * Japanese number, rank and tournament naming helpers.
 *
 * Shared by the fetch script (to build the Japanese payload) and the app
 * (to render kanji rank labels). No DOM or React dependencies.
 */
import type { Division } from './schema'

const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const

/**
 * Converts 1–99 to traditional kanji numerals as used on the banzuke
 * (e.g. 1 → 一, 10 → 十, 17 → 十七, 21 → 二十一).
 */
export function toKanjiNumber(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n)
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const tensPart = tens === 0 ? '' : tens === 1 ? '十' : `${DIGITS[tens]}十`
  return `${tensPart}${DIGITS[ones]}`
}

export const RANK_KANJI: Record<number, string> = {
  100: '横綱',
  200: '大関',
  300: '関脇',
  400: '小結',
  500: '前頭',
  600: '十両',
}

/** Position within a numbered rank: 1 → 筆頭 ("top"), 2 → 二枚目, 17 → 十七枚目. */
export function jpNumberKanji(position: number): string {
  return position === 1 ? '筆頭' : `${toKanjiNumber(position)}枚目`
}

/**
 * Full Japanese rank name as printed on the official banzuke table,
 * e.g. (100, 1) → 横綱, (500, 1) → 前頭筆頭, (500, 17) → 前頭十七枚目.
 */
export function jpRankName(rankCode: number, position: number): string {
  const base = RANK_KANJI[rankCode]
  if (!base) return ''
  if (rankCode < 500) return base
  return `${base}${jpNumberKanji(position)}`
}

/** Short Japanese rank as shown on a compact rail, e.g. 前頭十七 (no 枚目). */
export function jpRankShort(rankCode: number, position: number): string {
  const base = RANK_KANJI[rankCode]
  if (!base) return ''
  if (rankCode < 500) return base
  return position === 1 ? `${base}筆頭` : `${base}${toKanjiNumber(position)}`
}

/** Tournament name by month: 1 → 一月場所, 11 → 十一月場所. */
export function jpBashoName(month: number): string {
  return `${toKanjiNumber(month)}月場所`
}

/** Reiwa era year: 2019 → 令和元年, 2026 → 令和八年. */
export function jpEraYear(year: number): string {
  const reiwa = year - 2018
  if (reiwa < 1) return String(year)
  return reiwa === 1 ? '令和元年' : `令和${toKanjiNumber(reiwa)}年`
}

export const SIDE_KANJI = { east: '東', west: '西' } as const

export const DIVISION_KANJI: Record<Division, string> = { makuuchi: '幕内', juryo: '十両' }
