import { renderHook, waitFor } from '@testing-library/react'
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
})
