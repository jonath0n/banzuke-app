import { describe, expect, it } from 'vitest'
import {
  fromKanjiNumber,
  jpBashoName,
  jpEraYear,
  jpNumberKanji,
  jpRankName,
  jpRankShort,
  parseJpBasho,
  parseJpDate,
  shortPrefecture,
  toKanjiNumber,
} from './kanji'

describe('shortPrefecture', () => {
  it('drops the administrative suffix the banzuke leaves off', () => {
    expect(shortPrefecture('石川県')).toBe('石川')
    expect(shortPrefecture('大阪府')).toBe('大阪')
    expect(shortPrefecture('東京都')).toBe('東京')
  })

  it('leaves countries and two-character names alone', () => {
    expect(shortPrefecture('モンゴル')).toBe('モンゴル')
    expect(shortPrefecture('カザフスタン')).toBe('カザフスタン')
    // 京都 and 兵庫 are already short; trimming would leave a single character
    expect(shortPrefecture('京都')).toBe('京都')
    expect(shortPrefecture('')).toBe('')
  })
})

describe('toKanjiNumber', () => {
  it('handles units, tens and compounds', () => {
    expect(toKanjiNumber(1)).toBe('一')
    expect(toKanjiNumber(9)).toBe('九')
    expect(toKanjiNumber(10)).toBe('十')
    expect(toKanjiNumber(11)).toBe('十一')
    expect(toKanjiNumber(17)).toBe('十七')
    expect(toKanjiNumber(20)).toBe('二十')
    expect(toKanjiNumber(21)).toBe('二十一')
    expect(toKanjiNumber(99)).toBe('九十九')
  })

  it('falls back to digits outside 1–99', () => {
    expect(toKanjiNumber(0)).toBe('0')
    expect(toKanjiNumber(100)).toBe('100')
  })
})

describe('rank names', () => {
  it('matches the official table wording', () => {
    expect(jpRankName(100, 1)).toBe('横綱')
    expect(jpRankName(200, 1)).toBe('大関')
    expect(jpRankName(300, 1)).toBe('関脇')
    expect(jpRankName(400, 1)).toBe('小結')
    expect(jpRankName(500, 1)).toBe('前頭筆頭')
    expect(jpRankName(500, 2)).toBe('前頭二枚目')
    expect(jpRankName(500, 17)).toBe('前頭十七枚目')
    expect(jpRankName(600, 3)).toBe('十両三枚目')
    expect(jpRankName(999, 1)).toBe('')
  })

  it('produces compact rail labels', () => {
    expect(jpRankShort(500, 1)).toBe('前頭筆頭')
    expect(jpRankShort(500, 12)).toBe('前頭十二')
    expect(jpRankShort(100, 1)).toBe('横綱')
  })

  it('formats positions', () => {
    expect(jpNumberKanji(1)).toBe('筆頭')
    expect(jpNumberKanji(5)).toBe('五枚目')
  })
})

describe('tournament naming', () => {
  it('names basho by month', () => {
    expect(jpBashoName(1)).toBe('一月場所')
    expect(jpBashoName(9)).toBe('九月場所')
    expect(jpBashoName(11)).toBe('十一月場所')
  })

  it('formats Reiwa years', () => {
    expect(jpEraYear(2019)).toBe('令和元年')
    expect(jpEraYear(2026)).toBe('令和八年')
    expect(jpEraYear(2030)).toBe('令和十二年')
    expect(jpEraYear(2018)).toBe('2018')
  })
})

describe('fromKanjiNumber', () => {
  it('reads kanji, Arabic and 元', () => {
    expect(fromKanjiNumber('五')).toBe(5)
    expect(fromKanjiNumber('十')).toBe(10)
    expect(fromKanjiNumber('十七')).toBe(17)
    expect(fromKanjiNumber('二十一')).toBe(21)
    expect(fromKanjiNumber('12')).toBe(12)
    expect(fromKanjiNumber('元')).toBe(1)
    expect(fromKanjiNumber('')).toBeNull()
    expect(fromKanjiNumber('abc')).toBeNull()
  })
})

describe('parseJpBasho', () => {
  it('converts era tournament names to year and month', () => {
    expect(parseJpBasho('令和五年五月場所')).toEqual({ year: 2023, month: 5 })
    expect(parseJpBasho('令和六年十一月場所')).toEqual({ year: 2024, month: 11 })
    expect(parseJpBasho('令和元年九月場所')).toEqual({ year: 2019, month: 9 })
    expect(parseJpBasho('平成三十年一月場所')).toEqual({ year: 2018, month: 1 })
    expect(parseJpBasho('昭和六十三年三月場所')).toEqual({ year: 1988, month: 3 })
    expect(parseJpBasho('令和8年9月場所')).toEqual({ year: 2026, month: 9 })
    expect(parseJpBasho('平成二十三年五月技量審査場所')).toEqual({ year: 2011, month: 5 })
    expect(parseJpBasho('九月場所')).toBeNull()
    expect(parseJpBasho('令和五年十三月場所')).toBeNull()
  })
})

describe('parseJpDate', () => {
  it('converts era dates to ISO', () => {
    expect(parseJpDate('平成12年6月7日（26歳）')).toBe('2000-06-07')
    expect(parseJpDate('令和元年12月31日')).toBe('2019-12-31')
    expect(parseJpDate('昭和64年1月7日')).toBe('1989-01-07')
    expect(parseJpDate('2000-06-07')).toBeNull()
  })
})
