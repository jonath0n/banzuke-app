import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetArchiveCache, useArchivedBanzuke, useArchiveIndex } from './useArchive'
import { makeArchivedBanzuke, makeArchiveIndex } from '../test/fixtures'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response
}
const notFound = { ok: false, status: 404, statusText: 'Not Found' } as Response

describe('useArchive', () => {
  beforeEach(() => resetArchiveCache())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads and validates the index once, sharing it between callers', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(makeArchiveIndex()))
    vi.stubGlobal('fetch', fetchSpy)
    const a = renderHook(() => useArchiveIndex())
    const b = renderHook(() => useArchiveIndex())
    await waitFor(() => expect(a.result.current?.basho).toHaveLength(2))
    await waitFor(() => expect(b.result.current?.basho).toHaveLength(2))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/banzuke\/index\.json$/)
  })

  it('treats a missing or invalid index as no archive', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound))
    const { result } = renderHook(() => useArchiveIndex())
    await waitFor(() => expect(console.warn).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })

  it('does nothing without an entry, then loads the named file', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(makeArchivedBanzuke()))
    vi.stubGlobal('fetch', fetchSpy)
    const entry = makeArchiveIndex().basho[1]
    const { result, rerender } = renderHook(({ e }) => useArchivedBanzuke(e), {
      initialProps: { e: null as typeof entry | null },
    })
    expect(result.current).toEqual({ status: 'idle', archive: null })
    expect(fetchSpy).not.toHaveBeenCalled()
    rerender({ e: entry })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.archive?.bashoId).toBe(636)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/banzuke\/636\.json$/)
  })

  it('reports an archive that fails validation as unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ version: 9 })))
    const { result } = renderHook(() => useArchivedBanzuke(makeArchiveIndex().basho[1]))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })
})
