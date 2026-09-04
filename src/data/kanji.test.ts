import { describe, expect, it } from 'vitest'
import {
  jpBashoName,
  jpEraYear,
  jpNumberKanji,
  jpRankName,
  jpRankShort,
  toKanjiNumber,
} from './kanji'

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
