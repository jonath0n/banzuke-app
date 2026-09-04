/**
 * Fetches the current makuuchi banzuke from sumo.or.jp, validates it, and
 * writes a bilingual snapshot file.
 *
 * Sources:
 *   EN  the JSON endpoint behind the English banzuke page (ids, ranks, photos,
 *       tournament dates, English names)
 *   JP  the server-rendered Japanese rikishi list page (kanji names, readings,
 *       Japanese stable and prefecture names). The JSA's Japanese JSON
 *       endpoints reject requests that don't come from a browser session, so
 *       the Japanese payload is assembled from this page plus the English data.
 *
 * Usage:
 *   tsx scripts/fetch-banzuke.ts [--out <path>] [--previous <path>] [--if-changed] [--force]
 *
 * --out         Where to write the snapshot (default: public/latest-banzuke.json).
 * --previous    Snapshot to compare against (default: the --out path if it exists).
 * --if-changed  Only write when the payloads differ from --previous.
 * --force       Allow writing a snapshot for an older tournament than --previous.
 *
 * Exit codes: 0 success, 1 fetch failure, 2 validation failure, 3 regression.
 * In GitHub Actions the script appends `changed`, `basho_id` and `start_date`
 * to $GITHUB_OUTPUT.
 */
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { fetchJson, fetchText } from './lib/http.ts'
import { parseJpSearchPage } from './lib/jp-search-page.ts'
import { buildJpPayload } from './lib/jp-payload.ts'
import {
  isPlaceholderRow,
  snapshotBashoId,
  snapshotsEqualIgnoringFetchedAt,
  validateSnapshot,
  type Lang,
  type RawPayload,
  type RawSnapshot,
} from '../src/data/schema.ts'

/** Division 1 = makuuchi. */
const DIVISION = 1

export const SOURCES: Record<Lang, string> = {
  en: `https://sumo.or.jp/EnHonbashoBanzuke/indexAjax/${DIVISION}/1/`,
  jp: `https://www.sumo.or.jp/ResultRikishiData/search?kakuzuke_id=${DIVISION}`,
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    out: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    previous: { type: 'string' },
    'if-changed': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
})

async function readSnapshot(path: string): Promise<RawSnapshot | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
    const result = validateSnapshot(parsed)
    if (!result.ok) {
      console.warn(`Ignoring previous snapshot at ${path}: ${result.errors[0]}`)
      return null
    }
    return result.snapshot
  } catch {
    return null
  }
}

async function setOutput(name: string, value: string): Promise<void> {
  console.log(`${name}=${value}`)
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
  }
}

async function fetchSources(): Promise<{ en: RawPayload; jpHtml: string } | null> {
  console.log(`Fetching EN banzuke from ${SOURCES.en}`)
  console.log(`Fetching JP rikishi list from ${SOURCES.jp}`)
  const [enResult, jpResult] = await Promise.allSettled([
    fetchJson<RawPayload>(SOURCES.en, { form: { kakuzuke_id: DIVISION, page: 1 } }),
    fetchText(SOURCES.jp),
  ])

  let failed = false
  for (const [label, result] of [
    ['EN', enResult],
    ['JP', jpResult],
  ] as const) {
    if (result.status === 'rejected') {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`${label} fetch failed: ${reason}`)
      failed = true
    }
  }
  if (failed || enResult.status !== 'fulfilled' || jpResult.status !== 'fulfilled') return null

  return { en: enResult.value, jpHtml: jpResult.value }
}

async function main(): Promise<number> {
  const outPath = resolve(args.out as string)
  const previousPath = args.previous ? resolve(args.previous) : outPath

  const fetched = await fetchSources()
  if (!fetched) return 1

  const jpPage = parseJpSearchPage(fetched.jpHtml)
  const enWrestlers = fetched.en.BanzukeTable?.filter((row) => !isPlaceholderRow(row)).length ?? 0
  console.log(`EN payload: ${enWrestlers} wrestlers; JP page: ${jpPage.rows.length} wrestlers`)

  const jp = buildJpPayload(fetched.en, jpPage)
  if (jp.missing.length > 0) {
    console.error(
      `The Japanese list does not include ${jp.missing.length} wrestler(s) from the English banzuke: ${jp.missing.join(', ')}. The two sources may describe different tournaments; try again later.`
    )
    return 2
  }

  const candidate: RawSnapshot = {
    version: 1,
    fetchedAt: new Date().toISOString(),
    sources: SOURCES,
    payloads: { en: fetched.en, jp: jp.payload },
    readings: jp.readings,
  }

  const validation = validateSnapshot(candidate)
  if (!validation.ok) {
    console.error('Fetched data failed validation:')
    for (const error of validation.errors) console.error(`  - ${error}`)
    return 2
  }
  for (const warning of validation.warnings) console.warn(`Warning: ${warning}`)

  const snapshot = validation.snapshot
  const bashoId = snapshotBashoId(snapshot)
  const startDate = snapshot.payloads.en.BashoInfo.start_date
  await setOutput('basho_id', String(bashoId))
  await setOutput('start_date', startDate)

  const previous = await readSnapshot(previousPath)
  if (previous) {
    const previousId = snapshotBashoId(previous)
    if (bashoId < previousId && !args.force) {
      console.error(
        `Fetched basho_id ${bashoId} is older than the previous snapshot (${previousId}); refusing to write. Use --force to override.`
      )
      return 3
    }
    if (args['if-changed'] && snapshotsEqualIgnoringFetchedAt(previous, snapshot)) {
      console.log(`No changes: banzuke ${bashoId} (${startDate}) matches ${previousPath}`)
      await setOutput('changed', 'false')
      return 0
    }
  }

  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(`Saved banzuke ${bashoId} (${startDate}) to ${outPath}`)
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
