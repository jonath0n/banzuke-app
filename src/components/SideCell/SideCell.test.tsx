import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByText('Test · Mongolia')).toHaveAttribute('lang', 'en')
    expect(screen.getByText('New')).toHaveAttribute('title', 'New to Makuuchi')
    const img = screen.getByRole('presentation', { hidden: true })
    expect(img).toHaveAttribute('src', expect.stringMatching(/60x60\/20170096\.jpg$/))
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('width', '48')
    // Not selectable without an onSelect handler
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('is a real button when selectable and fires on click and keyboard', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <LanguageProvider>
        <SideCell rikishi={rikishi} side="west" rankLevel="yokozuna" onSelect={onSelect} />
      </LanguageProvider>
    )

    const button = screen.getByRole('button', { name: 'Test, West. View details' })
    expect(button.tagName).toBe('BUTTON')
    await user.click(button)
    button.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onSelect).toHaveBeenCalledTimes(3)
    expect(onSelect).toHaveBeenCalledWith(rikishi)
  })

  it('renders the Japanese name with a lang attribute in Japanese mode', () => {
    window.history.replaceState({}, '', '/?lang=jp')
    render(
      <LanguageProvider>
        <SideCell rikishi={rikishi} side="west" rankLevel="yokozuna" />
      </LanguageProvider>
    )

    expect(screen.getByText('テスト')).toHaveAttribute('lang', 'ja')
    expect(screen.getByText('テスト部屋 · モンゴル')).toHaveAttribute('lang', 'ja')
    expect(screen.getByText('新入幕')).toBeInTheDocument()
  })

  it('renders a dash for a vacant slot', () => {
    render(
      <LanguageProvider>
        <SideCell rikishi={null} side="west" rankLevel="ozeki" onSelect={vi.fn()} />
      </LanguageProvider>
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
