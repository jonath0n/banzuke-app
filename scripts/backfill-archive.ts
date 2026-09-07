/**
 * Fills the archive for tournaments before this site kept its own copies,
 * from sumo-api.com (https://www.sumo-api.com — free, "please use it
 * responsibly"). Each entry is joined to the JSA by sumo-api's `nskId`; a
 * tournament with any unmapped wrestler is reported and not written.
 *
 * Usage:
 *   tsx scripts/backfill-archive.ts 202511 202601 202603 202605 202607 [--out-dir <dir>] [--delay <ms>]
 *
 * Exit codes: 0 success, 1 a request failed, 2 a tournament could not be mapped.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { bashoIdFromSumoApi } from '../src/data/bashoIds.ts'
import { fetchJson } from './lib/http.ts'
import { refreshIndex, writeArchive } from './lib/archive-io.ts'
import {
  archiveFromSumoApi,
  type SumoApiBanzuke,
  type SumoApiBasho,
  type SumoApiRikishi,
} from './lib/sumo-api.ts'

const API = 'https://www.sumo-api.com/api'
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
    delay: { type: 'string', default: '500' },
  },
})

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

interface RikishiPage {
  records: SumoApiRikishi[]
  total: number
}

/** Every active wrestler in one call; retired ones are fetched singly as needed. */
async function loadRikishi(
  ids: Set<number>,
  delayMs: number
): Promise<Map<number, SumoApiRikishi>> {
  const page = await fetchJson<RikishiPage>(`${API}/rikishis?limit=1000`, { timeoutMs: 60_000 })
  const map = new Map(page.records.map((r) => [r.id, r]))
  for (const id of ids) {
    if (map.has(id)) continue
    await sleep(delayMs)
    map.set(id, await fetchJson<SumoApiRikishi>(`${API}/rikishi/${id}`))
  }
  return map
}

async function backfill(yyyymm: string, outDir: string, delayMs: number): Promise<number> {
  const bashoId = bashoIdFromSumoApi(yyyymm)
  if (bashoId === null) {
    console.error(`${yyyymm}: not a tournament month`)
    return 2
  }
  console.log(`Fetching ${yyyymm} (basho ${bashoId})`)
  const basho = await fetchJson<SumoApiBasho>(`${API}/basho/${yyyymm}`)
  await sleep(delayMs)
  const makuuchi = await fetchJson<SumoApiBanzuke>(`${API}/basho/${yyyymm}/banzuke/Makuuchi`)
  await sleep(delayMs)
  const juryo = await fetchJson<SumoApiBanzuke>(`${API}/basho/${yyyymm}/banzuke/Juryo`)

  const ids = new Set(
    [...makuuchi.east, ...makuuchi.west, ...juryo.east, ...juryo.west].map((e) => e.rikishiID)
  )
  const rikishi = await loadRikishi(ids, delayMs)

  const { archive, problems } = archiveFromSumoApi({ basho, banzuke: [makuuchi, juryo], rikishi })
  if (problems.length > 0) {
    console.error(`${yyyymm}: ${problems.length} wrestler(s) could not be mapped; nothing written:`)
    for (const problem of problems) console.error(`  - ${problem}`)
    return 2
  }
  const path = await writeArchive(outDir, archive)
  console.log(`  ${archive.rikishi.length} wrestlers → ${path}`)
  return 0
}

async function main(): Promise<number> {
  if (positionals.length === 0) {
    console.error(
      'Usage: tsx scripts/backfill-archive.ts <YYYYMM>... [--out-dir <dir>] [--delay <ms>]'
    )
    return 2
  }
  const outDir = resolve(args['out-dir'] as string)
  const delayMs = Number(args.delay)
  let worst = 0
  for (const yyyymm of positionals) {
    try {
      worst = Math.max(worst, await backfill(yyyymm, outDir, delayMs))
    } catch (error) {
      console.error(`${yyyymm}: ${error instanceof Error ? error.message : error}`)
      worst = Math.max(worst, 1)
    }
    await sleep(delayMs)
  }
  const index = await refreshIndex(outDir)
  console.log(`Index: ${index.basho.length} tournaments`)
  return worst
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
