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

  it('keeps the Japanese copy in its own register', () => {
    const texts: string[] = []
    const collect = (value: unknown) => {
      if (typeof value === 'string') texts.push(value)
      else if (typeof value === 'function')
        texts.push(
          String(
            (value as (...a: never[]) => unknown)(3 as never, '前頭五' as never, '大の里' as never)
          )
        )
      else if (value && typeof value === 'object') Object.values(value).forEach(collect)
    }
    collect(STRINGS.jp)
    for (const text of texts) {
      // Half-width punctuation is a tell: Japanese prose uses ： and 、 and 。.
      expect(text, text).not.toMatch(/[^\s\d\w()…·←→©.–-]:\s|[ぁ-んァ-ン一-龥]:/)
      expect(text, text).not.toMatch(/[ぁ-んァ-ン一-龥], /)
      // 番付外 is mae-zumo (unranked), not "left the sheet"; 首位 is league-table talk;
      // 未了 is a form's word for "pending".
      expect(text, text).not.toMatch(/番付外|首位|未了/)
    }
  })

  it('maps languages to lang attributes', () => {
    expect(langAttr('en')).toBe('en')
    expect(langAttr('jp')).toBe('ja')
  })
})
