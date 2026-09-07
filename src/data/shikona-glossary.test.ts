import { describe, expect, it } from 'vitest'
import { COMPOUNDS, explainShikona, GLOSSARY, glossaryGaps } from './shikona-glossary'
import { makeBanzuke } from '../test/fixtures'

describe('shikona glossary', () => {
  it('has an English meaning for every entry, and no stray whitespace', () => {
    for (const table of [GLOSSARY, COMPOUNDS]) {
      for (const [key, gloss] of Object.entries(table)) {
        expect(gloss.en.trim(), key).toBe(gloss.en)
        expect(gloss.en, key).not.toBe('')
        expect(gloss.note?.trim() ?? '', key).toBe(gloss.note ?? '')
      }
    }
    for (const key of Object.keys(GLOSSARY)) expect([...key], key).toHaveLength(1)
    for (const key of Object.keys(COMPOUNDS)) expect([...key], key).toHaveLength(2)
  })

  it('covers every character in the fixture names', () => {
    const names = [
      '豊昇龍',
      '大の里',
      '霧島',
      '琴櫻',
      '出羽ノ龍',
      '旭海雄',
      '大青山',
      '錦木',
      '若隆景',
      '安青錦',
      ...makeBanzuke().rikishi.map((r) => r.shikona.jp),
    ]
    expect(glossaryGaps(names)).toEqual([])
  })

  it('segments a name: compounds first, then single characters, unknown ones kept', () => {
    expect(explainShikona('大の里').map((s) => [s.text, s.gloss?.en ?? null])).toEqual([
      ['大', 'great'],
      ['の', 'of'],
      ['里', 'village; home'],
    ])
    expect(explainShikona('熱海富士').map((s) => s.text)).toEqual(['熱海', '富士'])
    expect(explainShikona('龘').map((s) => [s.text, s.gloss])).toEqual([['龘', null]])
    expect(explainShikona('')).toEqual([])
  })

  it('reports the characters it lacks, once each, sorted', () => {
    expect(glossaryGaps(['龘龘', '大龘', '齉'])).toEqual(['齉', '龘'])
  })
})
