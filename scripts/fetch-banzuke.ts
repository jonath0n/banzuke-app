/**
 * Fetches the current banzuke (Makuuchi and Juryo) from sumo.or.jp in both
 * languages, validates it, and writes a snapshot the app can load.
 *
 * English rows come from the JSON endpoint the official banzuke page uses.
 * The Japanese JSON endpoints reject non-browser clients, so Japanese text
 * (ring names in kanji, readings, stables, prefectures, rank names) is taken
 * from the server-rendered rikishi list page and merged onto the English rows
 * by rikishi_id.
 *
 * Usage:
 *   tsx scripts/fetch-banzuke.ts [--out <path>] [--previous <path>] [--if-changed] [--force]
 *
 * --out         Where to write the snapshot (default: public/latest-banzuke.json).
 * --previous    Snapshot to compare against (default: the --out path if it exists).
 * --if-changed  Only write when the data differs from --previous.
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
  DIVISIONS,
  DIVISION_IDS,
  isPlaceholderRow,
  snapshotBashoId,
  snapshotsEqualIgnoringFetchedAt,
  validateSnapshot,
  type Division,
  type Lang,
  type RawDivisionSnapshot,
  type RawPayload,
  type RawSnapshot,
} from '../src/data/schema.ts'

const EN_BANZUKE_URL = 'https://sumo.or.jp/EnHonbashoBanzuke/indexAjax'
/** The rikishi list form; the division is selected by POSTing `kakuzuke_id`. */
const JP_SEARCH_URL = 'https://www.sumo.or.jp/ResultRikishiData/search/'

export function sourcesFor(division: Division): Record<Lang, string> {
  const id = DIVISION_IDS[division]
  return {
    en: `${EN_BANZUKE_URL}/${id}/1/`,
    jp: `${JP_SEARCH_URL} (POST kakuzuke_id=${id})`,
  }
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

interface Fetched {
  en: RawPayload
  jpHtml: string
}

/** Fetches every division in both languages; null if any request failed. */
async function fetchSources(): Promise<Record<Division, Fetched> | null> {
  const requests = DIVISIONS.flatMap((division) => {
    const id = DIVISION_IDS[division]
    console.log(`Fetching ${division}: EN banzuke ${sourcesFor(division).en}`)
    console.log(`Fetching ${division}: JP rikishi list ${sourcesFor(division).jp}`)
    return [
      {
        label: `${division} EN`,
        promise: fetchJson<RawPayload>(`${EN_BANZUKE_URL}/${id}/1/`, {
          form: { kakuzuke_id: id, page: 1 },
        }),
      },
      {
        label: `${division} JP`,
        promise: fetchText(JP_SEARCH_URL, { form: { kakuzuke_id: id } }),
      },
    ]
  })

  const results = await Promise.allSettled(requests.map((request) => request.promise))
  let failed = false
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`${requests[index].label} fetch failed: ${reason}`)
      failed = true
    }
  })
  if (failed) return null

  const values = results.map((result) => (result as PromiseFulfilledResult<unknown>).value)
  const fetched = {} as Record<Division, Fetched>
  DIVISIONS.forEach((division, index) => {
    fetched[division] = {
      en: values[index * 2] as RawPayload,
      jpHtml: values[index * 2 + 1] as string,
    }
  })
  return fetched
}

/** Merges the Japanese page onto the English payload for one division. */
function buildDivision(division: Division, fetched: Fetched): RawDivisionSnapshot | null {
  const jpPage = parseJpSearchPage(fetched.jpHtml)
  const enWrestlers = fetched.en.BanzukeTable?.filter((row) => !isPlaceholderRow(row)).length ?? 0
  console.log(
    `${division}: EN payload has ${enWrestlers} wrestlers; JP page lists ${jpPage.rows.length}`
  )

  const jp = buildJpPayload(fetched.en, jpPage)
  if (jp.missing.length > 0) {
    console.error(
      `${division}: the Japanese list does not include ${jp.missing.length} wrestler(s) from the English banzuke: ${jp.missing.join(', ')}. The two sources may describe different tournaments; try again later.`
    )
    return null
  }

  return {
    sources: sourcesFor(division),
    payloads: { en: fetched.en, jp: jp.payload },
    readings: jp.readings,
  }
}

async function main(): Promise<number> {
  const outPath = resolve(args.out as string)
  const previousPath = args.previous ? resolve(args.previous) : outPath

  const fetched = await fetchSources()
  if (!fetched) return 1

  const divisions = {} as Record<Division, RawDivisionSnapshot>
  for (const division of DIVISIONS) {
    const built = buildDivision(division, fetched[division])
    if (!built) return 2
    divisions[division] = built
  }

  const candidate: RawSnapshot = {
    version: 2,
    fetchedAt: new Date().toISOString(),
    divisions,
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
  const startDate = snapshot.divisions.makuuchi.payloads.en.BashoInfo.start_date
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
