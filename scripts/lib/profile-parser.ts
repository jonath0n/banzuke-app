/**
 * Parsers for the JSA rikishi profile pages:
 *   EN  https://www.sumo.or.jp/EnSumoDataRikishi/profile/{id}/
 *   JP  https://www.sumo.or.jp/ResultRikishiData/profile/{id}/
 *
 * Both pages open with a "basic information" table of label/value rows. The
 * English page has the vital statistics; the Japanese page adds the debut,
 * career milestones and highest rank, which are converted from era dates.
 */
import { parse, type HTMLElement } from 'node-html-parser'
import { fromKanjiNumber, parseJpBasho, parseJpDate } from '../../src/data/kanji.ts'
import type { CareerMilestone, RikishiProfile } from '../../src/data/profiles.ts'

export interface EnProfile {
  stable: string
  realName: string
  ringName: string
  currentRank: string
  /** YYYY-MM-DD */
  birthDate: string | null
  birthplace: string
  heightCm: number | null
  weightKg: number | null
  kimarite: string
}

export interface JpProfile {
  heya: string
  realName: string
  /** Kanji ring name from the header. */
  shikona: string
  reading: string
  /** YYYY-MM-DD */
  birthDate: string | null
  birthplace: string
  heightCm: number | null
  weightKg: number | null
  kimarite: string
  /** YYYY-MM */
  debut: string | null
  milestones: Partial<Record<CareerMilestone, string>>
  highestRank: string
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const MILESTONE_LABELS: Record<string, CareerMilestone> = {
  新十両: 'juryo',
  新入幕: 'makuuchi',
  新三役: 'sanyaku',
  大関昇進: 'ozeki',
  横綱昇進: 'yokozuna',
}

const RANK_EN_BY_KANJI: Record<string, string> = {
  横綱: 'Yokozuna',
  大関: 'Ozeki',
  関脇: 'Sekiwake',
  小結: 'Komusubi',
  前頭: 'Maegashira',
  十両: 'Juryo',
  幕下: 'Makushita',
  三段目: 'Sandanme',
  序二段: 'Jonidan',
  序ノ口: 'Jonokuchi',
}

function text(el: HTMLElement | null | undefined): string {
  return (el?.text ?? '')
    .replace(/&nbsp;|&emsp;/g, ' ')
    .replace(/[\s\u3000]+/g, ' ')
    .trim()
}

/** Label → value for the first basic-information table on the page. */
function basicInfo(root: HTMLElement): Map<string, string> {
  const rows = new Map<string, string>()
  const table = root.querySelector('table.mdTable2') ?? root.querySelector('table')
  if (!table) return rows
  for (const tr of table.querySelectorAll('tr')) {
    const th = tr.querySelector('th')
    const td = tr.querySelector('td')
    if (th && td) rows.set(text(th), text(td))
  }
  return rows
}

function measure(value: string | undefined): number | null {
  const m = /([\d.]+)\s*(?:cm|kg)/.exec(value ?? '')
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

/** "June 7, 2000" → "2000-06-07". */
export function parseEnDate(value: string | undefined): string | null {
  const m = /^([A-Za-z]+)\.? (\d{1,2}),? (\d{4})$/.exec((value ?? '').trim())
  if (!m) return null
  const month = MONTHS.indexOf(m[1].toLowerCase()) + 1
  const day = Number(m[2])
  if (month === 0 || day < 1 || day > 31) return null
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function yearMonth(value: string | undefined): string | null {
  const parsed = parseJpBasho(value ?? '')
  return parsed ? `${parsed.year}-${String(parsed.month).padStart(2, '0')}` : null
}

export function parseEnProfile(html: string): EnProfile {
  const info = basicInfo(parse(html))
  return {
    stable: info.get('Stable') ?? '',
    realName: info.get('Name') ?? '',
    ringName: info.get('Ring Name') ?? '',
    currentRank: info.get('Current Rank') ?? '',
    birthDate: parseEnDate(info.get('Birthday')),
    birthplace: info.get('Birthplace') ?? '',
    heightCm: measure(info.get('Height')),
    weightKg: measure(info.get('Weight')),
    kimarite: info.get('Signature Maneuver') ?? '',
  }
}

export function parseJpProfile(html: string): JpProfile {
  const root = parse(html)
  const info = basicInfo(root)

  // Header cell: "大の里 泰輝   東横綱" then "(おおのさと だいき)" on the next line.
  const header =
    root.querySelector('table.mdTable2 td[colspan]') ?? root.querySelector('td[colspan]')
  const headerText = text(header)
  const reading = /[（(]([^()（）]+)[)）]/.exec(headerText)?.[1]?.trim() ?? ''
  const shikona = text(header?.querySelector('span')).split(' ')[0] ?? ''

  const milestones: Partial<Record<CareerMilestone, string>> = {}
  for (const [label, key] of Object.entries(MILESTONE_LABELS)) {
    const ym = yearMonth(info.get(label))
    if (ym) milestones[key] = ym
  }

  return {
    heya: info.get('所属部屋') ?? '',
    realName: info.get('本名') ?? '',
    shikona,
    reading,
    birthDate: parseJpDate(info.get('生年月日') ?? ''),
    birthplace: info.get('出身地') ?? '',
    heightCm: measure(info.get('身長')),
    weightKg: measure(info.get('体重')),
    kimarite: info.get('得意技') ?? '',
    debut: yearMonth(info.get('初土俵')),
    milestones,
    highestRank: info.get('最高位') ?? '',
  }
}

/** 前頭三枚目 → "Maegashira #3", 横綱 → "Yokozuna". */
export function translateRank(jp: string): string {
  const trimmed = jp.trim()
  for (const [kanji, en] of Object.entries(RANK_EN_BY_KANJI)) {
    if (!trimmed.startsWith(kanji)) continue
    const rest = trimmed.slice(kanji.length)
    if (!rest) return en
    if (rest === '筆頭') return `${en} #1`
    const n = fromKanjiNumber(rest.replace(/枚目$/, ''))
    return n === null ? en : `${en} #${n}`
  }
  return trimmed
}

/** Merges both languages into the app's profile record. */
export function buildProfile(
  id: number,
  en: EnProfile | null,
  jp: JpProfile | null,
  bashoId: number
): RikishiProfile {
  const highestJp = jp?.highestRank ?? ''
  return {
    id,
    realName: { en: en?.realName ?? '', jp: jp?.realName ?? '' },
    birthDate: en?.birthDate ?? jp?.birthDate ?? null,
    birthplace: { en: en?.birthplace ?? '', jp: jp?.birthplace ?? '' },
    heightCm: en?.heightCm ?? jp?.heightCm ?? null,
    weightKg: en?.weightKg ?? jp?.weightKg ?? null,
    kimarite: { en: en?.kimarite ?? '', jp: jp?.kimarite ?? '' },
    debut: jp?.debut ?? null,
    highestRank: { en: highestJp ? translateRank(highestJp) : '', jp: highestJp },
    milestones: jp?.milestones ?? {},
    bashoId,
  }
}
