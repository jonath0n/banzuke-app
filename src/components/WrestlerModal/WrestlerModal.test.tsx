import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeRikishi } from '../../test/fixtures'
import { onosatoProfile } from '../../data/profiles.test'
import { resetProfilesCache } from '../../hooks/useProfiles'
import { WrestlerModal } from './WrestlerModal'

const profilesFile = {
  version: 1,
  fetchedAt: '2026-09-04T00:00:00Z',
  profiles: { '4227': onosatoProfile },
}

const onosato = makeRikishi({
  id: 4227,
  shikona: { en: 'Onosato', jp: '大の里' },
  reading: 'おおのさと',
  heya: { id: 32, en: 'Nishonoseki', jp: '二所ノ関' },
  pref: { id: 17, en: 'Ishikawa', jp: '石川県' },
  promotion: { kind: 'new-rank', raw: '新横綱' },
})

function renderModal(rikishi = onosato, onClose = vi.fn(), lang: 'en' | 'jp' = 'en') {
  window.history.replaceState({}, '', `/?lang=${lang}`)
  const utils = render(
    <LanguageProvider>
      <button type="button">opener</button>
      <WrestlerModal rikishi={rikishi} onClose={onClose} />
    </LanguageProvider>
  )
  return { ...utils, onClose }
}

describe('WrestlerModal', () => {
  beforeEach(() => {
    resetProfilesCache()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(profilesFile),
      } as unknown as Response)
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/')
  })

  it('opens as a modal dialog named after the wrestler', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal')
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(showModal).toHaveBeenCalledTimes(1)
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveAccessibleName('Onosato')
    expect(screen.getByText('大の里')).toHaveAttribute('lang', 'ja')
    expect(screen.getByText('Nishonoseki')).toBeInTheDocument()
    expect(screen.getByText('New Yokozuna')).toBeInTheDocument()
    const img = screen.getByRole('presentation', { hidden: true })
    expect(img).toHaveAttribute('src', expect.stringMatching(/270x474\/20170096\.jpg$/))
    expect(screen.getByRole('link', { name: /Official profile/ })).toHaveAttribute(
      'href',
      'https://www.sumo.or.jp/EnSumoDataRikishi/profile/4227/'
    )
  })

  it('renders nothing visible without a wrestler', () => {
    renderModal(null as unknown as typeof onosato)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('calls onClose from the close button', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Close wrestler details' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the dialog closes natively and restores focus', () => {
    const onClose = vi.fn()
    window.history.replaceState({}, '', '/?lang=en')
    const { rerender } = render(
      <LanguageProvider>
        <button type="button">opener</button>
        <WrestlerModal rikishi={null} onClose={onClose} />
      </LanguageProvider>
    )
    const opener = screen.getByRole('button', { name: 'opener' })
    opener.focus()
    rerender(
      <LanguageProvider>
        <button type="button">opener</button>
        <WrestlerModal rikishi={onosato} onClose={onClose} />
      </LanguageProvider>
    )
    const dialog = screen.getByRole('dialog') as HTMLDialogElement
    // Simulate Escape: the browser closes the dialog and fires `close`.
    dialog.close()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(opener)
  })

  it('shows Japanese primary name with its reading in Japanese mode', () => {
    renderModal(onosato, vi.fn(), 'jp')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('大の里')
    expect(screen.getByText('おおのさと')).toBeInTheDocument()
    expect(screen.getByText('二所ノ関')).toBeInTheDocument()
    expect(screen.getByText('新横綱')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /公式プロフィール/ })).toHaveAttribute(
      'href',
      'https://www.sumo.or.jp/ResultRikishiData/profile/4227/'
    )
  })

  it('adds profile facts once the profiles file has loaded', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-04T00:00:00Z'))
    renderModal()
    expect(await screen.findByText('Daiki Nakamura')).toBeInTheDocument()
    expect(screen.getByText('June 7, 2000 (26)')).toBeInTheDocument()
    expect(screen.getByText('190 cm')).toBeInTheDocument()
    expect(screen.getByText('188 kg')).toBeInTheDocument()
    // Rank row, highest-rank row and the last career step all read Yokozuna
    expect(screen.getAllByText('Yokozuna')).toHaveLength(3)
    expect(screen.getByText('tsuki, oshi, migi-yotsu, yori')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('lays out the career as steps from debut to the highest rank', async () => {
    renderModal()
    const career = await screen.findByRole('region', { name: 'Career' })
    const steps = within(career).getAllByRole('listitem')
    expect(steps.map((li) => li.textContent)).toEqual([
      'DebutMay 2023',
      'JuryoSep 2023',
      'MakuuchiJan 2024',
      'YokozunaJul 2025',
    ])
    expect(within(career).getByText('May 2023')).toHaveAttribute('datetime', '2023-05')
  })

  it('shows the detailed Japanese birthplace and labels in Japanese mode', async () => {
    renderModal(onosato, vi.fn(), 'jp')
    expect(await screen.findByText('中村 泰輝')).toBeInTheDocument()
    expect(screen.getByText('石川県河北郡津幡町')).toBeInTheDocument()
    expect(screen.getByText('本名')).toBeInTheDocument()
    expect(screen.getByText('190cm')).toBeInTheDocument()
    expect(screen.getByText('2023年5月')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '昇進の歩み' })).toHaveTextContent('初土俵')
  })

  it('renders without profile facts when the file is unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response))
    renderModal()
    expect(screen.getByText('Ishikawa')).toBeInTheDocument()
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled())
    expect(screen.queryByText('Real name')).toBeNull()
  })
})
