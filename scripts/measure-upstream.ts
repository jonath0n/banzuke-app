/**
 * Read-only: how fast sumo-api.com and the live site get a day's results.
 * Run it on a tournament evening (from about 17:30 JST) and it appends one
 * CSV line per poll — the Tokyo time, how many of today's bouts sumo-api has
 * decided, and how many the site shows — until both carry the whole card or
 * the deadline passes. The numbers say where the watcher's window should
 * start, how often it should poll, and how long the pipeline really takes.
 *
 * Usage:
 *   tsx scripts/measure-upstream.ts [--snapshot <path>] [--site <url>] [--out <csv>]
 *                                   [--every <seconds>] [--max-minutes <n>]
 */
import { appendFile, readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { fetchJson, HttpError } from './lib/http.ts'
import { sleep } from './lib/run-io.ts'
import type { SumoApiTorikumi } from './lib/sumo-api.ts'
import { resultsFileName, validateResults } from '../src/data/results.ts'
import { seasonPhase } from './season-gate.mjs'

const API = 'https://www.sumo-api.com/api'
const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: 'public/latest-banzuke.json' },
    site: { type: 'string', default: 'https://jonath0n.github.io/banzuke-app' },
    out: { type: 'string', default: 'upstream-timing.csv' },
    every: { type: 'string', default: '120' },
    'max-minutes': { type: 'string', default: '240' },
  },
})

async function upstream(yyyymm: string, day: number): Promise<{ decided: number; total: number }> {
  try {
    const card = await fetchJson<SumoApiTorikumi>(`${API}/basho/${yyyymm}/torikumi/Makuuchi/${day}`)
    const bouts = card.torikumi ?? []
    return { decided: bouts.filter((m) => m.winnerId).length, total: bouts.length }
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return { decided: 0, total: 0 }
    throw error
  }
}

async function site(
  base: string,
  bashoId: number,
  day: number
): Promise<{ decided: number; total: number; modified: string }> {
  const response = await fetch(`${base}/results/${resultsFileName(bashoId)}`, { cache: 'no-store' })
  if (response.status === 404) return { decided: 0, total: 0, modified: '' }
  const result = validateResults((await response.json()) as unknown)
  const card = result.ok
    ? (result.results.torikumi[String(day)] ?? []).filter((m) => m.division === 'makuuchi')
    : []
  return {
    decided: card.filter((m) => m.winnerId !== null).length,
    total: card.length,
    modified: response.headers.get('last-modified') ?? '',
  }
}

async function main(): Promise<void> {
  const snapshot = JSON.parse(await readFile(resolve(args.snapshot as string), 'utf8')) as unknown
  const gate = seasonPhase(snapshot)
  if (gate.phase !== 'live') {
    console.log(`Basho ${gate.bashoId}: ${gate.phase}; nothing to measure today.`)
    return
  }
  const out = resolve(args.out as string)
  const everyMs = Number(args.every) * 1000
  const deadline = Date.now() + Number(args['max-minutes']) * 60_000
  await appendFile(
    out,
    `# basho ${gate.bashoId} day ${gate.day}, started ${new Date().toISOString()}\n`
  )
  await appendFile(
    out,
    'time_jst,upstream_decided,upstream_total,site_decided,site_total,site_last_modified\n'
  )
  console.log(`Measuring basho ${gate.bashoId} day ${gate.day} every ${everyMs / 1000}s → ${out}`)
  while (Date.now() < deadline) {
    const now = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Tokyo', hour12: false })
    try {
      const [up, shown] = await Promise.all([
        upstream(gate.yyyymm, gate.day),
        site((args.site as string).replace(/\/$/, ''), gate.bashoId, gate.day),
      ])
      const line = `${now},${up.decided},${up.total},${shown.decided},${shown.total},${shown.modified}`
      console.log(line)
      await appendFile(out, `${line}\n`)
      if (up.total > 0 && up.decided === up.total && shown.decided === up.total) {
        console.log('Both have the whole card; done.')
        return
      }
    } catch (error) {
      console.warn(`${now}: ${error instanceof Error ? error.message : error}`)
    }
    await sleep(everyMs)
  }
}

main().catch((error: unknown) => {
  console.error('Unexpected error:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
