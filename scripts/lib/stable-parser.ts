/**
 * Parsers for the JSA stable pages:
 *   EN  https://www.sumo.or.jp/EnSumoDataSumoBeya/detail/{id}/
 *   JP  https://www.sumo.or.jp/ResultRikishiDataSumoBeya/detail/{id}/
 *
 * Both open with the stable's name as the page heading and a "Master" card:
 * the elder's name in a small header, then a label/value table whose first
 * row is the ring name he fought under, prefixed by his highest rank. The
 * Japanese page also carries the postal address above the master. The roster
 * further down is not read: the banzuke already says who the sekitori are.
 */
import { parse, type HTMLElement } from 'node-html-parser'
import type { Stable, StableMaster } from '../../src/data/stables.ts'

export interface EnStable {
  /** 'Tatsunami' (the page says 'Tatsunami Stable'). */
  name: string
  masterName: string
  /** 'Komusubi' — the first word of the Ring Name row. */
  masterRank: string
  /** 'Asahiyutaka' — the rest of the Ring Name row. */
  masterShikona: string
}

export interface JpStable {
  /** '立浪' (the page says 立浪部屋). */
  name: string
  address: string
  masterName: string
  masterRank: string
  masterShikona: string
}

function text(el: HTMLElement | null | undefined): string {
  return (el?.text ?? '')
    .replace(/&nbsp;|&emsp;/g, ' ')
    .replace(/[\s\u3000]+/g, ' ')
    .trim()
}

/** Strips a trailing reading or note in parentheses: 立浪 耐治（たつなみ） → 立浪 耐治. */
function withoutParenthetical(value: string): string {
  return value.replace(/[（(][^()（）]*[)）]/g, '').trim()
}

/** Label → value for the master's table, the first `table.mdTable2` on the page. */
function masterInfo(root: HTMLElement): Map<string, string> {
  const rows = new Map<string, string>()
  const table = root.querySelector('table.mdTable2')
  if (!table) return rows
  for (const tr of table.querySelectorAll('tr')) {
    const th = tr.querySelector('th')
    const td = tr.querySelector('td')
    if (th && td) rows.set(text(th), withoutParenthetical(text(td)))
  }
  return rows
}

/** The master's name from the card header, absent when the stable has no master listed. */
function masterName(root: HTMLElement): string {
  return withoutParenthetical(text(root.querySelector('h4.mdTtl5 .txt2')))
}

/** 'Komusubi Asahiyutaka' → ['Komusubi', 'Asahiyutaka']; '小結 旭豊' likewise. */
function splitRankAndName(value: string): [string, string] {
  const [rank = '', ...rest] = value.split(' ')
  return [rank, rest.join(' ')]
}

export function parseEnStable(html: string): EnStable {
  const root = parse(html)
  const heading = text(root.querySelector('h2.mdTtl2.type2'))
  const [masterRank, masterShikona] = splitRankAndName(masterInfo(root).get('Ring Name') ?? '')
  return {
    name: heading.replace(/\s+Stable$/i, ''),
    masterName: masterName(root),
    masterRank,
    masterShikona,
  }
}

export function parseJpStable(html: string): JpStable {
  const root = parse(html)
  const heading = text(root.querySelector('h2.mdTtl2.type2'))
  let address = ''
  for (const tr of root.querySelectorAll('table.mdTable3 tr')) {
    if (text(tr.querySelector('th')) === '所在地') {
      // The postal code and the street sit on two lines: keep them as one.
      address = text(parse(tr.querySelector('td')?.innerHTML.replace(/<br\s*\/?>/gi, ' ') ?? ''))
    }
  }
  const [masterRank, masterShikona] = splitRankAndName(masterInfo(root).get('しこ名') ?? '')
  return {
    name: heading.replace(/部屋$/, ''),
    address,
    masterName: masterName(root),
    masterRank,
    masterShikona,
  }
}

/** Merges both languages into the app's stable record; null when neither page named the stable. */
export function buildStable(
  id: number,
  en: EnStable | null,
  jp: JpStable | null,
  bashoId: number
): Stable | null {
  const name = { en: en?.name ?? '', jp: jp?.name ?? '' }
  if (!name.en && !name.jp) return null
  const master: StableMaster | null =
    en?.masterName || jp?.masterName
      ? {
          name: { en: en?.masterName ?? '', jp: jp?.masterName ?? '' },
          formerShikona: { en: en?.masterShikona ?? '', jp: jp?.masterShikona ?? '' },
          highestRank: { en: en?.masterRank ?? '', jp: jp?.masterRank ?? '' },
        }
      : null
  return { id, name, master, address: jp?.address || null, bashoId }
}
