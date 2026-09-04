import { describe, expect, it } from 'vitest'
import { ageOn, formatBirthDate, formatMeasure, formatYearMonth } from './profile'

describe('formatBirthDate', () => {
  it('formats in both languages without time-zone drift', () => {
    expect(formatBirthDate('2000-06-07', 'en')).toBe('June 7, 2000')
    expect(formatBirthDate('2000-06-07', 'jp')).toBe('2000年6月7日')
    expect(formatBirthDate('not-a-date', 'en')).toBe('not-a-date')
  })
})

describe('ageOn', () => {
  it('counts completed years', () => {
    expect(ageOn('2000-06-07', new Date('2026-09-04T00:00:00Z'))).toBe(26)
    expect(ageOn('2000-06-07', new Date('2026-06-06T00:00:00Z'))).toBe(25)
    expect(ageOn('2000-06-07', new Date('2026-06-07T00:00:00Z'))).toBe(26)
    expect(ageOn('bad')).toBeNull()
  })
})

describe('formatYearMonth', () => {
  it('formats a tournament month', () => {
    expect(formatYearMonth('2023-05', 'en')).toBe('May 2023')
    expect(formatYearMonth('2023-05', 'jp')).toBe('2023年5月')
    expect(formatYearMonth('??', 'en')).toBe('??')
  })
})

describe('formatMeasure', () => {
  it('spaces the unit in English only and keeps decimals when present', () => {
    expect(formatMeasure(190, 'cm', 'en')).toBe('190 cm')
    expect(formatMeasure(190, 'cm', 'jp')).toBe('190cm')
    expect(formatMeasure(188.5, 'kg', 'en')).toBe('188.5 kg')
  })
})
