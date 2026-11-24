import { useEffect, useState } from 'react'
import { validateLowerSnapshot } from '../data/schema'
import { normalizeLowerSnapshot, type LowerSet } from '../data/normalize'

/**
 * The divisions below Juryo live in their own file, `latest-lower.json`,
 * about six times the size of the sekitori snapshot, so the first paint never
 * waits for it: it is fetched when something needs it (a lower tab, a search,
 * a link to a wrestler or stable) or once the page is idle. No localStorage
 * copy — the service worker keeps the file (stale-while-revalidate).
 */
const LOWER_URL = `${import.meta.env.BASE_URL}latest-lower.json`

/** How long after the first paint the file is fetched anyway, so search feels instant. */
export const LOWER_IDLE_MS = 2500

export type LowerStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

export interface LowerState {
  status: LowerStatus
  data: LowerSet | null
}

let pending: Promise<unknown> | null = null

/** The parsed file, once per page; a failure is remembered until a reload. */
function fetchLower(): Promise<unknown> {
  if (!pending) {
    pending = fetch(LOWER_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .catch((error: unknown) => {
        console.warn('Lower divisions unavailable:', error instanceof Error ? error.message : error)
        return null
      })
  }
  return pending
}

/** Validates and normalizes the file for the tournament on screen; null when it does not fit. */
export async function loadLower(bashoId: number): Promise<LowerSet | null> {
  const parsed = await fetchLower()
  if (parsed == null) return null
  const result = validateLowerSnapshot(parsed)
  if (!result.ok) {
    console.warn('Lower divisions failed validation:', result.errors[0])
    return null
  }
  const set = normalizeLowerSnapshot(result.snapshot, bashoId)
  if (!set) console.warn(`Lower divisions are not for basho ${bashoId}; not shown`)
  return set
}

/** Forgets the loaded file so the next call fetches again (tests). */
export function resetLowerCache(): void {
  pending = null
}

/**
 * The lower divisions for the live tournament `bashoId`. Idle until `wanted`
 * turns true (or the idle timer fires, once `bashoId` is known); then loads
 * once and keeps the result.
 */
export function useLowerBanzuke(bashoId: number | null, wanted: boolean): LowerState {
  const [idle, setIdle] = useState(false)
  const [state, setState] = useState<LowerState & { bashoId: number | null }>({
    status: 'idle',
    data: null,
    bashoId: null,
  })

  useEffect(() => {
    if (bashoId === null || idle) return
    const timer = window.setTimeout(() => setIdle(true), LOWER_IDLE_MS)
    return () => window.clearTimeout(timer)
  }, [bashoId, idle])

  const go = bashoId !== null && (wanted || idle)
  useEffect(() => {
    if (!go || bashoId === null) return
    let cancelled = false
    loadLower(bashoId).then((data) => {
      if (!cancelled) setState({ status: data ? 'ready' : 'unavailable', data, bashoId })
    })
    return () => {
      cancelled = true
    }
  }, [go, bashoId])

  if (bashoId === null) return { status: 'idle', data: null }
  if (state.bashoId !== bashoId) return { status: go ? 'loading' : 'idle', data: null }
  return { status: state.status, data: state.data }
}
