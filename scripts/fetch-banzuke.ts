/**
 * Fetches the current banzuke from sumo.or.jp in both languages, validates it,
 * and writes two snapshots the app can load: the sekitori (Makuuchi and Juryo)
 * to --out, and the divisions below Juryo (Makushita to Jonokuchi) to
 * --lower-out, which the app loads only when it needs them.
 *
 * English rows come from the JSON endpoint the official banzuke page uses.
 * The Japanese JSON endpoints reject non-browser clients, so Japanese text
 * (ring names in kanji, readings, stables, prefectures, rank names) is taken
 * from the server-rendered rikishi list page and merged onto the English rows
 * by rikishi_id. That page lists fifty wrestlers at a time, so the lower
 * divisions take several requests each (`scripts/lib/jp-search-pages.ts`).
 *
 * The lower divisions are a best effort: when they fail to fetch or validate,
 * a warning is printed, the committed lower file is left alone (the app hides
 * one that is for another tournament), and the exit code is the sekitori's.
 *
 * Usage:
 *   tsx scripts/fetch-banzuke.ts [--out <path>] [--previous <path>]
 *     [--lower-out <path>] [--lower-previous <path>] [--if-changed] [--force]
 *
 * --out             Where to write the snapshot (default: public/latest-banzuke.json).
 * --previous        Snapshot to compare against (default: the --out path if it exists).
 * --lower-out       Where to write the lower divisions (default: public/latest-lower.json).
 * --lower-previous  Lower snapshot to compare against (default: the --lower-out path).
 * --if-changed  Only write when the data differs from --previous.
 * --force       Allow writing a snapshot for an older tournament than --previous.
 *
 * Exit codes: 0 success, 1 fetch failure, 2 validation failure, 3 regression.
 * In GitHub Actions the script appends `changed` (either file), `lower_changed`,
 * `basho_id` and `start_date` to $GITHUB_OUTPUT.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { fetchJson, fetchText } from './lib/http.ts'
import { parseJpSearchPage, type JpSearchPage } from './lib/jp-search-page.ts'
import { fetchJpPages } from './lib/jp-search-pages.ts'
import { buildJpPayload } from './lib/jp-payload.ts'
import { setOutput } from './lib/run-io.ts'
import {
  DIVISION_IDS,
  isPlaceholderRow,
  LOWER_DIVISIONS,
  lowerSnapshotBashoId,
  SEKITORI_DIVISIONS,
  snapshotBashoId,
  snapshotsEqualIgnoringFetchedAt,
  validateLowerSnapshot,
  validateSnapshot,
  type Division,
  type Lang,
  type LowerDivision,
  type RawDivisionSnapshot,
  type RawLowerSnapshot,
  type RawPayload,
  type RawSnapshot,
  type SekitoriDivision,
} from '../src/data/schema.ts'

const EN_BANZUKE_URL = 'https://sumo.or.jp/EnHonbashoBanzuke/indexAjax'
/** The rikishi list form; the division is selected by POSTing `kakuzuke_id`. */
const JP_SEARCH_URL = 'https://www.sumo.or.jp/ResultRikishiData/search/'

