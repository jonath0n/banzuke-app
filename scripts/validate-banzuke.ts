/**
 * Validates a banzuke snapshot file and prints a short summary.
 *
 * Usage: tsx scripts/validate-banzuke.ts <path>
 * Exit code 0 when valid, 2 when invalid.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  isPlaceholderRow,
  snapshotDivisions,
  validateSnapshot,
  type RawDivisionSnapshot,
} from '../src/data/schema.ts'

async function main(): Promise<number> {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: tsx scripts/validate-banzuke.ts <path>')
    return 2
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(resolve(path), 'utf8'))
  } catch (error) {
    console.error(`Could not read ${path}: ${error instanceof Error ? error.message : error}`)
    return 2
  }

  const result = validateSnapshot(parsed)
  if (!result.ok) {
    console.error(`${path} is invalid:`)
    for (const error of result.errors) console.error(`  - ${error}`)
    return 2
  }

  const { snapshot } = result
  const top = snapshot.divisions.makuuchi.payloads.en
  console.log(`${path} is valid`)
  console.log(`  basho:      ${top.basho_name} (id ${top.basho_id})`)
  console.log(`  dates:      ${top.BashoInfo.start_date} to ${top.BashoInfo.end_date}`)
  for (const division of snapshotDivisions(snapshot)) {
    const en = (snapshot.divisions[division] as RawDivisionSnapshot).payloads.en
    const wrestlers = en.BanzukeTable.filter((row) => !isPlaceholderRow(row)).length
    console.log(`  ${division.padEnd(10)} ${wrestlers} wrestlers (${en.BanzukeTable.length} rows)`)
  }
  console.log(`  fetched at: ${snapshot.fetchedAt}`)
  for (const warning of result.warnings) console.warn(`  warning: ${warning}`)
  return 0
}

main().then((code) => {
  process.exitCode = code
})
