import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatRankLabel } from './formatting'
import type { RankGroup, Rikishi } from '../types/banzuke'

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

describe('formatting helpers', () => {
  it('formats dates with fallback for invalid values', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date')
    expect(formatDate('2024-01-02')).toContain('2024')
  })

  it('formats datetimes with fallback for invalid values', () => {
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('2024-01-02T10:00:00Z')).toContain('2024')
  })

  it('formats rank labels from rank codes', () => {
    const group: RankGroup = { name: 'Yokozuna', east: baseRikishi, west: null }
    expect(formatRankLabel(group)).toBe('Y')
  })
})