export function sourcesFor(division: Division): Record<Lang, string> {
  const id = DIVISION_IDS[division]
  return {
    en: `${EN_BANZUKE_URL}/${id}/1/`,
    jp: `${JP_SEARCH_URL} (POST kakuzuke_id=${id}${division === 'makuuchi' || division === 'juryo' ? '' : ', p=1…'})`,
  }
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    out: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    previous: { type: 'string' },
    'lower-out': { type: 'string', default: resolve(rootDir, 'public/latest-lower.json') },
    'lower-previous': { type: 'string' },
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

async function readLowerSnapshot(path: string): Promise<RawLowerSnapshot | null> {
  try {
    const result = validateLowerSnapshot(JSON.parse(await readFile(path, 'utf8')))
    if (!result.ok) {
      console.warn(`Ignoring previous lower snapshot at ${path}: ${result.errors[0]}`)
      return null
    }
    return result.snapshot
  } catch {
    return null
  }
}

interface Fetched {
  en: RawPayload
  jpPage: JpSearchPage
}

/** Fetches the sekitori divisions in both languages; null if any request failed. */
async function fetchSources(): Promise<Record<SekitoriDivision, Fetched> | null> {
  const requests = SEKITORI_DIVISIONS.flatMap((division) => {
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
  const fetched = {} as Record<SekitoriDivision, Fetched>
  SEKITORI_DIVISIONS.forEach((division, index) => {
    fetched[division] = {
      en: values[index * 2] as RawPayload,
      jpPage: parseJpSearchPage(values[index * 2 + 1] as string),
    }
  })
  return fetched
}

/**
 * Fetches one division below Juryo: the English banzuke (one request), then
 * the Japanese list page by page, one request at a time.
 */
async function fetchLowerDivision(division: LowerDivision): Promise<Fetched> {
  const id = DIVISION_IDS[division]
  console.log(`Fetching ${division}: EN banzuke ${sourcesFor(division).en}`)
  const en = await fetchJson<RawPayload>(`${EN_BANZUKE_URL}/${id}/1/`, {
    form: { kakuzuke_id: id, page: 1 },
  })
  const wrestlers = en.BanzukeTable?.filter((row) => !isPlaceholderRow(row)).length ?? 0
  const jpPage = await fetchJpPages(wrestlers, (p) => {
    console.log(`Fetching ${division}: JP rikishi list page ${p}`)
    return fetchText(JP_SEARCH_URL, { form: { kakuzuke_id: id, p } })
  })
  return { en, jpPage }
}

/** Merges the Japanese page onto the English payload for one division. */
function buildDivision(division: Division, fetched: Fetched): RawDivisionSnapshot | null {
  const { jpPage } = fetched
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

/**
 * Fetches, validates and writes the divisions below Juryo for tournament
 * `bashoId`. Returns whether the file changed; never throws, and leaves the
 * committed file alone on any failure.
 */
async function updateLower(bashoId: number): Promise<boolean> {
  const outPath = resolve(args['lower-out'] as string)
  const previousPath = args['lower-previous'] ? resolve(args['lower-previous']) : outPath
  const warn = (message: string) =>
    console.warn(`${process.env.GITHUB_ACTIONS ? '::warning::' : 'Warning: '}${message}`)

  const divisions: RawLowerSnapshot['divisions'] = {}
  try {
    for (const division of LOWER_DIVISIONS) {
      const built = buildDivision(division, await fetchLowerDivision(division))
      if (!built) {
        warn(`lower divisions not updated: ${division} did not build`)
        return false
      }
      divisions[division] = built
    }
  } catch (error) {
    warn(`lower divisions not updated: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }

  const validation = validateLowerSnapshot({
    version: 2,
    fetchedAt: new Date().toISOString(),
    divisions,
  })
  if (!validation.ok) {
    warn(`lower divisions not updated: ${validation.errors.join('; ')}`)
    return false
  }
  for (const warning of validation.warnings) console.warn(`Warning: ${warning}`)
  const snapshot = validation.snapshot
  const lowerId = lowerSnapshotBashoId(snapshot)
  if (lowerId !== bashoId) {
    warn(`lower divisions are for basho ${lowerId}, the sekitori for ${bashoId}; not written`)
    return false
  }

  const previous = await readLowerSnapshot(previousPath)
  if (args['if-changed'] && previous && snapshotsEqualIgnoringFetchedAt(previous, snapshot)) {
    console.log(`No changes: lower divisions for ${bashoId} match ${previousPath}`)
    return false
  }
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  console.log(`Saved lower divisions for ${bashoId} to ${outPath}`)
  return true
}

async function main(): Promise<number> {
  const outPath = resolve(args.out as string)
  const previousPath = args.previous ? resolve(args.previous) : outPath

  const fetched = await fetchSources()
  if (!fetched) return 1

  const divisions = {} as Record<SekitoriDivision, RawDivisionSnapshot>
  for (const division of SEKITORI_DIVISIONS) {
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
  let sekitoriChanged = true
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
      sekitoriChanged = false
    }
  }

  // Unchanged, the previous file is what ships: it lands at --out too (when that
  // is elsewhere), so a run where only the lower divisions moved still leaves
  // a sekitori snapshot beside them without touching its fetchedAt.
  const written = sekitoriChanged ? snapshot : previous
  if (written && (sekitoriChanged || outPath !== previousPath)) {
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, `${JSON.stringify(written, null, 2)}\n`, 'utf8')
    if (sekitoriChanged) console.log(`Saved banzuke ${bashoId} (${startDate}) to ${outPath}`)
  }

  const lowerChanged = await updateLower(bashoId)
  await setOutput('lower_changed', String(lowerChanged))
  await setOutput('changed', String(sekitoriChanged || lowerChanged))
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
