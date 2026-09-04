import type { Language } from '../types/banzuke'

const LOCALES: Record<Language, string> = { en: 'en-US', jp: 'ja-JP' }

function utcDate(iso: string): Date | null {
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

/** "2000-06-07" → "June 7, 2000" / "2000年6月7日". */
export function formatBirthDate(iso: string, language: Language): string {
  const date = utcDate(iso)
  if (!date) return iso
  return new Intl.DateTimeFormat(LOCALES[language], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Completed years between a birth date and `now`. */
export function ageOn(iso: string, now: Date = new Date()): number | null {
  const birth = utcDate(iso)
  if (!birth) return null
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

/** "2023-05" → "May 2023" / "2023年5月". */
export function formatYearMonth(yearMonth: string, language: Language): string {
  const date = utcDate(`${yearMonth}-01`)
  if (!date) return yearMonth
  return new Intl.DateTimeFormat(LOCALES[language], {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
}

/** 190 → "190 cm" / "190cm"; keeps one decimal when present. */
export function formatMeasure(value: number, unit: 'cm' | 'kg', language: Language): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return language === 'jp' ? `${text}${unit}` : `${text} ${unit}`
}
