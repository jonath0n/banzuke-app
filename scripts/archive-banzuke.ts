/**
 * Adds the tournament in a JSA snapshot to the banzuke archive.
 *
 * Usage:
 *   tsx scripts/archive-banzuke.ts [--snapshot <path>] [--out-dir <dir>]
 *
 * Writes <out-dir>/<bashoId>.json (overwriting a previous copy of the same
 * tournament — the JSA occasionally corrects a banzuke) and rebuilds
 * <out-dir>/index.json from every archive present.
 *
 * Exit codes: 0 success, 2 the snapshot did not validate.
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { archiveFromBanzukeSet } from '../src/data/archive.ts'
import { normalizeSnapshot } from '../src/data/normalize.ts'
import { validateSnapshot } from '../src/data/schema.ts'
import { refreshIndex, writeArchive } from './lib/archive-io.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
  },
})

async function main(): Promise<number> {
  const snapshotPath = resolve(args.snapshot as string)
  const outDir = resolve(args['out-dir'] as string)

  const parsed: unknown = JSON.parse(await readFile(snapshotPath, 'utf8'))
  const result = validateSnapshot(parsed)
  if (!result.ok) {
    console.error(`${snapshotPath} is invalid:`)
    for (const error of result.errors) console.error(`  - ${error}`)
    return 2
  }

  const archive = archiveFromBanzukeSet(normalizeSnapshot(result.snapshot, 'live'))
  const path = await writeArchive(outDir, archive)
  console.log(
    `Archived basho ${archive.bashoId} (${archive.year}-${String(archive.month).padStart(2, '0')}): ${archive.rikishi.length} wrestlers, ${archive.divisions.join('+')} → ${path}`
  )
  const index = await refreshIndex(outDir)
  console.log(
    `Index: ${index.basho.length} tournaments (${index.basho[0]?.bashoId}…${index.basho.at(-1)?.bashoId})`
  )
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
