/**
 * Derives public/sample-data.json from a live snapshot.
 *
 * The sample is the app's last resort — shown only when the live file fails
 * validation and nothing is cached — so it must be valid on its own and must
 * not be a byte copy of the live file that just failed. It keeps Makuuchi
 * only (enough to render a full sheet; the division tabs hide when Juryo is
 * absent) and rewrites `sources` to say what it is. The Hero already prints
 * "Bundled sample data" when this file is in use.
 *
 * Usage:
 *   tsx scripts/make-sample.ts [--from <path>] [--out <path>]
 *
 * Exit codes: 0 success, 2 the input did not validate.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { snapshotBashoId, validateSnapshot, type RawSnapshot } from '../src/data/schema.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    from: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    out: { type: 'string', default: resolve(rootDir, 'public/sample-data.json') },
  },
})

/** The sample: Makuuchi only, sources relabelled, everything else as fetched. */
export function deriveSample(live: RawSnapshot): RawSnapshot {
  const bashoId = snapshotBashoId(live)
  const { payloads, readings } = live.divisions.makuuchi
  const label = (lang: 'en' | 'jp') =>
    `Bundled sample derived from basho ${bashoId} (${live.divisions.makuuchi.sources[lang]})`
  return {
    version: 2,
    fetchedAt: live.fetchedAt,
    divisions: {
      makuuchi: {
        sources: { en: label('en'), jp: label('jp') },
        payloads,
        ...(readings ? { readings } : {}),
      },
    },
  }
}

async function main(): Promise<number> {
  const fromPath = resolve(args.from as string)
  const outPath = resolve(args.out as string)

  const parsed: unknown = JSON.parse(await readFile(fromPath, 'utf8'))
  const input = validateSnapshot(parsed)
  if (!input.ok) {
    console.error(`${fromPath} is invalid:`)
    for (const error of input.errors) console.error(`  - ${error}`)
    return 2
  }

  const sample = deriveSample(input.snapshot)
  const check = validateSnapshot(sample)
  if (!check.ok) {
    console.error('Derived sample is invalid:')
    for (const error of check.errors) console.error(`  - ${error}`)
    return 2
  }

  await writeFile(outPath, `${JSON.stringify(sample, null, 2)}\n`, 'utf8')
  const rows = sample.divisions.makuuchi.payloads.en.BanzukeTable.length
  console.log(`Wrote ${outPath}: basho ${snapshotBashoId(sample)}, makuuchi only, ${rows} rows`)
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
