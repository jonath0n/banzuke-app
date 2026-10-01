import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TodayStrip } from './TodayStrip'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzuke, makeResultsFile } from '../../test/fixtures'

describe('TodayStrip', () => {
  const rows = makeBanzuke().rikishi
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-24T10:12:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
    window.history.replaceState(null, '', '/')
  })

  it('says the day, how much of the card is fought, who leads, and how fresh it is', () => {
    render(
      <LanguageProvider>
        <TodayStrip
          results={makeResultsFile()}
          division="makuuchi"
          rows={rows}
          day={12}
          totalDays={15}
        />
      </LanguageProvider>
    )
    const strip = screen.getByRole('complementary', { name: 'Today' })
    expect(strip).toHaveTextContent('Day 12')
    expect(strip).toHaveTextContent('1 of 2 bouts fought')
    expect(strip).toHaveTextContent('Leads: Onosato, 2 losses')
    expect(strip).toHaveTextContent('updated 12 minutes ago')
    expect(screen.getByRole('link', { name: 'Today’s card' })).toHaveAttribute('href', '#bouts')
    expect(strip).toHaveAttribute('data-print', 'hide')
  })

  it('names the special days and reads in Japanese', () => {
    window.history.replaceState(null, '', '/?lang=jp')
    render(
      <LanguageProvider>
        <TodayStrip
          results={makeResultsFile({ day: 15, yusho: { makuuchi: 4227 } })}
          division="makuuchi"
          rows={rows}
          day={15}
          totalDays={15}
        />
      </LanguageProvider>
    )
    const strip = screen.getByRole('complementary', { name: '本日' })
    expect(strip).toHaveTextContent('千秋楽')
    expect(strip).toHaveTextContent('本日の取組は未発表')
    expect(strip).toHaveTextContent('優勝：大の里')
  })

  it('names shonichi and nakabi in English too', () => {
    const { rerender } = render(
      <LanguageProvider>
        <TodayStrip
          results={makeResultsFile()}
          division="makuuchi"
          rows={rows}
          day={1}
          totalDays={15}
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('complementary')).toHaveTextContent('Day 1 · Shonichi')
    rerender(
      <LanguageProvider>
        <TodayStrip
          results={makeResultsFile()}
          division="makuuchi"
          rows={rows}
          day={8}
          totalDays={15}
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('complementary')).toHaveTextContent('Day 8 · Nakabi')
  })
})
