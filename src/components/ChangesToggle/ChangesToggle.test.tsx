import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChangesToggle } from './ChangesToggle'
import { LanguageProvider } from '../../contexts/LanguageContext'

describe('ChangesToggle', () => {
  it('is a pressed button that names the previous tournament', async () => {
    const onChange = vi.fn()
    render(
      <LanguageProvider>
        <ChangesToggle on={false} onChange={onChange} sinceLabel="July 2026" />
      </LanguageProvider>
    )
    const button = screen.getByRole('button', { name: /Changes since July 2026/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('reflects the on state', () => {
    render(
      <LanguageProvider>
        <ChangesToggle on onChange={() => undefined} sinceLabel="July 2026" />
      </LanguageProvider>
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
