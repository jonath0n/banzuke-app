import { describe, expect, it } from 'vitest'
import {
  compareMovement,
  describeMovement,
  diffBanzuke,
  previousRankLabel,
  rankPosition,
} from './diff'
import { makeArchivedBanzuke, makeArchivedRikishi, makeRikishi } from '../test/fixtures'
import type { Division } from '../types/banzuke'

const M = (id: number, n: number, side: 'east' | 'west' = 'east') =>
  makeRikishi({ id, rankCode: 500, rankLevel: 'maegashira', rankNumber: n, side })
const J = (id: number, n: number, side: 'east' | 'west' = 'east') =>
  makeRikishi({ id, rankCode: 600, rankLevel: 'juryo', rankNumber: n, side })
const withDivision = (rows: ReturnType<typeof makeRikishi>[], division: Division) =>
  rows.map((rikishi) => ({ rikishi, division }))

describe('rankPosition', () => {
  it('orders the ladder Y < O < S < K < M1 < M17 < J1 and ignores sanyaku seats', () => {
    const p = (rankCode: number, rankNumber = 1) => rankPosition({ rankCode, rankNumber })
    expect(p(100)).toBeLessThan(p(200))
    expect(p(200)).toBeLessThan(p(300))
    expect(p(300)).toBeLessThan(p(400))
    expect(p(400)).toBeLessThan(p(500, 1))
    expect(p(500, 1)).toBeLessThan(p(500, 17))
    expect(p(500, 17)).toBeLessThan(p(600, 1))
    expect(p(600, 1)).toBeLessThan(p(600, 14))
  })
})

describe('compareMovement', () => {
  it('reads direction from position only', () => {
    expect(
      compareMovement({ rankCode: 500, rankNumber: 2 }, { rankCode: 500, rankNumber: 5 })
    ).toBe('up')
    expect(
      compareMovement({ rankCode: 500, rankNumber: 5 }, { rankCode: 500, rankNumber: 2 })
    ).toBe('down')
    expect(
      compareMovement({ rankCode: 400, rankNumber: 1 }, { rankCode: 500, rankNumber: 1 })
    ).toBe('up')
    expect(
      compareMovement({ rankCode: 600, rankNumber: 1 }, { rankCode: 500, rankNumber: 17 })
    ).toBe('down')
    expect(
      compareMovement({ rankCode: 200, rankNumber: 1 }, { rankCode: 200, rankNumber: 1 })
    ).toBe('same')
  })
})

