import { useMemo } from 'react'
import type { BanzukeSet, Division } from '../types/banzuke'
import { DIVISIONS } from '../data/schema'
import { divisionsIn } from '../data/divisions'
import { buildSearchIndex, matchingIds } from '../utils/search'

type PerDivision = Partial<Record<Division, number>>

export interface SearchState {
  /** Matching ids in the division on screen, or null when nothing is being filtered. */
  highlight: Set<number> | null
  isFiltering: boolean
  matchedCount: number
  /** Where else the query matches: the division with the most hits, or null. */
  otherDivision: Division | null
  otherHits: number
  /** Wrestlers per loaded division. */
  counts: PerDivision
  matchedByDivision: PerDivision | undefined
}

/** The search runs over every loaded division so the tabs can say where the matches are. */
export function useSearch(data: BanzukeSet | null, division: Division, query: string): SearchState {
  const indexes = useMemo(
    () =>
      data
        ? divisionsIn(data).map(
            (name) => [name, buildSearchIndex(data[name]?.rikishi ?? [])] as const
          )
        : [],
    [data]
  )
  const matches = useMemo(() => {
    const found: Partial<Record<Division, Set<number> | null>> = {}
    for (const [name, index] of indexes) found[name] = matchingIds(index, query)
    return found
  }, [indexes, query])
  const counts = useMemo(() => {
    const result: PerDivision = {}
    if (data) for (const name of divisionsIn(data)) result[name] = data[name]?.rikishi.length
    return result
  }, [data])

  const highlight = matches[division] ?? null
  let otherDivision: Division | null = null
  let otherHits = 0
  for (const name of DIVISIONS) {
    const hits = name === division ? 0 : (matches[name]?.size ?? 0)
    if (hits > otherHits) {
      otherDivision = name
      otherHits = hits
    }
  }
  const matchedByDivision: PerDivision | undefined =
    highlight !== null
      ? Object.fromEntries(
          Object.entries(matches).map(([name, set]) => [name, set?.size ?? undefined])
        )
      : undefined

  return {
    highlight,
    isFiltering: highlight !== null,
    matchedCount: highlight ? highlight.size : (counts[division] ?? 0),
    otherDivision,
    otherHits,
    counts,
    matchedByDivision,
  }
}
