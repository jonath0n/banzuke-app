/**
 * The committed archive must be internally consistent: every file validates,
 * the index lists exactly the files present, and the newest entry is the
 * tournament the live snapshot shows (so "changes since last basho" always
 * has a previous to compare against once the next banzuke lands).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveFileName, validateArchive, validateArchiveIndex } from './archive'
import { snapshotBashoId, validateSnapshot } from './schema'

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
    expect(index.index.basho.map((b) => b.file).sort()).toEqual([...files].sort())
  })

  it('has valid archives whose ids match their file names and index entries', () => {
    if (!index.ok) throw new Error(index.error)
    for (const entry of index.index.basho) {
      const result = validateArchive(read(entry.file))
      if (!result.ok) throw new Error(`${entry.file}: ${result.error}`)
      expect(archiveFileName(result.archive.bashoId)).toBe(entry.file)
      expect(result.archive.divisions).toEqual(entry.divisions)
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

  it('is contiguous — no tournament missing between first and last', () => {
    if (!index.ok) throw new Error(index.error)
    const ids = index.index.basho.map((b) => b.bashoId)
    expect(ids).toEqual(ids.map((_, i) => ids[0] + i))
  })
})
