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

    const yokozuna = screen.getByRole('region', { name: /Yokozuna/ })
    expect(within(yokozuna).getByText('Hoshoryu')).toBeInTheDocument()
    expect(within(yokozuna).getByText('Onosato')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: /Ozeki/ })).getByText('—')).toBeInTheDocument()
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
    renderGrid(<BanzukeGrid rows={[]} emptyReason="no-matches" onClearSearch={onClearSearch} />)
    expect(screen.getByRole('status')).toHaveTextContent('No wrestlers match your search.')
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
