/**
 * The app's internal, normalized data model.
 *
 * Raw upstream JSON (see `src/data/schema.ts`) is converted once, at the data
 * boundary, by `src/data/normalize.ts`. Components only ever see these types:
 * ids are numbers, sides are words, and every localized string carries both
 * languages, so nothing downstream needs to coerce or guess.
 */

import type { Division } from '../data/schema'

export type { Division }

export type Language = 'en' | 'jp'

export type Side = 'east' | 'west'

/** Rank tiers, used for styling and grouping. */
export type RankLevel = 'yokozuna' | 'ozeki' | 'sekiwake' | 'komusubi' | 'maegashira' | 'juryo'

export interface Localized {
  en: string
  jp: string
}

export type PromotionKind =
  /** First time in this division (新入幕) */
  | 'new-to-division'
  /** Back in this division or at this rank after dropping (再入幕, 再大関) */
  | 'returning'
  /** First time at this sanyaku rank (新小結, 新関脇, 新大関, 新横綱) */
  | 'new-rank'

export interface Promotion {
  kind: PromotionKind
  /** The upstream flag as printed on the banzuke, e.g. 新入幕 */
  raw: string
}

export interface Rikishi {
  /** JSA rikishi id; stable across tournaments and the key into profile pages. */
  id: number
  side: Side
  /** 100 Yokozuna … 500 Maegashira, 600 Juryo */
  rankCode: number
  rankLevel: RankLevel
  /** Position within a numbered rank (Maegashira 1 → 1); 1 for sanyaku. */
  rankNumber: number
  /** Full rank name, e.g. { en: 'Maegashira #17', jp: '前頭十七枚目' } */
  rankName: Localized
  /** Japanese ordinal for the position: 筆頭, 二枚目 … */
  numberKanji: string
  /** Upstream composite sort key; ascending order is banzuke order. */
  sortKey: string
  /** Ring name. */
  shikona: Localized
  /** Hiragana reading of the ring name, when known. */
  reading: string | null
  heya: { id: number } & Localized
  pref: { id: number } & Localized
  /** Photo filename on the JSA CDN, or null when there is no portrait. */
  photo: string | null
  promotion: Promotion | null
}

export interface Basho {
  id: number
  name: Localized
  /** Western year, e.g. 2026 */
  year: number
  /** Japanese era year, e.g. 令和八年 */
  yearJp: string
  /** 1–12 */
  month: number
  /** YYYY-MM-DD in JST */
  startDate: string
  /** YYYY-MM-DD in JST */
  endDate: string
  /** Naive JST datetime string from upstream, or null. */
  announcedAt: string | null
  venueId: number | null
}

export type DataSource = 'live' | 'sample'

export interface Banzuke {
  division: Division
  basho: Basho
  /** In banzuke order (East before West within a rank). */
  rikishi: Rikishi[]
  /** ISO timestamp of when the snapshot was fetched from sumo.or.jp. */
  fetchedAt: string
  source: DataSource
}

/**
 * Every division of one tournament. Makuuchi is always present; Juryo is
 * null when the snapshot did not include it.
 */
export interface BanzukeSet {
  makuuchi: Banzuke
  juryo: Banzuke | null
}

/**
 * A paired row in the banzuke grid showing the East and West wrestlers at
 * the same rank position.
 */
export interface RankGroup {
  /** Language-independent key, e.g. "500-17" */
  key: string
  rankCode: number
  rankNumber: number
  rankLevel: RankLevel
  name: Localized
  east: Rikishi | null
  west: Rikishi | null
}
