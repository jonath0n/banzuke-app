import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeArchiveIndex,
  makeArchivedBanzuke,
  makeRawSnapshot,
  makeRecord,
  makeResultsFile,
  makeStablesFile,
} from './test/fixtures'
import { resetArchiveCache } from './hooks/useArchive'
import { resetResultsCache } from './hooks/useResults'
import { resetStablesCache } from './hooks/useStables'
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
    resetStablesCache()
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
                : String(url).includes('stables.json')
                  ? jsonResponse(makeStablesFile())
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

  it('loads behind a skeleton shaped like the view it is about to show', async () => {
    const { unmount } = render(<App />)
    // The Sheet is the default view: its skeleton is the ruled paper, not a list.
    expect(screen.getByRole('status', { busy: true })).toHaveTextContent('Loading the banzuke')
    expect(
      screen.getByRole('status', { busy: true }).querySelectorAll('[class*="half"]')
    ).toHaveLength(2)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    unmount()

    // The first load cached the snapshot; forget it so the List loads from nothing too.
    window.localStorage.clear()
    window.history.replaceState(null, '', '/?view=list')
    render(<App />)
    expect(screen.getByRole('status', { busy: true }).querySelector('[class*="half"]')).toBeNull()
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
  })

  it('marks a kadoban Ozeki from the previous banzuke and its results, in every view', async () => {
    const stub = fetch as unknown as Mock<(url: RequestInfo | URL) => Promise<Response>>
    const fallback = stub.getMockImplementation()!
    stub.mockImplementation((url) => {
      if (String(url).includes('banzuke/636.json')) {
        return Promise.resolve(
          jsonResponse(
            makeArchivedBanzuke({
              rikishi: [
                { ...makeArchivedBanzuke().rikishi[0], id: 1002, rankCode: 200 },
                { ...makeArchivedBanzuke().rikishi[0], id: 1003, rankCode: 200 },
              ],
            })
          )
        )
      }
      if (String(url).includes('results/636.json')) {
        return Promise.resolve(
          jsonResponse(
            makeResultsFile({
              bashoId: 636,
              day: 15,
              records: {
                '1002': { wins: 7, losses: 8, absences: 0, bouts: [] },
                '1003': { wins: 9, losses: 6, absences: 0, bouts: [] },
              },
              torikumi: {},
            })
          )
        )
      }
      return fallback(url)
    })
    render(<App />)
    const kirishima = await screen.findByRole('button', { name: /Kirishima, East/ })
    // (The fixture's rank names are all Maegashira; the code, not the name, decides.)
    await waitFor(() => expect(kirishima).toHaveAccessibleName(/Kirishima, East\. .*Kadoban\./))
    expect(screen.getByRole('button', { name: /Kotozakura, West/ })).not.toHaveAccessibleName(
      /Kadoban/
    )
    expect(within(kirishima).getByText('Kadoban')).toBeInTheDocument()
  })

  it('shows an archived tournament from ?basho=, with a way back to the live sheet', async () => {
    window.history.replaceState(null, '', '/?basho=636')
    render(<App />)
    // The archived July rows, not the live September ones
    expect(await screen.findByRole('button', { name: /Wakatakakage, East/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Kirishima/ })).toBeNull()
    expect(screen.getByText('July Grand Sumo Tournament')).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Earlier tournaments' })
    expect(nav).toHaveTextContent('Archived banzuke: Jul 2026 (Nagoya)')
    await userEvent.setup().click(screen.getAllByRole('link', { name: 'Current banzuke' })[0])
    expect(await screen.findByRole('button', { name: /Hoshoryu, East/ })).toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('ignores a ?basho= the archive does not know', async () => {
    window.history.replaceState(null, '', '/?basho=600')
    render(<App />)
    expect(await screen.findByRole('button', { name: /Hoshoryu, East/ })).toBeInTheDocument()
    await waitFor(() => expect(window.location.search).toBe(''))
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

  it('clears a deep link to a wrestler who is not on this banzuke', async () => {
    window.history.replaceState(null, '', '/?rikishi=424242')
    render(<App />)
    await screen.findByRole('button', { name: /Onosato, West/ })
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('names the tab after the open dialog, then after the tournament again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Hoshoryu, East/ }))
    await waitFor(() => expect(document.title).toBe('Hoshoryu · Grand Sumo Banzuke'))
    await user.click(screen.getByRole('button', { name: 'Tatsunami stable' }))
    await waitFor(() => expect(document.title).toBe('Tatsunami stable · Grand Sumo Banzuke'))
    // Closing the stable walks Back to the wrestler; closing the wrestler leaves the chain.
    await user.click(await screen.findByRole('button', { name: 'Close stable details' }))
    await waitFor(() => expect(document.title).toBe('Hoshoryu · Grand Sumo Banzuke'))
    await user.click(screen.getByRole('button', { name: 'Close wrestler details' }))
    await waitFor(() =>
      expect(document.title).toBe('Grand Sumo Banzuke · September Grand Sumo Tournament')
    )
  })

  it('selecting a wrestler writes the deep link', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Onosato, West/ }))
    expect(window.location.search).toBe('?rikishi=1001')
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Onosato')
  })

  it('mounts a dialog on its first open and keeps it for the close transition', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: /Onosato, West/ })
    // Neither dialog element exists yet: their chunks are not fetched with the page.
    expect(document.querySelector('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: /Onosato, West/ }))
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Onosato')
    await user.click(screen.getByRole('button', { name: 'Close wrestler details' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.querySelector('dialog')).not.toBeNull()
  })

  it('filters from ?q= and keeps the URL in step with the search box', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?q=ozeki')
    render(<App />)
    await screen.findByRole('searchbox')
    expect(within(screen.getByRole('search')).getByRole('status')).toHaveTextContent(
      '2 of 24 wrestlers'
    )
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

  it('has Changes on by default before day 1, and ?diff=0 turns it off', async () => {
    // The default clock is 2026-09-04: the banzuke is out, day 1 is nine days away.
    const user = userEvent.setup()
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /Changes.*since July 2026/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    // Hoshoryu (id 1000 in the raw fixture) is not in the archive fixture → new.
    expect(
      await screen.findByRole('button', { name: /Hoshoryu, East.*New to the sheet/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /Left Makuuchi since July 2026/ })
    ).toBeInTheDocument()
    await user.click(toggle)
    expect(window.location.search).toBe('?diff=0')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /Hoshoryu, East/ })).not.toHaveAccessibleName(
      /New to the sheet/
    )
  })

  it('has Changes off by default during the tournament, and ?diff=1 turns it on', async () => {
    vi.setSystemTime(new Date('2026-09-24T12:00:00+09:00'))
    const user = userEvent.setup()
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /Changes.*since July 2026/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(window.location.search).toBe('?diff=1')
    expect(
      await screen.findByRole('button', { name: /Hoshoryu, East.*New to the sheet/ })
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

  it('shows only the card before day 1, with no 0–0 under every name', async () => {
    // The eve of day 1: the day-1 card is out, every record is empty.
    vi.setSystemTime(new Date('2026-09-12T20:00:00+09:00'))
    const empty = { wins: 0, losses: 0, absences: 0, bouts: [] }
    const stub = fetch as unknown as Mock<(url: RequestInfo | URL) => Promise<Response>>
    const fallback = stub.getMockImplementation()!
    stub.mockImplementation((url) =>
      String(url).includes('results/637.json')
        ? Promise.resolve(
            jsonResponse(
              makeResultsFile({
                day: 0,
                records: { '1000': empty, '1001': empty },
                torikumi: {
                  '1': [
                    {
                      division: 'makuuchi',
                      matchNo: 1,
                      east: { id: 1000, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } },
                      west: { id: 1001, shikona: { en: 'Onosato', jp: '大の里' } },
                      winnerId: null,
                      kimarite: '',
                    },
                  ],
                },
                yusho: {},
              })
            )
          )
        : fallback(url)
    )
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /Results.*The day 1 card/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Day 1 · Shonichi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Onosato, West/ })).not.toHaveAccessibleName(/wins/)
    expect(screen.queryByText('0–0')).toBeNull()
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
    expect(window.history.state?.urlParam).toBe('rikishi')
    expect(screen.queryByRole('button', { name: /Previous: Hoshoryu/ })).toBeInTheDocument()
  })

  it('opens the guide from its link, marks the sheet, and closes it from the legend', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    await user.click(screen.getByRole('link', { name: 'How to read a banzuke' }))
    expect(window.location.search).toBe('?guide=1')
    expect(screen.getByRole('region', { name: 'How to read a banzuke' })).toBeInTheDocument()
    expect(document.querySelectorAll('[data-zone]').length).toBeGreaterThan(5)
    await user.click(screen.getByRole('link', { name: 'Hide the guide' }))
    expect(window.location.search).toBe('')
    expect(screen.queryByRole('region', { name: 'How to read a banzuke' })).toBeNull()
  })

  it('offers no guide on the list view', async () => {
    window.history.replaceState(null, '', '/?view=list&guide=1')
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    // The skip-link's "Skip to the banzuke" would false-match a bare /banzuke/
    // regex, so this narrows to the guide's own link names.
    expect(screen.queryByRole('link', { name: /How to read a banzuke|Hide the guide/ })).toBeNull()
    expect(screen.queryByRole('region', { name: 'How to read a banzuke' })).toBeNull()
  })

  it('hides the guide while a search is filtering the sheet, and restores it when cleared', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?guide=1&q=onosato')
    render(<App />)
    await screen.findByRole('button', { name: /Onosato, West/ })
    expect(screen.queryByRole('region', { name: 'How to read a banzuke' })).toBeNull()
    expect(screen.queryByRole('link', { name: /How to read a banzuke|Hide the guide/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    expect(screen.getByRole('region', { name: 'How to read a banzuke' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hide the guide' })).toBeInTheDocument()
  })

  it('returns focus to the guide link when the guide is closed from the legend', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    await user.click(screen.getByRole('link', { name: 'How to read a banzuke' }))
    await user.click(screen.getByRole('link', { name: 'Hide the guide' }))
    expect(screen.getByRole('link', { name: 'How to read a banzuke' })).toHaveFocus()
  })

  /** Simulates the Back button landing on `path`. */
  function goBack(path: string) {
    window.history.replaceState(null, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  it('walks wrestler → stable → member, each step one history entry deeper', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Hoshoryu, East/ }))
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Hoshoryu')
    const depth = window.history.length

    await user.click(screen.getByRole('button', { name: 'Tatsunami stable' }))
    const stableDialog = await screen.findByRole('dialog')
    expect(stableDialog).toHaveAccessibleName('Tatsunami')
    expect(window.location.search).toBe('?heya=1')
    expect(window.history.length).toBe(depth + 1)
    expect(window.history.state?.urlParam).toBe('heya')
    // The master line arrives from the stables file
    expect(
      await screen.findByText('Stablemaster Tatsunami Taiji, former Komusubi Asahiyutaka')
    ).toBeInTheDocument()

    // The member row inside the dialog, not Onosato's column on the sheet behind it
    await user.click(within(stableDialog).getByRole('button', { name: /^Onosato, West\./ }))
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Onosato'))
    expect(window.location.search).toBe('?rikishi=1001')
    expect(window.history.length).toBe(depth + 2)

    goBack('/?heya=1')
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Tatsunami'))
    goBack('/?rikishi=1000')
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAccessibleName('Hoshoryu'))
  })

  it('shows a stable on the banzuke by filling the search, in place of the dialog entry', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/?heya=1')
    render(<App />)
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Tatsunami')
    await user.click(screen.getByRole('button', { name: 'Show on the banzuke' }))
    expect(window.location.search).toBe('?q=Tatsunami')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByRole('searchbox')).toHaveValue('Tatsunami')
  })

  it('lets the wrestler win when a URL names both, and drops an unknown stable', async () => {
    window.history.replaceState(null, '', '/?rikishi=1000&heya=1')
    const { unmount } = render(<App />)
    expect(await screen.findByRole('dialog')).toHaveAccessibleName('Hoshoryu')
    unmount()

    window.history.replaceState(null, '', '/?heya=999')
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    await waitFor(() => expect(window.location.search).toBe(''))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
