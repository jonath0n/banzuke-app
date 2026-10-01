import { describe, expect, it } from 'vitest'
import { makeRawSnapshot } from '../src/test/fixtures'
import { seasonPhase } from './season-gate.mjs'

// The fixture tournament runs 2026-09-13 to 2026-09-27 (basho 637).
const at = (iso: string) => seasonPhase(makeRawSnapshot(), new Date(iso))

describe('seasonPhase', () => {
  it('is out of season until the day before day 1', () => {
    expect(at('2026-09-01T00:00:00+09:00')).toMatchObject({ phase: 'upcoming', inSeason: false })
    expect(at('2026-09-11T23:59:00+09:00')).toMatchObject({ phase: 'upcoming', inSeason: false })
    expect(at('2026-09-12T00:00:00+09:00')).toMatchObject({
      phase: 'upcoming',
      inSeason: true,
      daysUntil: 1,
      day: 0,
    })
  })

  it('counts the days while live, on Tokyo calendar days', () => {
    expect(at('2026-09-13T00:00:00+09:00')).toMatchObject({ phase: 'live', day: 1 })
    // 23:30 UTC on the 12th is already the 13th in Tokyo
    expect(at('2026-09-12T23:30:00Z')).toMatchObject({ phase: 'live', day: 1 })
    expect(at('2026-09-20T18:00:00+09:00')).toMatchObject({ phase: 'live', day: 8 })
    expect(at('2026-09-27T18:00:00+09:00')).toMatchObject({
      phase: 'live',
      day: 15,
      inSeason: true,
    })
  })

  it('stays in season for three days after senshuraku, then is out', () => {
    expect(at('2026-09-30T12:00:00+09:00')).toMatchObject({
      phase: 'finished',
      inSeason: true,
      daysSince: 3,
    })
    expect(at('2026-10-01T12:00:00+09:00')).toMatchObject({ phase: 'out', inSeason: false })
  })

  it('names the tournament both ways', () => {
    expect(at('2026-09-20T18:00:00+09:00')).toMatchObject({ bashoId: 637, yyyymm: '202609' })
  })

  it('refuses a snapshot without dates', () => {
    expect(() => seasonPhase({}, new Date())).toThrow(/BashoInfo/)
  })
})
