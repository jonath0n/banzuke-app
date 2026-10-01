/**
 * Builds the self-hosted mincho for the Sheet.
 *
 * The Sheet, tabs, masthead and rank seals set Japanese in a serif face at
 * weight 700, and until now relied on whatever mincho the visitor's OS had —
 * often none on Windows or Android, where the calligraphic voice silently
 * became gothic. This script downloads the variable Noto Serif JP (OFL),
 * instances it at 700, keeps only the glyphs the app can render (see
 * scripts/lib/charset.ts) and writes two woff2 files — core and names, see
 * CORE_FILE — plus src/styles/fonts-jp.css and a manifest that
 * scripts/lib/font-coverage.test.ts checks against the current data.
 *
 * Usage:
 *   tsx scripts/subset-fonts.ts [--snapshot <path>] [--archive-dir <dir>] [--stables <path>]
 *                               [--out-dir <dir>] [--cache <path>]
 *
 * --snapshot    Banzuke snapshot to draw glyphs from (default: public/latest-banzuke.json).
 * --archive-dir Directory of archived banzuke JSON files (default: public/banzuke).
 * --stables     Stables file to draw glyphs from (default: public/stables.json). The deploy
 *               job passes the freshly fetched one, so a new stablemaster's kanji is in the
 *               subset the build job then tests against.
 * --out-dir     Where to write the woff2, manifest and licence (default: public/assets/fonts).
 * --cache       Where to keep the downloaded variable TTF (default: .data/NotoSerifJP[wght].ttf).
 *
 * The source font is pinned: a fixed google/fonts commit, and the SHA-256 of
 * the bytes it serves. Google updates Noto now and then, and a subset cut
 * from a font nobody reviewed must not reach the site by accident — a
 * mismatch is a failure, and the deploy job keeps the committed subset.
 *
 * Exit codes: 0 success, 1 download failure or a source font that is not the
 * pinned one, 2 subsetting failure.
 */
import { createHash } from 'node:crypto'
import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import subsetFont from 'subset-font'
import { fetchBytes, fetchText } from './lib/http.ts'
import { collectGlyphs } from './lib/charset.ts'

const FAMILY = 'Noto Serif JP'
const WEIGHT = 700
/**
 * Two faces of one family, split by who needs them. `core` is what an English
 * page draws in mincho: the rank kanji, the numerals, 東/西, the masthead and
 * the seals — every character in the components, data helpers and utilities.
 * `names` is everything else: the kana blocks, the Japanese UI strings, the
 * glossary and kimarite tables, and what the data brings (ring names,
 * stables, birthplaces). With unicode-range on each, an English reader's
 * browser fetches core alone (about a quarter of the glyphs) and asks for
 * names the first time it draws one — a Japanese page, or the dialog's name
 * section. The coverage test still checks the union against everything.
 */
const CORE_FILE = `NotoSerifJP-${WEIGHT}-core.woff2`
const NAMES_FILE = `NotoSerifJP-${WEIGHT}-names.woff2`
const MANIFEST = 'NotoSerifJP-subset.json'
const FONT_FACE_CSS = resolve(dirname(fileURLToPath(import.meta.url)), '../src/styles/fonts-jp.css')
const LICENSE = 'NotoSerifJP-OFL.txt'

// google/fonts main as of 2026-10-01. Move the commit and the hash together.
const GOOGLE_FONTS_COMMIT = '9710da1eacb3be272583c3224dcb70f9da6eadbb'
const GOOGLE_FONTS = `https://raw.githubusercontent.com/google/fonts/${GOOGLE_FONTS_COMMIT}/ofl/notoserifjp`
const SOURCE_URL = `${GOOGLE_FONTS}/NotoSerifJP%5Bwght%5D.ttf`
const SOURCE_SHA256 = '2fd527ba12b6a44ec30d796d633360da0aeba6c5d4af1304ce12bb4dc15a7dfc'
const LICENSE_URL = `${GOOGLE_FONTS}/OFL.txt`

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'archive-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
    stables: { type: 'string', default: resolve(rootDir, 'public/stables.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/assets/fonts') },
    cache: { type: 'string', default: resolve(rootDir, '.data/NotoSerifJP[wght].ttf') },
  },
})

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex')

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return sourceFiles(path)
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
    })
  )
  return nested.flat()
}

