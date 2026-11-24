/**
 * The committed archive must be internally consistent: every file validates,
 * the index lists exactly the files present, and the newest entry is the
 * tournament the live snapshot shows (so "changes since last basho" always
 * has a previous to compare against once the next banzuke lands).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  archiveFileName,
  isLowerArchive,
  lowerArchiveFileName,
  validateArchive,
  validateArchiveIndex,
} from './archive'
import {
  lowerSnapshotBashoId,
  snapshotBashoId,
  validateLowerSnapshot,
  validateSnapshot,
} from './schema'

const dir = resolve(__dirname, '../../public/banzuke')
const read = (name: string): unknown => JSON.parse(readFileSync(resolve(dir, name), 'utf8'))

describe('public/banzuke', () => {
  const index = validateArchiveIndex(read('index.json'))
  const files = readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'index.json')

  it('has a valid index', () => {
    expect(index.ok).toBe(true)
  })

  it('lists exactly the archive files present', () => {
    if (!index.ok) throw new Error(index.error)
    const listed = index.index.basho.flatMap((b) =>
      b.lowerFile ? [b.file, b.lowerFile] : [b.file]
    )
    expect(listed.sort()).toEqual([...files].sort())
  })

  it('has valid archives whose ids match their file names and index entries', () => {
    if (!index.ok) throw new Error(index.error)
    for (const entry of index.index.basho) {
      const result = validateArchive(read(entry.file))
      if (!result.ok) throw new Error(`${entry.file}: ${result.error}`)
      expect(archiveFileName(result.archive.bashoId)).toBe(entry.file)
      expect(isLowerArchive(result.archive)).toBe(false)
      let divisions = result.archive.divisions
      if (entry.lowerFile) {
        const lower = validateArchive(read(entry.lowerFile))
        if (!lower.ok) throw new Error(`${entry.lowerFile}: ${lower.error}`)
        expect(lowerArchiveFileName(lower.archive.bashoId)).toBe(entry.lowerFile)
        expect(isLowerArchive(lower.archive)).toBe(true)
        expect(lower.archive.startDate).toBe(entry.startDate)
        expect(lower.archive.rikishi.length).toBeGreaterThanOrEqual(300)
        divisions = [...divisions, ...lower.archive.divisions]
      }
      expect(divisions).toEqual(entry.divisions)
      expect(result.archive.startDate).toBe(entry.startDate)
      expect(result.archive.rikishi.length).toBeGreaterThanOrEqual(40)
      const yearMonth = `${result.archive.year}-${String(result.archive.month).padStart(2, '0')}`
      expect(result.archive.startDate.slice(0, 7)).toBe(yearMonth)
    }
  })

  it('covers the live tournament', () => {
    if (!index.ok) throw new Error(index.error)
    const live = validateSnapshot(read('../latest-banzuke.json'))
    if (!live.ok) throw new Error(live.errors.join('; '))
    const liveId = snapshotBashoId(live.snapshot)
    expect(index.index.basho.at(-1)?.bashoId).toBe(liveId)
  })

  it('archives the live lower divisions when the lower file is for the live tournament', () => {
    if (!index.ok) throw new Error(index.error)
    const live = validateSnapshot(read('../latest-banzuke.json'))
    const lower = validateLowerSnapshot(read('../latest-lower.json'))
    if (!live.ok || !lower.ok) throw new Error('snapshot invalid')
    const liveId = snapshotBashoId(live.snapshot)
    if (lowerSnapshotBashoId(lower.snapshot) !== liveId) return
    expect(index.index.basho.at(-1)?.lowerFile).toBe(lowerArchiveFileName(liveId))
  })

  it('is contiguous — no tournament missing between first and last', () => {
    if (!index.ok) throw new Error(index.error)
    const ids = index.index.basho.map((b) => b.bashoId)
    expect(ids).toEqual(ids.map((_, i) => ids[0] + i))
  })
})
