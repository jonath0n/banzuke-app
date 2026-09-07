import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Departed } from './Departed'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeArchivedRikishi, makeRikishi } from '../../test/fixtures'

const moved = {
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
}
const gone = {
  was: makeArchivedRikishi({
    id: 5,
    shikona: { en: 'Endo', jp: '遠藤' },
    rankCode: 500,
    rankNumber: 17,
  }),
  now: null,
}

describe('Departed', () => {
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
    await userEvent.click(tobizaru)
    expect(onSelect).toHaveBeenCalledWith(moved.now)
    const endo = screen.getByRole('link', { name: /Endo/ })
    expect(endo).toHaveAttribute('href', expect.stringContaining('/profile/5/'))
    expect(endo).toHaveTextContent('was M17')
  })

  it('says so when nobody left', () => {
    render(
      <LanguageProvider>
        <Departed division="juryo" departures={{ moved: [], gone: [] }} sinceLabel="July 2026" />
      </LanguageProvider>
    )
    expect(screen.getByText('Nobody left.')).toBeInTheDocument()
  })
})
