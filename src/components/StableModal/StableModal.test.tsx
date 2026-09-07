import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzukeSet, makeRecord, makeStable } from '../../test/fixtures'
import { rosterFor } from '../../utils/stables'
import { StableModal } from './StableModal'

const set = makeBanzukeSet()
const roster = rosterFor(set, 1)!

function renderModal(
  extra: Partial<React.ComponentProps<typeof StableModal>> = {},
  language: 'en' | 'jp' = 'en'
) {
  window.history.replaceState({}, '', language === 'jp' ? '/?lang=jp' : '/')
  const props: React.ComponentProps<typeof StableModal> = {
    heyaId: 1,
    roster,
    stable: makeStable(),
    stableLoading: false,
    onClose: vi.fn(),
    onSelectRikishi: vi.fn(),
    onShowOnBanzuke: vi.fn(),
    ...extra,
  }
  return { ...render(<LanguageProvider>{<StableModal {...props} />}</LanguageProvider>), props }
}

describe('StableModal', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('names the stable in both scripts, counts the sekitori and names the master', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Tatsunami')
    expect(screen.getByText('立浪')).toHaveAttribute('lang', 'ja')
    expect(screen.getByText('1 sekitori · 1 Makuuchi')).toBeInTheDocument()
    expect(
      screen.getByText('Stablemaster Tatsunami Taiji, former Komusubi Asahiyutaka')
    ).toBeInTheDocument()
    expect(dialog.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('reads in Japanese with kanji numerals', () => {
    renderModal({}, 'jp')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('立浪')
    expect(screen.getByText('関取一人 · 幕内一人')).toBeInTheDocument()
    expect(screen.getByText('師匠 立浪 耐治（元小結 旭豊）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '部屋の詳細を閉じる' })).toBeInTheDocument()
  })

  it('holds the master line while the file loads, and shows nothing when it lacks the stable', () => {
    const { rerender } = renderModal({ stable: null, stableLoading: true })
    expect(screen.getByRole('dialog').querySelector('[aria-busy="true"]')).not.toBeNull()
    rerender(
      <LanguageProvider>
        <StableModal
          heyaId={1}
          roster={roster}
          stable={null}
          stableLoading={false}
          onClose={vi.fn()}
          onSelectRikishi={vi.fn()}
          onShowOnBanzuke={vi.fn()}
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('dialog').querySelector('[aria-busy="true"]')).toBeNull()
    expect(screen.queryByText(/Stablemaster/)).toBeNull()
  })

  it('lists the members as buttons that open the wrestler, with movement and record spoken', async () => {
    const user = userEvent.setup()
    const { props } = renderModal({
      movements: new Map([
        [
          3842,
          {
            kind: 'up' as const,
            previous: { division: 'makuuchi', rankCode: 200, rankNumber: 1, seat: 1, side: 'east' },
            sideChanged: false,
          },
        ],
      ]),
      records: { '3842': makeRecord() },
    })
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(1)
    const member = screen.getByRole('button', { name: /^Hoshoryu, Yokozuna, East\./ })
    expect(member).toHaveAccessibleName(/Up from O/)
    expect(member).toHaveAccessibleName(/8 wins, 3 losses, 1 absence/)
    expect(member).toHaveAttribute('data-id', '3842')
    expect(member).not.toHaveAttribute('data-pair')
    expect(member).toHaveTextContent('Mongolia')
    await user.click(member)
    expect(props.onSelectRikishi).toHaveBeenCalledWith(roster.members[0])
  })

  it('offers the sheet, filtered to the stable, as the way out', async () => {
    const user = userEvent.setup()
    const { props } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Show on the banzuke' }))
    expect(props.onShowOnBanzuke).toHaveBeenCalledWith('Tatsunami')
  })

  it('shows the empty line for a stable with no sekitori left', () => {
    renderModal({ roster: null })
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Tatsunami')
    expect(screen.getByText('No sekitori on this banzuke')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show on the banzuke' })).toBeNull()
  })

  it('closes from the button and from Escape, and returns focus to the opener', async () => {
    const user = userEvent.setup()
    const opener = document.createElement('button')
    opener.textContent = 'opener'
    document.body.appendChild(opener)
    opener.focus()
    const { props } = renderModal()
    await user.click(screen.getByRole('button', { name: 'Close stable details' }))
    expect(props.onClose).toHaveBeenCalledTimes(1)
    // The native close event drives the focus return
    screen.getByRole('dialog').dispatchEvent(new Event('close'))
    expect(opener).toHaveFocus()
    opener.remove()
  })

  it('renders nothing while no stable is selected', () => {
    renderModal({ heyaId: null, roster: null, stable: null })
    expect(screen.getByRole('dialog', { hidden: true })).toBeEmptyDOMElement()
  })
})
