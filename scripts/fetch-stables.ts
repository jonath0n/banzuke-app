/**
 * Fetches the stables on the current banzuke — name, stablemaster and address —
 * from the JSA stable pages and writes them to a JSON file the app loads on
 * demand when a stable is opened.
 *
 * Stables are refreshed once per tournament: an entry already carrying the
 * current basho id is skipped, so a normal deploy makes no requests here.
 * Requests are sequential with a pause between them. A failed page keeps the
 * previous entry (if any) and never fails the run.
 *
 * Usage:
 *   tsx scripts/fetch-stables.ts [--snapshot <path>] [--lower <path>] [--out <path>]
 *                                [--previous <path>] [--delay <ms>] [--limit <n>] [--force]
 *
 * --lower  The lower-division snapshot (default: public/latest-lower.json): its
 *          stables join the sekitori's when it is for the same tournament, so a
 *          stable with no sekitori still names its master.
 *
 * In GitHub Actions the script appends `changed` to $GITHUB_OUTPUT.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { fetchText } from './lib/http.ts'
import { buildStable, parseEnStable, parseJpStable } from './lib/stable-parser.ts'
import { readJson, setOutput, sleep } from './lib/run-io.ts'
import {
  isPlaceholderRow,
  lowerSnapshotBashoId,
  snapshotBashoId,
  snapshotDivisions,
  validateLowerSnapshot,
  validateSnapshot,
  type RawDivisionFile,
  type RawDivisionSnapshot,
} from '../src/data/schema.ts'
import { validateStablesFile, type Stable, type StablesFile } from '../src/data/stables.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    lower: { type: 'string', default: resolve(rootDir, 'public/latest-lower.json') },
    out: { type: 'string', default: resolve(rootDir, 'public/stables.json') },
    previous: { type: 'string' },
    delay: { type: 'string', default: '400' },
    limit: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
})

export function stablePageUrls(id: number): { en: string; jp: string } {
  return {
    en: `https://www.sumo.or.jp/EnSumoDataSumoBeya/detail/${id}/`,
    jp: `https://www.sumo.or.jp/ResultRikishiDataSumoBeya/detail/${id}/`,
  }
}

async function fetchStable(id: number, bashoId: number): Promise<Stable> {
  const urls = stablePageUrls(id)
  const [enHtml, jpHtml] = await Promise.all([fetchText(urls.en), fetchText(urls.jp)])
  const stable = buildStable(id, parseEnStable(enHtml), parseJpStable(jpHtml), bashoId)
  if (!stable) throw new Error('stable pages did not name the stable')
  return stable
}

async function main(): Promise<number> {
  const snapshotPath = resolve(args.snapshot as string)
  const outPath = resolve(args.out as string)
  const previousPath = args.previous ? resolve(args.previous) : outPath
  const delay = Math.max(0, Number(args.delay) || 0)
  const limit = args.limit ? Number(args.limit) : Infinity

  const validation = validateSnapshot(await readJson(snapshotPath))
  if (!validation.ok) {
    console.error(`Cannot read snapshot ${snapshotPath}: ${validation.errors[0]}`)
    return 2
  }
  const snapshot = validation.snapshot
  const bashoId = snapshotBashoId(snapshot)

  const files: RawDivisionFile[] = [snapshot]
  const lower = validateLowerSnapshot(await readJson(resolve(args.lower as string)))
  if (lower.ok && lowerSnapshotBashoId(lower.snapshot) === bashoId) files.push(lower.snapshot)
  else console.warn('No lower-division snapshot for this tournament; sekitori stables only.')

  // Distinct stable ids across every division, in order of first appearance.
  const ids = new Set<number>()
  for (const file of files) {
    for (const division of snapshotDivisions(file)) {
      const en = (file.divisions[division] as RawDivisionSnapshot).payloads.en
      for (const row of en.BanzukeTable) {
        if (isPlaceholderRow(row)) continue
        const id = Number(row.heya_id)
        if (Number.isInteger(id) && id > 0) ids.add(id)
      }
    }
  }

  const previous = validateStablesFile(await readJson(previousPath))
  const existing: Record<string, Stable> = previous.ok ? previous.file.stables : {}
  if (!previous.ok && (await readJson(previousPath)) !== null) {
    console.warn(`Ignoring previous stables at ${previousPath}: ${previous.error}`)
  }

  const stables: Record<string, Stable> = {}
  let fetched = 0
  let failed = 0
  let skipped = 0
  let changed = false

  for (const id of ids) {
    const key = String(id)
    const current = existing[key]
    if (current && current.bashoId === bashoId && !args.force) {
      stables[key] = current
      skipped += 1
      continue
    }
    if (fetched + failed >= limit) {
      if (current) stables[key] = current
      continue
    }
    if (fetched + failed > 0 && delay > 0) await sleep(delay)
    try {
      stables[key] = await fetchStable(id, bashoId)
      fetched += 1
      changed = true
      console.log(`fetched ${id}: ${stables[key].name.en || stables[key].name.jp}`)
    } catch (error) {
      failed += 1
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(`stable ${id} failed: ${reason}`)
      if (current) stables[key] = current
    }
  }

  // Stables with nobody left on the banzuke are dropped from the file.
  const dropped = Object.keys(existing).filter((key) => !(key in stables))
  if (dropped.length > 0) changed = true

  console.log(
    `${ids.size} stables: ${fetched} fetched, ${skipped} up to date, ${failed} failed, ${dropped.length} dropped`
  )

  if (!changed) {
    await setOutput('changed', 'false')
    return 0
  }

  const file: StablesFile = { version: 1, fetchedAt: new Date().toISOString(), stables }
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
  console.log(`Saved ${Object.keys(stables).length} stables to ${outPath}`)
  await setOutput('changed', 'true')
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
