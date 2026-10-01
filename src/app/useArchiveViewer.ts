import { useEffect, useMemo } from 'react'
import type { BanzukeSet } from '../types/banzuke'
import { banzukeSetFromArchive, type ArchiveIndex, type ArchiveIndexEntry } from '../data/archive'
import { useArchivedBanzuke } from '../hooks/useArchive'
import { clearUrlParam } from '../hooks/useUrlState'

export interface ArchiveViewer {
  /** The archived tournament's rows in the app's model, or null when viewing the live banzuke. */
  data: BanzukeSet | null
  /** The index entry being viewed. */
  entry: ArchiveIndexEntry | null
  loading: boolean
  /** The entries before and after the one on screen; the live banzuke counts as the last. */
  previous: ArchiveIndexEntry | null
  next: ArchiveIndexEntry | null
  /** Stepping off the newest archived tournament returns to the live one. */
  nextIsLive: boolean
}

/**
 * ?basho=<id>: an earlier tournament from the archive, shown by the same views
 * as the live sheet (read-only: no portraits, no promotion flags, no stable
 * dialogs — the archive keeps none of those). The live banzuke's own id, or
 * an id the index lacks, means the live sheet.
 */
export function useArchiveViewer(
  bashoParam: string | null,
  index: ArchiveIndex | null,
  liveBashoId: number | null
): ArchiveViewer {
  const wanted = Number(bashoParam)
  const entry = useMemo(() => {
    if (!index || !Number.isInteger(wanted) || wanted <= 0 || wanted === liveBashoId) return null
    return index.basho.find((b) => b.bashoId === wanted) ?? null
  }, [index, wanted, liveBashoId])
  const state = useArchivedBanzuke(entry)
  const data = useMemo(
    () => (state.archive ? banzukeSetFromArchive(state.archive) : null),
    [state.archive]
  )

  // A ?basho= the index does not know, once the index is here: back to the live sheet.
  useEffect(() => {
    if (bashoParam && index && !entry) clearUrlParam('basho')
  }, [bashoParam, index, entry])

  const position = entry && index ? index.basho.findIndex((b) => b.bashoId === entry.bashoId) : -1
  const previous = position > 0 && index ? index.basho[position - 1] : null
  const after = position >= 0 && index ? (index.basho[position + 1] ?? null) : null
  const nextIsLive = entry !== null && (after === null || after.bashoId === liveBashoId)

  return {
    data: entry ? data : null,
    entry,
    loading: entry !== null && state.status === 'loading',
    previous,
    next: nextIsLive ? null : after,
    nextIsLive,
  }
}
