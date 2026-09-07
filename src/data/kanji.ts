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

/**
 * Prefecture as the banzuke prints it, without its administrative suffix:
 * 石川県 → 石川, 大阪府 → 大阪, 東京都 → 東京. Countries are left alone.
 * The sheet has one short band for this, so every character saved counts.
 */
export function shortPrefecture(name: string): string {
  return name.length > 2 ? name.replace(/[県府都]$/, '') : name
}

const KANJI_DIGITS: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

/** Parses 1–99 written in kanji (十七 → 17), Arabic digits, or 元 (→ 1). */
export function fromKanjiNumber(text: string): number | null {
  const s = text.trim()
  if (!s) return null
  if (/^\d+$/.test(s)) return Number(s)
  if (s === '元') return 1
  const m = /^(?:([一二三四五六七八九])?(十))?([一二三四五六七八九])?$/.exec(s)
  if (!m || (!m[2] && !m[3])) return null
  const tens = m[2] ? (m[1] ? KANJI_DIGITS[m[1]] : 1) : 0
  const ones = m[3] ? KANJI_DIGITS[m[3]] : 0
  return tens * 10 + ones
}

/** First Western year of each era minus one, so era year N maps to offset + N. */
const ERA_OFFSETS: Record<string, number> = { 令和: 2018, 平成: 1988, 昭和: 1925 }

const ERA_YEAR = '(令和|平成|昭和)(元|[一二三四五六七八九十]+|\\d+)年'

function eraYear(era: string, year: string): number | null {
  const n = fromKanjiNumber(year)
  return n === null ? null : ERA_OFFSETS[era] + n
}

/**
 * 令和五年五月場所 → { year: 2023, month: 5 }. Also accepts the May 2011
 * 技量審査場所 (technical examination tournament held in place of a basho).
 */
export function parseJpBasho(text: string): { year: number; month: number } | null {
  const m = new RegExp(
    `^${ERA_YEAR}(十一|十二|[一二三四五六七八九]|\\d+)月(?:技量審査)?場所$`
  ).exec(text.trim())
  if (!m) return null
  const year = eraYear(m[1], m[2])
  const month = fromKanjiNumber(m[3])
  if (year === null || month === null || month < 1 || month > 12) return null
  return { year, month }
}

/** 平成12年6月7日（26歳） → "2000-06-07". Ignores any trailing text. */
export function parseJpDate(text: string): string | null {
  const m = new RegExp(
    `^${ERA_YEAR}(\\d{1,2}|[一二三四五六七八九十]+)月(\\d{1,2}|[一二三四五六七八九十]+)日`
  ).exec(text.trim())
  if (!m) return null
  const year = eraYear(m[1], m[2])
  const month = fromKanjiNumber(m[3])
  const day = fromKanjiNumber(m[4])
  if (year === null || month === null || day === null) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export const DIVISION_KANJI: Record<Division, string> = { makuuchi: '幕内', juryo: '十両' }
