import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * A query-string parameter as React state.
 *
 * Reads are subscribed to `popstate` (Back/Forward) and to writes made
 * through this hook, so every consumer stays in sync. Writes use
 * `replaceState` by default; pass `'push'` for states the user should be
 * able to leave with the Back button (an open dialog, for example).
 */
type HistoryMode = 'replace' | 'push'

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

function getSearch(): string {
  return window.location.search
}

function getServerSearch(): string {
  return ''
}

function notify() {
  for (const listener of listeners) listener()
}

/**
 * Writes several parameters to the current URL in one history entry, without
 * reloading. A pushed entry is owned by the first key being set (not removed),
 * which is the key `clearUrlParam` later undoes — swapping one dialog for
 * another writes `{ rikishi: null, heya: id }` and Back returns to the first.
 */
export function setUrlParams(params: Record<string, string | null>, mode: HistoryMode = 'replace') {
  const url = new URL(window.location.href)
  for (const [name, value] of Object.entries(params)) {
    if (value == null || value === '') url.searchParams.delete(name)
    else url.searchParams.set(name, value)
  }
  const next = `${url.pathname}${url.search}${url.hash}`
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === current) return
  if (mode === 'push') {
    const names = Object.keys(params)
    const owner = names.find((name) => params[name] != null && params[name] !== '') ?? names[0]
    window.history.pushState({ urlParam: owner }, '', next)
  } else {
    window.history.replaceState(window.history.state, '', next)
  }
  notify()
}

/** Writes a parameter to the current URL without reloading. */
export function setUrlParam(name: string, value: string | null, mode: HistoryMode = 'replace') {
  setUrlParams({ [name]: value }, mode)
}

/**
 * Removes a parameter, undoing a `push` write when that is what created the
 * current entry (so the history stays clean) and replacing otherwise.
 */
export function clearUrlParam(name: string) {
  const state = window.history.state as { urlParam?: string } | null
  if (state?.urlParam === name) {
    // Back is asynchronous: ignore repeat calls until `popstate` lands so two
    // close paths (a close event and a key handler) cannot leave the site.
    if (pendingBack) return
    pendingBack = true
    window.history.back()
    return
  }
  setUrlParam(name, null, 'replace')
}

let pendingBack = false
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    pendingBack = false
  })
}

export function useUrlParam(
  name: string,
  mode: HistoryMode = 'replace'
): [string | null, (value: string | null) => void] {
  const search = useSyncExternalStore(subscribe, getSearch, getServerSearch)
  const value = useMemo(() => new URLSearchParams(search).get(name), [search, name])
  const set = useCallback((next: string | null) => setUrlParam(name, next, mode), [name, mode])
  return [value, set]
}
