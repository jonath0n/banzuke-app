import { describe, expect, it } from 'vitest'
import { DATA_CACHE, SHELL_PREFIX, staleShellCaches, strategyFor } from './strategy'

const origin = 'https://jonath0n.github.io'
const base = '/banzuke-app/'
const precached = new Set([
  '/banzuke-app/index.html',
  '/banzuke-app/assets/index-abc.js',
  '/banzuke-app/assets/fonts/NotoSerifJP-700-core.woff2',
])
const get = (url: string, extra: Partial<Parameters<typeof strategyFor>[0]> = {}) =>
  strategyFor(
    { url, method: 'GET', mode: 'cors', cache: 'default', ...extra },
    origin,
    base,
    precached
  )

describe('strategyFor', () => {
  it('loads a page network-first and precached assets cache-first', () => {
    expect(get(`${origin}/banzuke-app/`, { mode: 'navigate' })).toBe('network-first')
    expect(get(`${origin}/banzuke-app/?rikishi=1`, { mode: 'navigate' })).toBe('network-first')
    expect(get(`${origin}/banzuke-app/assets/index-abc.js`)).toBe('cache-first')
    expect(get(`${origin}/banzuke-app/assets/fonts/NotoSerifJP-700-core.woff2`)).toBe('cache-first')
  })

  it('serves data stale-while-revalidate, unless the page asked past the cache', () => {
    expect(get(`${origin}/banzuke-app/latest-banzuke.json`)).toBe('stale-while-revalidate')
    expect(get(`${origin}/banzuke-app/results/638.json`)).toBe('stale-while-revalidate')
    expect(get(`${origin}/banzuke-app/results/638.json`, { cache: 'no-cache' })).toBe('network')
  })

  it('leaves other origins, other paths, other methods and the unhashed rest alone', () => {
    expect(get('https://www.sumo.or.jp/img/x.jpg')).toBe('network')
    expect(get(`${origin}/other/`, { mode: 'navigate' })).toBe('network')
    expect(get(`${origin}/banzuke-app/latest-banzuke.json`, { method: 'POST' })).toBe('network')
    expect(get(`${origin}/banzuke-app/og-image.png`)).toBe('network')
    expect(get('not a url')).toBe('network')
  })

  it('names the old shell caches to drop and keeps the data cache', () => {
    expect(
      staleShellCaches(
        [`${SHELL_PREFIX}old`, `${SHELL_PREFIX}new`, DATA_CACHE, 'other'],
        `${SHELL_PREFIX}new`
      )
    ).toEqual([`${SHELL_PREFIX}old`])
  })
})
