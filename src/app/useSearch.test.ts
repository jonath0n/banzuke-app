import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSearch } from './useSearch'
import { makeBanzukeSet, makeMakushitaBanzuke } from '../test/fixtures'

describe('useSearch', () => {
  const set = makeBanzukeSet({ makushita: makeMakushitaBanzuke() })

  it('counts every loaded division and filters nothing without a query', () => {
    const { result } = renderHook(() => useSearch(set, 'makuuchi', ''))
    expect(result.current.counts).toEqual({ makuuchi: 3, juryo: 2, makushita: 2 })
    expect(result.current.isFiltering).toBe(false)
    expect(result.current.matchedCount).toBe(3)
    expect(result.current.otherDivision).toBeNull()
  })

  it('points to the division below Juryo where the matches are', () => {
    const { result } = renderHook(() => useSearch(set, 'makuuchi', 'Inami'))
    expect(result.current.isFiltering).toBe(true)
    expect(result.current.matchedCount).toBe(0)
    expect(result.current.otherDivision).toBe('makushita')
    expect(result.current.otherHits).toBe(1)
    expect(result.current.matchedByDivision).toEqual({ makuuchi: 0, juryo: 0, makushita: 1 })
  })

  it('finds a lower wrestler by his rank label', () => {
    const { result } = renderHook(() => useSearch(set, 'makushita', 'Ms1'))
    expect(result.current.matchedCount).toBe(2)
  })

  it('offers the division with the most matches', () => {
    // Tatsunami: Hoshoryu in Makuuchi, Izumifuji in Makushita; from Juryo, either will do,
    // and the tie goes to the higher division.
    const { result } = renderHook(() => useSearch(set, 'juryo', 'Tatsunami'))
    expect(result.current.otherDivision).toBe('makuuchi')
  })
})
