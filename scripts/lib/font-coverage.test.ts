/**
 * The committed mincho subset must cover every Japanese character the app can
 * render today: the snapshot's names, stables, provinces and rank names, and
 * every literal in the source. When this fails, run `npm run subset-fonts`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { missingGlyphs } from './charset.ts'

const root = resolve(__dirname, '../..')
const fontsDir = resolve(root, 'public/assets/fonts')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('NotoSerifJP subset', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(fontsDir, 'NotoSerifJP-subset.json'), 'utf8')
  ) as {
    version: number
    weight: number
    files: Array<{
      role: string
      file: string
      glyphs: string
      glyphCount: number
      unicodeRange: string
    }>
    glyphs: string
    glyphCount: number
  }

  it('has a consistent manifest and a real woff2 for each face', () => {
    expect(manifest.version).toBe(2)
    expect(manifest.weight).toBe(700)
    expect(manifest.glyphCount).toBe([...manifest.glyphs].length)
    expect(manifest.files.map((f) => f.role)).toEqual(['core', 'names'])
    expect(manifest.files.map((f) => f.glyphs).join('')).toBe(manifest.glyphs)
    for (const face of manifest.files) {
      expect(face.glyphCount).toBe([...face.glyphs].length)
      const bytes = readFileSync(resolve(fontsDir, face.file))
      // woff2 magic number "wOF2"
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2')
      expect(bytes.length).toBeGreaterThan(10_000)
    }
    // The two faces never overlap: unicode-range decides which one a glyph comes from
    const core = new Set(manifest.files[0].glyphs)
    expect([...manifest.files[1].glyphs].filter((ch) => core.has(ch))).toEqual([])
  })

  it('declares both faces in src/styles/fonts-jp.css with their unicode ranges', () => {
    const css = readFileSync(resolve(root, 'src/styles/fonts-jp.css'), 'utf8')
    for (const face of manifest.files) {
      expect(css).toContain(`/assets/fonts/${face.file}`)
      // The first and last ranges of each face appear verbatim
      const ranges = face.unicodeRange.split(', ')
      expect(css).toContain(ranges[0])
      expect(css).toContain(ranges[ranges.length - 1])
    }
  })

  it('keeps every character an English page sets in mincho in the core face', () => {
    // Components, data helpers and utilities; not the tests, fixtures, UI
    // strings or lookup tables, which only a Japanese page or the dialog draws.
    const namesSource =
      /(\.test\.tsx?|test[\\/]fixtures\.ts|i18n[\\/]strings\.ts|shikona-glossary\.ts|kimarite\.ts)$/
    const texts = sourceFiles(resolve(root, 'src'))
      .filter((path) => !namesSource.test(path))
      .map((path) => readFileSync(path, 'utf8'))
    // The kana blocks live in the names face whole, so a kana literal in a
    // component (a regex range, an iteration mark) is not a core gap.
    const kana = /^[\u{3041}-\u{30FF}\u{3005}\u{3006}\u{3007}]$/u
    expect(missingGlyphs(manifest.files[0].glyphs, texts).filter((ch) => !kana.test(ch))).toEqual(
      []
    )
    expect(manifest.files[0].glyphCount).toBeLessThan(manifest.files[1].glyphCount)
  })

  it('covers every Japanese character in the current snapshot', () => {
    const snapshot = readFileSync(resolve(root, 'public/latest-banzuke.json'), 'utf8')
    expect(missingGlyphs(manifest.glyphs, [snapshot])).toEqual([])
  })

  it('covers every Japanese character in the source code', () => {
    const texts = sourceFiles(resolve(root, 'src')).map((path) => readFileSync(path, 'utf8'))
    expect(missingGlyphs(manifest.glyphs, texts)).toEqual([])
  })

  it('covers every Japanese character in the stables file', () => {
    // Stablemasters' names render in the serif in the stable dialog.
    const stables = readFileSync(resolve(root, 'public/stables.json'), 'utf8')
    expect(missingGlyphs(manifest.glyphs, [stables])).toEqual([])
  })

  it('covers every Japanese character in the bundled sample', () => {
    const sample = readFileSync(resolve(root, 'public/sample-data.json'), 'utf8')
    expect(missingGlyphs(manifest.glyphs, [sample])).toEqual([])
  })

  it('covers every Japanese character in the banzuke archive', () => {
    const dir = resolve(root, 'public/banzuke')
    const texts = readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => readFileSync(join(dir, name), 'utf8'))
    expect(texts.length).toBeGreaterThan(0)
    expect(missingGlyphs(manifest.glyphs, texts)).toEqual([])
  })
})
