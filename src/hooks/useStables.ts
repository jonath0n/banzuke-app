import { useEffect, useState } from 'react'
import { validateStablesFile, type Stable } from '../data/stables'

const STABLES_URL = `${import.meta.env.BASE_URL}stables.json`

type StableMap = Record<string, Stable>

let pending: Promise<StableMap> | null = null

/**
 * Loads the stables file once per page and shares it between callers.
 * Any failure resolves to an empty map: stable details are optional enrichment.
 */
export function loadStables(): Promise<StableMap> {
  if (!pending) {
    pending = fetch(STABLES_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then((parsed) => {
        const result = validateStablesFile(parsed)
        if (!result.ok) throw new Error(result.error)
        return result.file.stables
      })
      .catch((error: unknown) => {
        console.warn('Stable details unavailable:', error instanceof Error ? error.message : error)
        return {}
      })
  }
  return pending
}

/** Forgets the loaded file so the next call fetches again (tests). */
export function resetStablesCache(): void {
  pending = null
}

export interface StableState {
  /** True until the shared file has settled (even to an empty map). */
  loading: boolean
  stable: Stable | null
}

/** The file's entry for a stable, and whether the file is still on its way. */
export function useStableState(id: number | null): StableState {
  const [stables, setStables] = useState<StableMap | null>(null)

  useEffect(() => {
    if (id == null) return
    let cancelled = false
    loadStables().then((map) => {
      if (!cancelled) setStables(map)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (id == null) return { loading: false, stable: null }
  if (!stables) return { loading: true, stable: null }
  return { loading: false, stable: stables[String(id)] ?? null }
}
