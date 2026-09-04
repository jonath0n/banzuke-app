import { describe, expect, it } from 'vitest'
import { STRINGS, langAttr } from './strings'

function shape(value: unknown): unknown {
  if (typeof value === 'function') return 'fn'
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shape(v)])
    )
  }
  return typeof value
}

describe('STRINGS', () => {
  it('has the same keys and value kinds in both languages', () => {
    expect(shape(STRINGS.jp)).toEqual(shape(STRINGS.en))
  })

  it('has no empty strings', () => {
    for (const table of Object.values(STRINGS)) {
      for (const [key, value] of Object.entries(table)) {
        if (typeof value === 'string') expect(value.trim(), key).not.toBe('')
      }
    }
  })

  it('formats counts and days in both languages', () => {
    expect(STRINGS.en.searchCount(3, 42)).toBe('3 of 42 wrestlers')
    expect(STRINGS.jp.searchCount(3, 42)).toBe('42人中 3人')
    expect(STRINGS.en.statusUpcoming(8)).toBe('Starts in 8 days')
    expect(STRINGS.jp.statusUpcoming(8)).toBe('初日まであと8日')
    expect(STRINGS.jp.statusLive(8)).toBe('8日目')
  })

  it('maps languages to lang attributes', () => {
    expect(langAttr('en')).toBe('en')
    expect(langAttr('jp')).toBe('ja')
  })
})
