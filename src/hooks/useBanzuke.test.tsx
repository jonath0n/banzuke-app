import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeBanzuke,
  makeBanzukeSet,
  makeRawDivision,
  makeRawPayload,
  makeRawSnapshot,
  makeRawSnapshotV1,
} from '../test/fixtures'
import { CACHE_KEY, readCachedBanzuke, useBanzuke } from './useBanzuke'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response
}

const notFound = { ok: false, status: 404, statusText: 'Not Found' } as Response

describe('useBanzuke', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads, validates, normalizes and caches the live snapshot', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(makeRawSnapshot()))
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useBanzuke())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.problem).toBeNull()
    expect(result.current.refreshing).toBe(false)
    const data = result.current.data
    expect(data?.makuuchi.source).toBe('live')
    expect(data?.makuuchi.basho.name.en).toBe('September Grand Sumo Tournament')
    expect(data?.makuuchi.rikishi[0].shikona).toEqual({ en: 'Hoshoryu', jp: '豊昇龍' })
    expect(data?.juryo?.rikishi).toHaveLength(28)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/latest-banzuke\.json$/)
    expect(readCachedBanzuke()?.makuuchi.basho.id).toBe(637)
    expect(readCachedBanzuke()?.juryo?.division).toBe('juryo')
  })

  it('still reads a version 1 (makuuchi-only) file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeRawSnapshotV1())))
    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.data?.makuuchi.rikishi).toHaveLength(24)
    expect(result.current.data?.juryo).toBeNull()
  })

  it('shows the saved copy first, then the fresh data', async () => {
    const cached = makeBanzukeSet({
      makuuchi: makeBanzuke({ basho: { ...makeBanzuke().basho, id: 634 } }),
    })
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
    let resolveFetch: (r: Response) => void = () => {}
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve)))
    )

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.data?.makuuchi.basho.id).toBe(634)
    expect(result.current.refreshing).toBe(true)

    resolveFetch(jsonResponse(makeRawSnapshot()))
    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(result.current.data?.makuuchi.basho.id).toBe(637)
    expect(result.current.problem).toBeNull()
  })

  it('keeps the saved copy and flags it stale when the refresh fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    localStorage.setItem(CACHE_KEY, JSON.stringify(makeBanzukeSet({ juryo: null })))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound))

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.refreshing).toBe(false))
    expect(result.current.status).toBe('ready')
    expect(result.current.problem).toBe('stale')
    expect(result.current.data?.makuuchi.basho.id).toBe(637)
    expect(result.current.data?.juryo).toBeNull()
  })

  it('ignores a corrupt or outdated cache entry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(makeRawSnapshot())))

    localStorage.setItem(CACHE_KEY, '{not json')
    expect(readCachedBanzuke()).toBeNull()
    // The pre-division cache shape (a bare Banzuke) is not reused.
    localStorage.setItem(CACHE_KEY, JSON.stringify(makeBanzuke()))
    expect(readCachedBanzuke()).toBeNull()

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.problem).toBeNull()
  })

  it('falls back to sample data when the snapshot is invalid and nothing is cached', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const sample = makeRawSnapshot({
      divisions: {
        makuuchi: makeRawDivision('makuuchi', {
          payloads: {
            en: makeRawPayload('en', 24, { basho_name: 'Sample Basho' }),
            jp: makeRawPayload('jp'),
          },
        }),
      },
    })
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ bad: true }))
      .mockResolvedValueOnce(jsonResponse(sample))
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.data?.makuuchi.source).toBe('sample')
    expect(result.current.data?.makuuchi.basho.name.en).toBe('Sample Basho')
    expect(result.current.problem).toBe('sample')
    expect(warnSpy).toHaveBeenCalled()
    expect(String(fetchSpy.mock.calls[1][0])).toMatch(/sample-data\.json$/)
    expect(readCachedBanzuke()).toBeNull()
  })

  it('reports an error when both sources fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound))

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.data).toBeNull()
    expect(result.current.problem).toBe('unavailable')
  })

  it('does not warn when a request is aborted', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fetchSpy = vi.fn((_: RequestInfo, options?: RequestInit) => {
      return new Promise((_, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchSpy)

    const { unmount } = renderHook(() => useBanzuke())

    unmount()
    await Promise.resolve()

    expect(warnSpy).not.toHaveBeenCalled()
  })
})
