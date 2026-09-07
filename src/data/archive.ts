/**
 * The banzuke archive: one small file per tournament under public/banzuke/,
 * plus an index. Written by scripts/archive-banzuke.ts (from the JSA
 * snapshot, every time the data changes) and scripts/backfill-archive.ts
 * (from sumo-api.com, once, for tournaments before this site kept copies).
 * Read by the app to say what changed since the previous banzuke.
 *
 * Free of DOM and React imports so the scripts can share it.
 */
import type { BanzukeSet, Division, Localized, Rikishi, Side } from '../types/banzuke'
import { DIVISIONS } from './schema'
import { bashoYearMonth } from './bashoIds'

export type ArchiveSource = 'jsa' | 'sumo-api'

export interface ArchivedRikishi {
  /** JSA rikishi id (sumo-api's `nskId`). */
  id: number
  /** Ring name only — the given name is stripped. */
  shikona: Localized
  division: Division
  rankCode: number
  rankNumber: number
  seat: number
  side: Side
  /** `jp` may be '' when the source carried no Japanese. */
  heya: Localized | null
  pref: Localized | null
}

export interface ArchivedBanzuke {
  version: 1
  bashoId: number
  year: number
  month: number
  /** YYYY-MM-DD, JST calendar dates. */
  startDate: string
  endDate: string
  source: ArchiveSource
  /** The divisions this file actually carries. */
  divisions: Division[]
  /** Banzuke order: Makuuchi then Juryo, East before West within a position. */
  rikishi: ArchivedRikishi[]
}

export interface ArchiveIndexEntry {
  bashoId: number
  year: number
  month: number
  startDate: string
  file: string
  source: ArchiveSource
  divisions: Division[]
}

export interface ArchiveIndex {
  version: 1
  generatedAt: string
  /** Ascending by bashoId. */
  basho: ArchiveIndexEntry[]
}

const SOURCES: readonly ArchiveSource[] = ['jsa', 'sumo-api']
const RANK_CODES = new Set([100, 200, 300, 400, 500, 600])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLocalized(value: unknown): value is Localized {
  return isRecord(value) && typeof value.en === 'string' && typeof value.jp === 'string'
}

function isDivision(value: unknown): value is Division {
  return (DIVISIONS as readonly string[]).includes(value as string)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

/** The first problem with an archived wrestler, or null. */
function rikishiProblem(row: unknown, divisions: Division[]): string | null {
  if (!isRecord(row)) return 'rikishi entry is not an object'
  if (!isInteger(row.id) || row.id <= 0) return 'id must be a positive integer'
  if (!isLocalized(row.shikona) || row.shikona.en === '') return 'shikona must be localized'
  if (!isDivision(row.division)) return 'division is unknown'
  if (!divisions.includes(row.division)) return `division ${row.division} is not listed`
  if (!isInteger(row.rankCode) || !RANK_CODES.has(row.rankCode)) return 'rankCode is unknown'
  if (!isInteger(row.rankNumber) || row.rankNumber < 1) return 'rankNumber must be ≥ 1'
  if (!isInteger(row.seat) || row.seat < 1) return 'seat must be ≥ 1'
  if (row.side !== 'east' && row.side !== 'west') return 'side must be east or west'
  if (row.heya !== null && !isLocalized(row.heya)) return 'heya must be localized or null'
  if (row.pref !== null && !isLocalized(row.pref)) return 'pref must be localized or null'
  return null
}

export function validateArchive(
  input: unknown
): { ok: true; archive: ArchivedBanzuke } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'archive is not an object' }
  if (input.version !== 1) return { ok: false, error: 'version must be 1' }
  if (!isInteger(input.bashoId) || input.bashoId <= 0) return { ok: false, error: 'bashoId' }
  if (!isInteger(input.year) || !isInteger(input.month)) return { ok: false, error: 'year/month' }
  for (const key of ['startDate', 'endDate'] as const) {
    if (typeof input[key] !== 'string' || !ISO_DATE.test(input[key] as string)) {
      return { ok: false, error: `${key} must be YYYY-MM-DD` }
    }
  }
  if (!SOURCES.includes(input.source as ArchiveSource)) return { ok: false, error: 'source' }
  if (!Array.isArray(input.divisions) || !input.divisions.every(isDivision)) {
    return { ok: false, error: 'divisions must list known divisions' }
  }
  if (!Array.isArray(input.rikishi)) return { ok: false, error: 'rikishi must be an array' }
  const seen = new Set<number>()
  for (const [i, row] of input.rikishi.entries()) {
    const problem = rikishiProblem(row, input.divisions as Division[])
    if (problem) return { ok: false, error: `rikishi[${i}]: ${problem}` }
    const id = (row as ArchivedRikishi).id
    if (seen.has(id)) return { ok: false, error: `rikishi[${i}]: duplicate id ${id}` }
    seen.add(id)
  }
  return { ok: true, archive: input as unknown as ArchivedBanzuke }
}

