import { describe, expect, it } from 'vitest'
import {
  isPlaceholderRow,
  snapshotBashoId,
  snapshotsEqualIgnoringFetchedAt,
  validatePayload,
  validateSnapshot,
  type Lang,
  type RawPayload,
  type RawRikishi,
  type RawSnapshot,
} from './schema'

const NAMES: Record<Lang, string[]> = {
  en: ['Hoshoryu', 'Onosato', 'Kirishima', 'Kotozakura'],
  jp: ['豊昇龍　智勝', '大の里　泰輝', '霧島　鐵力', '琴櫻　将且'],
}

function makeRow(index: number, lang: Lang, overrides: Partial<RawRikishi> = {}): RawRikishi {
  const rankCode = index < 2 ? 100 : index < 4 ? 200 : 500
  const number = index < 4 ? 1 : Math.floor((index - 4) / 2) + 1
  return {
    sort: `${String(rankCode).padStart(3, '0')}000000${String(number).padStart(2, '0')}0000001`,
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

function makePayload(lang: Lang, rows = 24, overrides: Partial<RawPayload> = {}): RawPayload {
  const table = Array.from({ length: rows }, (_, i) => makeRow(i, lang))
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

function makeSnapshot(overrides: Partial<RawSnapshot> = {}): RawSnapshot {
  return {
    version: 1,
    fetchedAt: '2026-09-04T00:00:00.000Z',
    sources: { en: 'https://example.test/en', jp: 'https://example.test/jp' },
    payloads: { en: makePayload('en'), jp: makePayload('jp') },
    ...overrides,
  }
}

function expectErrorMatching(result: ReturnType<typeof validateSnapshot>, pattern: RegExp) {
  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.errors.some((e) => pattern.test(e))).toBe(true)
  }
}

describe('validateSnapshot', () => {
  it('accepts a complete bilingual snapshot', () => {
    const result = validateSnapshot(makeSnapshot())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(snapshotBashoId(result.snapshot)).toBe(637)
      expect(result.warnings).toEqual([])
    }
  })

  it('accepts placeholder rows used for vacancy alignment', () => {
    const en = makePayload('en')
    const jp = makePayload('jp')
    const blank = {
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
    en.BanzukeTable.push(blank)
    en.list_max += 1
    jp.BanzukeTable.push(blank)
    jp.list_max += 1
    expect(isPlaceholderRow(blank)).toBe(true)
    expect(validateSnapshot(makeSnapshot({ payloads: { en, jp } })).ok).toBe(true)
  })

  it('rejects non-objects and missing payloads', () => {
    expect(validateSnapshot(null).ok).toBe(false)
    expect(validateSnapshot('nope').ok).toBe(false)
    expectErrorMatching(validateSnapshot({ fetchedAt: 'x' }), /payloads is missing/)
  })

  it('rejects a snapshot missing one language', () => {
    const snapshot = makeSnapshot()
    delete (snapshot.payloads as Partial<Record<Lang, RawPayload>>).jp
    expectErrorMatching(validateSnapshot(snapshot), /payloads\.jp is missing/)
  })

  it('rejects an invalid fetchedAt', () => {
    expectErrorMatching(validateSnapshot(makeSnapshot({ fetchedAt: 'yesterday' })), /fetchedAt/)
  })

  it('rejects an upstream error result', () => {
    const snapshot = makeSnapshot()
    snapshot.payloads.en.Result = '0'
    expectErrorMatching(validateSnapshot(snapshot), /Result is "0"/)
  })

  it('rejects a list_max that disagrees with the row count', () => {
    const snapshot = makeSnapshot()
    snapshot.payloads.en.list_max = 99
    expectErrorMatching(validateSnapshot(snapshot), /list_max is 99/)
  })

  it('rejects a payload with too few wrestlers', () => {
    const snapshot = makeSnapshot({
      payloads: { en: makePayload('en', 4), jp: makePayload('jp', 4) },
    })
    expectErrorMatching(validateSnapshot(snapshot), /only 4 wrestlers/)
  })

  it('rejects rows with bad fields', () => {
    const snapshot = makeSnapshot()
    snapshot.payloads.en.BanzukeTable[0].ew = 3
    snapshot.payloads.en.BanzukeTable[1].rank = 'abc'
    const result = validateSnapshot(snapshot)
    expectErrorMatching(result, /ew must be 1 or 2/)
    expectErrorMatching(result, /rank is not numeric/)
  })

  it('rejects duplicate wrestlers within a language', () => {
    const snapshot = makeSnapshot()
    snapshot.payloads.en.BanzukeTable[1].rikishi_id =
      snapshot.payloads.en.BanzukeTable[0].rikishi_id
    expectErrorMatching(validateSnapshot(snapshot), /duplicate rikishi_id/)
  })

  it('rejects languages describing different tournaments', () => {
    const snapshot = makeSnapshot()
    snapshot.payloads.jp.basho_id = 636
    expectErrorMatching(validateSnapshot(snapshot), /basho_id differs/)
  })

  it('rejects languages with different wrestler sets', () => {
    const snapshot = makeSnapshot()
    snapshot.payloads.jp.BanzukeTable[3].rikishi_id = 999999
    const result = validateSnapshot(snapshot)
    expectErrorMatching(result, /present in en but not jp: 1003/)
    expectErrorMatching(result, /present in jp but not en: 999999/)
  })

  it('rejects malformed tournament dates', () => {
    const snapshot = makeSnapshot()
    snapshot.payloads.en.BashoInfo.start_date = '13/09/2026'
    expectErrorMatching(validateSnapshot(snapshot), /start_date is not YYYY-MM-DD/)
  })

  it('warns instead of failing when sources are missing', () => {
    const snapshot = makeSnapshot()
    delete (snapshot as Partial<RawSnapshot>).sources
    const result = validateSnapshot(snapshot)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.warnings).toContain('sources is missing')
  })
})

describe('validatePayload', () => {
  it('returns an empty list for a valid payload', () => {
    expect(validatePayload(makePayload('en'))).toEqual([])
  })

  it('reports a missing BanzukeTable', () => {
    expect(validatePayload({ Result: '1' }, 'x')).toContain('x: BanzukeTable is not an array')
  })
})

describe('snapshotsEqualIgnoringFetchedAt', () => {
  it('ignores fetchedAt, sources and key order', () => {
    const a = makeSnapshot()
    const b = makeSnapshot({
      fetchedAt: '2030-01-01T00:00:00.000Z',
      sources: { en: 'other', jp: 'other' },
    })
    // Reorder keys of one row to prove comparison is order-insensitive.
    const row = b.payloads.en.BanzukeTable[0]
    b.payloads.en.BanzukeTable[0] = Object.fromEntries(
      Object.entries(row).reverse()
    ) as unknown as RawRikishi
    expect(snapshotsEqualIgnoringFetchedAt(a, b)).toBe(true)
  })

  it('detects a changed wrestler', () => {
    const a = makeSnapshot()
    const b = makeSnapshot()
    b.payloads.en.BanzukeTable[0].shikona = 'Someone Else'
    expect(snapshotsEqualIgnoringFetchedAt(a, b)).toBe(false)
  })
})
