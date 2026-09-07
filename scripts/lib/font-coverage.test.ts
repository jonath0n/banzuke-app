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
  ) as { version: number; weight: number; file: string; glyphs: string; glyphCount: number }

  it('has a consistent manifest and a real woff2 beside it', () => {
    expect(manifest.version).toBe(1)
    expect(manifest.weight).toBe(700)
    expect(manifest.glyphCount).toBe([...manifest.glyphs].length)
    const bytes = readFileSync(resolve(fontsDir, manifest.file))
    // woff2 magic number "wOF2"
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2')
    expect(bytes.length).toBeGreaterThan(10_000)
  })

  it('covers every Japanese character in the current snapshot', () => {
    const snapshot = readFileSync(resolve(root, 'public/latest-banzuke.json'), 'utf8')
    expect(missingGlyphs(manifest.glyphs, [snapshot])).toEqual([])
  })

  it('covers every Japanese character in the source code', () => {
    const texts = sourceFiles(resolve(root, 'src')).map((path) => readFileSync(path, 'utf8'))
    expect(missingGlyphs(manifest.glyphs, texts)).toEqual([])
  })

  it('covers every Japanese character in the bundled sample', () => {
    const sample = readFileSync(resolve(root, 'public/sample-data.json'), 'utf8')
    expect(missingGlyphs(manifest.glyphs, [sample])).toEqual([])
  })
})
