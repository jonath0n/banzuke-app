import type { Rikishi } from '../types/banzuke'
import { getRankLabel, RANK_LEVEL_KANJI, RANK_LEVEL_NAMES, isSanyaku } from '../constants/ranks'
import { foldVariantKanji, jpRankShort } from '../data/kanji'

/**
 * Normalizes text for matching: compatibility forms (full-width → ASCII),
 * lower case, no diacritics (Hōshōryū → hoshoryu), katakana → hiragana,
 * variant kanji to their common form (琴櫻 → 琴桜), collapsed whitespace.
 */
export function foldForSearch(value: string): string {
  return foldVariantKanji(value)
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s\u3000]+/g, ' ')
    .trim()
}

export interface SearchEntry {
  rikishi: Rikishi
  /** Folded, space-separated searchable text. */
  text: string
  /** The same text as whole words, for terms that must not match inside another. */
  tokens: Set<string>
}

function rankTokens(r: Rikishi): string[] {
  const tokens = [
    RANK_LEVEL_NAMES[r.rankLevel],
    RANK_LEVEL_KANJI[r.rankLevel],
    r.rankName.en,
    r.rankName.jp,
    jpRankShort(r.rankCode, r.rankNumber),
  ]
  if (!isSanyaku(r.rankCode)) {
    tokens.push(getRankLabel(r.rankCode, r.rankNumber))
    tokens.push(`${RANK_LEVEL_NAMES[r.rankLevel]} ${r.rankNumber}`)
  }
  return tokens
}

function promotionTokens(r: Rikishi): string[] {
  if (!r.promotion) return []
  const words = { 'new-to-division': 'new', returning: 'back returning', 'new-rank': 'new' }
  return [r.promotion.raw, words[r.promotion.kind]]
}

/** Precomputes the searchable text for each wrestler. */
export function buildSearchIndex(rows: Rikishi[]): SearchEntry[] {
  return rows.map((rikishi) => {
    const text = foldForSearch(
      [
        rikishi.shikona.en,
        rikishi.shikona.jp,
        rikishi.reading ?? '',
        rikishi.heya.en,
        rikishi.heya.jp,
        rikishi.pref.en,
        rikishi.pref.jp,
        rikishi.side,
        rikishi.side === 'east' ? '東' : '西',
        ...rankTokens(rikishi),
        ...promotionTokens(rikishi),
      ].join(' ')
    )
    return { rikishi, text, tokens: new Set(text.split(' ')) }
  })
}

function termsOf(query: string): string[] {
  return foldForSearch(query).split(' ').filter(Boolean)
}

/**
 * A rank code (m1, j2, s, k…) or a bare number is a whole word: "m1" means
 * Maegashira 1, not M10 through M17. Everything else matches inside a word,
 * so "nosato" still finds Onosato.
 */
function isWholeWordTerm(term: string): boolean {
  return /^(?:[ymoskj]\d+|\d+)$/.test(term)
}

function matches(entry: SearchEntry, terms: string[]): boolean {
  return terms.every((term) =>
    isWholeWordTerm(term) ? entry.tokens.has(term) : entry.text.includes(term)
  )
}

/**
 * Wrestlers whose text contains every whitespace-separated term of the query.
 * An empty query matches everything.
 */
export function filterRikishi(index: SearchEntry[], query: string): Rikishi[] {
  const terms = termsOf(query)
  if (terms.length === 0) return index.map((entry) => entry.rikishi)
  return index.filter((entry) => matches(entry, terms)).map((entry) => entry.rikishi)
}

/**
 * Ids of the wrestlers matching the query, or null when the query is blank
 * (nothing is being filtered). Lets the sheet keep a matching wrestler's
 * East/West partner in view, dimmed, instead of dropping the half-row.
 */
export function matchingIds(index: SearchEntry[], query: string): Set<number> | null {
  const terms = termsOf(query)
  if (terms.length === 0) return null
  return new Set(index.filter((entry) => matches(entry, terms)).map((entry) => entry.rikishi.id))
}
