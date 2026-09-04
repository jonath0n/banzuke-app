import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzuke } from '../../test/fixtures'
import { Hero } from './Hero'

function renderHero(now: string, lang: 'en' | 'jp' = 'en') {
  vi.setSystemTime(new Date(now))
  window.history.replaceState({}, '', `/?lang=${lang}`)
  return render(
    <LanguageProvider>
      <Hero data={makeBanzuke({ fetchedAt: new Date(now).toISOString() })} />
    </LanguageProvider>
  )
}

describe('Hero', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    window.history.replaceState({}, '', '/')
  })

  it('renders the title, the tournament deck and JST dates', () => {
    renderHero('2026-09-01T12:00:00Z')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Grand Sumo Banzuke')
    expect(screen.getByText('September Grand Sumo Tournament')).toBeInTheDocument()
    expect(screen.getByText(/Ryogoku Kokugikan, Tokyo/)).toBeInTheDocument()
    expect(screen.getByText(/Sep 13\s*[–-]\s*27, 2026/)).toBeInTheDocument()
    expect(
      screen.getByText(/Banzuke announced Aug 31, 2026,? 6:00\sAM JST · Data from sumo.or.jp/)
    ).toBeInTheDocument()
  })

  it('shows a countdown before the tournament', () => {
    renderHero('2026-09-01T12:00:00Z')
    expect(screen.getByText('Starts in 12 days')).toBeInTheDocument()
  })

  it('computes the day number during the tournament', () => {
    renderHero('2026-09-20T03:00:00Z')
    expect(screen.getByText('Day 8')).toBeInTheDocument()
  })

  it('marks a finished tournament as completed', () => {
    renderHero('2026-10-05T00:00:00Z')
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('switches names and dates to Japanese', () => {
    renderHero('2026-09-01T12:00:00Z', 'jp')
    expect(screen.getByText('九月場所')).toBeInTheDocument()
    expect(screen.getByText(/両国国技館（東京）/)).toBeInTheDocument()
    expect(screen.getByText(/2026年9月13日/)).toBeInTheDocument()
    expect(screen.getByText('初日まであと12日')).toBeInTheDocument()
    expect(screen.getByText(/番付発表 2026年8月31日/)).toBeInTheDocument()
  })

  it('names the bundled sample data as such', () => {
    vi.setSystemTime(new Date('2026-09-01T12:00:00Z'))
    window.history.replaceState({}, '', '/?lang=en')
    render(
      <LanguageProvider>
        <Hero data={makeBanzuke({ source: 'sample' })} />
      </LanguageProvider>
    )
    expect(screen.getByText(/Bundled sample data/)).toBeInTheDocument()
    expect(screen.queryByText(/checked/)).toBeNull()
  })

  it('renders a placeholder deck without data', () => {
    render(
      <LanguageProvider>
        <Hero data={null} />
      </LanguageProvider>
    )
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/Starts in/)).toBeNull()
  })
})
