/**
 * Adds the tournament in a JSA snapshot to the banzuke archive.
 *
 * Usage:
 *   tsx scripts/archive-banzuke.ts [--snapshot <path>] [--lower-snapshot <path>] [--out-dir <dir>]
 *
 * Writes <out-dir>/<bashoId>.json (overwriting a previous copy of the same
 * tournament — the JSA occasionally corrects a banzuke), and
 * <out-dir>/<bashoId>-lower.json from the lower-division snapshot when there
 * is one for the same tournament, then rebuilds <out-dir>/index.json from
 * every archive present. A missing, invalid or older lower snapshot is
 * skipped with a warning.
 *
 * Exit codes: 0 success, 2 the snapshot did not validate.
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { archiveFromBanzukeSet } from '../src/data/archive.ts'
import { normalizeLowerSnapshot, normalizeSnapshot } from '../src/data/normalize.ts'
import { LOWER_DIVISIONS, validateLowerSnapshot, validateSnapshot } from '../src/data/schema.ts'
import { refreshIndex, writeArchive } from './lib/archive-io.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'lower-snapshot': { type: 'string', default: resolve(rootDir, 'public/latest-lower.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
  },
})

/** The lower divisions for `bashoId`, or null (with a warning) when there are none to archive. */
async function readLower(path: string, bashoId: number) {
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'))
  } catch {
    console.warn(`No lower-division snapshot at ${path}; archiving the sekitori only.`)
    return null
  }
  const result = validateLowerSnapshot(parsed)
  if (!result.ok) {
    console.warn(`Warning: ${path} is invalid (${result.errors[0]}); not archived.`)
    return null
  }
  const lower = normalizeLowerSnapshot(result.snapshot, bashoId)
  if (!lower) console.warn(`Warning: ${path} is for another tournament; not archived.`)
  return lower
}

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

  const set = normalizeSnapshot(result.snapshot, 'live')
  const archive = archiveFromBanzukeSet(set)
  const path = await writeArchive(outDir, archive)
  console.log(
    `Archived basho ${archive.bashoId} (${archive.year}-${String(archive.month).padStart(2, '0')}): ${archive.rikishi.length} wrestlers, ${archive.divisions.join('+')} → ${path}`
  )

  const lower = await readLower(resolve(args['lower-snapshot'] as string), archive.bashoId)
  if (lower) {
    const lowerArchive = archiveFromBanzukeSet({ ...set, ...lower }, LOWER_DIVISIONS)
    const lowerPath = await writeArchive(outDir, lowerArchive)
    console.log(
      `Archived the lower divisions: ${lowerArchive.rikishi.length} wrestlers, ${lowerArchive.divisions.join('+')} → ${lowerPath}`
    )
  }
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
