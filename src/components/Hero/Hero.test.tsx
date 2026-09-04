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

  it('renders the title, basho and JST dates', () => {
    renderHero('2026-09-01T12:00:00Z')
    expect(screen.getByText('Grand Sumo Banzuke')).toBeInTheDocument()
    expect(screen.getByText('September Grand Sumo Tournament (Makuuchi)')).toBeInTheDocument()
    expect(screen.getByText(/Sep 13\s*[–-]\s*27, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Aug 31, 2026,? 6:00\sAM JST/)).toBeInTheDocument()
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
    expect(screen.getByText('九月場所 (幕内)')).toBeInTheDocument()
    expect(screen.getByText(/2026年9月13日/)).toBeInTheDocument()
  })

  it('renders placeholders without data', () => {
    render(
      <LanguageProvider>
        <Hero data={null} />
      </LanguageProvider>
    )
    expect(screen.getAllByText('—')).toHaveLength(3)
  })
})
