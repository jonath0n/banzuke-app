import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BashoPicker } from './BashoPicker'
import { bashoLabel } from '../../utils/formatting'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeArchiveIndex } from '../../test/fixtures'

describe('BashoPicker', () => {
  afterEach(() => window.history.replaceState(null, '', '/'))
  const entries = makeArchiveIndex().basho

  it('labels a tournament the way fans do, in both languages', () => {
    const july = entries.find((b) => b.month === 7)!
    expect(bashoLabel(july, 'en')).toBe('Jul 2026 (Nagoya)')
    expect(bashoLabel(july, 'jp')).toBe('令和八年七月場所')
  })

  it('steps with real links and handles a plain click in place', async () => {
    const onChange = vi.fn()
    const [older, current] = entries.slice(-2)
    render(
      <LanguageProvider>
        <BashoPicker
          current={current}
          previous={older}
          next={null}
          nextIsLive
          onChange={onChange}
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('navigation', { name: 'Earlier tournaments' })).toHaveTextContent(
      `Archived banzuke: ${bashoLabel(current, 'en')}`
    )
    const back = screen.getByRole('link', { name: /Previous tournament/ })
    expect(back).toHaveAttribute('href', `/?basho=${older.bashoId}`)
    await userEvent.click(back)
    expect(onChange).toHaveBeenCalledWith(older.bashoId)
    await userEvent.click(screen.getAllByRole('link', { name: 'Current banzuke' })[0])
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
