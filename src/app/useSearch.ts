import { useMemo } from 'react'
import type { BanzukeSet, Division } from '../types/banzuke'
import { buildSearchIndex, matchingIds } from '../utils/search'

export interface SearchState {
  /** Matching ids in the division on screen, or null when nothing is being filtered. */
  highlight: Set<number> | null
  isFiltering: boolean
  matchedCount: number
  otherDivision: Division
  otherHits: number
  counts: { makuuchi: number | undefined; juryo: number | undefined }
  matchedByDivision: { makuuchi: number | undefined; juryo: number | undefined } | undefined
}

/** The search runs over both divisions so the tabs can say where the matches are. */
export function useSearch(data: BanzukeSet | null, division: Division, query: string): SearchState {
  const indexes = useMemo(
    () => ({
      makuuchi: buildSearchIndex(data?.makuuchi.rikishi ?? []),
      juryo: buildSearchIndex(data?.juryo?.rikishi ?? []),
    }),
    [data]
  )
  const matches = useMemo(
    () => ({
      makuuchi: matchingIds(indexes.makuuchi, query),
      juryo: data?.juryo ? matchingIds(indexes.juryo, query) : null,
    }),
    [indexes, query, data]
  )
  const counts = useMemo(
    () => ({ makuuchi: data?.makuuchi.rikishi.length, juryo: data?.juryo?.rikishi.length }),
    [data]
  )
  const highlight = matches[division]
  const isFiltering = highlight !== null
  const rows = division === 'juryo' ? data?.juryo?.rikishi : data?.makuuchi.rikishi
  const otherDivision: Division = division === 'makuuchi' ? 'juryo' : 'makuuchi'
  return {
    highlight,
    isFiltering,
    matchedCount: highlight ? highlight.size : (rows?.length ?? 0),
    otherDivision,
    otherHits: matches[otherDivision]?.size ?? 0,
    counts,
    matchedByDivision: isFiltering
      ? { makuuchi: matches.makuuchi?.size, juryo: matches.juryo?.size }
      : undefined,
  }
}
