import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetResultsCache, useResults } from './useResults'
import { makeResultsFile } from '../test/fixtures'

const json = (body: unknown): Response =>
  ({ ok: true, status: 200, json: vi.fn().mockResolvedValue(body) }) as unknown as Response
const notFound = { ok: false, status: 404 } as Response

describe('useResults', () => {
  beforeEach(() => resetResultsCache())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is idle without a basho, then loads the file once and shares it', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(json(makeResultsFile()))
    vi.stubGlobal('fetch', fetchSpy)
    const { result, rerender } = renderHook(({ id }) => useResults(id), {
      initialProps: { id: null as number | null },
    })
    expect(result.current).toEqual({ status: 'idle', results: null })
    rerender({ id: 637 })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.results?.day).toBe(12)
    renderHook(() => useResults(637))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/results\/637\.json$/)
  })

  it('treats a missing file as unavailable without warning (out of season is normal)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound))
    const { result } = renderHook(() => useResults(637))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(warn).not.toHaveBeenCalled()
  })

  it('refuses a file for another tournament or an invalid one, with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(makeResultsFile({ bashoId: 636 }))))
    const { result } = renderHook(() => useResults(637))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(warn).toHaveBeenCalled()
  })

  describe('live', () => {
    const at = (iso: string) => vi.setSystemTime(new Date(iso))
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('asks again every five minutes in the Tokyo evening and keeps only a newer file', async () => {
      at('2026-11-08T09:00:00Z') // 18:00 JST
      const first = makeResultsFile({ day: 1, fetchedAt: '2026-11-08T08:30:00.000Z' })
      const fetchSpy = vi.fn().mockResolvedValue(json(first))
      vi.stubGlobal('fetch', fetchSpy)
      const { result } = renderHook(() => useResults(637, { live: true }))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(result.current.status).toBe('ready')
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      // Same file again: nothing changes, nothing re-renders into a new object
      const before = result.current.results
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60_000)
      })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      expect(fetchSpy.mock.calls[1][1]).toEqual({ cache: 'no-cache' })
      expect(result.current.results).toBe(before)

      // A newer file replaces it
      const newer = makeResultsFile({ day: 2, fetchedAt: '2026-11-08T09:04:00.000Z' })
      fetchSpy.mockResolvedValue(json(newer))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5 * 60_000)
      })
      expect(result.current.results?.day).toBe(2)
    })

    it('is quiet outside the window and when the tab is hidden, and asks once on return', async () => {
      at('2026-11-08T00:00:00Z') // 09:00 JST
      const fetchSpy = vi.fn().mockResolvedValue(json(makeResultsFile()))
      vi.stubGlobal('fetch', fetchSpy)
      renderHook(() => useResults(637, { live: true }))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30 * 60_000)
      })
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      at('2026-11-08T09:00:00Z') // 18:00 JST, but hidden
      const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10 * 60_000)
      })
      expect(fetchSpy).toHaveBeenCalledTimes(1)

      visibility.mockReturnValue('visible')
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      // Back again within the minute: not asked twice
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it('does nothing when not live', async () => {
      at('2026-11-08T09:00:00Z')
      const fetchSpy = vi.fn().mockResolvedValue(json(makeResultsFile()))
      vi.stubGlobal('fetch', fetchSpy)
      renderHook(() => useResults(637))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60 * 60_000)
      })
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })
})
