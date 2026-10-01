/**
 * What the service worker does with a request, as a pure decision so it can
 * be tested without a worker. DOM-free.
 */
export type Strategy = 'network-first' | 'stale-while-revalidate' | 'cache-first' | 'network'

export interface RequestFacts {
  url: string
  method: string
  /** 'navigate' for a page load. */
  mode: string
  /** The request's cache mode: 'no-cache' is the results re-poll asking past every cache. */
  cache: string
}

/**
 * - A page load is network-first with the cached shell as the fallback, so a
 *   new deploy shows on the next visit and the site still opens offline.
 * - Data files (*.json under the site) are stale-while-revalidate: what is
 *   cached shows at once and the network copy replaces it for next time —
 *   except when the page itself asked past the cache, which goes to the
 *   network and refreshes the copy.
 * - Precached assets (hashed bundles, fonts) are cache-first: their names
 *   change when their bytes do.
 * - Anything else — another origin, a POST, a photo on the JSA CDN — is
 *   left to the browser.
 */
export function strategyFor(
  request: RequestFacts,
  origin: string,
  base: string,
  precached: ReadonlySet<string>
): Strategy {
  if (request.method !== 'GET') return 'network'
  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return 'network'
  }
  if (url.origin !== origin || !url.pathname.startsWith(base)) return 'network'
  if (request.mode === 'navigate') return 'network-first'
  const path = url.pathname + url.search
  if (precached.has(path) || precached.has(url.pathname)) return 'cache-first'
  if (url.pathname.endsWith('.json')) {
    return request.cache === 'no-cache' ? 'network' : 'stale-while-revalidate'
  }
  return 'network'
}

/** The cache a fresh data response goes into, and which old shell caches to drop. */
export const DATA_CACHE = 'banzuke-data'
export const SHELL_PREFIX = 'banzuke-shell-'

export function staleShellCaches(names: readonly string[], current: string): string[] {
  return names.filter((name) => name.startsWith(SHELL_PREFIX) && name !== current)
}
