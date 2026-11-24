/**
 * Validates banzuke snapshot files and prints a short summary of each: the
 * sekitori snapshot (`latest-banzuke.json`) or the lower divisions
 * (`latest-lower.json`), told apart by whether Makuuchi is in it. With both,
 * the lower file must be for the same tournament.
 *
 * Usage: tsx scripts/validate-banzuke.ts <path> [<path> …]
 * Exit code 0 when every file is valid, 2 when one is not.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  isPlaceholderRow,
  lowerSnapshotBashoId,
  snapshotBashoId,
  snapshotDivisions,
  validateLowerSnapshot,
  validateSnapshot,
  type RawDivisionFile,
  type RawDivisionSnapshot,
} from '../src/data/schema.ts'

function isLowerFile(parsed: unknown): boolean {
  if (typeof parsed !== 'object' || parsed === null) return false
  const divisions = (parsed as { divisions?: unknown }).divisions
  return typeof divisions === 'object' && divisions !== null && !('makuuchi' in divisions)
}

function summarize(path: string, snapshot: RawDivisionFile): void {
  const first = snapshotDivisions(snapshot)[0]
  const top = (snapshot.divisions[first] as RawDivisionSnapshot).payloads.en
  console.log(`${path} is valid`)
  console.log(`  basho:      ${top.basho_name} (id ${top.basho_id})`)
  console.log(`  dates:      ${top.BashoInfo.start_date} to ${top.BashoInfo.end_date}`)
  for (const division of snapshotDivisions(snapshot)) {
    const en = (snapshot.divisions[division] as RawDivisionSnapshot).payloads.en
    const wrestlers = en.BanzukeTable.filter((row) => !isPlaceholderRow(row)).length
    console.log(`  ${division.padEnd(10)} ${wrestlers} wrestlers (${en.BanzukeTable.length} rows)`)
  }
  console.log(`  fetched at: ${snapshot.fetchedAt}`)
}

async function main(): Promise<number> {
  const paths = process.argv.slice(2)
  if (paths.length === 0) {
    console.error('Usage: tsx scripts/validate-banzuke.ts <path> [<path> …]')
    return 2
  }

  let sekitoriId: number | null = null
  let lowerId: number | null = null
  for (const path of paths) {
    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(resolve(path), 'utf8'))
    } catch (error) {
      console.error(`Could not read ${path}: ${error instanceof Error ? error.message : error}`)
      return 2
    }

    const result = isLowerFile(parsed) ? validateLowerSnapshot(parsed) : validateSnapshot(parsed)
    if (!result.ok) {
      console.error(`${path} is invalid:`)
      for (const error of result.errors) console.error(`  - ${error}`)
      return 2
    }
    summarize(path, result.snapshot)
    for (const warning of result.warnings) console.warn(`  warning: ${warning}`)
    if ('makuuchi' in result.snapshot.divisions) {
      sekitoriId = snapshotBashoId(result.snapshot as Parameters<typeof snapshotBashoId>[0])
    } else {
      lowerId = lowerSnapshotBashoId(result.snapshot as Parameters<typeof lowerSnapshotBashoId>[0])
    }
  }

  // Not an error: the app hides a lower file for another tournament.
  if (sekitoriId !== null && lowerId !== null && sekitoriId !== lowerId) {
    console.warn(
      `warning: the lower divisions are for basho ${lowerId}, the sekitori for ${sekitoriId}; the app will not show them`
    )
  }
  return 0
}

main().then((code) => {
  process.exitCode = code
})
