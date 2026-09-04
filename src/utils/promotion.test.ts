import { describe, expect, it } from 'vitest'
import { makeRikishi } from '../test/fixtures'
import { describePromotion } from './promotion'

describe('describePromotion', () => {
  it('returns null without a promotion', () => {
    expect(describePromotion(makeRikishi(), 'en')).toBeNull()
  })

  it('uses the official Japanese wording', () => {
    const r = makeRikishi({ promotion: { kind: 'new-to-division', raw: '新入幕' } })
    expect(describePromotion(r, 'jp')).toBe('新入幕')
    expect(describePromotion(r, 'jp', 'short')).toBe('新入幕')
  })

  it('describes each kind in English', () => {
    const newToDivision = makeRikishi({ promotion: { kind: 'new-to-division', raw: '新入幕' } })
    expect(describePromotion(newToDivision, 'en')).toBe('New to Makuuchi')
    expect(describePromotion(newToDivision, 'en', 'short')).toBe('New')

    const returning = makeRikishi({ promotion: { kind: 'returning', raw: '再入幕' } })
    expect(describePromotion(returning, 'en')).toBe('Back in Makuuchi')
    expect(describePromotion(returning, 'en', 'short')).toBe('Back')

    const backAtOzeki = makeRikishi({
      rankName: { en: 'Ozeki', jp: '大関' },
      promotion: { kind: 'returning', raw: '再大関' },
    })
    expect(describePromotion(backAtOzeki, 'en')).toBe('Back at Ozeki')

    const newRank = makeRikishi({
      rankName: { en: 'Komusubi', jp: '小結' },
      promotion: { kind: 'new-rank', raw: '新小結' },
    })
    expect(describePromotion(newRank, 'en')).toBe('New Komusubi')
    expect(describePromotion(newRank, 'en', 'short')).toBe('New Komusubi')
  })

  it('describes entering and returning to Juryo', () => {
    const newJuryo = makeRikishi({
      rankName: { en: 'Juryo #10', jp: '十両十枚目' },
      promotion: { kind: 'new-to-division', raw: '新十両' },
    })
    expect(describePromotion(newJuryo, 'en')).toBe('New to Juryo')
    expect(describePromotion(newJuryo, 'en', 'short')).toBe('New')
    expect(describePromotion(newJuryo, 'jp', 'short')).toBe('新十両')

    const backInJuryo = makeRikishi({
      rankName: { en: 'Juryo #10', jp: '十両十枚目' },
      promotion: { kind: 'returning', raw: '再十両' },
    })
    expect(describePromotion(backInJuryo, 'en')).toBe('Back in Juryo')
    expect(describePromotion(backInJuryo, 'en', 'short')).toBe('Back')
  })
})
