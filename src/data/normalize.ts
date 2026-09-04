/**
 * Converts a validated raw snapshot into the app's internal model.
 * This is the only place that knows about the upstream field names and quirks.
 */
import type {
  Banzuke,
  Basho,
  DataSource,
  Division,
  Promotion,
  Rikishi,
  Side,
} from '../types/banzuke'
import { getRankLevelFromCode } from '../constants/ranks'
import { jpNumberKanji, jpRankName } from './kanji'
import { isPlaceholderRow, type RawPayload, type RawRikishi, type RawSnapshot } from './schema'

/**
 * Returns the ring name from an upstream shikona that may carry the given
 * name after an ideographic space (U+3000), e.g. "豊昇龍 智勝" → "豊昇龍".
 */
export function ringName(shikona: string): string {
  return shikona.trim().split(/[\u3000\s]+/)[0] ?? ''
}

/** Maps the upstream promotion flag (新入幕, 再入幕, 新小結 …) to a kind. */
export function parsePromotion(raw: string | undefined): Promotion | null {
  const flag = (raw ?? '').trim()
  if (!flag) return null
  if (flag.includes('入幕') || flag.includes('入十両')) {
    return { kind: flag.startsWith('再') ? 'returning' : 'new-to-division', raw: flag }
  }
  if (flag.startsWith('再')) return { kind: 'returning', raw: flag }
  return { kind: 'new-rank', raw: flag }
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function cleanText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
}

function normalizeRikishi(
  en: RawRikishi,
  jp: RawRikishi | undefined,
  reading: string | undefined
): Rikishi {
  const rankCode = toNumber(en.rank)
  const rankNumber = Math.max(1, toNumber(en.number, 1))
  const side: Side = toNumber(en.ew) === 2 ? 'west' : 'east'
  const jpNumberKanjiValue =
    jp?.numberKanji && !jp.numberKanji.startsWith('#') ? jp.numberKanji : jpNumberKanji(rankNumber)

  return {
    id: toNumber(en.rikishi_id),
    side,
    rankCode,
    rankLevel: getRankLevelFromCode(rankCode),
    rankNumber,
    rankName: {
      en: cleanText(en.banzuke_name),
      jp: cleanText(jp?.banzuke_name) || jpRankName(rankCode, rankNumber),
    },
    numberKanji: jpNumberKanjiValue,
    sortKey: en.sort ?? '',
    shikona: {
      en: cleanText(en.shikona),
      jp: ringName(cleanText(jp?.shikona)) || cleanText(en.shikona),
    },
    reading: reading?.trim() || null,
    heya: {
      id: toNumber(en.heya_id),
      en: cleanText(en.heya_name),
      jp: cleanText(jp?.heya_name) || cleanText(en.heya_name),
    },
    pref: {
      id: toNumber(en.pref_id),
      en: cleanText(en.pref_name),
      jp: cleanText(jp?.pref_name) || cleanText(en.pref_name),
    },
    photo: cleanText(en.photo) || null,
    promotion: parsePromotion(en.rank_new ?? jp?.rank_new),
  }
}

function normalizeBasho(en: RawPayload, jp: RawPayload): Basho {
  const info = en.BashoInfo
  const startDate = cleanText(info?.start_date)
  const year = toNumber(info?.year_eng) || toNumber(startDate.slice(0, 4))
  const month = toNumber(startDate.slice(5, 7))
  return {
    id: toNumber(en.basho_id ?? info?.basho_id),
    name: {
      en: cleanText(en.basho_name),
      jp: cleanText(jp.basho_name) || cleanText(info?.basho_name) || cleanText(en.basho_name),
    },
    year,
    yearJp: cleanText(jp.year_jp) || cleanText(info?.year_jp),
    month,
    startDate,
    endDate: cleanText(info?.end_date),
    announcedAt: cleanText(info?.banzuke_announcement_datetime) || null,
    venueId: info?.venue_id != null ? toNumber(info.venue_id) || null : null,
  }
}

function divisionOf(payload: RawPayload): Division {
  return String(payload.kakuzuke_id) === '2' ? 'juryo' : 'makuuchi'
}

/** Banzuke order: by upstream sort key, then East before West. */
function compareRikishi(a: Rikishi, b: Rikishi): number {
  if (a.sortKey !== b.sortKey) return a.sortKey < b.sortKey ? -1 : 1
  if (a.side !== b.side) return a.side === 'east' ? -1 : 1
  return 0
}

export function normalizeSnapshot(snapshot: RawSnapshot, source: DataSource): Banzuke {
  const en = snapshot.payloads.en
  const jp = snapshot.payloads.jp
  const readings = snapshot.readings ?? {}

  const jpById = new Map<number, RawRikishi>()
  for (const row of jp.BanzukeTable) {
    if (!isPlaceholderRow(row)) jpById.set(toNumber(row.rikishi_id), row)
  }

  const rikishi = en.BanzukeTable.filter((row) => !isPlaceholderRow(row)).map((row) => {
    const id = toNumber(row.rikishi_id)
    return normalizeRikishi(row, jpById.get(id), readings[String(id)])
  })
  rikishi.sort(compareRikishi)

  return {
    division: divisionOf(en),
    basho: normalizeBasho(en, jp),
    rikishi,
    fetchedAt: snapshot.fetchedAt,
    source,
  }
}
