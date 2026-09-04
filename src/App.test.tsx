import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRawSnapshot } from './test/fixtures'
import App from './App'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    vi.stubGlobal(
      'fetch',
      vi.fn((url: RequestInfo | URL) =>
        Promise.resolve(
          String(url).includes('rikishi-profiles')
            ? jsonResponse({ version: 1, fetchedAt: '2026-09-04T00:00:00Z', profiles: {} })
            : jsonResponse(makeRawSnapshot())
        )
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
  })

  it('renders the banzuke and sets the document title', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: /Hoshoryu, East/ })).toBeInTheDocument()
    await waitFor(() =>
      expect(document.title).toBe('Grand Sumo Banzuke · September Grand Sumo Tournament')
    )
  })

  it('opens a wrestler from the URL and closes without leaving the deep link', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?rikishi=1001')
    render(<App />)
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Onosato')
    await user.click(screen.getByRole('button', { name: 'Close wrestler details' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(window.location.search).toBe('')
  })

  it('selecting a wrestler writes the deep link', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Onosato, West/ }))
    expect(window.location.search).toBe('?rikishi=1001')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Onosato')
  })

  it('filters from ?q= and keeps the URL in step with the search box', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?q=ozeki')
    render(<App />)
    await screen.findByRole('searchbox')
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('2 of 24 wrestlers')
    expect(screen.queryByRole('button', { name: /Hoshoryu/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(window.location.search).toBe('')
    expect(await screen.findByRole('button', { name: /Hoshoryu/ })).toBeInTheDocument()
  })

  it('shows a helpful empty state for a search with no matches', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByRole('searchbox'), 'zzzz')
    expect(screen.getByText(/Nothing on the sheet for/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all wrestlers' }))
    expect(await screen.findByRole('button', { name: /Hoshoryu/ })).toBeInTheDocument()
  })

  it('toggles language with the L key and writes ?lang', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('searchbox')
    await user.keyboard('l')
    expect(await screen.findByRole('button', { name: /豊昇龍/ })).toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get('lang')).toBe('jp')
    expect(document.documentElement.lang).toBe('ja')
  })

  it('offers division tabs and switches to Juryo through the URL', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    expect(screen.getByRole('tab', { name: /Makuuchi/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: /Juryo/ }))
    expect(window.location.search).toBe('?div=juryo')
    expect(await screen.findByRole('button', { name: /Dewanoryu, East/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hoshoryu/ })).toBeNull()
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName(/Juryo/)
    expect(screen.getByText(/Juryo\)/)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Makuuchi/ }))
    expect(window.location.search).toBe('')
  })

  it('opens Juryo from ?div= and a Juryo wrestler from ?rikishi=', async () => {
    window.history.replaceState(null, '', '/?div=juryo&rikishi=2001')
    render(<App />)
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Kyokukaiyu')
    expect(screen.getByRole('tab', { name: /Juryo/ })).toHaveAttribute('aria-selected', 'true')
  })
})
