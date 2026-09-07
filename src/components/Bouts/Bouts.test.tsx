import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Bouts } from './Bouts'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzuke, makeResultsFile } from '../../test/fixtures'

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
    expect(screen.getByText(/Leaders after day 12/)).toHaveTextContent(
      'Onosato 10–2 · Hoshoryu 8–3–1'
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Not yet fought')
    expect(items[1].querySelector('strong')).toHaveTextContent('Onosato')
    expect(items[1]).toHaveTextContent('yorikiri')
    await userEvent.click(screen.getByRole('button', { name: /Hoshoryu/ }))
    expect(onSelect).toHaveBeenCalledWith(rows[0])
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(onChangeDay).toHaveBeenCalledWith(11)
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
})
