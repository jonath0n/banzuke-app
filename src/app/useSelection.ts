import { useCallback, useEffect, useMemo } from 'react'
import type { BanzukeSet, Rikishi } from '../types/banzuke'
import type { Stable } from '../data/stables'
import { useStableState } from '../hooks/useStables'
import { clearUrlParam, setUrlParam, setUrlParams } from '../hooks/useUrlState'
import { rosterFor, type StableRoster } from '../utils/stables'

export interface Selection {
  /** Everyone on the banzuke by id: the dialog reads an opponent's rank off it. */
  rankById: Map<number, Rikishi>
  selectedRikishi: Rikishi | null
  neighbours: { previous: Rikishi | null; next: Rikishi | null } | undefined
  selectedHeyaId: number | null
  roster: StableRoster | null
  stable: Stable | null
  stableLoading: boolean
  onStep: (rikishi: Rikishi) => void
  onSelectStable: (heyaId: number) => void
  onSelectMember: (rikishi: Rikishi) => void
  onCloseStable: () => void
  onCloseWrestler: () => void
  onShowOnBanzuke: (name: string) => void
}

/**
 * The two dialogs, driven by ?rikishi= and ?heya=. One at a time: the
 * wrestler wins when a URL carries both. A link to someone or somewhere the
 * loaded set does not know is cleared. Opening one from the other pushes an
 * entry so Back walks the chain back; stepping and closing replace.
 */
export function useSelection(
  data: BanzukeSet | null,
  selectedId: string | null,
  heyaParam: string | null
): Selection {
  const everyone = useMemo(
    () => (data ? [...data.makuuchi.rikishi, ...(data.juryo?.rikishi ?? [])] : []),
    [data]
  )
  const rankById = useMemo(() => new Map(everyone.map((r) => [r.id, r])), [everyone])

  const selectedRikishi = useMemo(
    () => (selectedId ? (everyone.find((r) => String(r.id) === selectedId) ?? null) : null),
    [everyone, selectedId]
  )

  // Previous and next in banzuke order (East then West at each rank), within
  // the selected wrestler's own division — the walk never crosses the Juryo line.
  const neighbours = useMemo(() => {
    if (!selectedRikishi || !data) return undefined
    const rows = data.makuuchi.rikishi.includes(selectedRikishi)
      ? data.makuuchi.rikishi
      : (data.juryo?.rikishi ?? [])
    const i = rows.indexOf(selectedRikishi)
    return { previous: rows[i - 1] ?? null, next: rows[i + 1] ?? null }
  }, [data, selectedRikishi])

  const selectedHeyaId = useMemo(() => {
    if (selectedRikishi || !data) return null
    const id = Number(heyaParam)
    return Number.isInteger(id) && id > 0 ? id : null
  }, [data, heyaParam, selectedRikishi])
  const roster = useMemo(
    () => (data && selectedHeyaId != null ? rosterFor(data, selectedHeyaId) : null),
    [data, selectedHeyaId]
  )
  const { loading: stableLoading, stable } = useStableState(selectedHeyaId)

  useEffect(() => {
    if (selectedId && data && !selectedRikishi) clearUrlParam('rikishi')
  }, [data, selectedId, selectedRikishi])
  useEffect(() => {
    if (selectedHeyaId != null && !roster && !stableLoading && !stable) clearUrlParam('heya')
  }, [selectedHeyaId, roster, stableLoading, stable])

  return {
    rankById,
    selectedRikishi,
    neighbours,
    selectedHeyaId,
    roster,
    stable,
    stableLoading,
    // Stepping replaces the dialog's history entry, so Back still closes it in one step.
    onStep: useCallback((r: Rikishi) => setUrlParam('rikishi', String(r.id), 'replace'), []),
    onSelectStable: useCallback(
      (heyaId: number) => setUrlParams({ rikishi: null, heya: String(heyaId) }, 'push'),
      []
    ),
    onSelectMember: useCallback(
      (r: Rikishi) => setUrlParams({ heya: null, rikishi: String(r.id) }, 'push'),
      []
    ),
    onCloseStable: useCallback(() => clearUrlParam('heya'), []),
    // Undo the pushed entry (or replace a deep link) so Back never reopens it.
    onCloseWrestler: useCallback(() => clearUrlParam('rikishi'), []),
    // The way out to the sheet: the search filters to the stable's members and
    // the dialog's entry becomes the filtered sheet, so one Back undoes both.
    onShowOnBanzuke: useCallback(
      (name: string) => setUrlParams({ heya: null, q: name }, 'replace'),
      []
    ),
  }
}
