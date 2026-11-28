/**
 * After `vite build`: writes the share pages (r/<id>/, heya/<id>/), the
 * sitemap, robots.txt and the tournament's JSON-LD into dist/, and fills index.html's
 * title and <noscript> facts (scripts/lib/home.ts), from the snapshot and results the
 * build shipped. See scripts/lib/stubs.ts.
 *
 * Usage: tsx scripts/build-stubs.ts [--dist <dir>] [--snapshot <path>] [--lower <path>]
 *   [--results <dir>]
 *
 * The lower divisions (--lower) get share pages too when their file is for the
 * same tournament; without it the sekitori's pages are still written.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { normalizeLowerSnapshot, normalizeSnapshot } from '../src/data/normalize.ts'
import { validateLowerSnapshot, validateSnapshot } from '../src/data/schema.ts'
import { everyRikishi } from '../src/data/divisions.ts'
import { validateResults, resultsFileName, type ResultsFile } from '../src/data/results.ts'
import { injectHome } from './lib/home.ts'
import {
  dataModified,
  renderJsonLd,
  renderRobots,
  renderSitemap,
  renderStub,
  stableStub,
  wrestlerStub,
} from './lib/stubs.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values: args } = parseArgs({
  options: {
    dist: { type: 'string', default: resolve(rootDir, 'dist') },
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    lower: { type: 'string', default: resolve(rootDir, 'public/latest-lower.json') },
    results: { type: 'string', default: resolve(rootDir, 'public/results') },
  },
})

async function readLower(path: string, bashoId: number) {
  try {
    const result = validateLowerSnapshot(JSON.parse(await readFile(path, 'utf8')))
    if (result.ok) return normalizeLowerSnapshot(result.snapshot, bashoId)
    console.warn(`Ignoring ${path}: ${result.errors[0]}`)
  } catch {
    // No lower file: the sekitori's pages only.
  }
  return null
}

/** The tournament's results, when the results job has written them; null otherwise. */
async function readResults(dir: string, bashoId: number): Promise<ResultsFile | null> {
  try {
    const result = validateResults(
      JSON.parse(await readFile(join(dir, resultsFileName(bashoId)), 'utf8'))
    )
    if (result.ok) return result.results
    console.warn(`Ignoring results for ${bashoId}: ${result.error}`)
  } catch {
    // Before the tournament, or no results job yet: the banzuke alone.
  }
  return null
}

async function main(): Promise<number> {
  const dist = resolve(args.dist as string)
  const validation = validateSnapshot(
    JSON.parse(await readFile(resolve(args.snapshot as string), 'utf8'))
  )
  if (!validation.ok) {
    console.error(`Cannot read snapshot: ${validation.errors[0]}`)
    return 2
  }
  const sekitori = normalizeSnapshot(validation.snapshot, 'live')
  const lower = await readLower(resolve(args.lower as string), sekitori.makuuchi.basho.id)
  const data = { ...sekitori, ...(lower ?? {}) }
  const bashoName = data.makuuchi.basho.name.en
  const everyone = everyRikishi(data)
  const stubs = everyone.map((r) => wrestlerStub(r, bashoName))
  const heyaIds = [...new Set(everyone.map((r) => r.heya.id).filter((id) => id > 0))].sort(
    (a, b) => a - b
  )
  for (const id of heyaIds) {
    const stub = stableStub(data, id, bashoName)
    if (stub) stubs.push(stub)
  }
  for (const stub of stubs) {
    const dir = join(dist, stub.path)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'index.html'), renderStub(stub), 'utf8')
  }
  const results = await readResults(resolve(args.results as string), data.makuuchi.basho.id)
  await writeFile(join(dist, 'sitemap.xml'), renderSitemap(dataModified(data, results)), 'utf8')
  await writeFile(join(dist, 'robots.txt'), renderRobots(), 'utf8')

  const indexPath = join(dist, 'index.html')
  let index = injectHome(await readFile(indexPath, 'utf8'), data, results)
  if (!index.includes('application/ld+json')) {
    index = index.replace('</head>', `    ${renderJsonLd(data, results)}\n  </head>`)
  }
  await writeFile(indexPath, index, 'utf8')
  console.log(
    `Wrote ${everyone.length} wrestler and ${stubs.length - everyone.length} stable share pages, the sitemap, robots.txt, the JSON-LD and the home page's title and facts`
  )
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
