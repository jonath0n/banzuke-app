import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { PromotionPill } from './PromotionPill'
import { makeRikishi } from '../../test/fixtures'

const newcomer = {
  promotion: { kind: 'new-to-division' as const, raw: '新入幕' },
  rankName: { en: 'Maegashira #15', jp: '前頭十五枚目' },
}

function wrap(rikishi: Parameters<typeof PromotionPill>[0]['rikishi'], lang = 'en') {
  window.history.replaceState(null, '', `/?lang=${lang}`)
  return render(
    <LanguageProvider>
      <PromotionPill rikishi={rikishi} variant="row" />
    </LanguageProvider>
  ).container
}

describe('PromotionPill', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('shows the short form with the long one as a tooltip', () => {
    wrap(newcomer)
    const pill = screen.getByText('New')
    expect(pill).toHaveAttribute('title', 'New to Makuuchi')
    expect(pill).toHaveAttribute('lang', 'en')
  })

  it('prints the official wording in Japanese', () => {
    wrap(newcomer, 'jp')
    expect(screen.getByText('新入幕')).toHaveAttribute('lang', 'ja')
  })

  it('renders nothing without a promotion', () => {
    expect(wrap({ promotion: null, rankName: newcomer.rankName }).firstElementChild).toBeNull()
  })

  it('marks a kadoban Ozeki in ink when the JSA prints no flag, and never over a flag', () => {
    const ozeki = makeRikishi({ promotion: null, rankName: { en: 'Ozeki', jp: '大関' } })
    const { rerender } = render(
      <LanguageProvider>
        <PromotionPill rikishi={ozeki} variant="row" kadoban />
      </LanguageProvider>
    )
    expect(screen.getByText('Kadoban')).toHaveAttribute(
      'title',
      'Kadoban: an eighth loss drops him from Ozeki'
    )
    rerender(
      <LanguageProvider>
        <PromotionPill
          rikishi={{ ...ozeki, promotion: { kind: 'new-rank', raw: '新大関' } }}
          variant="row"
          kadoban
        />
      </LanguageProvider>
    )
    expect(screen.queryByText('Kadoban')).toBeNull()
    expect(screen.getByText('New Ozeki')).toBeInTheDocument()
  })
})
