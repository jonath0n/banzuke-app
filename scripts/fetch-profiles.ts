/**
 * Fetches wrestler profiles (height, weight, birth date, debut, highest rank …)
 * from the JSA profile pages for every wrestler in the current snapshot and
 * writes them to a JSON file the app loads on demand.
 *
 * Profiles are refreshed once per tournament: a wrestler whose stored profile
 * already carries the current basho id is skipped. Requests are sequential
 * with a pause between them. A failed page keeps the previous profile (if any)
 * and never fails the run, so a scraping hiccup cannot block a deploy.
 *
 * Usage:
 *   tsx scripts/fetch-profiles.ts [--snapshot <path>] [--out <path>] [--previous <path>]
 *                                 [--delay <ms>] [--limit <n>] [--force]
 *
 * In GitHub Actions the script appends `changed` to $GITHUB_OUTPUT.
 */
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { fetchText } from './lib/http.ts'
import { buildProfile, parseEnProfile, parseJpProfile } from './lib/profile-parser.ts'
import {
  isPlaceholderRow,
  snapshotBashoId,
  snapshotDivisions,
  validateSnapshot,
  type RawDivisionSnapshot,
} from '../src/data/schema.ts'
import { validateProfiles, type ProfilesFile, type RikishiProfile } from '../src/data/profiles.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    out: { type: 'string', default: resolve(rootDir, 'public/rikishi-profiles.json') },
    previous: { type: 'string' },
    delay: { type: 'string', default: '400' },
    limit: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
})

export function profilePageUrls(id: number): { en: string; jp: string } {
  return {
    en: `https://www.sumo.or.jp/EnSumoDataRikishi/profile/${id}/`,
    jp: `https://www.sumo.or.jp/ResultRikishiData/profile/${id}/`,
  }
}

async function setOutput(name: string, value: string): Promise<void> {
  console.log(`${name}=${value}`)
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
  }
}

async function readJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown
  } catch {
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}

async function fetchProfile(id: number, bashoId: number): Promise<RikishiProfile> {
  const urls = profilePageUrls(id)
  const [enHtml, jpHtml] = await Promise.all([fetchText(urls.en), fetchText(urls.jp)])
  const en = parseEnProfile(enHtml)
  const jp = parseJpProfile(jpHtml)
  if (!en.ringName && !jp.shikona) {
    throw new Error('profile pages did not contain a basic information table')
  }
  return buildProfile(id, en, jp, bashoId)
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

  const ids: number[] = []
  for (const division of snapshotDivisions(snapshot)) {
    const en = (snapshot.divisions[division] as RawDivisionSnapshot).payloads.en
    for (const row of en.BanzukeTable) {
      if (!isPlaceholderRow(row)) ids.push(Number(row.rikishi_id))
    }
  }

  const previous = validateProfiles(await readJson(previousPath))
  const existing: Record<string, RikishiProfile> = previous.ok ? previous.file.profiles : {}
  if (!previous.ok && (await readJson(previousPath)) !== null) {
    console.warn(`Ignoring previous profiles at ${previousPath}: ${previous.error}`)
  }

  const profiles: Record<string, RikishiProfile> = {}
  let fetched = 0
  let failed = 0
  let skipped = 0
  let changed = false

  for (const id of ids) {
    const key = String(id)
    const current = existing[key]
    if (current && current.bashoId === bashoId && !args.force) {
      profiles[key] = current
      skipped += 1
      continue
    }
    if (fetched + failed >= limit) {
      if (current) profiles[key] = current
      continue
    }
    if (fetched + failed > 0 && delay > 0) await sleep(delay)
    try {
      profiles[key] = await fetchProfile(id, bashoId)
      fetched += 1
      changed = true
      console.log(`fetched ${id}: ${profiles[key].realName.en || profiles[key].realName.jp}`)
    } catch (error) {
      failed += 1
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(`profile ${id} failed: ${reason}`)
      if (current) profiles[key] = current
    }
  }

  // Wrestlers no longer on the banzuke are dropped from the file.
  const dropped = Object.keys(existing).filter((key) => !(key in profiles))
  if (dropped.length > 0) changed = true

  console.log(
    `${ids.length} wrestlers: ${fetched} fetched, ${skipped} up to date, ${failed} failed, ${dropped.length} dropped`
  )

  if (!changed) {
    await setOutput('changed', 'false')
    return 0
  }

  const file: ProfilesFile = { version: 1, fetchedAt: new Date().toISOString(), profiles }
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
  console.log(`Saved ${Object.keys(profiles).length} profiles to ${outPath}`)
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
