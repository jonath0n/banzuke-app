/**
 * Test fixtures shared across unit tests: raw upstream shapes (as the JSA
 * API returns them) and normalized app-model shapes.
 */
import type { Lang, RawPayload, RawRikishi, RawSnapshot } from '../data/schema'
import type { Banzuke, Basho, Rikishi } from '../types/banzuke'

const NAMES: Record<Lang, string[]> = {
  en: ['Hoshoryu', 'Onosato', 'Kirishima', 'Kotozakura'],
  jp: ['豊昇龍　智勝', '大の里　泰輝', '霧島　鐵力', '琴櫻　将且'],
}

export function makeRawRow(
  index: number,
  lang: Lang,
  overrides: Partial<RawRikishi> = {}
): RawRikishi {
  const rankCode = index < 2 ? 100 : index < 4 ? 200 : 500
  const number = index < 4 ? 1 : Math.floor((index - 4) / 2) + 1
  return {
    // Upstream composite key: rank/100 (3 digits) + position (7) + seat (5)
    sort: `${String(rankCode / 100).padStart(3, '0')}${String(number).padStart(7, '0')}00001`,
    banzuke_name: lang === 'en' ? `Maegashira #${number}` : `前頭${number}枚目`,
    ew: index % 2 === 0 ? 1 : 2,
    banzuke_id: index + 1,
    kakuzuke_id: '1',
    rikishi_id: 1000 + index,
    rikishi_banzuke_id: 100 + index,
    rank: rankCode,
    rank_new: index === 5 ? '新入幕' : '',
    seat_order: 1,
    number,
    numberKanji: lang === 'en' ? `#${number}` : '筆頭',
    photo: `2020${String(index).padStart(4, '0')}.jpg`,
    pref_id: 13,
    pref_name: lang === 'en' ? 'Tokyo' : '東京都',
    heya_id: 1,
    heya_name: lang === 'en' ? 'Tatsunami' : '立浪',
    shikona: NAMES[lang][index] ?? `${lang}-rikishi-${index}`,
    ...overrides,
  }
}

export function makeRawPayload(
  lang: Lang,
  rows = 24,
  overrides: Partial<RawPayload> = {}
): RawPayload {
  const table = Array.from({ length: rows }, (_, i) => makeRawRow(i, lang))
  return {
    BanzukeTable: table,
    basho_name: lang === 'en' ? 'September Grand Sumo Tournament' : '九月場所',
    year_jp: lang === 'en' ? '2026' : '令和八年',
    lang: lang.toUpperCase(),
    kakuzuke_id: '1',
    page: '1',
    Kakuzuke: lang === 'en' ? 'Makuuchi&nbsp;Division' : '幕内',
    list_max: table.length,
    basho_id: 637,
    BashoInfo: {
      today: '2026-09-04',
      basho_id: 637,
      start_date: '2026-09-13',
      end_date: '2026-09-27',
      year_jp: '令和八年',
      basho_name: '九月場所',
      basho_name_eng: 'September',
      start_datetime: '2026-09-13 00:00:00',
      end_datetime: '2026-09-27 19:00:00',
      ticket_advanceselling_start_datetime: '',
      ticket_advanceselling_end_datetime: '',
      ticket_preselling_datetime: '2026-08-08 10:00:00',
      year_eng: '2026',
      JpDate: '令和8年9月13日(日)',
      BattleNow: 0,
      banzuke_announcement_datetime: '2026-08-31 06:00:00',
      day: '',
      venue_id: 1,
    },
    Result: '1',
    ...overrides,
  }
}

export function makeRawSnapshot(overrides: Partial<RawSnapshot> = {}): RawSnapshot {
  return {
    version: 1,
    fetchedAt: '2026-09-04T00:00:00.000Z',
    sources: { en: 'https://example.test/en', jp: 'https://example.test/jp' },
    payloads: { en: makeRawPayload('en'), jp: makeRawPayload('jp') },
    readings: { '1000': 'ほうしょうりゅう', '1001': 'おおのさと' },
    ...overrides,
  }
}

/** An all-blank alignment row as the API emits for vacancies. */
export const placeholderRow = {
  pref_id: '',
  pref_name: '',
  heya_id: '',
  heya_name: '',
  banzuke_name: '',
  ew: 2,
  banzuke_id: 0,
  kakuzuke_id: '',
  rikishi_id: '',
  rikishi_banzuke_id: '',
  shikona: '',
  photo: '',
  rank: '',
  number: '',
  seat_order: '',
} as unknown as RawRikishi

export function makeRikishi(overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id: 3842,
    side: 'east',
    rankCode: 100,
    rankLevel: 'yokozuna',
    rankNumber: 1,
    rankName: { en: 'Yokozuna', jp: '横綱' },
    numberKanji: '筆頭',
    sortKey: '001000000100001',
    shikona: { en: 'Hoshoryu', jp: '豊昇龍' },
    reading: 'ほうしょうりゅう',
    heya: { id: 1, en: 'Tatsunami', jp: '立浪' },
    pref: { id: 49, en: 'Mongolia', jp: 'モンゴル' },
    photo: '20170096.jpg',
    promotion: null,
    ...overrides,
  }
}

export function makeBasho(overrides: Partial<Basho> = {}): Basho {
  return {
    id: 637,
    name: { en: 'September Grand Sumo Tournament', jp: '九月場所' },
    year: 2026,
    yearJp: '令和八年',
    month: 9,
    startDate: '2026-09-13',
    endDate: '2026-09-27',
    announcedAt: '2026-08-31 06:00:00',
    venueId: 1,
    ...overrides,
  }
}

export function makeBanzuke(overrides: Partial<Banzuke> = {}): Banzuke {
  return {
    division: 'makuuchi',
    basho: makeBasho(),
    rikishi: [
      makeRikishi(),
      makeRikishi({
        id: 4227,
        side: 'west',
        shikona: { en: 'Onosato', jp: '大の里' },
        reading: 'おおのさと',
        heya: { id: 32, en: 'Nishonoseki', jp: '二所ノ関' },
        pref: { id: 17, en: 'Ishikawa', jp: '石川県' },
        photo: '20230048.jpg',
      }),
      makeRikishi({
        id: 4055,
        side: 'east',
        rankCode: 500,
        rankLevel: 'maegashira',
        rankNumber: 1,
        rankName: { en: 'Maegashira #1', jp: '前頭筆頭' },
        sortKey: '005000000100001',
        shikona: { en: 'Wakatakakage', jp: '若隆景' },
        reading: 'わかたかかげ',
        heya: { id: 20, en: 'Arashio', jp: '荒汐' },
        pref: { id: 7, en: 'Fukushima', jp: '福島県' },
        photo: '20170031.jpg',
        promotion: { kind: 'returning', raw: '再入幕' },
      }),
    ],
    fetchedAt: '2026-09-04T00:00:00.000Z',
    source: 'live',
    ...overrides,
  }
}
