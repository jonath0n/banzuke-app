import { describe, expect, it } from 'vitest'
import { makeBanzuke, makeRikishi } from '../test/fixtures'
import { buildSearchIndex, filterRikishi, foldForSearch, matchingIds } from './search'

describe('foldForSearch', () => {
  it('strips diacritics and case', () => {
    expect(foldForSearch('Hōshōryū')).toBe('hoshoryu')
    expect(foldForSearch('ŌNOSATO')).toBe('onosato')
  })

  it('normalizes full-width characters', () => {
    expect(foldForSearch('Ｍ５')).toBe('m5')
    expect(foldForSearch('ｵｵﾉｻﾄ')).toBe('おおのさと')
  })

  it('folds katakana to hiragana and collapses spaces', () => {
    expect(foldForSearch('オオノサト')).toBe('おおのさと')
    expect(foldForSearch('  大の里　泰輝 ')).toBe('大の里 泰輝')
  })
})

describe('filterRikishi', () => {
  const rows = [
    ...makeBanzuke().rikishi,
    makeRikishi({
      id: 9,
      side: 'west',
      rankCode: 500,
      rankLevel: 'maegashira',
      rankNumber: 5,
      rankName: { en: 'Maegashira #5', jp: '前頭五枚目' },
      shikona: { en: 'Oshoma', jp: '欧勝馬' },
      reading: 'おうしょうま',
      heya: { id: 3, en: 'Naruto', jp: '鳴戸' },
      pref: { id: 49, en: 'Mongolia', jp: 'モンゴル' },
    }),
  ]
  const index = buildSearchIndex(rows)
  const ids = (query: string) => filterRikishi(index, query).map((r) => r.id)

  it('matches everything for an empty query', () => {
    expect(ids('')).toHaveLength(rows.length)
    expect(ids('   ')).toHaveLength(rows.length)
  })

  it('matches names in romaji, kanji and hiragana', () => {
    expect(ids('onosato')).toEqual([4227])
    expect(ids('大の里')).toEqual([4227])
    expect(ids('おおのさと')).toEqual([4227])
    expect(ids('オオノサト')).toEqual([4227])
    expect(ids('Ōnosato')).toEqual([4227])
  })

  it('matches stables and regions in both languages', () => {
    expect(ids('mongolia')).toEqual([3842, 9])
    expect(ids('モンゴル')).toEqual([3842, 9])
    expect(ids('立浪')).toEqual([3842])
    expect(ids('arashio')).toEqual([4055])
  })

  it('matches ranks by tier, short code and kanji', () => {
    expect(ids('yokozuna')).toEqual([3842, 4227])
    expect(ids('横綱')).toEqual([3842, 4227])
    expect(ids('m5')).toEqual([9])
    expect(ids('前頭五')).toEqual([9])
    expect(ids('maegashira 1')).toEqual([4055])
  })

  it('matches promotions and sides', () => {
    expect(ids('再入幕')).toEqual([4055])
    expect(ids('back')).toEqual([4055])
    expect(ids('west')).toEqual([4227, 9])
  })

  it('requires every term to match', () => {
    expect(ids('mongolia west')).toEqual([9])
    expect(ids('mongolia zzz')).toEqual([])
  })

  it('reports matching ids, or null when nothing is being filtered', () => {
    expect(matchingIds(index, '')).toBeNull()
    expect(matchingIds(index, '  ')).toBeNull()
    expect([...matchingIds(index, 'mongolia')!]).toEqual([3842, 9])
    expect(matchingIds(index, 'zzz')?.size).toBe(0)
  })
})