/**
 * Everything Japanese the app can show, in two piles: the source (every
 * page's glyphs) and the data (names, which only a Japanese reader draws).
 */
async function gatherTexts(
  snapshotPath: string,
  archiveDir: string,
  stablesPath: string
): Promise<{ core: string[]; names: string[] }> {
  const names = [await readFile(snapshotPath, 'utf8')]
  // The fallback sheet must render in the same face, and it is frozen at an
  // older basho than the live file.
  names.push(await readFile(resolve(rootDir, 'public/sample-data.json'), 'utf8'))
  // Stablemasters' names render in the serif in the stable dialog.
  try {
    names.push(await readFile(stablesPath, 'utf8'))
  } catch {
    // No stables file yet: nothing to add.
  }
  // Archived tournaments: departed wrestlers' names render in the serif too.
  try {
    for (const name of await readdir(archiveDir)) {
      if (name.endsWith('.json')) names.push(await readFile(join(archiveDir, name), 'utf8'))
    }
  } catch {
    // No archive yet: nothing to add.
  }
  // Test files are deliberately included (~5% of glyphs) so this script and
  // the coverage test scan identical file sets — in the names face, with the
  // Japanese UI strings and the two lookup tables, since an English page
  // draws none of them in mincho.
  const core: string[] = []
  for (const path of await sourceFiles(resolve(rootDir, 'src'))) {
    const text = await readFile(path, 'utf8')
    if (NAMES_SOURCE.test(path)) names.push(text)
    else core.push(text)
  }
  return { core, names }
}

/** Source files whose Japanese an English page never sets in mincho. */
const NAMES_SOURCE =
  /(\.test\.tsx?|test[\\/]fixtures\.ts|i18n[\\/]strings\.ts|shikona-glossary\.ts|kimarite\.ts)$/

/** "U+3041-3096, U+30A1-30FA, U+30FC" for a string of glyphs, consecutive code points merged. */
export function unicodeRange(glyphs: string): string {
  const points = [...glyphs].map((ch) => ch.codePointAt(0)!).sort((a, b) => a - b)
  const ranges: string[] = []
  let start = -1
  let end = -1
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(4, '0')
  const flush = () => {
    if (start < 0) return
    ranges.push(start === end ? `U+${hex(start)}` : `U+${hex(start)}-${hex(end)}`)
  }
  for (const point of points) {
    if (point === end + 1) {
      end = point
      continue
    }
    flush()
    start = point
    end = point
  }
  flush()
  return ranges.join(', ')
}

/** One @font-face per file, wrapped the way Prettier wraps a long value. */
function fontFaceCss(faces: Array<{ file: string; range: string }>): string {
  const wrap = (value: string) => {
    const lines: string[] = []
    let line = '   '
    for (const part of value.split(', ')) {
      const next = `${line} ${part},`
      if (next.length > 100) {
        lines.push(line)
        line = `    ${part},`
      } else {
        line = next
      }
    }
    lines.push(line.replace(/,$/, ';'))
    return lines.join('\n')
  }
  const rules = faces.map(
    ({ file, range }) => `@font-face {
  font-family: '${FAMILY}';
  src: url('/assets/fonts/${file}') format('woff2');
  font-weight: ${WEIGHT};
  font-style: normal;
  font-display: swap;
  unicode-range:
${wrap(range)}
}`
  )
  return `/* Generated by scripts/subset-fonts.ts — do not edit. Noto Serif JP (SIL OFL 1.1,
   see public/assets/fonts/NotoSerifJP-OFL.txt), instanced at ${WEIGHT} and cut in two:
   core (kana and every character in the source) and names (what only the data
   brings). unicode-range lets a browser fetch only the face a page draws. */

${rules.join('\n\n')}
`
}

