import { describe, expect, it } from 'vitest'
import {
  filterValidRikishi,
  isValidBanzukePayload,
  isValidBanzukeSnapshot,
  isValidRikishi,
} from './validation'
import type { BanzukePayload, BanzukeSnapshot, Rikishi } from '../types/banzuke'

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

describe('validation helpers', () => {
  it('validates rikishi entries', () => {
    expect(isValidRikishi(baseRikishi)).toBe(true)
    expect(isValidRikishi({ shikona: 'Name' })).toBe(false)
  })

  it('validates banzuke payloads', () => {
    const payload: BanzukePayload = {
      BanzukeTable: [baseRikishi],
      basho_name: 'Hatsu',
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
    }

    expect(isValidBanzukePayload(payload)).toBe(true)
    expect(isValidBanzukePayload({ BanzukeTable: [] })).toBe(false)
  })

  it('validates banzuke snapshots', () => {
    const payload: BanzukePayload = {
      BanzukeTable: [baseRikishi],
      basho_name: 'Hatsu',
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
    }
    const snapshot: BanzukeSnapshot = {
      fetchedAt: '2024-01-01T00:00:00Z',
      sources: { en: 'https://example.com' },
      payloads: { en: payload },
    }

    expect(isValidBanzukeSnapshot(snapshot)).toBe(true)
    expect(isValidBanzukeSnapshot({ payloads: {} })).toBe(false)
  })

  it('filters invalid or empty rikishi entries', () => {
    const rows = [
      baseRikishi,
      { shikona: '', ew: 1 },
      { shikona: '\u2014', ew: 1 },
    ]

    expect(filterValidRikishi(rows)).toHaveLength(1)
  })
})
