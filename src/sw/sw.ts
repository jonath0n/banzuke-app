/// <reference lib="webworker" />
/**
 * The service worker: the shell and fonts precached at install so the site
 * opens offline, data files served from cache while the network refreshes
 * them, and a page load always tried on the network first. Hand-written and
 * small; the decisions live in strategy.ts, which is unit-tested.
 *
 * `__PRECACHE__` and `__VERSION__` are filled in at build time by
 * scripts/lib/vite-plugin-sw.ts from the files Vite emitted.
 */
import { DATA_CACHE, SHELL_PREFIX, staleShellCaches, strategyFor } from './strategy'

declare const __PRECACHE__: string[]
declare const __VERSION__: string
declare const __BASE__: string

const sw = self as unknown as ServiceWorkerGlobalScope
const SHELL_CACHE = `${SHELL_PREFIX}${__VERSION__}`
const PRECACHE = new Set(__PRECACHE__)

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll([...PRECACHE]))
      .then(() => sw.skipWaiting())
  )
})

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(staleShellCaches(names, SHELL_CACHE).map((n) => caches.delete(n)))
      )
      .then(() => sw.clients.claim())
  )
})

async function fromNetworkInto(cacheName: string, request: Request): Promise<Response> {
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    await cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    return await fromNetworkInto(SHELL_CACHE, request)
  } catch {
    const cached = (await caches.match(request)) ?? (await caches.match(`${__BASE__}index.html`))
    if (cached) return cached
    throw new Error('offline and nothing cached')
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  return (await caches.match(request)) ?? fromNetworkInto(SHELL_CACHE, request)
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cached = await caches.match(request)
  const refresh = fromNetworkInto(DATA_CACHE, request).catch(() => undefined)
  if (cached) return cached
  const fresh = await refresh
  if (fresh) return fresh
  throw new Error('offline and nothing cached')
}

sw.addEventListener('fetch', (event) => {
  const { request } = event
  const strategy = strategyFor(
    { url: request.url, method: request.method, mode: request.mode, cache: request.cache },
    sw.location.origin,
    __BASE__,
    PRECACHE
  )
  if (strategy === 'network-first') event.respondWith(networkFirst(request))
  else if (strategy === 'cache-first') event.respondWith(cacheFirst(request))
  else if (strategy === 'stale-while-revalidate') event.respondWith(staleWhileRevalidate(request))
  else if (request.cache === 'no-cache' && request.url.endsWith('.json')) {
    // The page asked past every cache: let it, and keep the answer for next time.
    event.respondWith(fromNetworkInto(DATA_CACHE, request))
  }
})
