import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BanzukeSheet } from './BanzukeSheet'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeRikishi } from '../../test/fixtures'
import type { Rikishi } from '../../types/banzuke'

const yokozunaEast = makeRikishi({ id: 1, side: 'east', shikona: { en: 'Onosato', jp: '大の里' } })
const yokozunaWest = makeRikishi({ id: 2, side: 'west', shikona: { en: 'Hoshoryu', jp: '豊昇龍' } })

function maegashira(id: number, side: 'east' | 'west', number: number, en: string): Rikishi {
  return makeRikishi({
    id,
    side,
    number,
    rankCode: 500,
    rankLevel: 'maegashira',
    rankNumber: number,
    rankName: { en: `Maegashira #${number}`, jp: `前頭${number}枚目` },
    shikona: { en, jp: en },
    sortKey: `005${String(number).padStart(7, '0')}00001`,
  } as Partial<Rikishi>)
}

const rows: Rikishi[] = [
  yokozunaEast,
  yokozunaWest,
  maegashira(3, 'east', 1, 'Atamifuji'),
  maegashira(4, 'west', 1, 'Takayasu'),
  maegashira(5, 'east', 2, 'Abi'),
  maegashira(6, 'west', 2, 'Ura'),
]

function renderSheet(props: Partial<Parameters<typeof BanzukeSheet>[0]> = {}) {
  return render(
    <LanguageProvider>
      <BanzukeSheet rows={rows} {...props} />
    </LanguageProvider>
  )
}

describe('BanzukeSheet', () => {
  it('reads each half from its highest rank down, East half first', () => {
    const { container } = renderSheet({ onSelectRikishi: vi.fn() })
    const columns = [...container.querySelectorAll('[data-side]')]

    expect(columns.map((c) => c.getAttribute('data-side'))).toEqual([
      'east',
      'east',
      'east',
      'west',
      'west',
      'west',
    ])
    // Both halves run Yokozuna → Maegashira 2, right to left within the half.
    expect(columns[0]).toHaveAccessibleName(/Onosato, East/)
    expect(columns[2]).toHaveAccessibleName(/Abi/)
    expect(columns[3]).toHaveAccessibleName(/Hoshoryu, West/)
    expect(columns[5]).toHaveAccessibleName(/Ura/)
  })

  it('gives each half a labelled band group so the sides stay distinguishable', () => {
    renderSheet({ onSelectRikishi: vi.fn() })
    expect(screen.getByRole('group', { name: 'East' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'West' })).toBeInTheDocument()
  })

  it('names each column with its rank, which the printed sheet shows by size', () => {
    renderSheet({ onSelectRikishi: vi.fn() })
    expect(
      screen.getByRole('button', { name: 'Onosato, East. Yokozuna. View details' })
    ).toBeInTheDocument()
  })

  it('shrinks the ring name continuously from Yokozuna to the lowest rank', () => {
    const { container } = renderSheet()
    const scale = (name: string) => {
      const column = [...container.querySelectorAll<HTMLElement>('[data-rank-level]')].find((c) =>
        c.textContent?.includes(name)
      )
      return Number(column?.style.getPropertyValue('--col-scale'))
    }
    expect(scale('Onosato')).toBeGreaterThan(scale('Atamifuji'))
    expect(scale('Atamifuji')).toBeGreaterThan(scale('Abi'))
  })

  it('keeps the matched pair whole and dims the partner', () => {
    const { container } = renderSheet({
      onSelectRikishi: vi.fn(),
      highlight: new Set([yokozunaEast.id]),
    })
    const columns = [...container.querySelectorAll('[data-side]')]
    expect(columns).toHaveLength(2)
    expect(columns[0]).not.toHaveAttribute('data-dimmed')
    expect(columns[1]).toHaveAttribute('data-dimmed')
  })

  it('selects a wrestler on click', async () => {
    const user = userEvent.setup()
    const onSelectRikishi = vi.fn()
    renderSheet({ onSelectRikishi })
    await user.click(screen.getByRole('button', { name: /Onosato, East/ }))
    expect(onSelectRikishi).toHaveBeenCalledWith(expect.objectContaining({ id: yokozunaEast.id }))
  })

  it('is not selectable without a handler', () => {
    renderSheet()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
