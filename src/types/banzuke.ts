export interface Rikishi {
  sort?: string
  banzuke_name: string
  ew: number // 1 = East, 2 = West
  banzuke_id: number
  kakuzuke_id: string
  rikishi_id: number | string
  rikishi_banzuke_id: number | string
  rank: number | string
  rank_new: string
  seat_order: number | string
  number: number | string
  numberKanji: string
  photo: string
  pref_id: number | string
  pref_name: string
  heya_id: number | string
  heya_name: string
  shikona: string
}

export interface BashoInfo {
  today: string
  basho_id: number
  start_date: string
  end_date: string
  year_jp: string
  basho_name: string
  basho_name_eng: string
  start_datetime: string
  end_datetime: string
  ticket_advanceselling_start_datetime: string
  ticket_advanceselling_end_datetime: string
  ticket_preselling_datetime: string
  year_eng: string
  JpDate: string
  BattleNow: number
  banzuke_announcement_datetime: string
  day: string
  venue_id: number
}

export interface BanzukePayload {
  BanzukeTable: Rikishi[]
  basho_name: string
  year_jp: string
  lang: string
  kakuzuke_id: string
  page: string
  Kakuzuke: string
  list_max: number
  basho_id: number
  BashoInfo: BashoInfo
  Result: string
}

export interface BanzukeSnapshot {
  fetchedAt: string
  sources: Record<string, string>
  payloads: Record<string, BanzukePayload>
  // Legacy format support
  payload?: BanzukePayload
  source?: string
}

export interface RankGroup {
  name: string
  east: Rikishi | null
  west: Rikishi | null
}

export type RankLevel = 'yokozuna' | 'ozeki' | 'sekiwake' | 'komusubi' | 'maegashira'

export type Language = 'en' | 'jp'
