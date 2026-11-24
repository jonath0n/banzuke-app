import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Departed } from './Departed'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Departure } from '../../utils/diff'
import { makeArchivedRikishi, makeRikishi } from '../../test/fixtures'

const moved: Departure = {
  was: makeArchivedRikishi({
    id: 4,
    shikona: { en: 'Tobizaru', jp: '翔猿' },
    rankCode: 500,
    rankNumber: 16,
  }),
  now: makeRikishi({
    id: 4,
    shikona: { en: 'Tobizaru', jp: '翔猿' },
    rankCode: 600,
    rankLevel: 'juryo',
    rankNumber: 1,
  }),
  nowDivision: 'juryo',
}
const gone: Departure = {
  was: makeArchivedRikishi({
    id: 5,
    shikona: { en: 'Endo', jp: '遠藤' },
    rankCode: 500,
    rankNumber: 17,
  }),
  now: null,
  nowDivision: null,
}
const dropped: Departure = {
  was: makeArchivedRikishi({
    id: 6,
    division: 'juryo',
    shikona: { en: 'Chiyoshoma', jp: '千代翔馬' },
    rankCode: 600,
    rankNumber: 14,
  }),
  now: makeRikishi({
    id: 6,
    shikona: { en: 'Chiyoshoma', jp: '千代翔馬' },
    rankCode: 700,
    rankLevel: 'makushita',
    rankNumber: 3,
  }),
  nowDivision: 'makushita',
}

describe('Departed', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('lists who moved down and who is gone, with their ranks', async () => {
    const onSelect = vi.fn()
    render(
      <LanguageProvider>
        <Departed
          division="makuuchi"
          departures={{ moved: [moved], gone: [gone] }}
          sinceLabel="July 2026"
          onSelectRikishi={onSelect}
        />
      </LanguageProvider>
    )
    expect(
      screen.getByRole('region', { name: 'Left Makuuchi since July 2026' })
    ).toBeInTheDocument()
    const tobizaru = screen.getByRole('button', { name: /Tobizaru/ })
    expect(tobizaru).toHaveTextContent('now J1')
    expect(tobizaru).toHaveAccessibleName(/View details/)
    await userEvent.click(tobizaru)
    expect(onSelect).toHaveBeenCalledWith(moved.now)
    const endo = screen.getByRole('link', { name: /Endo/ })
    expect(endo).toHaveAttribute('href', expect.stringContaining('/profile/5/'))
    expect(endo).toHaveTextContent('was M17')
  })

  it('renders the moved name as plain text without a handler', () => {
    render(
      <LanguageProvider>
        <Departed
          division="makuuchi"
          departures={{ moved: [moved], gone: [] }}
          sinceLabel="July 2026"
        />
      </LanguageProvider>
    )
    expect(screen.queryByRole('button', { name: /Tobizaru/ })).toBeNull()
    expect(screen.getByText('Tobizaru')).toBeInTheDocument()
  })

  it('says so when nobody left', () => {
    render(
      <LanguageProvider>
        <Departed division="juryo" departures={{ moved: [], gone: [] }} sinceLabel="July 2026" />
      </LanguageProvider>
    )
    expect(screen.getByText('Nobody left.')).toBeInTheDocument()
  })

  it('renders in Japanese', () => {
    window.history.replaceState(null, '', '/?lang=jp')
    render(
      <LanguageProvider>
        <Departed
          division="makuuchi"
          departures={{ moved: [], gone: [gone] }}
          sinceLabel="七月場所"
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('region', { name: '七月場所から幕内を離れた力士' })).toBeInTheDocument()
    const endo = screen.getByRole('link', { name: /遠藤/ })
    expect(endo).toHaveTextContent('旧')
  })

  it('groups the moved by the division they are in now, below Juryo too', () => {
    render(
      <LanguageProvider>
        <Departed
          division="juryo"
          departures={{ moved: [dropped], gone: [gone] }}
          sinceLabel="July 2026"
          lowerLoaded
          onSelectRikishi={vi.fn()}
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('heading', { name: 'Now in Makushita' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chiyoshoma/ })).toHaveTextContent('now Ms3')
    expect(screen.getByRole('heading', { name: 'Retired or off the banzuke' })).toBeInTheDocument()
  })
})
