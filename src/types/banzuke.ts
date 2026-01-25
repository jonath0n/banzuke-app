/**
 * Represents a single wrestler (rikishi) entry in the banzuke.
 * Data comes from the Japan Sumo Association API.
 */
export interface Rikishi {
  /** Sort order within the banzuke */
  sort?: string
  /** The rank name in the banzuke (e.g., "横綱", "Yokozuna") */
  banzuke_name: string
  /** East/West indicator: 1 = East (東), 2 = West (西) */
  ew: number
  /** Unique identifier for the banzuke entry */
  banzuke_id: number
  /** Rank classification ID */
  kakuzuke_id: string
  /** Unique identifier for the wrestler */
  rikishi_id: number | string
  /** Wrestler's banzuke-specific ID */
  rikishi_banzuke_id: number | string
  /** Numeric rank code (100=Yokozuna, 200=Ozeki, etc.) */
  rank: number | string
  /** Promotion/demotion indicator (e.g., "新", "再") */
  rank_new: string
  /** Position within the rank */
  seat_order: number | string
  /** Numeric position (e.g., 1 for M1) */
  number: number | string
  /** Position in Japanese kanji */
  numberKanji: string
  /** Filename for wrestler's photo */
  photo: string
  /** Home prefecture ID */
  pref_id: number | string
  /** Home prefecture name */
  pref_name: string
  /** Training stable (heya) ID */
  heya_id: number | string
  /** Training stable (heya) name */
  heya_name: string
  /** Wrestler's ring name (四股名) */
  shikona: string
  /** English ring name (for bilingual display) */
  shikona_en?: string
  /** Japanese ring name (for bilingual display) */
  shikona_jp?: string
  /** English rank name (for bilingual display) */
  banzuke_name_en?: string
  /** Japanese rank name (for bilingual display) */
  banzuke_name_jp?: string
}

/**
 * Information about a sumo tournament (basho).
 * Includes dates, venue, and timing information.
 */
export interface BashoInfo {
  /** Current date string */
  today: string
  /** Unique tournament identifier */
  basho_id: number
  /** Tournament start date */
  start_date: string
  /** Tournament end date */
  end_date: string
  /** Year in Japanese era format (e.g., "令和7年") */
  year_jp: string
  /** Tournament name in Japanese */
  basho_name: string
  /** Tournament name in English */
  basho_name_eng: string
  /** Tournament start datetime */
  start_datetime: string
  /** Tournament end datetime */
  end_datetime: string
  /** Ticket advance sale start datetime */
  ticket_advanceselling_start_datetime: string
  /** Ticket advance sale end datetime */
  ticket_advanceselling_end_datetime: string
  /** Ticket presale datetime */
  ticket_preselling_datetime: string
  /** Year in Western format */
  year_eng: string
  /** Japanese formatted date */
  JpDate: string
  /** Whether matches are currently ongoing */
  BattleNow: number
  /** Banzuke announcement datetime */
  banzuke_announcement_datetime: string
  /** Current day of tournament */
  day: string
  /** Venue identifier */
  venue_id: number
}

/**
 * Complete banzuke data payload from the API.
 * Contains the wrestler table and tournament metadata.
 */
export interface BanzukePayload {
  /** Array of all wrestlers in the banzuke */
  BanzukeTable: Rikishi[]
  /** Tournament name */
  basho_name: string
  /** Year in Japanese era format */
  year_jp: string
  /** Language code of this payload */
  lang: string
  /** Rank classification ID */
  kakuzuke_id: string
  /** Page identifier */
  page: string
  /** Division name (e.g., "幕内", "Makuuchi") */
  Kakuzuke: string
  /** Maximum number of entries */
  list_max: number
  /** Tournament identifier */
  basho_id: number
  /** Detailed tournament information */
  BashoInfo: BashoInfo
  /** API result status */
  Result: string
}

/**
 * Cached snapshot of banzuke data, supporting multiple languages.
 * Stored as static JSON and fetched by the app.
 */
export interface BanzukeSnapshot {
  /** ISO timestamp when data was fetched */
  fetchedAt: string
  /** Map of language codes to source URLs */
  sources: Record<string, string>
  /** Map of language codes to payload data */
  payloads: Record<string, BanzukePayload>
  /** @deprecated Legacy single-payload format */
  payload?: BanzukePayload
  /** @deprecated Legacy single-source format */
  source?: string
}

/**
 * A paired row in the banzuke grid showing east and west wrestlers
 * at the same rank position.
 */
export interface RankGroup {
  /** Display name for this rank (e.g., "横綱", "Maegashira 1") */
  name: string
  /** Eastern side wrestler, or null if position is vacant */
  east: Rikishi | null
  /** Western side wrestler, or null if position is vacant */
  west: Rikishi | null
}

/**
 * The five rank tiers in makuuchi division, used for styling.
 */
export type RankLevel = 'yokozuna' | 'ozeki' | 'sekiwake' | 'komusubi' | 'maegashira'

/**
 * Supported display languages.
 */
export type Language = 'en' | 'jp'
