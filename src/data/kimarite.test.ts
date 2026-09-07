import { describe, expect, it } from 'vitest'
import { KIMARITE, kimariteGloss, kimariteLabel } from './kimarite'

describe('kimarite', () => {
  it('covers the eighty-two official techniques and the five non-techniques', () => {
    expect(Object.keys(KIMARITE)).toHaveLength(87 + 2) // + hansoku, fusen
  })
  it('labels in each language and falls back to the romaji', () => {
    expect(kimariteLabel('yorikiri', 'jp')).toBe('寄り切り')
    expect(kimariteLabel('yorikiri', 'en')).toBe('yorikiri')
    expect(kimariteLabel('oshidashi', 'jp')).toBe('押し出し')
    expect(kimariteLabel('fusen', 'jp')).toBe('不戦')
    expect(kimariteLabel('mystery', 'jp')).toBe('mystery')
    expect(kimariteLabel('', 'jp')).toBe('')
  })
  it('glosses known techniques', () => {
    expect(kimariteGloss('hatakikomi')).toBe('slap down')
    expect(kimariteGloss('mystery')).toBeNull()
  })
})
