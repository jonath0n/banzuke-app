/**
 * Date helpers for tournament data.
 *
 * Upstream dates are naive JST strings ("2026-09-13", "2026-08-31 06:00:00").
 * Everything here parses them as Asia/Tokyo and formats them in Asia/Tokyo,
 * so a visitor in any time zone sees the dates the JSA printed.
 */
import type { Language } from '../types/banzuke'

export const JST_TIME_ZONE = 'Asia/Tokyo'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const NAIVE_DATETIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})?$/
const MS_PER_DAY = 86_400_000

function localeFor(lang: Language): string {
  return lang === 'jp' ? 'ja-JP' : 'en-US'
}

/**
 * Parses an upstream date or datetime as JST. ISO strings that already
 * carry a zone are respected. Returns null for empty or invalid input.
 */
export function parseJst(value: string | null | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  let iso = trimmed
  if (DATE_ONLY.test(trimmed)) iso = `${trimmed}T00:00:00+09:00`
  else if (NAIVE_DATETIME.test(trimmed)) iso = `${trimmed.replace(' ', 'T')}+09:00`
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  return parseJst(value)
}

/** "Sep 13, 2026" / "2026年9月13日" */
export function formatDate(value: string | Date | null | undefined, lang: Language = 'en'): string {
  const date = toDate(value)
  if (!date) return ''
  return new Intl.DateTimeFormat(localeFor(lang), {
    timeZone: JST_TIME_ZONE,
    year: 'numeric',
    month: lang === 'jp' ? 'long' : 'short',
    day: 'numeric',
  }).format(date)
}

/** "Sep 13 – 27, 2026" / "2026年9月13日～27日" */
export function formatDateRange(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  lang: Language = 'en'
): string {
  const a = toDate(start)
  const b = toDate(end)
  if (!a || !b) return [formatDate(a, lang), formatDate(b, lang)].filter(Boolean).join(' – ')

  if (lang === 'jp') {
    // ICU's Japanese range format drops the month names; compose it by hand.
    const first = formatDate(a, 'jp')
    const partsA = jstParts(a)
    const partsB = jstParts(b)
    const sameMonth = partsA.year === partsB.year && partsA.month === partsB.month
    return sameMonth ? `${first}～${partsB.day}日` : `${first}～${formatDate(b, 'jp')}`
  }

  const formatter = new Intl.DateTimeFormat(localeFor(lang), {
    timeZone: JST_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  try {
    return formatter.formatRange(a, b)
  } catch {
    return `${formatter.format(a)} – ${formatter.format(b)}`
  }
}

function jstParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** "Aug 31, 2026, 6:00 AM JST" / "2026年8月31日 6:00 JST" */
export function formatDateTime(
  value: string | Date | null | undefined,
  lang: Language = 'en'
): string {
  const date = toDate(value)
  if (!date) return ''
  const formatted = new Intl.DateTimeFormat(localeFor(lang), {
    timeZone: JST_TIME_ZONE,
    year: 'numeric',
    month: lang === 'jp' ? 'long' : 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: lang !== 'jp',
  }).format(date)
  return `${formatted} JST`
}

/** Calendar date of `date` in JST as a day index (days since the epoch). */
export function jstDayIndex(date: Date): number {
  const { year, month, day } = jstParts(date)
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY)
}

export type TournamentStatus =
  | { kind: 'upcoming'; daysUntil: number }
  | { kind: 'live'; day: number; totalDays: number }
  | { kind: 'finished'; daysSince: number }
  | { kind: 'unknown' }

/**
 * Where we are relative to a tournament, on JST calendar days.
 * Day 1 is the start date; a 15-day basho ends on day 15 (senshuraku).
 */
export function getTournamentStatus(
  basho: { startDate: string; endDate: string },
  now: Date = new Date()
): TournamentStatus {
  const start = parseJst(basho.startDate)
  const end = parseJst(basho.endDate)
  if (!start || !end) return { kind: 'unknown' }

  const startDay = jstDayIndex(start)
  const endDay = jstDayIndex(end)
  const today = jstDayIndex(now)

  if (today < startDay) return { kind: 'upcoming', daysUntil: startDay - today }
  if (today > endDay) return { kind: 'finished', daysSince: today - endDay }
  return { kind: 'live', day: today - startDay + 1, totalDays: endDay - startDay + 1 }
}

/** "3 hours ago" / "3 時間前"; "just now" under a minute. */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  lang: Language = 'en',
  now: Date = new Date()
): string {
  const date = toDate(value)
  if (!date) return ''
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(seconds)
  const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'auto' })

  if (abs < 60) return lang === 'jp' ? 'たった今' : 'just now'
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < MS_PER_DAY / 1000) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 30 * (MS_PER_DAY / 1000)) return rtf.format(Math.round(seconds / 86_400), 'day')
  return rtf.format(Math.round(seconds / (30 * 86_400)), 'month')
}
