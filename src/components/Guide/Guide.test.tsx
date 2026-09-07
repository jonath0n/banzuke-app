import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Guide, GuideLink } from './Guide'
import { LanguageProvider } from '../../contexts/LanguageContext'

describe('Guide', () => {
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('lists the items in mark order with their numbers, as a real list under a heading', async () => {
    const onClose = vi.fn()
    render(
      <LanguageProvider>
        <Guide items={['size', 'east', 'gold']} onClose={onClose} />
      </LanguageProvider>
    )
    expect(screen.getByRole('region', { name: 'How to read a banzuke' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent(/^1/)
    expect(items[0]).toHaveTextContent(/Rank is written in size/)
    expect(items[2]).toHaveTextContent(/^3/)
    expect(items[2]).toHaveTextContent(/gold rule/)
    await userEvent.click(screen.getByRole('link', { name: 'Hide the guide' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('links to ?guide=1 and toggles without leaving the page', async () => {
    const onToggle = vi.fn()
    window.history.replaceState({}, '', '/?div=juryo')
    render(
      <LanguageProvider>
        <GuideLink on={false} onToggle={onToggle} />
      </LanguageProvider>
    )
    const link = screen.getByRole('link', { name: 'How to read a banzuke' })
    expect(link).toHaveAttribute('href', '/?div=juryo&guide=1')
    await userEvent.click(link)
    expect(onToggle).toHaveBeenCalledWith(true)
    expect(window.location.search).toBe('?div=juryo')
  })
})
