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

/**
 * The elements of the Master section: everything after the "Master" / 師匠
 * heading up to the next section heading. The page lists the Gyoji,
 * Yobidashi and Tokoyama in the same shape further down, so a stable with no
 * master listed must yield nothing rather than the referee.
 */
function masterSection(root: HTMLElement, heading: string): HTMLElement[] {
  const all = root.querySelectorAll('*')
  const start = all.findIndex((el) => el.tagName === 'H3' && text(el) === heading)
  if (start === -1) return []
  const section: HTMLElement[] = []
  for (const el of all.slice(start + 1)) {
    if (el.tagName === 'H3') break
    section.push(el)
  }
  return section
}

interface MasterCard {
  name: string
  info: Map<string, string>
}

/** The master's name from the card header and the label → value rows of his table. */
function masterCard(root: HTMLElement, heading: string): MasterCard {
  const section = masterSection(root, heading)
  const nameEl = section.find((el) => el.tagName === 'H4')?.querySelector('.txt2')
  const info = new Map<string, string>()
  const table = section.find((el) => el.tagName === 'TABLE' && el.classList.contains('mdTable2'))
  for (const tr of table?.querySelectorAll('tr') ?? []) {
    const th = tr.querySelector('th')
    const td = tr.querySelector('td')
    if (th && td) info.set(text(th), withoutParenthetical(text(td)))
  }
  return { name: withoutParenthetical(text(nameEl)), info }
}

/** 'Komusubi Asahiyutaka' → ['Komusubi', 'Asahiyutaka']; '小結 旭豊' likewise. */
function splitRankAndName(value: string): [string, string] {
  const [rank = '', ...rest] = value.split(' ')
  return [rank, rest.join(' ')]
}

export function parseEnStable(html: string): EnStable {
  const root = parse(html)
  const heading = text(root.querySelector('h2.mdTtl2.type2'))
  const master = masterCard(root, 'Master')
  const [masterRank, masterShikona] = splitRankAndName(master.info.get('Ring Name') ?? '')
  return {
    name: heading.replace(/\s+Stable$/i, ''),
    masterName: master.name,
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
  const master = masterCard(root, '師匠')
  const [masterRank, masterShikona] = splitRankAndName(master.info.get('しこ名') ?? '')
  return {
    name: heading.replace(/部屋$/, ''),
    address,
    masterName: master.name,
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
