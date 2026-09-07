import { useEffect, useState } from 'react'
import { resultsFileName, validateResults, type ResultsFile } from '../data/results'

const RESULTS_BASE = `${import.meta.env.BASE_URL}results/`
const pending = new Map<number, Promise<ResultsFile | null>>()

/**
 * One tournament's results, once per page. A 404 is the normal state for most
 * of the year (no tournament running), so it is silent; anything else that
 * goes wrong is logged. Failure is cached for the page like the archive.
 */
export function loadResults(bashoId: number): Promise<ResultsFile | null> {
  let promise = pending.get(bashoId)
  if (!promise) {
    promise = fetch(`${RESULTS_BASE}${resultsFileName(bashoId)}`)
      .then(async (response) => {
        if (response.status === 404) return null
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = validateResults((await response.json()) as unknown)
        if (!result.ok) throw new Error(result.error)
        if (result.results.bashoId !== bashoId) {
          throw new Error(`file is for basho ${result.results.bashoId}`)
        }
        return result.results
      })
      .catch((error: unknown) => {
        console.warn(
          `Results for basho ${bashoId} unavailable:`,
          error instanceof Error ? error.message : error
        )
        return null
      })
    pending.set(bashoId, promise)
  }
  return promise
}

export function resetResultsCache(): void {
  pending.clear()
}

export interface ResultsState {
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  results: ResultsFile | null
}

export function useResults(bashoId: number | null): ResultsState {
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

  if (bashoId === null) return { status: 'idle', results: null }
  if (state.bashoId !== bashoId) return { status: 'loading', results: null }
  return { status: state.status, results: state.results }
}
