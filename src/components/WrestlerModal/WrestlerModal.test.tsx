import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeRikishi } from '../../test/fixtures'
import { WrestlerModal } from './WrestlerModal'

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
  afterEach(() => {
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
})
