import { describe, expect, it } from 'vitest'
import { makeRawDivision, makeRawPayload, makeRawSnapshot, placeholderRow } from '../test/fixtures'
import { normalizeDivision, normalizeSnapshot, parsePromotion, ringName } from './normalize'

const FETCHED_AT = '2026-09-04T00:00:00.000Z'

describe('normalizeSnapshot', () => {
  const set = normalizeSnapshot(makeRawSnapshot(), 'live')
  const banzuke = set.makuuchi

  it('produces numeric ids, word sides and both languages', () => {
    const first = banzuke.rikishi[0]
    expect(first).toMatchObject({
      id: 1000,
      side: 'east',
      rankCode: 100,
      rankLevel: 'yokozuna',
      rankNumber: 1,
      shikona: { en: 'Hoshoryu', jp: '豊昇龍' },
      reading: 'ほうしょうりゅう',
      heya: { id: 1, en: 'Tatsunami', jp: '立浪' },
      pref: { id: 13, en: 'Tokyo', jp: '東京都' },
      photo: '20200000.jpg',
      promotion: null,
    })
    expect(banzuke.rikishi[1].side).toBe('west')
    expect(banzuke.rikishi[1].reading).toBe('おおのさと')
    expect(banzuke.rikishi[2].reading).toBeNull()
  })

  it('keeps banzuke order: sort key, then East before West', () => {
    const keys = banzuke.rikishi.map((r) => `${r.sortKey}/${r.side}`)
    expect(keys.slice(0, 4)).toEqual([
      '001000000100001/east',
      '001000000100001/west',
      '002000000100001/east',
      '002000000100001/west',
    ])
    expect(banzuke.rikishi.at(-1)?.rankNumber).toBe(10)
  })

  it('maps promotion flags', () => {
    const promoted = banzuke.rikishi.find((r) => r.id === 1005)
    expect(promoted?.promotion).toEqual({ kind: 'new-to-division', raw: '新入幕' })
  })

  it('normalizes every division it is given', () => {
    expect(set.juryo?.division).toBe('juryo')
    expect(set.juryo?.rikishi).toHaveLength(28)
    expect(set.juryo?.rikishi[0]).toMatchObject({
      id: 2000,
      rankCode: 600,
      rankLevel: 'juryo',
      rankNumber: 1,
      rankName: { en: 'Juryo #1', jp: '十両1枚目' },
      shikona: { en: 'Dewanoryu', jp: '出羽ノ龍' },
      reading: 'でわのりゅう',
    })
    expect(set.juryo?.rikishi.find((r) => r.id === 2005)?.promotion).toEqual({
      kind: 'new-to-division',
      raw: '新十両',
    })
    expect(set.juryo?.basho).toEqual(banzuke.basho)
  })

  it('leaves juryo null when the snapshot has only makuuchi', () => {
    const only = normalizeSnapshot(
      makeRawSnapshot({ divisions: { makuuchi: makeRawDivision() } }),
      'live'
    )
    expect(only.juryo).toBeNull()
    expect(only.makuuchi.rikishi).toHaveLength(24)
  })

  it('derives Japanese rank names when the JP row is missing one', () => {
    const jp = makeRawPayload('jp')
    jp.BanzukeTable[4].banzuke_name = ''
    jp.BanzukeTable[4].numberKanji = '#1'
    const result = normalizeDivision(
      'makuuchi',
      makeRawDivision('makuuchi', { payloads: { en: makeRawPayload('en'), jp } }),
      FETCHED_AT,
      'live'
    )
    const row = result.rikishi.find((r) => r.id === 1004)
    expect(row?.rankName.jp).toBe('前頭筆頭')
    expect(row?.numberKanji).toBe('筆頭')
  })

  it('falls back to English text when a wrestler is absent from the JP payload', () => {
    const jp = makeRawPayload('jp', 23)
    const en = makeRawPayload('en')
    const result = normalizeDivision(
      'makuuchi',
      makeRawDivision('makuuchi', { payloads: { en, jp } }),
      FETCHED_AT,
      'live'
    )
    const last = result.rikishi.find((r) => r.id === 1023)
    expect(last?.shikona).toEqual({ en: 'en-makuuchi-23', jp: 'en-makuuchi-23' })
    expect(last?.heya.jp).toBe('Tatsunami')
    expect(last?.rankName.jp).toBe('前頭十枚目')
  })

  it('drops placeholder rows and strips HTML entities', () => {
    const en = makeRawPayload('en')
    const jp = makeRawPayload('jp')
    en.BanzukeTable.push(placeholderRow)
    en.list_max += 1
    jp.BanzukeTable.push(placeholderRow)
    jp.list_max += 1
    en.BanzukeTable[0].banzuke_name = 'Yokozuna&nbsp;'
    const result = normalizeDivision(
      'makuuchi',
      makeRawDivision('makuuchi', { payloads: { en, jp } }),
      FETCHED_AT,
      'sample'
    )
    expect(result.rikishi).toHaveLength(24)
    expect(result.rikishi[0].rankName.en).toBe('Yokozuna')
    expect(result.source).toBe('sample')
  })

  it('normalizes tournament metadata', () => {
    expect(banzuke.basho).toEqual({
      id: 637,
      name: { en: 'September Grand Sumo Tournament', jp: '九月場所' },
      year: 2026,
      yearJp: '令和八年',
      month: 9,
      startDate: '2026-09-13',
      endDate: '2026-09-27',
      announcedAt: '2026-08-31 06:00:00',
      venueId: 1,
    })
    expect(banzuke.division).toBe('makuuchi')
    expect(banzuke.fetchedAt).toBe(FETCHED_AT)
  })
})

describe('ringName', () => {
  it('strips the given name after an ideographic space', () => {
    expect(ringName('豊昇龍　智勝')).toBe('豊昇龍')
    expect(ringName('大の里 泰輝')).toBe('大の里')
    expect(ringName('大の里')).toBe('大の里')
    expect(ringName('')).toBe('')
  })
})

describe('parsePromotion', () => {
  it('classifies the official flags', () => {
    expect(parsePromotion('')).toBeNull()
    expect(parsePromotion(undefined)).toBeNull()
    expect(parsePromotion('新入幕')).toEqual({ kind: 'new-to-division', raw: '新入幕' })
    expect(parsePromotion('再入幕')).toEqual({ kind: 'returning', raw: '再入幕' })
    expect(parsePromotion('新小結')).toEqual({ kind: 'new-rank', raw: '新小結' })
    expect(parsePromotion('新大関')).toEqual({ kind: 'new-rank', raw: '新大関' })
    expect(parsePromotion('再大関')).toEqual({ kind: 'returning', raw: '再大関' })
    expect(parsePromotion('新十両')).toEqual({ kind: 'new-to-division', raw: '新十両' })
    expect(parsePromotion('再十両')).toEqual({ kind: 'returning', raw: '再十両' })
  })
})