/** The variable TTF, downloaded once and kept under .data/ (gitignored). */
/** The pinned font, from the cache when its bytes match and from the pinned URL otherwise. */
async function loadSourceFont(cachePath: string): Promise<Uint8Array> {
  if (await exists(cachePath)) {
    const cached = new Uint8Array(await readFile(cachePath))
    if (sha256(cached) === SOURCE_SHA256) {
      console.log(`Using cached ${cachePath} (${(cached.length / 1e6).toFixed(1)} MB)`)
      return cached
    }
    console.log(`Cached ${cachePath} is not the pinned font; downloading`)
  }
  console.log(`Downloading ${SOURCE_URL}`)
  const bytes = await fetchBytes(SOURCE_URL, { timeoutMs: 120_000 })
  const digest = sha256(bytes)
  if (digest !== SOURCE_SHA256) {
    throw new Error(`source font SHA-256 ${digest} is not the pinned ${SOURCE_SHA256}`)
  }
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, bytes)
  console.log(`Saved ${(bytes.length / 1e6).toFixed(1)} MB to ${cachePath}`)
  return bytes
}

async function main(): Promise<number> {
  const outDir = resolve(args['out-dir'] as string)
  const texts = await gatherTexts(
    resolve(args.snapshot as string),
    resolve(args['archive-dir'] as string),
    resolve(args.stables as string)
  )
  // collectGlyphs adds the kana blocks; they belong to the names face.
  const kana = new Set(collectGlyphs([]))
  const coreGlyphs = [...collectGlyphs(texts.core)].filter((ch) => !kana.has(ch)).join('')
  const coreSet = new Set(coreGlyphs)
  const namesGlyphs = [...collectGlyphs(texts.names)].filter((ch) => !coreSet.has(ch)).join('')
  const glyphs = coreGlyphs + namesGlyphs
  const glyphCount = [...glyphs].length
  console.log(
    `Glyph set: ${glyphCount} characters (core ${[...coreGlyphs].length}, names ${[...namesGlyphs].length})`
  )

  let source: Uint8Array
  try {
    source = await loadSourceFont(resolve(args.cache as string))
  } catch (error) {
    console.error(
      `Could not download the source font: ${error instanceof Error ? error.message : error}`
    )
    return 1
  }

  const cut = async (set: string): Promise<Uint8Array> =>
    // fontverter (a subset-font dependency) sniffs the format with
    // `buffer.toString('ascii', 0, 4)`, which only behaves on a Node Buffer —
    // a plain Uint8Array ignores those arguments and stringifies as
    // comma-separated bytes, so the signature check always fails.
    subsetFont(Buffer.from(source), set, { targetFormat: 'woff2', variationAxes: { wght: WEIGHT } })
  const faces = [
    { role: 'core', file: CORE_FILE, glyphs: coreGlyphs },
    { role: 'names', file: NAMES_FILE, glyphs: namesGlyphs },
  ].filter((face) => face.glyphs.length > 0)
  const files: Array<{
    role: string
    file: string
    glyphs: string
    glyphCount: number
    unicodeRange: string
  }> = []
  await mkdir(outDir, { recursive: true })
  for (const face of faces) {
    let woff2: Uint8Array
    try {
      woff2 = await cut(face.glyphs)
    } catch (error) {
      console.error(
        `Subsetting ${face.role} failed: ${error instanceof Error ? error.message : error}`
      )
      return 2
    }
    await writeFile(join(outDir, face.file), woff2)
    console.log(`Wrote ${face.file} (${(woff2.length / 1e3).toFixed(1)} kB)`)
    files.push({
      role: face.role,
      file: face.file,
      glyphs: face.glyphs,
      glyphCount: [...face.glyphs].length,
      unicodeRange: unicodeRange(face.glyphs),
    })
  }

  await writeFile(
    FONT_FACE_CSS,
    fontFaceCss(files.map((f) => ({ file: f.file, range: f.unicodeRange })))
  )
  console.log(`Wrote ${FONT_FACE_CSS.slice(rootDir.length + 1)}`)

  const manifest = {
    version: 2,
    family: FAMILY,
    weight: WEIGHT,
    source: SOURCE_URL,
    license: 'OFL-1.1',
    files,
    glyphs,
    glyphCount,
    generatedAt: new Date().toISOString(),
  }
  await writeFile(join(outDir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${MANIFEST}`)

  const licensePath = join(outDir, LICENSE)
  if (!(await exists(licensePath))) {
    await writeFile(licensePath, await fetchText(LICENSE_URL), 'utf8')
    console.log(`Wrote ${LICENSE}`)
  }
  return 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
