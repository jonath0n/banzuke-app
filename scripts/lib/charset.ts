/**
 * Glyph-set collection for the self-hosted mincho subset.
 *
 * The Sheet sets ring names, rank kanji, the masthead and the 東/西 marks in
 * a serif Japanese face. Rather than ship the whole of Noto Serif JP (several
 * megabytes), `scripts/subset-fonts.ts` keeps only the characters the app can
 * actually render: everything Japanese in the current snapshot and in the
 * source code, plus the kana blocks in full so a reading or a katakana
 * birthplace never falls back to a different face mid-word.
 *
 * The ranges deliberately omit CJK radicals (U+2E80-2EFF), enclosed and
 * compatibility blocks (U+3200-33FF) and the astral extensions (Extension
 * B onward); Noto Serif JP does not cover those either, so a name using one
 * would fall back regardless.
 */

/** One character in the CJK punctuation, kana, kanji, compatibility or fullwidth ranges. */
// Use \u{XXXX} escapes: editors and Unicode NFC normalization silently replace U+F900 with U+8C48.
export const JAPANESE_GLYPH_RE =
  /[\u{3000}-\u{303F}\u{3041}-\u{309F}\u{30A0}-\u{30FF}\u{3400}-\u{4DBF}\u{4E00}-\u{9FFF}\u{F900}-\u{FAFF}\u{FF00}-\u{FFEF}]/gu

/** Always present, whatever the data says: hiragana, katakana, and the iteration marks. */
function kanaBlocks(): string[] {
  const chars: string[] = []
  for (let code = 0x3041; code <= 0x3096; code++) chars.push(String.fromCodePoint(code))
  for (let code = 0x30a1; code <= 0x30fa; code++) chars.push(String.fromCodePoint(code))
  chars.push('ー', 'ゝ', 'ゞ', 'ヽ', 'ヾ', '々', '〆', '〇')
  return chars
}

function japaneseCharacters(texts: Iterable<string>): Set<string> {
  const found = new Set<string>()
  for (const text of texts) {
    for (const match of text.matchAll(JAPANESE_GLYPH_RE)) found.add(match[0])
  }
  return found
}

function sortByCodePoint(chars: Iterable<string>): string[] {
  return [...chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
}

/**
 * Every distinct Japanese character in `texts`, plus the kana blocks, as one
 * string sorted by code point (so the output is stable across runs).
 */
export function collectGlyphs(texts: Iterable<string>): string {
  const found = japaneseCharacters(texts)
  for (const ch of kanaBlocks()) found.add(ch)
  return sortByCodePoint(found).join('')
}

/** Japanese characters in `texts` that `available` does not contain. */
export function missingGlyphs(available: string, texts: Iterable<string>): string[] {
  const have = new Set(available)
  return sortByCodePoint([...japaneseCharacters(texts)].filter((ch) => !have.has(ch)))
}
