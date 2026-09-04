import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeRikishi } from '../../test/fixtures'
import { SideCell } from './SideCell'

const rikishi = makeRikishi({
  shikona: { en: 'Test', jp: 'テスト' },
  heya: { id: 1, en: 'Test', jp: 'テスト部屋' },
  promotion: { kind: 'new-to-division', raw: '新入幕' },
})

describe('SideCell', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders rikishi name, avatar and promotion pill', () => {
    render(
      <LanguageProvider>
        <SideCell rikishi={rikishi} side="east" rankLevel="yokozuna" />
      </LanguageProvider>
    )

    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('New')).toHaveAttribute('title', 'New to Makuuchi')
    const img = screen.getByAltText('Portrait of Test from Test stable')
    expect(img).toHaveAttribute('src', expect.stringMatching(/60x60\/20170096\.jpg$/))
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('width', '48')
  })

  it('renders the Japanese name with a lang attribute in Japanese mode', () => {
    window.history.replaceState({}, '', '/?lang=jp')
    render(
      <LanguageProvider>
        <SideCell rikishi={rikishi} side="west" rankLevel="yokozuna" />
      </LanguageProvider>
    )

    expect(screen.getByText('テスト')).toHaveAttribute('lang', 'ja')
    expect(screen.getByText('新入幕')).toBeInTheDocument()
  })

  it('renders a dash for a vacant slot', () => {
    render(
      <LanguageProvider>
        <SideCell rikishi={null} side="west" rankLevel="ozeki" />
      </LanguageProvider>
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
