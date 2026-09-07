import { describe, expect, it } from 'vitest'
import {
  boutMark,
  describeRecord,
  kachikoshiState,
  leaders,
  resultsEqualIgnoringFetchedAt,
  resultsFileName,
  scoreLabel,
  validateResults,
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
            bouts: [{ day: 1, outcome: 'draw', opponent: null, kimarite: '' }],
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
    [
      'match without fighters',
      { ...makeResultsFile(), torikumi: { '1': [{ division: 'makuuchi', matchNo: 1 }] } },
    ],
    ['yusho for unknown division', { ...makeResultsFile(), yusho: { makushita: 1 } }],
  ])('rejects %s', (_label, input) => {
    expect(validateResults(input).ok).toBe(false)
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

  it('marks bouts the way a hoshitori does', () => {
    expect(boutMark('win')).toBe('○')
    expect(boutMark('fusen-win')).toBe('○')
    expect(boutMark('loss')).toBe('●')
    expect(boutMark('fusen-loss')).toBe('●')
    expect(boutMark('absent')).toBe('休')
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
