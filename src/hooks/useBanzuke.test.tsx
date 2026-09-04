import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeRawPayload, makeRawSnapshot } from '../test/fixtures'
import { useBanzuke } from './useBanzuke'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response
}

describe('useBanzuke', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads, validates and normalizes the snapshot', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(makeRawSnapshot()))
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data?.source).toBe('live')
    expect(result.current.data?.basho.name.en).toBe('September Grand Sumo Tournament')
    expect(result.current.data?.rikishi[0].shikona).toEqual({ en: 'Hoshoryu', jp: '豊昇龍' })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/latest-banzuke\.json$/)
  })

  it('falls back to sample data when the snapshot is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const sample = makeRawSnapshot({
      payloads: {
        en: makeRawPayload('en', 24, { basho_name: 'Sample Basho' }),
        jp: makeRawPayload('jp'),
      },
    })
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ bad: true }))
      .mockResolvedValueOnce(jsonResponse(sample))
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.source).toBe('sample')
    expect(result.current.data?.basho.name.en).toBe('Sample Basho')
    expect(result.current.error).toBe('Live data unavailable. Showing bundled sample data.')
    expect(warnSpy).toHaveBeenCalled()
    expect(String(fetchSpy.mock.calls[1][0])).toMatch(/sample-data\.json$/)
  })

  it('reports an error when both sources fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response)
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useBanzuke())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).toMatch(/Could not load the banzuke/)
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