function entryProblem(entry: unknown): string | null {
  if (!isRecord(entry)) return 'entry is not an object'
  if (!isInteger(entry.bashoId)) return 'bashoId'
  if (!isInteger(entry.year) || !isInteger(entry.month)) return 'year/month'
  if (typeof entry.startDate !== 'string' || !ISO_DATE.test(entry.startDate)) return 'startDate'
  if (typeof entry.file !== 'string' || !/^\d+\.json$/.test(entry.file)) return 'file'
  if (!SOURCES.includes(entry.source as ArchiveSource)) return 'source'
  if (!Array.isArray(entry.divisions) || !entry.divisions.every(isDivision)) return 'divisions'
  return null
}

export function validateArchiveIndex(
  input: unknown
): { ok: true; index: ArchiveIndex } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'index is not an object' }
  if (input.version !== 1) return { ok: false, error: 'version must be 1' }
  if (typeof input.generatedAt !== 'string') return { ok: false, error: 'generatedAt' }
  if (!Array.isArray(input.basho)) return { ok: false, error: 'basho must be an array' }
  let last = -Infinity
  for (const [i, entry] of input.basho.entries()) {
    const problem = entryProblem(entry)
    if (problem) return { ok: false, error: `basho[${i}]: ${problem}` }
    const id = (entry as ArchiveIndexEntry).bashoId
    if (id <= last) return { ok: false, error: `basho[${i}]: not ascending` }
    last = id
  }
  return { ok: true, index: input as unknown as ArchiveIndex }
}

function stripId(value: { id: number } & Localized): Localized {
  return { en: value.en, jp: value.jp }
}

function archiveRikishi(rikishi: Rikishi, division: Division): ArchivedRikishi {
  return {
    id: rikishi.id,
    shikona: { en: rikishi.shikona.en, jp: rikishi.shikona.jp },
    division,
    rankCode: rikishi.rankCode,
    rankNumber: rikishi.rankNumber,
    seat: rikishi.seat,
    side: rikishi.side,
    heya: rikishi.heya.en ? stripId(rikishi.heya) : null,
    pref: rikishi.pref.en ? stripId(rikishi.pref) : null,
  }
}

/** The archive entry for the tournament a normalized set describes. */
export function archiveFromBanzukeSet(set: BanzukeSet): ArchivedBanzuke {
  const { basho } = set.makuuchi
  const { year, month } = bashoYearMonth(basho.id)
  // A cancelled tournament that consumes no id would shift every later label
  // while leaving startDate correct; the snapshot's own year/month catch it.
  if (year !== basho.year || month !== basho.month) {
    throw new Error(
      `basho ${basho.id}: id arithmetic says ${year}-${month} but the snapshot says ${basho.year}-${basho.month}; check ANCHOR in bashoIds.ts`
    )
  }
  const divisions: Division[] = set.juryo ? ['makuuchi', 'juryo'] : ['makuuchi']
  const rikishi = [
    ...set.makuuchi.rikishi.map((r) => archiveRikishi(r, 'makuuchi')),
    ...(set.juryo?.rikishi ?? []).map((r) => archiveRikishi(r, 'juryo')),
  ]
  return {
    version: 1,
    bashoId: basho.id,
    year,
    month,
    startDate: basho.startDate,
    endDate: basho.endDate,
    source: 'jsa',
    divisions,
    rikishi,
  }
}

export function archiveFileName(bashoId: number): string {
  return `${bashoId}.json`
}

export function indexEntry(archive: ArchivedBanzuke): ArchiveIndexEntry {
  return {
    bashoId: archive.bashoId,
    year: archive.year,
    month: archive.month,
    startDate: archive.startDate,
    file: archiveFileName(archive.bashoId),
    source: archive.source,
    divisions: archive.divisions,
  }
}

/** One entry per archive, ascending; two archives for one tournament is a bug. */
export function buildIndex(archives: ArchivedBanzuke[], generatedAt: string): ArchiveIndex {
  const entries = archives.map(indexEntry).sort((a, b) => a.bashoId - b.bashoId)
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].bashoId === entries[i - 1].bashoId) {
      throw new Error(`two archives for basho ${entries[i].bashoId}`)
    }
  }
  return { version: 1, generatedAt, basho: entries }
}

/** The tournament immediately before `bashoId` in the index, or null. */
export function previousEntry(index: ArchiveIndex, bashoId: number): ArchiveIndexEntry | null {
  let found: ArchiveIndexEntry | null = null
  for (const entry of index.basho) {
    if (entry.bashoId < bashoId) found = entry
    else break
  }
  return found
}