describe('diffBanzuke', () => {
  const previous = makeArchivedBanzuke({
    rikishi: [
      makeArchivedRikishi({ id: 1, rankCode: 100, side: 'west' }), // Y west
      makeArchivedRikishi({ id: 2, rankCode: 500, rankNumber: 5 }), // M5
      makeArchivedRikishi({ id: 3, rankCode: 500, rankNumber: 1 }), // M1
      makeArchivedRikishi({ id: 4, rankCode: 500, rankNumber: 16 }), // M16 → will be J
      makeArchivedRikishi({ id: 5, rankCode: 500, rankNumber: 17 }), // M17 → gone
      makeArchivedRikishi({ id: 6, division: 'juryo', rankCode: 600, rankNumber: 2 }), // J2 → M
      makeArchivedRikishi({ id: 7, division: 'juryo', rankCode: 600, rankNumber: 14 }), // J14 → gone
    ],
  })
  const current = [
    ...withDivision(
      [makeRikishi({ id: 1, side: 'east' }), M(2, 2), M(3, 4, 'west'), M(6, 16), M(8, 17)],
      'makuuchi'
    ),
    ...withDivision([J(4, 1), J(9, 14)], 'juryo'),
  ]
  const diff = diffBanzuke(current, previous)

  it('names the previous tournament', () => {
    expect(diff.previousBashoId).toBe(636)
  })

  it('classifies every current wrestler', () => {
    const m = (id: number) => diff.movements.get(id)
    expect(m(1)).toEqual({
      kind: 'same',
      sideChanged: true,
      previous: { division: 'makuuchi', rankCode: 100, rankNumber: 1, seat: 1, side: 'west' },
    })
    expect(m(2)?.kind).toBe('up')
    expect(m(2)?.previous?.rankNumber).toBe(5)
    expect(m(3)?.kind).toBe('down')
    expect(m(6)?.kind).toBe('up')
    expect(m(6)?.previous?.division).toBe('juryo')
    expect(m(4)?.kind).toBe('down')
    expect(m(4)?.previous?.rankNumber).toBe(16)
    expect(m(8)).toEqual({ kind: 'new', previous: null, sideChanged: false })
    expect(m(9)?.kind).toBe('new')
    expect(diff.movements.size).toBe(7)
  })

  it('lists departures per division, split by whether they are still on the sheet', () => {
    expect(diff.byDivision.makuuchi.moved.map((d) => [d.was.id, d.now?.id])).toEqual([[4, 4]])
    expect(diff.byDivision.makuuchi.gone.map((d) => d.was.id)).toEqual([5])
    expect(diff.byDivision.juryo.moved.map((d) => [d.was.id, d.now?.id])).toEqual([[6, 6]])
    expect(diff.byDivision.juryo.gone.map((d) => d.was.id)).toEqual([7])
  })

  it('keeps departures in the previous banzuke order', () => {
    const prev = makeArchivedBanzuke({
      rikishi: [
        makeArchivedRikishi({ id: 21, rankCode: 500, rankNumber: 3 }),
        makeArchivedRikishi({ id: 22, rankCode: 500, rankNumber: 9 }),
      ],
    })
    const d = diffBanzuke([], prev)
    expect(d.byDivision.makuuchi.gone.map((x) => x.was.id)).toEqual([21, 22])
  })
})

describe('labels', () => {
  const prev = {
    division: 'makuuchi' as const,
    rankCode: 500,
    rankNumber: 5,
    seat: 1,
    side: 'east' as const,
  }
  it('names the previous rank briefly in each language', () => {
    expect(previousRankLabel(prev, 'en')).toBe('M5')
    expect(previousRankLabel({ ...prev, rankCode: 400, rankNumber: 1 }, 'en')).toBe('K')
    expect(
      previousRankLabel({ ...prev, division: 'juryo', rankCode: 600, rankNumber: 2 }, 'en')
    ).toBe('J2')
    expect(previousRankLabel(prev, 'jp')).toMatch(/^前頭/)
    expect(previousRankLabel({ ...prev, rankCode: 100, rankNumber: 1 }, 'jp')).toBe('横綱')
  })

  it('describes a movement as a sentence', () => {
    expect(describeMovement({ kind: 'up', previous: prev, sideChanged: false }, 'en')).toBe(
      'Up from M5'
    )
    expect(
      describeMovement(
        { kind: 'down', previous: { ...prev, rankCode: 400 }, sideChanged: false },
        'en'
      )
    ).toBe('Down from K')
    expect(describeMovement({ kind: 'same', previous: prev, sideChanged: false }, 'en')).toBe(
      'Unchanged'
    )
    expect(
      describeMovement(
        { kind: 'same', previous: { ...prev, side: 'west' }, sideChanged: true },
        'en'
      )
    ).toBe('Unchanged, West to East')
    expect(describeMovement({ kind: 'new', previous: null, sideChanged: false }, 'en')).toBe(
      'New to the sheet'
    )
    expect(describeMovement({ kind: 'up', previous: prev, sideChanged: false }, 'jp')).toMatch(
      /^前頭.*から$/
    )
    expect(describeMovement({ kind: 'new', previous: null, sideChanged: false }, 'jp')).toBe(
      '番付外から'
    )
    expect(
      describeMovement(
        { kind: 'same', previous: { ...prev, side: 'west' }, sideChanged: true },
        'jp'
      )
    ).toBe('西から東へ')
  })
})
