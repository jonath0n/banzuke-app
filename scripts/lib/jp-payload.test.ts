// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { RawPayload, RawRikishi } from '../../src/data/schema'
import { buildJpPayload } from './jp-payload'
import type { JpSearchPage } from './jp-search-page'

function enRow(overrides: Partial<RawRikishi>): RawRikishi {
  return {
    sort: '001000000100001',
    banzuke_name: 'Yokozuna',
    ew: 1,
    banzuke_id: 1,
    kakuzuke_id: '1',
    rikishi_id: 4227,
    rikishi_banzuke_id: 100,
    rank: 100,
    rank_new: '',
    seat_order: 1,
    number: 1,
    numberKanji: '#1',
    photo: '20230048.jpg',
    pref_id: 17,
    pref_name: 'Ishikawa',
    heya_id: 32,
    heya_name: 'Nishonoseki',
    shikona: 'Onosato',
    ...overrides,
  }
}

const placeholder = {
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

const en: RawPayload = {
  BanzukeTable: [
    enRow({}),
    enRow({ rikishi_id: 3842, ew: 2, shikona: 'Hoshoryu', pref_id: 49, pref_name: 'Mongolia' }),
    enRow({
      rikishi_id: 3553,
      rank: 500,
      number: 17,
      banzuke_name: 'Maegashira #17',
      numberKanji: '#17',
      shikona: 'Shonannoumi',
      pref_id: 14,
      pref_name: 'Kanagawa',
      heya_id: 22,
      heya_name: 'Takadagawa',
      rank_new: '再入幕',
    }),
    placeholder,
  ],
  basho_name: 'September Grand Sumo Tournament',
  year_jp: '2026',
  lang: 'EN',
  kakuzuke_id: '1',
  page: '1',
  Kakuzuke: 'Makuuchi&nbsp;Division',
  list_max: 4,
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
    ticket_preselling_datetime: '',
    year_eng: '2026',
    JpDate: '',
    BattleNow: 0,
    banzuke_announcement_datetime: '2026-08-31 06:00:00',
    day: '',
    venue_id: 1,
  },
  Result: '1',
}

const page: JpSearchPage = {
  rows: [
    {
      rikishiId: 4227,
      shikona: '大の里',
      reading: 'おおのさと',
      side: 'east',
      rankName: '横綱',
      prefId: 17,
      prefName: '石川県',
      heyaId: 32,
      heyaName: '二所ノ関',
    },
    {
      rikishiId: 3842,
      shikona: '豊昇龍',
      reading: 'ほうしょうりゅう',
      side: 'west',
      rankName: '横綱',
      prefId: 49,
      prefName: 'モンゴル',
      heyaId: 1,
      heyaName: '立浪',
    },
  ],
  prefectures: { 14: '神奈川県', 17: '石川県', 49: 'モンゴル' },
}

describe('buildJpPayload', () => {
  const result = buildJpPayload(en, page)

  it('translates text fields and keeps ids, ranks and photos', () => {
    const [onosato, hoshoryu] = result.payload.BanzukeTable
    expect(onosato).toMatchObject({
      rikishi_id: 4227,
      rank: 100,
      photo: '20230048.jpg',
      shikona: '大の里',
      banzuke_name: '横綱',
      numberKanji: '筆頭',
      pref_name: '石川県',
      heya_name: '二所ノ関',
    })
    expect(hoshoryu.shikona).toBe('豊昇龍')
    expect(hoshoryu.pref_name).toBe('モンゴル')
  })

  it('collects readings', () => {
    expect(result.readings).toEqual({ '4227': 'おおのさと', '3842': 'ほうしょうりゅう' })
  })

  it('reports wrestlers missing from the Japanese page but still derives the rank', () => {
    expect(result.missing).toEqual([3553])
    const shonannoumi = result.payload.BanzukeTable[2]
    expect(shonannoumi.banzuke_name).toBe('前頭十七枚目')
    expect(shonannoumi.numberKanji).toBe('十七枚目')
    expect(shonannoumi.pref_name).toBe('神奈川県')
    expect(shonannoumi.shikona).toBe('Shonannoumi')
    expect(shonannoumi.rank_new).toBe('再入幕')
  })

  it('copies placeholder rows untouched', () => {
    expect(result.payload.BanzukeTable[3]).toEqual(placeholder)
  })

  it('derives tournament naming', () => {
    expect(result.payload.lang).toBe('JP')
    expect(result.payload.basho_name).toBe('九月場所')
    expect(result.payload.year_jp).toBe('令和八年')
    expect(result.payload.Kakuzuke).toBe('幕内')
    expect(result.payload.basho_id).toBe(637)
    expect(result.payload.list_max).toBe(4)
  })
})
