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

  it('takes a rank code or a number as a whole word, never inside M10–M17', () => {
    const ladder = [1, 10, 11, 15, 17].map((n) =>
      makeRikishi({
        id: 100 + n,
        rankCode: 500,
        rankLevel: 'maegashira',
        rankNumber: n,
        rankName: { en: `Maegashira #${n}`, jp: `前頭${n}枚目` },
        shikona: { en: `M${n}san`, jp: `前${n}` },
      })
    )
    const ladderIds = (query: string) =>
      filterRikishi(buildSearchIndex(ladder), query).map((r) => r.id)
    expect(ladderIds('m1')).toEqual([101])
    expect(ladderIds('M1')).toEqual([101])
    expect(ladderIds('maegashira 1')).toEqual([101])
    expect(ladderIds('m11')).toEqual([111])
    expect(ladderIds('前頭筆頭')).toEqual([101])
    // A name fragment still matches inside a word
    expect(ladderIds('san')).toHaveLength(5)
  })

  it('finds a variant character by its common form, and the other way round', () => {
    const variants = [
      makeRikishi({ id: 1, shikona: { en: 'Kotozakura', jp: '琴櫻' } }),
      makeRikishi({ id: 2, shikona: { en: 'Takayasu', jp: '\u{9AD9}安' } }),
      makeRikishi({ id: 3, shikona: { en: 'Tamawashi', jp: '玉鷲' } }),
    ]
    const variantIds = (query: string) =>
      filterRikishi(buildSearchIndex(variants), query).map((r) => r.id)
    expect(variantIds('琴桜')).toEqual([1])
    expect(variantIds('琴櫻')).toEqual([1])
    expect(variantIds('高安')).toEqual([2])
    expect(variantIds('\u{9AD9}安')).toEqual([2])
    expect(variantIds('桜')).toEqual([1])
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
