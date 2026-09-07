import { useEffect, useState } from 'react'
import {
  validateArchive,
  validateArchiveIndex,
  type ArchivedBanzuke,
  type ArchiveIndex,
  type ArchiveIndexEntry,
} from '../data/archive'

const ARCHIVE_BASE = `${import.meta.env.BASE_URL}banzuke/`

let indexPending: Promise<ArchiveIndex | null> | null = null
const archivePending = new Map<string, Promise<ArchivedBanzuke | null>>()

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<unknown>
}

/** The archive index, once per page; null when there is no archive. */
export function loadArchiveIndex(): Promise<ArchiveIndex | null> {
  if (!indexPending) {
    indexPending = fetchJson(`${ARCHIVE_BASE}index.json`)
      .then((parsed) => {
        const result = validateArchiveIndex(parsed)
        if (!result.ok) throw new Error(result.error)
        return result.index
      })
      .catch((error: unknown) => {
        console.warn('Banzuke archive unavailable:', error instanceof Error ? error.message : error)
        return null
      })
  }
  return indexPending
}

/** One archived tournament, once per file. */
export function loadArchive(file: string): Promise<ArchivedBanzuke | null> {
  let pending = archivePending.get(file)
  if (!pending) {
    pending = fetchJson(`${ARCHIVE_BASE}${file}`)
      .then((parsed) => {
        const result = validateArchive(parsed)
        if (!result.ok) throw new Error(result.error)
        return result.archive
      })
      .catch((error: unknown) => {
        console.warn(
          `Archived banzuke ${file} unavailable:`,
          error instanceof Error ? error.message : error
        )
        return null
      })
    archivePending.set(file, pending)
  }
  return pending
}

/** Forgets everything loaded so the next call fetches again (tests). */
export function resetArchiveCache(): void {
  indexPending = null
  archivePending.clear()
}

export function useArchiveIndex(): ArchiveIndex | null {
  const [index, setIndex] = useState<ArchiveIndex | null>(null)
  useEffect(() => {
    let cancelled = false
    loadArchiveIndex().then((loaded) => {
      if (!cancelled) setIndex(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return index
}

export interface ArchivedBanzukeState {
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  archive: ArchivedBanzuke | null
}

/** The archive an index entry points at; idle until given an entry. */
export function useArchivedBanzuke(entry: ArchiveIndexEntry | null): ArchivedBanzukeState {
  const file = entry?.file ?? null
  const [state, setState] = useState<ArchivedBanzukeState & { file: string | null }>({
    status: 'idle',
    archive: null,
    file: null,
  })

  useEffect(() => {
    if (!file) return
    let cancelled = false
    loadArchive(file).then((archive) => {
      if (cancelled) return
      setState({ status: archive ? 'ready' : 'unavailable', archive, file })
    })
    return () => {
      cancelled = true
    }
  }, [file])

  if (!file) return { status: 'idle', archive: null }
  if (state.file !== file) return { status: 'loading', archive: null }
  return { status: state.status, archive: state.archive }
}
