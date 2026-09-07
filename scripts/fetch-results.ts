/**
 * Fetches the current tournament's results — every wrestler's record, each
 * day's torikumi and the yusho — from sumo-api.com and writes one file per
 * basho for the app's hoshitori overlay.
 *
 * Runs on every deploy but only fetches in season: from the day before the
 * first day to three days after senshuraku (late corrections), as read from
 * the snapshot's dates. Out of season it prints `changed=false` and exits 0.
 *
 * Usage:
 *   tsx scripts/fetch-results.ts [--snapshot <path>] [--out-dir <dir>] [--previous-dir <dir>]
 *                                [--basho <YYYYMM>] [--delay <ms>] [--force]
 *
 * --basho   Fetch a specific tournament (implies --force); used to seed the
 *           archive and to test against a finished basho.
 *
 * Exit codes: 0 success / unchanged / out of season, 1 fetch failure,
 * 2 a wrestler could not be mapped to a JSA id (nothing written).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { fetchJson, HttpError } from './lib/http.ts'
import { setOutput } from './lib/run-io.ts'
import {
  resultsFromSumoApi,
  type SumoApiBanzuke,
  type SumoApiBanzukeEntry,
  type SumoApiBasho,
  type SumoApiRikishi,
  type SumoApiTorikumi,
} from './lib/sumo-api.ts'
import { bashoIdFromSumoApi, sumoApiBashoId } from '../src/data/bashoIds.ts'
import {
  MAX_DAYS,
  resultsEqualIgnoringFetchedAt,
  resultsFileName,
  validateResults,
  type ResultsFile,
} from '../src/data/results.ts'
import { snapshotBashoId, validateSnapshot } from '../src/data/schema.ts'
import { getTournamentStatus } from '../src/utils/dates.ts'

const API = 'https://www.sumo-api.com/api'
const DIVISIONS_API = ['Makuuchi', 'Juryo'] as const
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/results') },
    'previous-dir': { type: 'string' },
    basho: { type: 'string' },
    delay: { type: 'string', default: '300' },
    force: { type: 'boolean', default: false },
  },
})

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

async function readResults(path: string): Promise<ResultsFile | null> {
  try {
    const result = validateResults(JSON.parse(await readFile(path, 'utf8')))
    if (!result.ok) {
      console.warn(`${path}: ${result.error}`)
      return null
    }
    return result.results
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }
    console.warn(`${path}: ${error instanceof Error ? error.message : error}`)
    return null
  }
}

/** Which tournament, and whether we are in season for it. */
async function target(): Promise<{ bashoId: number; yyyymm: string; inSeason: boolean } | null> {
  if (args.basho) {
    const bashoId = bashoIdFromSumoApi(args.basho)
    if (bashoId === null) {
      console.error(`${args.basho}: not a tournament month`)
      return null
    }
    return { bashoId, yyyymm: args.basho, inSeason: true }
  }
  const validation = validateSnapshot(
    JSON.parse(await readFile(resolve(args.snapshot as string), 'utf8'))
  )
  if (!validation.ok) {
    console.error(`Cannot read snapshot: ${validation.errors[0]}`)
    return null
  }
  const bashoId = snapshotBashoId(validation.snapshot)
  const info = validation.snapshot.divisions.makuuchi.payloads.en.BashoInfo
  const status = getTournamentStatus({ startDate: info.start_date, endDate: info.end_date })
  const inSeason =
    status.kind === 'live' ||
    (status.kind === 'upcoming' && status.daysUntil <= 1) ||
    (status.kind === 'finished' && status.daysSince <= 3)
  console.log(`Basho ${bashoId}: ${status.kind}${inSeason ? '' : ' — out of season'}`)
  return { bashoId, yyyymm: sumoApiBashoId(bashoId), inSeason }
}

/**
 * Days whose card is already complete in the previous file need no refetch —
 * except the last two days of the range, which are always re-fetched so a
 * late correction or a partially-fetched day (one division 404'd) can heal.
 * `--force` re-fetches every day in the range.
 */
function daysToFetch(previous: ResultsFile | null, upTo: number, force: boolean): number[] {
  const days: number[] = []
  for (let day = 1; day <= upTo; day++) {
    if (force) {
      days.push(day)
      continue
    }
    const card = previous?.torikumi[String(day)]
    const complete = card && card.length > 0 && card.every((m) => m.winnerId !== null)
    if (!complete || day >= upTo - 1) days.push(day)
  }
  return days
}

