import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateRange,
  formatDateTime,
  formatRelativeTime,
  getTournamentStatus,
  jstDayIndex,
  parseJst,
} from './dates'

const basho = { startDate: '2026-09-13', endDate: '2026-09-27' }

describe('parseJst', () => {
  it('reads date-only strings as JST midnight', () => {
    expect(parseJst('2026-09-13')?.toISOString()).toBe('2026-09-12T15:00:00.000Z')
  })

  it('reads naive datetimes as JST', () => {
    expect(parseJst('2026-08-31 06:00:00')?.toISOString()).toBe('2026-08-30T21:00:00.000Z')
    expect(parseJst('2026-08-31T06:00')?.toISOString()).toBe('2026-08-30T21:00:00.000Z')
  })

  it('respects explicit zones and rejects junk', () => {
    expect(parseJst('2026-09-04T00:00:00.000Z')?.toISOString()).toBe('2026-09-04T00:00:00.000Z')
    expect(parseJst('')).toBeNull()
    expect(parseJst(undefined)).toBeNull()
    expect(parseJst('not a date')).toBeNull()
  })
})

describe('formatting in JST regardless of the local time zone', () => {
  it('formats dates', () => {
    expect(formatDate('2026-09-13')).toBe('Sep 13, 2026')
    expect(formatDate('2026-09-13', 'jp')).toBe('2026年9月13日')
    expect(formatDate('')).toBe('')
  })

  it('formats date ranges', () => {
    expect(formatDateRange(basho.startDate, basho.endDate)).toMatch(/^Sep 13\s*[–-]\s*27, 2026$/)
    expect(formatDateRange(basho.startDate, basho.endDate, 'jp')).toMatch(/2026年9月13日.*27日/)
    expect(formatDateRange('2026-09-13', null)).toBe('Sep 13, 2026')
  })

  it('formats datetimes with an explicit JST marker', () => {
    expect(formatDateTime('2026-08-31 06:00:00')).toMatch(/^Aug 31, 2026,? 6:00\sAM JST$/)
    expect(formatDateTime('2026-08-31 06:00:00', 'jp')).toMatch(/^2026年8月31日 6:00 JST$/)
    expect(formatDateTime(undefined)).toBe('')
  })
})

describe('getTournamentStatus', () => {
  it('is upcoming before the first day, counting JST days', () => {
    // 23:59 JST on Sep 12
    expect(getTournamentStatus(basho, new Date('2026-09-12T14:59:00Z'))).toEqual({
      kind: 'upcoming',
      daysUntil: 1,
    })
    expect(getTournamentStatus(basho, new Date('2026-09-01T00:00:00Z'))).toEqual({
      kind: 'upcoming',
      daysUntil: 12,
    })
  })

  it('is live from JST midnight on day 1 through senshuraku', () => {
    expect(getTournamentStatus(basho, new Date('2026-09-12T15:00:00Z'))).toEqual({
      kind: 'live',
      day: 1,
      totalDays: 15,
    })
    expect(getTournamentStatus(basho, new Date('2026-09-20T03:00:00Z'))).toEqual({
      kind: 'live',
      day: 8,
      totalDays: 15,
    })
    // 23:59 JST on Sep 27
    expect(getTournamentStatus(basho, new Date('2026-09-27T14:59:00Z'))).toEqual({
      kind: 'live',
      day: 15,
      totalDays: 15,
    })
  })

  it('is finished after senshuraku', () => {
    expect(getTournamentStatus(basho, new Date('2026-09-27T15:00:00Z'))).toEqual({
      kind: 'finished',
      daysSince: 1,
    })
  })

  it('is unknown for bad dates', () => {
    expect(getTournamentStatus({ startDate: '', endDate: '' })).toEqual({ kind: 'unknown' })
  })
})

describe('jstDayIndex', () => {
  it('rolls over at JST midnight', () => {
    const before = jstDayIndex(new Date('2026-09-12T14:59:59Z'))
    const after = jstDayIndex(new Date('2026-09-12T15:00:00Z'))
    expect(after - before).toBe(1)
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-09-04T12:00:00Z')

  it('picks a sensible unit', () => {
    expect(formatRelativeTime('2026-09-04T11:59:40Z', 'en', now)).toBe('just now')
    expect(formatRelativeTime('2026-09-04T11:30:00Z', 'en', now)).toBe('30 minutes ago')
    expect(formatRelativeTime('2026-09-04T09:00:00Z', 'en', now)).toBe('3 hours ago')
    expect(formatRelativeTime('2026-09-01T12:00:00Z', 'en', now)).toBe('3 days ago')
    expect(formatRelativeTime('2026-06-01T12:00:00Z', 'en', now)).toBe('3 months ago')
    expect(formatRelativeTime('2026-09-04T09:00:00Z', 'jp', now)).toBe('3 時間前')
    expect(formatRelativeTime(null, 'en', now)).toBe('')
  })
})
