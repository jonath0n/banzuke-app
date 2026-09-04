/**
 * Builds the Japanese banzuke payload from the English JSON payload plus the
 * Japanese rikishi list page. Language-independent fields (ids, rank codes,
 * photos, tournament dates) are copied from the English payload; only the
 * text fields are replaced with their Japanese equivalents.
 */
import { jpBashoName, jpEraYear, jpNumberKanji, jpRankName } from '../../src/data/kanji.ts'
import { isPlaceholderRow, type RawPayload, type RawRikishi } from '../../src/data/schema.ts'
import type { JpSearchPage } from './jp-search-page.ts'

export interface JpBuildResult {
  payload: RawPayload
  /** rikishi_id → hiragana reading */
  readings: Record<string, string>
  /** rikishi_ids in the English payload that the Japanese page did not list */
  missing: number[]
}

function tournamentMonth(startDate: string): number {
  const month = Number(startDate.slice(5, 7))
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : 0
}

export function buildJpPayload(en: RawPayload, page: JpSearchPage): JpBuildResult {
  const byId = new Map(page.rows.map((row) => [row.rikishiId, row]))
  const readings: Record<string, string> = {}
  const missing: number[] = []

  const table: RawRikishi[] = en.BanzukeTable.map((row) => {
    if (isPlaceholderRow(row)) return { ...row }

    const id = Number(row.rikishi_id)
    const jp = byId.get(id)
    const rankCode = Number(row.rank)
    const position = Number(row.number) || 1

    if (!jp) {
      missing.push(id)
      return {
        ...row,
        banzuke_name: jpRankName(rankCode, position) || row.banzuke_name,
        numberKanji: jpNumberKanji(position),
        pref_name: page.prefectures[Number(row.pref_id)] ?? row.pref_name,
      }
    }

    if (jp.reading) readings[String(id)] = jp.reading

    return {
      ...row,
      banzuke_name: jp.rankName || jpRankName(rankCode, position) || row.banzuke_name,
      numberKanji: jpNumberKanji(position),
      pref_name: (jp.prefName || page.prefectures[Number(row.pref_id)]) ?? row.pref_name,
      heya_name: jp.heyaName || row.heya_name,
      shikona: jp.shikona,
    }
  })

  const month = tournamentMonth(en.BashoInfo?.start_date ?? '')
  const year = Number(en.BashoInfo?.year_eng ?? en.year_jp)
  const yearJp = Number.isInteger(year) && year > 2018 ? jpEraYear(year) : en.BashoInfo?.year_jp

  const payload: RawPayload = {
    ...en,
    BanzukeTable: table,
    basho_name: month ? jpBashoName(month) : en.BashoInfo?.basho_name || en.basho_name,
    year_jp: yearJp || en.year_jp,
    lang: 'JP',
    Kakuzuke: '幕内',
  }

  return { payload, readings, missing }
}