async function main(): Promise<number> {
  const outDir = resolve(args['out-dir'] as string)
  const previousDir = args['previous-dir'] ? resolve(args['previous-dir']) : outDir
  const delayMs = Math.max(0, Number(args.delay) || 0)

  const which = await target()
  if (!which) return 2
  if (!which.inSeason && !args.force) {
    await setOutput('changed', 'false')
    return 0
  }
  const { bashoId, yyyymm } = which
  const previous = await readResults(join(previousDir, resultsFileName(bashoId)))

  const basho = await fetchJson<SumoApiBasho>(`${API}/basho/${yyyymm}`)
  await sleep(delayMs)
  const banzuke: SumoApiBanzuke[] = []
  for (const division of DIVISIONS_API) {
    banzuke.push(await fetchJson<SumoApiBanzuke>(`${API}/basho/${yyyymm}/banzuke/${division}`))
    await sleep(delayMs)
  }
  const page = await fetchJson<{ records: SumoApiRikishi[] }>(`${API}/rikishis?limit=1000`, {
    timeoutMs: 60_000,
  })
  const rikishi = new Map(page.records.map((r) => [r.id, r]))

  // The latest fought day for one entry's record, from the last decided bout.
  const lastFoughtDay = (record: SumoApiBanzukeEntry['record']): number => {
    const bouts = record ?? []
    for (let i = bouts.length - 1; i >= 0; i--) {
      if (bouts[i].result) return i + 1
    }
    return 0
  }

  // The latest fought day, from the records; the next day's card may already be out.
  const fought = Math.max(
    0,
    ...banzuke.flatMap((t) => [...t.east, ...t.west]).map((e) => lastFoughtDay(e.record))
  )
  const upTo = Math.min(MAX_DAYS, fought + 1)

  // Complete days need no refetch: carry them over already-converted via `keep`.
  // A day being re-fetched replaces the kept copy, so it is excluded here.
  const fetchDays = new Set(daysToFetch(previous, upTo, Boolean(args.force)))
  const torikumi = new Map<number, SumoApiTorikumi>()
  const keep = new Map<string, ResultsFile['torikumi'][string]>()
  for (const [day, matches] of Object.entries(previous?.torikumi ?? {})) {
    if (fetchDays.has(Number(day))) continue
    if (matches.length > 0 && matches.every((m) => m.winnerId !== null)) keep.set(day, matches)
  }
  for (const day of fetchDays) {
    for (const division of DIVISIONS_API) {
      await sleep(delayMs)
      let card: SumoApiTorikumi
      try {
        card = await fetchJson<SumoApiTorikumi>(
          `${API}/basho/${yyyymm}/torikumi/${division}/${day}`
        )
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          console.log(`day ${day} ${division}: card not published yet`)
          card = { date: yyyymm }
        } else {
          throw error
        }
      }
      const existing = torikumi.get(day)
      torikumi.set(day, {
        date: card.date,
        torikumi: [...(existing?.torikumi ?? []), ...(card.torikumi ?? [])],
      })
    }
  }

  const { results, problems, warnings } = resultsFromSumoApi({
    bashoId,
    fetchedAt: new Date().toISOString(),
    basho,
    banzuke,
    torikumi,
    rikishi,
  })
  for (const [day, matches] of keep) results.torikumi[day] = matches
  for (const warning of warnings) console.warn(`warning: ${warning}`)
  if (problems.length > 0) {
    console.error(`${problems.length} problem(s); nothing written:`)
    for (const problem of problems) console.error(`  - ${problem}`)
    return 2
  }
  console.log(
    `Basho ${bashoId}: day ${results.day}, ${Object.keys(results.records).length} records, cards for days ${Object.keys(results.torikumi).join(', ') || 'none'}`
  )

  if (previous && resultsEqualIgnoringFetchedAt(previous, results)) {
    console.log('No changes.')
    await setOutput('changed', 'false')
    return 0
  }
  await mkdir(outDir, { recursive: true })
  const path = join(outDir, resultsFileName(bashoId))
  await writeFile(path, `${JSON.stringify(results, null, 1)}\n`, 'utf8')
  console.log(`Saved ${path}`)
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
