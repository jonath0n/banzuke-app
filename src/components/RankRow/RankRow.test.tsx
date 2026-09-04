import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeRikishi } from '../../test/fixtures'
import type { RankGroup } from '../../types/banzuke'
import { RankRow } from './RankRow'

describe('RankRow', () => {
  it('renders East, the rank label and West', () => {
    const group: RankGroup = {
      key: '500-3',
      rankCode: 500,
      rankNumber: 3,
      seat: 1,
      rankLevel: 'maegashira',
      name: { en: 'Maegashira #3', jp: '前頭三枚目' },
      east: makeRikishi({ id: 1, side: 'east', shikona: { en: 'Left', jp: '左' } }),
      west: makeRikishi({ id: 2, side: 'west', shikona: { en: 'Right', jp: '右' } }),
    }
    const { container } = render(
      <LanguageProvider>
        <RankRow group={group} index={3} />
      </LanguageProvider>
    )
    expect(screen.getByText('M3')).toBeInTheDocument()
    expect(screen.getByText('前頭三')).toHaveAttribute('lang', 'ja')
    const cells = container.querySelectorAll('[data-side]')
    expect(cells[0]).toHaveAttribute('data-side', 'east')
    expect(cells[0]).toHaveTextContent('Left')
    expect(cells[1]).toHaveAttribute('data-side', 'west')
    expect(cells[1]).toHaveTextContent('Right')
    expect(container.firstElementChild).toHaveAttribute('data-rank-level', 'maegashira')
  })

  it('shows a dash for a vacancy', () => {
    const group: RankGroup = {
      key: '200-1',
      rankCode: 200,
      rankNumber: 1,
      seat: 1,
      rankLevel: 'ozeki',
      name: { en: 'Ozeki', jp: '大関' },
      east: makeRikishi({ rankCode: 200, rankLevel: 'ozeki' }),
      west: null,
    }
    render(
      <LanguageProvider>
        <RankRow group={group} />
      </LanguageProvider>
    )
    expect(screen.getByText('OZEKI')).toBeInTheDocument()
    expect(screen.getByText('大関')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
