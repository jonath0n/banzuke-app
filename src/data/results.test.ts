import { describe, expect, it } from 'vitest'
import {
  boutMark,
  describeRecord,
  kachikoshiState,
  leaders,
  playoffFighters,
  resultsEqualIgnoringFetchedAt,
  resultsFileName,
  resultsRegressed,
  scoreLabel,
  validateResults,
  type Fighter,
} from './results'
import { makeBanzuke, makeRecord, makeResultsFile, makeRikishi } from '../test/fixtures'

describe('validateResults', () => {
  it('accepts the fixture', () => {
    expect(validateResults(makeResultsFile())).toEqual({ ok: true, results: makeResultsFile() })
  })

  it.each([
    ['not an object', 42],
    ['wrong version', { ...makeResultsFile(), version: 2 }],
    ['non-integer day', { ...makeResultsFile(), day: 1.5 }],
    ['day above 15', { ...makeResultsFile(), day: 16 }],
    ['unknown division', { ...makeResultsFile(), divisions: ['makushita'] }],
    ['record key not numeric', { ...makeResultsFile(), records: { abc: makeRecord() } }],
    [
      'unknown outcome',
      {
        ...makeResultsFile(),
        records: {
          '1': {
            ...makeRecord(),
            bouts: [{ day: 1, outcome: 'tie', opponent: null, kimarite: '' }],
          },
        },
      },
    ],
    [
      'bout day out of range',
      {
        ...makeResultsFile(),
        records: {
          '1': {
            ...makeRecord(),
            bouts: [{ day: 0, outcome: 'win', opponent: null, kimarite: '' }],
          },
        },
      },
    ],
    ['torikumi key not a day', { ...makeResultsFile(), torikumi: { x: [] } }],
    ['torikumi key with leading zero', { ...makeResultsFile(), torikumi: { '01': [] } }],
    [
      'match without fighters',
      { ...makeResultsFile(), torikumi: { '1': [{ division: 'makuuchi', matchNo: 1 }] } },
    ],
    ['yusho for unknown division', { ...makeResultsFile(), yusho: { makushita: 1 } }],
    ['playoff for unknown division', { ...makeResultsFile(), playoff: { makushita: [] } }],
    ['empty playoff', { ...makeResultsFile(), playoff: { makuuchi: [] } }],
    [
      'undecided playoff bout',
      {
        ...makeResultsFile(),
        playoff: { makuuchi: [{ ...makeResultsFile().torikumi['12'][0] }] },
      },
    ],
    ['sansho of unknown kind', { ...makeResultsFile(), sansho: [{ kind: 'x', rikishiId: 1 }] }],
    ['sansho without an id', { ...makeResultsFile(), sansho: [{ kind: 'kanto' }] }],
  ])('rejects %s', (_label, input) => {
    expect(validateResults(input).ok).toBe(false)
  })

  it('accepts a decided playoff, the sansho and the draw outcomes', () => {
    const decided = makeResultsFile().torikumi['12'][1]
    const file = {
      ...makeResultsFile(),
      records: {
        '1': {
          ...makeRecord(),
          bouts: [
            { day: 1, outcome: 'draw', opponent: null, kimarite: '' },
            { day: 2, outcome: 'injury-draw', opponent: null, kimarite: '' },
          ],
        },
      },
      playoff: { makuuchi: [decided, { ...decided, matchNo: 2 }] },
      sansho: [
        { kind: 'shukun', rikishiId: 4055 },
        { kind: 'kanto', rikishiId: 3983 },
      ],
    }
    expect(validateResults(file)).toEqual({ ok: true, results: file })
  })

  it('names the first problem', () => {
    expect(validateResults({ ...makeResultsFile(), version: 2 })).toEqual({
      ok: false,
      error: 'version must be 1',
    })
  })
})

