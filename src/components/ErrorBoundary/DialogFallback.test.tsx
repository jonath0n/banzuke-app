import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { DialogFallback } from './DialogFallback'

describe('DialogFallback', () => {
  it('explains and offers a reload', async () => {
    window.history.replaceState(null, '', '/')
    const onReload = vi.fn()
    render(
      <LanguageProvider>
        <DialogFallback onReload={onReload} />
      </LanguageProvider>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('reads in Japanese', () => {
    window.history.replaceState(null, '', '/?lang=jp')
    render(
      <LanguageProvider>
        <DialogFallback onReload={() => undefined} />
      </LanguageProvider>
    )
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument()
  })
})
