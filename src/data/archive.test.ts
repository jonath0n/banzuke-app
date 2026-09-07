import { describe, expect, it } from 'vitest'
import {
  archiveFileName,
  archiveFromBanzukeSet,
  buildIndex,
  previousEntry,
  validateArchive,
  validateArchiveIndex,
} from './archive'
import { makeArchivedBanzuke, makeArchiveIndex, makeBanzukeSet } from '../test/fixtures'

describe('archiveFromBanzukeSet', () => {
  it('flattens both divisions in banzuke order with ring names only', () => {
    const archive = archiveFromBanzukeSet(makeBanzukeSet())
    expect(archive.version).toBe(1)
    expect(archive.source).toBe('jsa')
    expect(archive.bashoId).toBe(637)
    expect(archive.year).toBe(2026)
    expect(archive.month).toBe(9)
    expect(archive.startDate).toBe('2026-09-13')
    expect(archive.divisions).toEqual(['makuuchi', 'juryo'])
    expect(
      archive.rikishi.map((r) => [r.id, r.division, r.rankCode, r.rankNumber, r.side])
    ).toEqual([
      [3842, 'makuuchi', 100, 1, 'east'],
      [4227, 'makuuchi', 100, 1, 'west'],
      [4055, 'makuuchi', 500, 1, 'east'],
      [3983, 'juryo', 600, 1, 'east'],
      [4232, 'juryo', 600, 1, 'west'],
    ])
    expect(archive.rikishi[0].heya).toEqual({ en: 'Tatsunami', jp: '立浪' })
    expect(archive.rikishi[0].pref).toEqual({ en: 'Mongolia', jp: 'モンゴル' })
    expect(validateArchive(archive).ok).toBe(true)
  })

  it('records only the divisions the set carries', () => {
    const archive = archiveFromBanzukeSet(makeBanzukeSet({ juryo: null }))
    expect(archive.divisions).toEqual(['makuuchi'])
    expect(archive.rikishi.every((r) => r.division === 'makuuchi')).toBe(true)
  })

  it('refuses a snapshot whose dates disagree with the id arithmetic', () => {
    const set = makeBanzukeSet()
    set.makuuchi.basho = { ...set.makuuchi.basho, month: 11 }
    expect(() => archiveFromBanzukeSet(set)).toThrow(/637.*2026-9.*2026-11/)
  })
})

describe('validateArchive', () => {
  it('accepts the fixture', () => {
    expect(validateArchive(makeArchivedBanzuke())).toEqual({
      ok: true,
      archive: makeArchivedBanzuke(),
    })
  })

  it.each([
    ['not an object', 'nope'],
    ['wrong version', { ...makeArchivedBanzuke(), version: 2 }],
    ['non-numeric bashoId', { ...makeArchivedBanzuke(), bashoId: '636' }],
    ['bad startDate', { ...makeArchivedBanzuke(), startDate: '12/07/2026' }],
    ['unknown source', { ...makeArchivedBanzuke(), source: 'wiki' }],
    ['unknown division listed', { ...makeArchivedBanzuke(), divisions: ['makushita'] }],
    [
      'duplicate id',
      {
        ...makeArchivedBanzuke(),
        rikishi: [makeArchivedBanzuke().rikishi[0], makeArchivedBanzuke().rikishi[0]],
      },
    ],
    [
      'rankCode outside 100–600',
      {
        ...makeArchivedBanzuke(),
        rikishi: [{ ...makeArchivedBanzuke().rikishi[0], rankCode: 700 }],
      },
    ],
    [
      'wrestler in a division the file does not list',
      { ...makeArchivedBanzuke(), divisions: ['makuuchi'] },
    ],
  ])('rejects %s', (_label, input) => {
    expect(validateArchive(input).ok).toBe(false)
  })

  it('names the first problem', () => {
    const result = validateArchive({ ...makeArchivedBanzuke(), version: 2 })
    expect(result).toEqual({ ok: false, error: 'version must be 1' })
  })
})

describe('index', () => {
  it('builds an ascending index with one entry per archive', () => {
    const later = makeArchivedBanzuke()
    const earlier = makeArchivedBanzuke({
      bashoId: 634,
      year: 2026,
      month: 3,
      startDate: '2026-03-08',
    })
    const index = buildIndex([later, earlier], '2026-09-06T00:00:00.000Z')
    expect(index.basho.map((b) => b.bashoId)).toEqual([634, 636])
    expect(index.basho[1]).toEqual({
      bashoId: 636,
      year: 2026,
      month: 7,
      startDate: '2026-07-12',
      file: '636.json',
      source: 'sumo-api',
      divisions: ['makuuchi', 'juryo'],
    })
    expect(validateArchiveIndex(index).ok).toBe(true)
  })

  it('refuses two archives for one tournament', () => {
    expect(() => buildIndex([makeArchivedBanzuke(), makeArchivedBanzuke()], 'x')).toThrow(/636/)
  })

  it('finds the tournament before a given one', () => {
    const index = makeArchiveIndex()
    expect(previousEntry(index, 637)?.bashoId).toBe(636)
    expect(previousEntry(index, 636)?.bashoId).toBe(634)
    expect(previousEntry(index, 634)).toBeNull()
    expect(previousEntry(index, 700)?.bashoId).toBe(636)
  })

  it('names archive files by id', () => {
    expect(archiveFileName(637)).toBe('637.json')
  })

  it('rejects a malformed index', () => {
    expect(validateArchiveIndex({ version: 1, basho: 'x' }).ok).toBe(false)
    expect(validateArchiveIndex({ ...makeArchiveIndex(), basho: [{ bashoId: 1 }] }).ok).toBe(false)
  })
})
