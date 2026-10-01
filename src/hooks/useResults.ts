import { useEffect, useState } from 'react'
import { resultsFileName, validateResults, type ResultsFile } from '../data/results'
import { jstHour } from '../utils/dates'

const RESULTS_BASE = `${import.meta.env.BASE_URL}results/`
const pending = new Map<number, Promise<ResultsFile | null>>()

/**
 * The evening window, Tokyo time, in which a day's results can land: the
 * last bout ends around 18:00, the pipeline follows within the hour when the
 * watcher is running, and the scheduled runs trail behind it. Nothing moves
 * outside it, so nothing is asked for.
 */
export const POLL_WINDOW_JST: readonly [number, number] = [15, 23]
/** While the window is open and the tab is visible: a conditional GET every five minutes. */
export const POLL_INTERVAL_MS = 5 * 60_000
/** And on returning to the tab, at most once a minute. */
const POLL_MIN_GAP_MS = 60_000

export function inPollWindow(now: Date = new Date()): boolean {
  const hour = jstHour(now)
  return hour >= POLL_WINDOW_JST[0] && hour < POLL_WINDOW_JST[1]
}

async function fetchResults(bashoId: number, init?: RequestInit): Promise<ResultsFile | null> {
  try {
    const response = await fetch(`${RESULTS_BASE}${resultsFileName(bashoId)}`, init)
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = validateResults((await response.json()) as unknown)
    if (!result.ok) throw new Error(result.error)
    if (result.results.bashoId !== bashoId) {
      throw new Error(`file is for basho ${result.results.bashoId}`)
    }
    return result.results
  } catch (error: unknown) {
    console.warn(
      `Results for basho ${bashoId} unavailable:`,
      error instanceof Error ? error.message : error
    )
    return null
  }
}

/**
 * One tournament's results, once per page. A 404 is the normal state for most
 * of the year (no tournament running), so it is silent; anything else that
 * goes wrong is logged. Failure is cached for the page like the archive.
 */
export function loadResults(bashoId: number): Promise<ResultsFile | null> {
  let promise = pending.get(bashoId)
  if (!promise) {
    promise = fetchResults(bashoId)
    pending.set(bashoId, promise)
  }
  return promise
}

/**
 * Asks the server again, past the browser cache (Pages answers a conditional
 * GET with a 304 when nothing changed), and keeps the newer file: a stale
 * edge can still serve the previous one for a few minutes after a deploy.
 */
export async function refreshResults(bashoId: number): Promise<ResultsFile | null> {
  const fresh = await fetchResults(bashoId, { cache: 'no-cache' })
  if (!fresh) return null
  const current = await loadResults(bashoId)
  if (current && current.fetchedAt >= fresh.fetchedAt) return current
  pending.set(bashoId, Promise.resolve(fresh))
  return fresh
}

export function resetResultsCache(): void {
  pending.clear()
}

export interface ResultsState {
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  results: ResultsFile | null
}

export interface ResultsOptions {
  /**
   * The tournament is on: keep asking for the day's results in the Tokyo
   * evening while the tab is visible, and once more when it comes back.
   */
  live?: boolean
}

export function useResults(
  bashoId: number | null,
  { live = false }: ResultsOptions = {}
): ResultsState {
  const [state, setState] = useState<ResultsState & { bashoId: number | null }>({
    status: 'idle',
    results: null,
    bashoId: null,
  })

  useEffect(() => {
    if (bashoId === null) return
    let cancelled = false
    loadResults(bashoId).then((results) => {
      if (cancelled) return
      setState({ status: results ? 'ready' : 'unavailable', results, bashoId })
    })
    return () => {
      cancelled = true
    }
  }, [bashoId])

  useEffect(() => {
    if (bashoId === null || !live) return
    let cancelled = false
    let lastPoll = 0
    const poll = async (onReturn: boolean) => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (!onReturn && !inPollWindow(new Date(now))) return
      if (now - lastPoll < POLL_MIN_GAP_MS) return
      lastPoll = now
      const fresh = await refreshResults(bashoId)
      if (cancelled || !fresh) return
      setState((previous) =>
        previous.bashoId === bashoId &&
        previous.results &&
        previous.results.fetchedAt >= fresh.fetchedAt
          ? previous
          : { status: 'ready', results: fresh, bashoId }
      )
    }
    const timer = setInterval(() => void poll(false), POLL_INTERVAL_MS)
    const onVisibility = () => void poll(true)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [bashoId, live])

  if (bashoId === null) return { status: 'idle', results: null }
  if (state.bashoId !== bashoId) return { status: 'loading', results: null }
  return { status: state.status, results: state.results }
}
