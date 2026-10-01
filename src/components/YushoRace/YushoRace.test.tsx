import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { YushoRace } from './YushoRace'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzuke, makeResultsFile } from '../../test/fixtures'
import { yushoRace } from '../../data/results'

describe('YushoRace', () => {
  const rows = makeBanzuke().rikishi
  const file = makeResultsFile()

  it('names the leaders by losses, then the chasers, as buttons into the dialog', async () => {
    const onSelect = vi.fn()
    render(
      <LanguageProvider>
        <YushoRace
          race={yushoRace(file, 'makuuchi', rows)}
          records={file.records}
          onSelectRikishi={onSelect}
        />
      </LanguageProvider>
    )
    expect(screen.getByText(/Yusho race after day 12/).closest('p')).toHaveTextContent(
      'Yusho race after day 12 2 losses Onosato · 4 losses Hoshoryu'
    )
    await userEvent.click(screen.getByRole('button', { name: 'Hoshoryu' }))
    expect(onSelect).toHaveBeenCalledWith(rows[0])
  })

  it('says who took the yusho once it is settled, with the record', () => {
    const decided = makeResultsFile({ day: 15, yusho: { makuuchi: 4227 } })
    render(
      <LanguageProvider>
        <YushoRace race={yushoRace(decided, 'makuuchi', rows)} records={decided.records} />
      </LanguageProvider>
    )
    expect(screen.getByText('Yusho').closest('p')).toHaveTextContent('Yusho Onosato 10–2')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('reads in Japanese by losses, with 、between names', () => {
    window.history.replaceState(null, '', '/?lang=jp')
    render(
      <LanguageProvider>
        <YushoRace race={yushoRace(file, 'makuuchi', rows)} records={file.records} />
      </LanguageProvider>
    )
    expect(screen.getByText(/12日目終了時の優勝争い/).closest('p')).toHaveTextContent(
      '12日目終了時の優勝争い 2敗 大の里 · 4敗 豊昇龍'
    )
    window.history.replaceState(null, '', '/')
  })
})
