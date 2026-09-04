/**
 * Parser for the Japanese rikishi list page
 * (https://www.sumo.or.jp/ResultRikishiData/search), which is server-rendered
 * and lists every wrestler of a division with kanji name, hiragana reading,
 * rank, prefecture and stable. The JSA's Japanese JSON endpoints are no
 * longer reachable from outside a browser, so this page is our Japanese source.
 */
import { parse, type HTMLElement } from 'node-html-parser'

export interface JpSearchRow {
  rikishiId: number
  /** Ring name in kanji, e.g. 豊昇龍 */
  shikona: string
  /** Hiragana reading, e.g. ほうしょうりゅう */
  reading: string
  /** 'east' | 'west' from the leading 東/西 of the rank label */
  side: 'east' | 'west'
  /** Rank label without the side prefix, e.g. 横綱, 前頭十七枚目 */
  rankName: string
  prefId: number | null
  prefName: string
  heyaId: number | null
  heyaName: string
}

export interface JpSearchPage {
  rows: JpSearchRow[]
  /** pref_id → Japanese prefecture/country name, from the search form. */
  prefectures: Record<number, string>
}

const PROFILE_RE = /\/profile\/(\d+)\//
const PREF_RE = /pref_id=(\d+)/
const HEYA_RE = /\/detail\/(\d+)\//

function text(el: HTMLElement | null | undefined): string {
  return (el?.text ?? '').replace(/\s+/g, ' ').trim()
}

function idFrom(href: string | undefined, re: RegExp): number | null {
  const match = href ? re.exec(href) : null
  return match ? Number(match[1]) : null
}

function parseRow(tr: HTMLElement): JpSearchRow | null {
  const profileLink = tr.querySelector('a[href*="/profile/"]')
  const rikishiId = idFrom(profileLink?.getAttribute('href'), PROFILE_RE)
  if (!profileLink || rikishiId === null) return null

  const shikona = text(profileLink.querySelector('span'))
  const reading = text(profileLink)
    .replace(shikona, '')
    .replace(/[()（）]/g, '')
    .trim()

  const rankLabel = text(tr.querySelector('th'))
  const side = rankLabel.startsWith('西') ? 'west' : 'east'
  const rankName = rankLabel.replace(/^[東西]/, '')

  const prefLink = tr.querySelector('a[href*="pref_id="]')
  const heyaLink = tr.querySelector('a[href*="SumoBeya/detail/"]')

  return {
    rikishiId,
    shikona,
    reading,
    side,
    rankName,
    prefId: idFrom(prefLink?.getAttribute('href'), PREF_RE),
    prefName: text(prefLink),
    heyaId: idFrom(heyaLink?.getAttribute('href'), HEYA_RE),
    heyaName: text(heyaLink),
  }
}

export function parseJpSearchPage(html: string): JpSearchPage {
  const root = parse(html)

  const prefectures: Record<number, string> = {}
  for (const option of root.querySelectorAll('select[name="pref_id"] option')) {
    const id = Number(option.getAttribute('value'))
    const name = text(option)
    if (Number.isInteger(id) && id > 0 && name) prefectures[id] = name
  }

  const rows: JpSearchRow[] = []
  for (const tr of root.querySelectorAll('table tr')) {
    const row = parseRow(tr)
    if (row) rows.push(row)
  }

  return { rows, prefectures }
}
