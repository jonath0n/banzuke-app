import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onosatoProfile } from '../data/profiles.test'
import { loadProfiles, resetProfilesCache, useProfile } from './useProfiles'

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

const file = { version: 1, fetchedAt: '2026-09-04T00:00:00Z', profiles: { '4227': onosatoProfile } }

describe('useProfile', () => {
  beforeEach(() => {
    resetProfilesCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads the file once and returns the matching profile', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(file))
    vi.stubGlobal('fetch', fetchSpy)

    const { result, rerender } = renderHook(({ id }: { id: number | null }) => useProfile(id), {
      initialProps: { id: 4227 },
    })
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current?.heightCm).toBe(190))

    rerender({ id: 1 })
    await waitFor(() => expect(result.current).toBeNull())
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/rikishi-profiles\.json$/)
  })

  it('returns nothing for a null id without fetching', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { result } = renderHook(() => useProfile(null))
    expect(result.current).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('treats a missing or invalid file as no profiles', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ nope: true }, false)))
    await expect(loadProfiles()).resolves.toEqual({})
    expect(warn).toHaveBeenCalledWith('Wrestler profiles unavailable:', 'HTTP 404')

    resetProfilesCache()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ version: 3 })))
    await expect(loadProfiles()).resolves.toEqual({})
  })
})
