import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeArchiveIndex,
  makeArchivedBanzuke,
  makeRawSnapshot,
  makeRecord,
  makeResultsFile,
} from './test/fixtures'
import { resetArchiveCache } from './hooks/useArchive'
import { resetResultsCache } from './hooks/useResults'
import App from './App'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response
}

const recordOf10 = { wins: 10, losses: 2, absences: 0, bouts: [] }

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState(null, '', '/')
    resetArchiveCache()
    resetResultsCache()
    // From 2026-09-12 the fixture basho (637: 2026-09-13…27) is in season for
    // every un-faked test, which makes the shared stub's Hoshoryu ambiguous
    // with the Bouts card's fighter button of the same name. Pin the clock
    // before day 1 so results stay off unless a test opts in with its own
    // vi.setSystemTime.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-09-04T12:00:00+09:00'))
    vi.stubGlobal(
      'fetch',
      vi.fn((url: RequestInfo | URL) =>
        Promise.resolve(
          String(url).includes('banzuke/index.json')
            ? jsonResponse(makeArchiveIndex())
            : String(url).includes('banzuke/636.json')
              ? jsonResponse(makeArchivedBanzuke())
              : String(url).includes('rikishi-profiles')
                ? jsonResponse({ version: 1, fetchedAt: '2026-09-04T00:00:00Z', profiles: {} })
                : String(url).includes('results/637.json')
                  ? jsonResponse(
                      makeResultsFile({
                        records: { '1000': makeRecord(), '1001': recordOf10 },
                        torikumi: {
                          '12': [
                            {
                              division: 'makuuchi',
                              matchNo: 1,
                              east: { id: 1000, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } },
                              west: { id: 1001, shikona: { en: 'Onosato', jp: '大の里' } },
                              winnerId: 1001,
                              kimarite: 'yorikiri',
                            },
                          ],
                        },
                      })
                    )
                  : jsonResponse(makeRawSnapshot())
        )
      )
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.history.replaceState(null, '', '/')
    vi.useRealTimers()
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

  it('keeps the partner of a match in view and counts matches per division', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByRole('searchbox'), 'onosato')
    // Onosato (West Yokozuna) matches; Hoshoryu stays as the dimmed East partner
    expect(screen.getByRole('button', { name: /Onosato, West/ })).not.toHaveAttribute('data-dimmed')
    expect(screen.getByRole('button', { name: /Hoshoryu, East/ })).toHaveAttribute('data-dimmed')
    expect(screen.queryByRole('button', { name: /Kirishima/ })).toBeNull()
    expect(screen.getByRole('tab', { name: /Makuuchi/ })).toHaveTextContent('1/24')
    expect(screen.getByRole('tab', { name: /Juryo/ })).toHaveTextContent('0/28')
  })

  it('points to the other division when only it has matches', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(await screen.findByRole('searchbox'), 'dewanoryu')
    await user.click(screen.getByRole('button', { name: 'Show 1 in Juryo' }))
    expect(window.location.search).toBe('?q=dewanoryu&div=juryo')
    expect(await screen.findByRole('button', { name: /Dewanoryu, East/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Juryo/ })).toHaveAttribute('aria-selected', 'true')
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
    await user.click(screen.getByRole('tab', { name: /Makuuchi/ }))
    expect(window.location.search).toBe('')
  })

  it('opens Juryo from ?div= and a Juryo wrestler from ?rikishi=', async () => {
    window.history.replaceState(null, '', '/?div=juryo&rikishi=2001')
    render(<App />)
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Kyokukaiyu')
    expect(screen.getByRole('tab', { name: /Juryo/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('offers Changes when the archive has a previous tournament, and annotates the sheet with ?diff=1', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /Changes.*since July 2026/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(window.location.search).toBe('?diff=1')
    // Hoshoryu (id 1000 in the raw fixture) is not in the archive fixture → new.
    expect(
      await screen.findByRole('button', { name: /Hoshoryu, East.*New to the sheet/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /Left Makuuchi since July 2026/ })
    ).toBeInTheDocument()
  })

  it('names the previous tournament with its year in Japanese when the year differs', async () => {
    window.history.replaceState(null, '', '/?lang=jp')
    vi.stubGlobal(
      'fetch',
      vi.fn((url: RequestInfo | URL) =>
        Promise.resolve(
          String(url).includes('banzuke/index.json')
            ? jsonResponse(
                makeArchiveIndex({
                  basho: [
                    {
                      bashoId: 632,
                      year: 2025,
                      month: 11,
                      startDate: '2025-11-09',
                      file: '632.json',
                      source: 'sumo-api',
                      divisions: ['makuuchi', 'juryo'],
                    },
                    {
                      bashoId: 637,
                      year: 2026,
                      month: 9,
                      startDate: '2026-09-13',
                      file: '637.json',
                      source: 'sumo-api',
                      divisions: ['makuuchi', 'juryo'],
                    },
                  ],
                })
              )
            : jsonResponse(makeRawSnapshot())
        )
      )
    )
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /変動/ })
    expect(toggle).toHaveAttribute('title', '令和七年十一月場所からの変動')
  })

  it('names the previous tournament without a year in Japanese when the year is the same', async () => {
    window.history.replaceState(null, '', '/?lang=jp')
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /変動/ })
    expect(toggle).toHaveAttribute('title', '七月場所からの変動')
  })

  it('hides the toggle when there is no archive', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: RequestInfo | URL) =>
        Promise.resolve(
          String(url).includes('banzuke/')
            ? ({ ok: false, status: 404 } as Response)
            : String(url).includes('rikishi-profiles')
              ? jsonResponse({ version: 1, fetchedAt: '2026-09-04T00:00:00Z', profiles: {} })
              : jsonResponse(makeRawSnapshot())
        )
      )
    )
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    expect(screen.queryByRole('button', { name: /Changes/ })).toBeNull()
  })

  it('shows results by default during the tournament and hides them with ?results=0', async () => {
    vi.setSystemTime(new Date('2026-09-24T12:00:00+09:00'))
    const user = userEvent.setup()
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /Results.*through day 12/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(
      await screen.findByRole('button', { name: /Onosato, West.*10 wins, 2 losses/ })
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Day 12' })).toBeInTheDocument()
    await user.click(toggle)
    expect(window.location.search).toBe('?results=0')
    expect(screen.queryByRole('region', { name: 'Day 12' })).toBeNull()
    expect(screen.getByRole('button', { name: /Onosato, West/ })).not.toHaveAccessibleName(/wins/)
  })

  it('offers no results toggle out of season or when the file is missing', async () => {
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    expect(screen.queryByRole('button', { name: /Results/ })).toBeNull()
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('results/'))
  })

  it('walks the banzuke from the dialog without growing the history', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Hoshoryu, East/ }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Hoshoryu')
    const depth = window.history.length
    await user.click(screen.getByRole('button', { name: 'Next: Onosato' }))
    await waitFor(() => expect(dialog).toHaveAccessibleName('Onosato'))
    expect(window.location.search).toBe('?rikishi=1001')
    expect(window.history.length).toBe(depth)
    expect(screen.queryByRole('button', { name: /Previous: Hoshoryu/ })).toBeInTheDocument()
  })
})
