/**
 * The in-season watcher: one run of this script sits through the Tokyo
 * evening, asks sumo-api every few minutes whether more of today's bouts have
 * been decided than the live site shows, and starts a results-only deploy
 * when they have. GitHub's cron queue runs hours late in the evening; a
 * workflow_dispatch starts in seconds. See docs/ops/results-freshness.md.
 *
 * Usage:
 *   tsx scripts/watch-results.ts [--snapshot <path>] [--site <url>]
 *                                [--max-minutes <n>] [--poll-seconds <n>]
 *                                [--window <from-to JST hours>] [--dry-run]
 *
 * Exit 0 always; the workflow around it decides whether to start a successor.
 * Prints `in_season=` so the workflow can stop the chain out of season.
 */
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { fetchJson, HttpError } from './lib/http.ts'
import { setOutput, sleep } from './lib/run-io.ts'
import type { SumoApiTorikumi } from './lib/sumo-api.ts'
import { jstHour } from '../src/utils/dates.ts'
import { resultsFileName, validateResults, type ResultsFile } from '../src/data/results.ts'
import { seasonPhase } from './season-gate.mjs'

const API = 'https://www.sumo-api.com/api'
const DIVISIONS = ['Makuuchi', 'Juryo'] as const

const run = promisify(execFile)

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: 'public/latest-banzuke.json' },
    site: { type: 'string', default: 'https://jonath0n.github.io/banzuke-app' },
    'max-minutes': { type: 'string', default: '330' },
    'poll-seconds': { type: 'string', default: '300' },
    /** The hours (JST) in which results can land: the last bout ends about 18:00. */
    window: { type: 'string', default: '15-23' },
    'dry-run': { type: 'boolean', default: false },
  },
})

/** How much of a day is decided: bouts with a winner, over bouts on the card. */
export interface DayProgress {
  decided: number
  total: number
}

/** The day's progress as sumo-api has it. A missing card counts as nothing to show. */
export async function upstreamProgress(yyyymm: string, day: number): Promise<DayProgress> {
  let decided = 0
  let total = 0
  for (const division of DIVISIONS) {
    try {
      const card = await fetchJson<SumoApiTorikumi>(
        `${API}/basho/${yyyymm}/torikumi/${division}/${day}`,
        { timeoutMs: 20_000 }
      )
      for (const m of card.torikumi ?? []) {
        total += 1
        if (m.winnerId) decided += 1
      }
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) throw error
    }
  }
  return { decided, total }
}

/** The same count for the file the site is serving, bypassing any cache in between. */
export function siteProgress(file: ResultsFile | null, day: number): DayProgress {
  const card = file?.torikumi[String(day)] ?? []
  return { decided: card.filter((m) => m.winnerId !== null).length, total: card.length }
}

/** More decided bouts upstream than on the site: a deploy would show something new. */
export function behind(site: DayProgress, upstream: DayProgress): boolean {
  return upstream.decided > site.decided || upstream.total > site.total
}

async function siteResults(site: string, bashoId: number): Promise<ResultsFile | null> {
  try {
    const raw = await fetchJson<unknown>(`${site}/results/${resultsFileName(bashoId)}`, {
      timeoutMs: 20_000,
      headers: { 'cache-control': 'no-cache' },
    })
    const result = validateResults(raw)
    return result.ok ? result.results : null
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null
    throw error
  }
}

async function dispatchDeploy(dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log('dry run: would dispatch deploy.yml with mode=results')
    return
  }
  await run('gh', ['workflow', 'run', 'deploy.yml', '--ref', 'main', '-f', 'mode=results'])
  console.log('dispatched deploy.yml (mode=results)')
}

function parseWindow(spec: string): [number, number] {
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(spec)
  if (!match) throw new Error(`--window must look like 15-23, got "${spec}"`)
  return [Number(match[1]), Number(match[2])]
}

async function main(): Promise<void> {
  const snapshot = JSON.parse(await readFile(resolve(args.snapshot as string), 'utf8')) as unknown
  const maxMs = Number(args['max-minutes']) * 60_000
  const pollMs = Number(args['poll-seconds']) * 1000
  const [from, to] = parseWindow(args.window as string)
  const site = (args.site as string).replace(/\/$/, '')
  const deadline = Date.now() + maxMs
  let dispatchedFor = ''

  const gate = seasonPhase(snapshot)
  await setOutput('in_season', String(gate.inSeason))
  if (!gate.inSeason) {
    console.log(`Basho ${gate.bashoId}: ${gate.phase}; nothing to watch.`)
    return
  }
  console.log(
    `Watching basho ${gate.bashoId} (${gate.yyyymm}) until ${new Date(deadline).toISOString()}, ` +
      `every ${pollMs / 1000}s between ${from}:00 and ${to}:00 JST`
  )

  while (Date.now() < deadline) {
    const now = new Date()
    const today = seasonPhase(snapshot, now)
    if (!today.inSeason) {
      // Three days past senshuraku during a run: let the chain end here.
      await setOutput('in_season', 'false')
      console.log('Out of season now; stopping.')
      return
    }
    const hour = jstHour(now)
    if (today.phase === 'live' && hour >= from && hour < to) {
      try {
        const [upstream, file] = await Promise.all([
          upstreamProgress(today.yyyymm, today.day),
          siteResults(site, today.bashoId),
        ])
        const shown = siteProgress(file, today.day)
        const key = `${today.day}:${upstream.decided}/${upstream.total}`
        const stamp = now.toISOString().slice(11, 19)
        if (behind(shown, upstream) && dispatchedFor !== key) {
          console.log(
            `${stamp} day ${today.day}: upstream ${upstream.decided}/${upstream.total}, site ${shown.decided}/${shown.total} — deploying`
          )
          await dispatchDeploy(args['dry-run'] as boolean)
          dispatchedFor = key
        } else {
          console.log(
            `${stamp} day ${today.day}: upstream ${upstream.decided}/${upstream.total}, site ${shown.decided}/${shown.total}`
          )
        }
      } catch (error) {
        console.warn(`poll failed: ${error instanceof Error ? error.message : error}`)
      }
    }
    await sleep(Math.min(pollMs, Math.max(0, deadline - Date.now())))
  }
  console.log('Handing over to the next watcher.')
}

if (process.argv[1]?.endsWith('watch-results.ts')) {
  main().catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
