import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeStablesFile } from '../test/fixtures'
import { loadStables, resetStablesCache, useStableState } from './useStables'

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('useStableState', () => {
  beforeEach(() => {
    resetStablesCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads the file once and returns the matching stable', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(makeStablesFile()))
    vi.stubGlobal('fetch', fetchSpy)

    const { result, rerender } = renderHook(({ id }) => useStableState(id), {
      initialProps: { id: 1 as number | null },
    })
    expect(result.current).toEqual({ loading: true, stable: null })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stable?.name.en).toBe('Tatsunami')

    rerender({ id: 2 })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stable).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/stables\.json$/)
  })

  it('is idle for no id', () => {
    vi.stubGlobal('fetch', vi.fn())
    const { result } = renderHook(() => useStableState(null))
    expect(result.current).toEqual({ loading: false, stable: null })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('settles to nothing when the file is missing or invalid', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)))
    await expect(loadStables()).resolves.toEqual({})
    resetStablesCache()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ version: 3 })))
    const { result } = renderHook(() => useStableState(1))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stable).toBeNull()
  })
})
