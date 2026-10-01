#!/usr/bin/env node
/**
 * Where today stands relative to the tournament in the committed snapshot,
 * for the deploy workflow's gate job: whether a results run is worth starting
 * at all. Plain Node, no install, so the gate answers in seconds.
 *
 * Usage:
 *   node scripts/season-gate.mjs [--snapshot <path>] [--now <ISO date>]
 *
 * Prints `name=value` lines and, in GitHub Actions, appends them to
 * $GITHUB_OUTPUT:
 *   phase      upcoming | live | finished | out
 *   in_season  true from the day before day 1 to three days after senshuraku
 *              (the same rule scripts/fetch-results.ts applies)
 *   day        the tournament day, 1–15, while live; 0 otherwise
 *   basho_id   the JSA basho id (results/{basho_id}.json)
 *   yyyymm     the sumo-api id of the same tournament
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const JST = 'Asia/Tokyo'
const MS_PER_DAY = 86_400_000

/** Calendar day in Tokyo as days since the epoch. */
function jstDayIndex(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value)
  return Math.floor(Date.UTC(get('year'), get('month') - 1, get('day')) / MS_PER_DAY)
}

/** The Makuuchi BashoInfo of a format 1 or format 2 snapshot. */
function bashoInfo(snapshot) {
  const division = snapshot?.divisions?.makuuchi ?? snapshot
  return division?.payloads?.en?.BashoInfo ?? null
}

/**
 * @param {unknown} snapshot the parsed snapshot
 * @param {Date} now
 * @returns {{ phase: 'upcoming'|'live'|'finished'|'out', inSeason: boolean, day: number,
 *             bashoId: number, yyyymm: string, daysUntil: number, daysSince: number }}
 */
export function seasonPhase(snapshot, now = new Date()) {
  const info = bashoInfo(snapshot)
  if (
    !info ||
    !/^\d{4}-\d{2}-\d{2}$/.test(info.start_date) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(info.end_date)
  ) {
    throw new Error('snapshot has no readable BashoInfo dates')
  }
  const start = jstDayIndex(new Date(`${info.start_date}T00:00:00+09:00`))
  const end = jstDayIndex(new Date(`${info.end_date}T00:00:00+09:00`))
  const today = jstDayIndex(now)
  const bashoId = Number(info.basho_id)
  const yyyymm = info.start_date.slice(0, 7).replace('-', '')
  const daysUntil = Math.max(0, start - today)
  const daysSince = Math.max(0, today - end)
  let phase = 'live'
  let day = 0
  if (today < start) phase = 'upcoming'
  else if (today > end) phase = 'finished'
  else day = today - start + 1
  const inSeason =
    phase === 'live' ||
    (phase === 'upcoming' && daysUntil <= 1) ||
    (phase === 'finished' && daysSince <= 3)
  if (!inSeason) phase = phase === 'upcoming' ? 'upcoming' : 'out'
  return { phase, inSeason, day, bashoId, yyyymm, daysUntil, daysSince }
}

function setOutput(name, value) {
  console.log(`${name}=${value}`)
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}

function main() {
  const args = process.argv.slice(2)
  const option = (name, fallback) => {
    const i = args.indexOf(`--${name}`)
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback
  }
  const snapshotPath = resolve(option('snapshot', 'public/latest-banzuke.json'))
  const now = option('now') ? new Date(option('now')) : new Date()
  if (Number.isNaN(now.getTime())) throw new Error('--now is not a date')
  const gate = seasonPhase(JSON.parse(readFileSync(snapshotPath, 'utf8')), now)
  setOutput('phase', gate.phase)
  setOutput('in_season', String(gate.inSeason))
  setOutput('day', String(gate.day))
  setOutput('basho_id', String(gate.bashoId))
  setOutput('yyyymm', gate.yyyymm)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
