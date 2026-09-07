import { describe, expect, it } from 'vitest'
import { COMPOUNDS, explainShikona, GLOSSARY, glossaryGaps } from './shikona-glossary'
import { makeBanzukeSet, makeRawSnapshot, makeThirdOzekiRow } from '../test/fixtures'
import { ringName } from './normalize'

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

  it('keeps kana and kanji out of en/note: these strings render without lang="ja"', () => {
    const kanaOrKanji = /[\u{3040}-\u{30FF}\u{3400}-\u{9FFF}]/u
    for (const table of [GLOSSARY, COMPOUNDS]) {
      for (const [key, gloss] of Object.entries(table)) {
        expect(gloss.en, key).not.toMatch(kanaOrKanji)
        if (gloss.note) expect(gloss.note, key).not.toMatch(kanaOrKanji)
      }
    }
  })

  it('covers every character in the fixture names', () => {
    // Every Japanese ring name the fixtures carry: the raw snapshot's tables
    // (name then given name, as sumo.or.jp prints them), the extra Ozeki row,
    // and the normalized banzuke set.
    const set = makeBanzukeSet()
    const snapshot = makeRawSnapshot()
    const names = [
      ...Object.values(snapshot.divisions).flatMap((d) =>
        (d?.payloads.jp.BanzukeTable ?? []).map((row) => ringName(row.shikona))
      ),
      ringName(makeThirdOzekiRow('jp').shikona),
      ...[...set.makuuchi.rikishi, ...(set.juryo?.rikishi ?? [])].map((r) => r.shikona.jp),
    ]
    // Rows past the named ones carry ASCII placeholders; only real names count.
    const japanese = names.filter((name) => /[\u{3040}-\u{9FFF}]/u.test(name))
    expect(japanese.length).toBeGreaterThan(8)
    expect(glossaryGaps(japanese)).toEqual([])
  })

  it('flags the joining kana so the dialog can prefer another note', () => {
    for (const ch of ['の', 'ノ', '乃', '之']) expect(GLOSSARY[ch].joining, ch).toBe(true)
    expect(GLOSSARY['大'].joining).toBeUndefined()
  })

  it('segments a name: compounds first, then single characters, unknown ones kept', () => {
    expect(explainShikona('大の里').map((s) => [s.text, s.gloss?.en ?? null])).toEqual([
      ['大', 'great'],
      ['の', 'of'],
      ['里', 'village; home'],
    ])
    expect(explainShikona('熱海富士').map((s) => s.text)).toEqual(['熱海', '富士'])
    expect(explainShikona('出羽ノ龍').map((s) => s.text)).toEqual(['出羽', 'ノ', '龍'])
    // Escaped so the font-coverage source scan doesn't pick up this made-up
    // character and demand it in the glyph manifest: it never renders for real.
    expect(explainShikona('\u{9F98}').map((s) => [s.text, s.gloss])).toEqual([['\u{9F98}', null]])
    expect(explainShikona('')).toEqual([])
  })

  it('reports the characters it lacks, once each, sorted', () => {
    // Escaped for the same reason as above.
    expect(glossaryGaps(['\u{9F98}\u{9F98}', '大\u{9F98}', '\u{9F49}'])).toEqual([
      '\u{9F49}',
      '\u{9F98}',
    ])
  })
})
