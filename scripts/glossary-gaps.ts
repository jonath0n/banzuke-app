/**
 * Lists the ring-name characters the shikona glossary lacks, across the
 * current snapshot and the archive, with one name each appears in. Always
 * exits 0: a gap is a writing task, not a broken build. In GitHub Actions the
 * lines are emitted as workflow warnings so they show on the run summary.
 *
 * Usage: tsx scripts/glossary-gaps.ts [--snapshot <path>] [--archive-dir <dir>]
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { glossaryGaps } from '../src/data/shikona-glossary.ts'
import { validateArchive } from '../src/data/archive.ts'
import { validateSnapshot } from '../src/data/schema.ts'
import { ringName } from '../src/data/normalize.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'archive-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
  },
})

const names = new Map<string, string>() // character → one name carrying it
function add(name: string) {
  for (const ch of name) if (!names.has(ch)) names.set(ch, name)
}

const snapshot = validateSnapshot(JSON.parse(readFileSync(args.snapshot as string, 'utf8')))
if (snapshot.ok) {
  for (const division of Object.values(snapshot.snapshot.divisions)) {
    for (const row of division.payloads.jp.BanzukeTable) add(ringName(row.shikona))
  }
} else {
  console.warn(`Snapshot not read: ${snapshot.errors[0]}`)
}
for (const file of readdirSync(args['archive-dir'] as string).filter((f) =>
  /^\d+\.json$/.test(f)
)) {
  const archive = validateArchive(
    JSON.parse(readFileSync(join(args['archive-dir'] as string, file), 'utf8'))
  )
  if (archive.ok) for (const r of archive.archive.rikishi) add(r.shikona.jp)
}

const gaps = glossaryGaps(names.keys())
if (gaps.length === 0) {
  console.log('Shikona glossary covers every character in the snapshot and the archive.')
} else {
  const prefix = process.env.GITHUB_ACTIONS ? '::warning::' : ''
  for (const ch of gaps) console.log(`${prefix}Shikona glossary lacks: ${ch} (${names.get(ch)})`)
}
