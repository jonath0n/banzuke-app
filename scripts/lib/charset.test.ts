import { describe, expect, it } from 'vitest'
import { collectGlyphs, missingGlyphs } from './charset.ts'

describe('collectGlyphs', () => {
  it('keeps Japanese characters and drops Latin, digits and ASCII punctuation', () => {
    const glyphs = collectGlyphs(['大の里 Onosato 4227, 石川県'])
    for (const ch of '大の里石川県') expect(glyphs).toContain(ch)
    for (const ch of 'Onosato4227, ') expect(glyphs).not.toContain(ch)
  })

  it('always includes the kana blocks and the iteration marks', () => {
    const glyphs = collectGlyphs([])
    for (const ch of 'あぃゔカザフスタンヶーゝ々〆〇') expect(glyphs).toContain(ch)
  })

  it('is unique and sorted by code point', () => {
    const glyphs = collectGlyphs(['里大', '大里', '里'])
    const codes = Array.from(glyphs, (ch) => ch.codePointAt(0)!)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toEqual([...codes].sort((a, b) => a - b))
  })

  it('includes fullwidth punctuation and the ideographic space family', () => {
    const glyphs = collectGlyphs(['両国国技館（東京）', '令和八年・九月場所'])
    for (const ch of '（）・') expect(glyphs).toContain(ch)
  })

  it('does not treat Hangul, Yi or private-use characters as Japanese', () => {
    const glyphs = collectGlyphs(['\u{AC00}\u{A000}\u{E000}\u{F900}'])
    expect(glyphs).not.toContain('\u{AC00}')
    expect(glyphs).not.toContain('\u{A000}')
    expect(glyphs).not.toContain('\u{E000}')
    expect(glyphs).toContain('\u{F900}')
  })
})

describe('missingGlyphs', () => {
  it('lists Japanese characters absent from the available set', () => {
    expect(missingGlyphs('大の里', ['大の里', '豊昇龍 abc'])).toEqual(['昇', '豊', '龍'])
  })

  it('is empty when everything is covered', () => {
    expect(missingGlyphs(collectGlyphs(['豊昇龍']), ['豊昇龍 Hoshoryu'])).toEqual([])
  })
})