describe('helpers', () => {
  it('names files by basho id', () => {
    expect(resultsFileName(637)).toBe('637.json')
  })

  it('compares files ignoring fetchedAt', () => {
    const a = makeResultsFile()
    expect(resultsEqualIgnoringFetchedAt(a, { ...a, fetchedAt: 'later' })).toBe(true)
    expect(resultsEqualIgnoringFetchedAt(a, { ...a, day: 13 })).toBe(false)
  })

  it('reads kachi-koshi and make-koshi off the record, counting absences as losses', () => {
    expect(kachikoshiState({ wins: 8, losses: 3, absences: 0 })).toBe('kachikoshi')
    expect(kachikoshiState({ wins: 7, losses: 8, absences: 0 })).toBe('makekoshi')
    expect(kachikoshiState({ wins: 0, losses: 1, absences: 7 })).toBe('makekoshi')
    expect(kachikoshiState({ wins: 7, losses: 7, absences: 0 })).toBe('pending')
    expect(kachikoshiState({ wins: 0, losses: 0, absences: 0 })).toBe('pending')
  })

  it('writes the score in each language', () => {
    expect(scoreLabel({ wins: 8, losses: 3, absences: 0 }, 'en')).toBe('8–3')
    expect(scoreLabel({ wins: 8, losses: 3, absences: 1 }, 'en')).toBe('8–3–1')
    expect(scoreLabel({ wins: 8, losses: 3, absences: 0 }, 'jp')).toBe('8勝3敗')
    expect(scoreLabel({ wins: 8, losses: 3, absences: 1 }, 'jp')).toBe('8勝3敗1休')
  })

  it('describes the record as a sentence', () => {
    expect(describeRecord({ wins: 8, losses: 3, absences: 1 }, 'en')).toBe(
      '8 wins, 3 losses, 1 absence. Kachi-koshi.'
    )
    expect(describeRecord({ wins: 1, losses: 8, absences: 0 }, 'en')).toBe(
      '1 win, 8 losses. Make-koshi.'
    )
    expect(describeRecord({ wins: 7, losses: 7, absences: 0 }, 'en')).toBe('7 wins, 7 losses.')
    expect(describeRecord({ wins: 8, losses: 3, absences: 1 }, 'jp')).toBe('8勝3敗1休、勝ち越し')
    expect(describeRecord({ wins: 7, losses: 7, absences: 0 }, 'jp')).toBe('7勝7敗')
  })

  it('tells a 巴戦 from a two-man playoff by who took part', () => {
    const a: Fighter = { id: 1, shikona: { en: 'A', jp: 'あ' } }
    const b: Fighter = { id: 2, shikona: { en: 'B', jp: 'い' } }
    const c: Fighter = { id: null, shikona: { en: 'C', jp: 'う' } }
    const bout = (east: Fighter, west: Fighter, matchNo: number) => ({
      division: 'makuuchi' as const,
      matchNo,
      east,
      west,
      winnerId: east.id,
      kimarite: '',
    })
    expect(playoffFighters([bout(a, b, 1)])).toHaveLength(2)
    expect(playoffFighters([bout(a, b, 1), bout(a, c, 2), bout(b, c, 3)])).toHaveLength(3)
  })

  it('marks bouts the way a hoshitori does', () => {
    expect(boutMark('win')).toBe('○')
    expect(boutMark('loss')).toBe('●')
    // Squares say no bout was fought
    expect(boutMark('fusen-win')).toBe('□')
    expect(boutMark('fusen-loss')).toBe('■')
    expect(boutMark('absent')).toBe('休')
    expect(boutMark('draw')).toBe('×')
    expect(boutMark('injury-draw')).toBe('△')
  })

  it('lists the leaders in two tiers, ties in banzuke order, ignoring wrestlers without a record', () => {
    const rows = [
      ...makeBanzuke().rikishi, // 3842 (8 wins), 4227 (10), 4055 (3)
      makeRikishi({ id: 9999, shikona: { en: 'Nobody', jp: '無' } }),
    ]
    const result = leaders(makeResultsFile().records, rows)
    expect(result.map((tier) => [tier.wins, tier.rikishi.map((r) => r.id)])).toEqual([
      [10, [4227]],
      [8, [3842]],
    ])
    expect(leaders({}, rows)).toEqual([])
  })
})

describe('resultsRegressed', () => {
  const file = makeResultsFile()
  const firstId = Object.keys(file.records)[0]

  it('is empty when the next file only moves forward', () => {
    expect(resultsRegressed(file, file)).toEqual([])
    const ahead = {
      ...file,
      day: file.day + 1,
      records: {
        ...file.records,
        [firstId]: { ...file.records[firstId], wins: file.records[firstId].wins + 1 },
      },
    }
    expect(resultsRegressed(file, ahead)).toEqual([])
  })

  it('names a day that went backwards', () => {
    expect(resultsRegressed(file, { ...file, day: file.day - 1 })).toEqual([
      `day ${file.day - 1} is behind ${file.day}`,
    ])
  })

  it('names a record that shrank or vanished', () => {
    const shrunk = { ...file.records[firstId], wins: 0, losses: 0, absences: 0 }
    expect(
      resultsRegressed(file, { ...file, records: { ...file.records, [firstId]: shrunk } })
    ).toEqual([
      `record ${firstId} shrank from ${file.records[firstId].wins + file.records[firstId].losses + file.records[firstId].absences} to 0 bouts`,
    ])
    const { [firstId]: _gone, ...rest } = file.records
    expect(resultsRegressed(file, { ...file, records: rest })[0]).toMatch(
      new RegExp(`^record ${firstId} is gone`)
    )
  })

  it('names a decided bout that lost its winner', () => {
    const [day, matches] = Object.entries(file.torikumi).find(([, m]) =>
      m.some((x) => x.winnerId !== null)
    )!
    const undone = matches.map((m) => ({ ...m, winnerId: null }))
    const reasons = resultsRegressed(file, {
      ...file,
      torikumi: { ...file.torikumi, [day]: undone },
    })
    expect(reasons.length).toBe(matches.filter((m) => m.winnerId !== null).length)
    expect(reasons[0]).toMatch(new RegExp(`^day ${day} `))
  })
})
