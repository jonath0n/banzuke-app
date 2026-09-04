import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzuke, makeRikishi } from '../../test/fixtures'
import { BanzukeGrid, BanzukeGridSkeleton } from './BanzukeGrid'

function renderGrid(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>)
}

describe('BanzukeGrid', () => {
  it('renders one labelled section per rank tier, in banzuke order', () => {
    const rows = [
      ...makeBanzuke().rikishi,
      makeRikishi({
        id: 9,
        side: 'east',
        rankCode: 200,
        rankLevel: 'ozeki',
        rankName: { en: 'Ozeki', jp: '大関' },
        sortKey: '002000000100001',
        shikona: { en: 'Kirishima', jp: '霧島' },
      }),
    ]
    // Put rows in banzuke order (Yokozuna, Ozeki, Maegashira)
    rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    renderGrid(<BanzukeGrid rows={rows} />)

    const headings = screen.getAllByRole('heading', { level: 2 })
    expect(headings.map((h) => h.textContent)).toEqual([
      '横綱Yokozuna',
      '大関Ozeki',
      '前頭Maegashira',
    ])
    // Sanyaku rails already stamp the rank, so only numbered tiers show a band
    expect(headings[0]).toHaveClass('visually-hidden')
    expect(headings[1]).toHaveClass('visually-hidden')
    expect(headings[2]).not.toHaveClass('visually-hidden')

    const yokozuna = screen.getByRole('region', { name: /Yokozuna/ })
    expect(within(yokozuna).getByText('Hoshoryu')).toBeInTheDocument()
    expect(within(yokozuna).getByText('Onosato')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /Ozeki/ })).getByText('—')).toBeInTheDocument()
  })

  it('renders three Ozeki as two rows under one heading', () => {
    const ozeki = {
      rankCode: 200,
      rankLevel: 'ozeki' as const,
      rankName: { en: 'Ozeki', jp: '大関' },
    }
    const rows = [
      makeRikishi({ ...ozeki, id: 3622, side: 'east', shikona: { en: 'Kirishima', jp: '霧島' } }),
      makeRikishi({ ...ozeki, id: 3661, side: 'west', shikona: { en: 'Kotozakura', jp: '琴櫻' } }),
      makeRikishi({
        ...ozeki,
        id: 4230,
        side: 'east',
        seat: 2,
        shikona: { en: 'Aonishiki', jp: '安青錦' },
      }),
    ]
    renderGrid(<BanzukeGrid rows={rows} onSelectRikishi={vi.fn()} />)
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    const names = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual([
      'Kirishima, East. View details',
      'Kotozakura, West. View details',
      'Aonishiki, East. View details',
    ])
    // The vacant West seat beside the third Ozeki is shown as such
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('makes wrestlers selectable buttons', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    renderGrid(<BanzukeGrid rows={makeBanzuke().rikishi} onSelectRikishi={onSelect} />)
    await user.click(screen.getByRole('button', { name: /Onosato/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 4227 }))
  })

  it('explains an empty search and offers to clear it', async () => {
    const user = userEvent.setup()
    const onClearSearch = vi.fn()
    renderGrid(
      <BanzukeGrid
        rows={[]}
        emptyReason="no-matches"
        query=" mongolia "
        onClearSearch={onClearSearch}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent('Nothing on the sheet for “mongolia”.')
    await user.click(screen.getByRole('button', { name: 'Show all wrestlers' }))
    expect(onClearSearch).toHaveBeenCalled()
  })

  it('shows the no-data message by default', () => {
    renderGrid(<BanzukeGrid rows={[]} />)
    expect(screen.getByRole('status')).toHaveTextContent('No rikishi available right now.')
  })

  it('announces loading', () => {
    renderGrid(<BanzukeGridSkeleton />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading the banzuke')
  })
})
