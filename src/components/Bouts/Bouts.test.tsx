import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Bouts } from './Bouts'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzuke, makeJuryoBanzuke, makeResultsFile } from '../../test/fixtures'

describe('Bouts', () => {
  const rows = makeBanzuke().rikishi
  it('lists the day, names the winner and the kimarite, and steps days', async () => {
    const onChangeDay = vi.fn()
    const onSelect = vi.fn()
    render(
      <LanguageProvider>
        <Bouts
          results={makeResultsFile()}
          division="makuuchi"
          rows={rows}
          day={12}
          onChangeDay={onChangeDay}
          onSelectRikishi={onSelect}
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('region', { name: 'Day 12' })).toBeInTheDocument()
    expect(screen.getByText(/Yusho race after day 12/).closest('p')).toHaveTextContent(
      '2 losses Onosato · 4 losses Hoshoryu'
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Not yet fought')
    expect(items[1].querySelector('strong')).toHaveTextContent('Onosato')
    expect(items[1]).toHaveTextContent('yorikiri')
    // The card's own button, not the race line's
    await userEvent.click(within(items[1]).getByRole('button', { name: /Hoshoryu/ }))
    expect(onSelect).toHaveBeenCalledWith(rows[0])
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(onChangeDay).toHaveBeenCalledWith(11)
  })

  it('shows the playoff under senshuraku’s card, named 巴戦 when three fought', () => {
    const bout = (matchNo: number, eastId: number, westId: number, winnerId: number) => ({
      division: 'makuuchi' as const,
      matchNo,
      east: { id: eastId, shikona: rows.find((r) => r.id === eastId)!.shikona },
      west: { id: westId, shikona: rows.find((r) => r.id === westId)!.shikona },
      winnerId,
      kimarite: matchNo === 3 ? 'yorikiri' : '',
    })
    const results = makeResultsFile({
      day: 15,
      torikumi: { '15': [bout(1, 3842, 4227, 4227)] },
      playoff: {
        makuuchi: [bout(1, 3842, 4227, 3842), bout(2, 3842, 4055, 4055), bout(3, 4227, 4055, 4055)],
      },
      yusho: { makuuchi: 4055 },
    })
    render(
      <LanguageProvider>
        <Bouts results={results} division="makuuchi" rows={rows} day={15} onChangeDay={vi.fn()} />
      </LanguageProvider>
    )
    const playoff = screen.getByRole('region', { name: 'Three-way playoff' })
    expect(playoff).toHaveTextContent('After senshuraku, for the yusho.')
    const items = playoff.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[2].querySelector('strong')).toHaveTextContent('Wakatakakage')
    expect(items[2]).toHaveTextContent('yorikiri')
    // Not on an earlier day
    render(
      <LanguageProvider>
        <Bouts results={results} division="makuuchi" rows={rows} day={14} onChangeDay={vi.fn()} />
      </LanguageProvider>
    )
    expect(screen.getAllByRole('region', { name: /playoff/i })).toHaveLength(1)
  })

  it('says when a day has no card yet', () => {
    render(
      <LanguageProvider>
        <Bouts
          results={makeResultsFile()}
          division="makuuchi"
          rows={rows}
          day={13}
          onChangeDay={() => undefined}
        />
      </LanguageProvider>
    )
    expect(screen.getByText('The card for this day has not been published.')).toBeInTheDocument()
  })

  it('enables Next onto a later published card and steps to it', async () => {
    const onChangeDay = vi.fn()
    render(
      <LanguageProvider>
        <Bouts
          results={makeResultsFile({
            day: 12,
            torikumi: {
              '12': [
                {
                  division: 'makuuchi',
                  matchNo: 1,
                  east: { id: 3842, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } },
                  west: { id: 4227, shikona: { en: 'Onosato', jp: '大の里' } },
                  winnerId: 4227,
                  kimarite: 'yorikiri',
                },
              ],
              '13': [
                {
                  division: 'makuuchi',
                  matchNo: 1,
                  east: { id: 3842, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } },
                  west: { id: 4227, shikona: { en: 'Onosato', jp: '大の里' } },
                  winnerId: null,
                  kimarite: '',
                },
              ],
            },
          })}
          division="makuuchi"
          rows={rows}
          day={12}
          onChangeDay={onChangeDay}
        />
      </LanguageProvider>
    )
    const next = screen.getByRole('button', { name: 'Next day' })
    expect(next).toBeEnabled()
    await userEvent.click(next)
    expect(onChangeDay).toHaveBeenCalledWith(13)
  })

  it('keeps this division’s own card first and puts a cross bout last, in Juryo', () => {
    const juryoRows = makeJuryoBanzuke().rikishi
    render(
      <LanguageProvider>
        <Bouts
          results={makeResultsFile({
            torikumi: {
              '12': [
                {
                  // Cross-division bout, published on the Makuuchi card.
                  division: 'makuuchi',
                  matchNo: 1,
                  east: { id: 3983, shikona: { en: 'Dewanoryu', jp: '出羽ノ龍' } },
                  west: { id: 4055, shikona: { en: 'Wakatakakage', jp: '若隆景' } },
                  winnerId: 3983,
                  kimarite: 'oshidashi',
                },
                {
                  // Makuuchi-only match: neither fighter is in the Juryo rows.
                  division: 'makuuchi',
                  matchNo: 2,
                  east: { id: 3842, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } },
                  west: { id: 4227, shikona: { en: 'Onosato', jp: '大の里' } },
                  winnerId: 4227,
                  kimarite: 'yorikiri',
                },
                {
                  division: 'juryo',
                  matchNo: 1,
                  east: { id: 3983, shikona: { en: 'Dewanoryu', jp: '出羽ノ龍' } },
                  west: { id: 4232, shikona: { en: 'Kyokukaiyu', jp: '旭海雄' } },
                  winnerId: 4232,
                  kimarite: 'uwatenage',
                },
              ],
            },
          })}
          division="juryo"
          rows={juryoRows}
          day={12}
          onChangeDay={() => undefined}
        />
      </LanguageProvider>
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(screen.queryByText('Hoshoryu')).not.toBeInTheDocument()
    expect(items[0]).toHaveTextContent('Kyokukaiyu')
    expect(items[0]).toHaveTextContent('uwatenage')
    expect(items[1]).toHaveTextContent('Dewanoryu')
    expect(items[1]).toHaveTextContent('Wakatakakage')
  })
})
