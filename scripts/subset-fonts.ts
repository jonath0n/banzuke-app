/**
 * Builds the self-hosted mincho for the Sheet.
 *
 * The Sheet, tabs, masthead and rank seals set Japanese in a serif face at
 * weight 700, and until now relied on whatever mincho the visitor's OS had —
 * often none on Windows or Android, where the calligraphic voice silently
 * became gothic. This script downloads the variable Noto Serif JP (OFL),
 * instances it at 700, keeps only the glyphs the app can render (see
 * scripts/lib/charset.ts) and writes a woff2 plus a manifest that
 * scripts/lib/font-coverage.test.ts checks against the current data.
 *
 * Usage:
 *   tsx scripts/subset-fonts.ts [--snapshot <path>] [--out-dir <dir>] [--cache <path>]
 *
 * --snapshot  Banzuke snapshot to draw glyphs from (default: public/latest-banzuke.json).
 * --out-dir   Where to write the woff2, manifest and licence (default: public/assets/fonts).
 * --cache     Where to keep the downloaded variable TTF (default: .data/NotoSerifJP[wght].ttf).
 *
 * Exit codes: 0 success, 1 download failure, 2 subsetting failure.
 */
import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import subsetFont from 'subset-font'
import { fetchBytes, fetchText } from './lib/http.ts'
import { collectGlyphs } from './lib/charset.ts'

const FAMILY = 'Noto Serif JP'
const WEIGHT = 700
const FILE = `NotoSerifJP-${WEIGHT}-subset.woff2`
const MANIFEST = 'NotoSerifJP-subset.json'
const LICENSE = 'NotoSerifJP-OFL.txt'

const GOOGLE_FONTS = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifjp'
const SOURCE_URL = `${GOOGLE_FONTS}/NotoSerifJP%5Bwght%5D.ttf`
const LICENSE_URL = `${GOOGLE_FONTS}/OFL.txt`

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/assets/fonts') },
    cache: { type: 'string', default: resolve(rootDir, '.data/NotoSerifJP[wght].ttf') },
  },
})

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

/** Everything Japanese the app can show: the snapshot plus every source literal. */
async function gatherTexts(snapshotPath: string): Promise<string[]> {
  const texts = [await readFile(snapshotPath, 'utf8')]
  for (const path of await sourceFiles(resolve(rootDir, 'src'))) {
    texts.push(await readFile(path, 'utf8'))
  }
  return texts
}

/** The variable TTF, downloaded once and kept under .data/ (gitignored). */
async function loadSourceFont(cachePath: string): Promise<Uint8Array> {
  if (await exists(cachePath)) {
    const size = (await stat(cachePath)).size
    console.log(`Using cached ${cachePath} (${(size / 1e6).toFixed(1)} MB)`)
    return new Uint8Array(await readFile(cachePath))
  }
  console.log(`Downloading ${SOURCE_URL}`)
  const bytes = await fetchBytes(SOURCE_URL, { timeoutMs: 120_000 })
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, bytes)
  console.log(`Saved ${(bytes.length / 1e6).toFixed(1)} MB to ${cachePath}`)
  return bytes
}

async function main(): Promise<number> {
  const outDir = resolve(args['out-dir'] as string)
  const glyphs = collectGlyphs(await gatherTexts(resolve(args.snapshot as string)))
  const glyphCount = [...glyphs].length
  console.log(`Glyph set: ${glyphCount} characters`)

  let source: Uint8Array
  try {
    source = await loadSourceFont(resolve(args.cache as string))
  } catch (error) {
    console.error(
      `Could not download the source font: ${error instanceof Error ? error.message : error}`
    )
    return 1
  }

  let woff2: Uint8Array
  try {
    // fontverter (a subset-font dependency) sniffs the format with
    // `buffer.toString('ascii', 0, 4)`, which only behaves on a Node Buffer —
    // a plain Uint8Array ignores those arguments and stringifies as
    // comma-separated bytes, so the signature check always fails.
    woff2 = await subsetFont(Buffer.from(source), glyphs, {
      targetFormat: 'woff2',
      variationAxes: { wght: WEIGHT },
    })
  } catch (error) {
    console.error(`Subsetting failed: ${error instanceof Error ? error.message : error}`)
    return 2
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, FILE), woff2)
  console.log(`Wrote ${FILE} (${(woff2.length / 1e3).toFixed(1)} kB)`)

  const manifest = {
    version: 1,
    family: FAMILY,
    weight: WEIGHT,
    file: FILE,
    source: SOURCE_URL,
    license: 'OFL-1.1',
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
