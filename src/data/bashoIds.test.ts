import { describe, expect, it } from 'vitest'
import { bashoIdFor, bashoIdFromSumoApi, bashoYearMonth, sumoApiBashoId } from './bashoIds'

describe('bashoIds', () => {
  // Every pair below is read off a real JSA snapshot in this repo's history.
  it.each([
    [632, 2025, 11],
    [633, 2026, 1],
    [634, 2026, 3],
    [637, 2026, 9],
  ])('maps id %i to %i-%i and back', (id, year, month) => {
    expect(bashoYearMonth(id)).toEqual({ year, month })
    expect(bashoIdFor(year, month)).toBe(id)
  })

  it('fills the gaps between known ids', () => {
    expect(bashoYearMonth(635)).toEqual({ year: 2026, month: 5 })
    expect(bashoYearMonth(636)).toEqual({ year: 2026, month: 7 })
    expect(bashoYearMonth(638)).toEqual({ year: 2026, month: 11 })
    expect(bashoYearMonth(639)).toEqual({ year: 2027, month: 1 })
  })

  it('has no tournament in even months', () => {
    expect(bashoIdFor(2026, 8)).toBeNull()
  })

  it('converts to and from the sumo-api YYYYMM form', () => {
    expect(sumoApiBashoId(636)).toBe('202607')
    expect(sumoApiBashoId(633)).toBe('202601')
    expect(bashoIdFromSumoApi('202607')).toBe(636)
    expect(bashoIdFromSumoApi('2026-07')).toBeNull()
    expect(bashoIdFromSumoApi('202608')).toBeNull()
  })
})
