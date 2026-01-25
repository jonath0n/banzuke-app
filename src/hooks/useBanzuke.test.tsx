import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BanzukePayload, BanzukeSnapshot, Rikishi } from '../types/banzuke'
import { useBanzuke } from './useBanzuke'

const baseRikishi: Rikishi = {
  banzuke_name: 'Yokozuna',
  ew: 1,
  banzuke_id: 1,
  kakuzuke_id: '1',
  rikishi_id: 1,
  rikishi_banzuke_id: 1,
  rank: 100,
  rank_new: '',
  seat_order: 1,
  number: 1,
  numberKanji: '1',
  photo: 'sample.jpg',
  pref_id: 1,
  pref_name: 'Tokyo',
  heya_id: 1,
  heya_name: 'Test',
  shikona: 'Test',
}

const createPayload = (name = 'Hatsu'): BanzukePayload => ({
  BanzukeTable: [baseRikishi],
  basho_name: name,
  year_jp: 'Reiwa 6',
  lang: 'en',
  kakuzuke_id: '1',
  page: '1',
  Kakuzuke: 'Makuuchi',
  list_max: 42,
  basho_id: 1,
  BashoInfo: {
    today: '2024-01-01',
    basho_id: 1,
    start_date: '2024-01-14',
    end_date: '2024-01-28',
    year_jp: 'Reiwa 6',
    basho_name: 'Hatsu',
    basho_name_eng: 'Hatsu',
    start_datetime: '2024-01-14T00:00:00Z',
    end_datetime: '2024-01-28T00:00:00Z',
    ticket_advanceselling_start_datetime: '2024-01-01T00:00:00Z',
    ticket_advanceselling_end_datetime: '2024-01-02T00:00:00Z',
    ticket_preselling_datetime: '2024-01-03T00:00:00Z',
    year_eng: '2024',
    JpDate: 'Reiwa 6-01',
    BattleNow: 0,
    banzuke_announcement_datetime: '2023-12-25T00:00:00Z',
    day: '1',
    venue_id: 1,
  },
  Result: 'OK',
})

const createSnapshot = (payload: BanzukePayload): BanzukeSnapshot => ({
  fetchedAt: '2024-01-01T00:00:00Z',
  sources: { en: 'https://example.com' },
  payloads: { en: payload },
})

describe('useBanzuke', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads the snapshot and sets data', async () => {
    const payload = createPayload('Hatsu')
    const snapshot = createSnapshot(payload)
    const response = { ok: true, json: vi.fn().mockResolvedValue(snapshot) } as unknown as Response
    const fetchSpy = vi.fn().mockResolvedValue(response)
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useBanzuke())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.basho_name).toBe('Hatsu')
    expect(result.current.error).toBeNull()
  })

  it('falls back to sample data when snapshot is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const invalidSnapshotResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ bad: true }),
    } as unknown as Response
    const samplePayload = createPayload('Sample Basho')
    const sampleResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(samplePayload),
    } as unknown as Response
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(invalidSnapshotResponse)
      .mockResolvedValueOnce(sampleResponse)
    vi.stubGlobal('fetch', fetchSpy)

    const { result } = renderHook(() => useBanzuke())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.basho_name).toBe('Sample Basho')
    expect(result.current.error).toBe('Live data unavailable. Showing bundled sample data.')
    expect(warnSpy).toHaveBeenCalled()
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
