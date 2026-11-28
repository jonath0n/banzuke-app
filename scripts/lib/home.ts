/**
 * What the built index.html says before JavaScript runs. Google renders the app, but Bing often
 * does not and AI search crawlers never do: for them the page is its <head> and its <noscript>.
 * So the build writes the current tournament into both: a dated title, and a plain summary and
 * Makuuchi table that mirror what the app draws. Pure: scripts/build-stubs.ts reads and writes.
 */
import type { ResultsFile } from '../../src/data/results.ts'
import { resultsFileName, scoreLabel } from '../../src/data/results.ts'
import { getVenue } from '../../src/constants/venues.ts'
import { STRINGS } from '../../src/i18n/strings.ts'
import type { BanzukeSet, Rikishi } from '../../src/types/banzuke.ts'
import { bashoLabel, groupRowsByRank } from '../../src/utils/formatting.ts'
import { BASE } from './site.ts'
import { escapeHtml } from './stubs.ts'

/** Where the build puts the facts inside index.html's <noscript>. */
export const FACTS_MARKER = '<!-- banzuke-facts -->'

/** The page title the app sets for the live sheet, so the raw HTML and the rendered page agree. */
export function homeTitle(data: BanzukeSet): string {
  return STRINGS.en.homeTitle(bashoLabel(data.makuuchi.basho, 'en'))
}

/** "8–22 November 2026" from two YYYY-MM-DD dates (already JST calendar days). */
function dateRange(start: string, end: string): string {
  const month = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
  const [sy, , sd] = start.split('-').map(Number)
  const [ey, , ed] = end.split('-').map(Number)
  if (month(start) === month(end) && sy === ey) return `${sd}–${ed} ${month(end)} ${ey}`
  return `${sd} ${month(start)} – ${ed} ${month(end)} ${ey}`
}

function nameOf(r: Rikishi): string {
  return `${escapeHtml(r.shikona.en)} <span lang="ja">${escapeHtml(r.shikona.jp)}</span>`
}

/**
 * The tournament in sentences and a table: name, dates and venue; once decided, the yusho and
 * the special prizes; then every Makuuchi rank, East and West, with the record so far.
 */
export function renderNoscriptFacts(data: BanzukeSet, results: ResultsFile | null): string {
  const basho = data.makuuchi.basho
  const venue = getVenue(basho.month)
  const live = results && results.bashoId === basho.id ? results : null
  const everyone = new Map(
    Object.values(data)
      .flatMap((b) => b?.rikishi ?? [])
      .map((r) => [r.id, r])
  )
  const record = (r: Rikishi) => {
    const rec = live?.records[String(r.id)]
    return rec ? ` (${scoreLabel(rec, 'en')})` : ''
  }
  const lines: string[] = []
  lines.push(
    `<h2>${escapeHtml(basho.name.en)} ${basho.year} <span lang="ja">${escapeHtml(
      bashoLabel(basho, 'jp')
    )}</span></h2>`
  )
  lines.push(
    `<p>${dateRange(basho.startDate, basho.endDate)}${
      venue ? `, ${escapeHtml(venue.en)}` : ''
    }.${basho.announcedAt ? ` Banzuke announced ${basho.announcedAt.slice(0, 10)}.` : ''}${
      live && live.day > 0 ? ` Results through day ${live.day}.` : ''
    }</p>`
  )
  const champions: string[] = []
  for (const division of ['makuuchi', 'juryo'] as const) {
    const id = live?.yusho[division]
    const r = id ? everyone.get(id) : undefined
    if (!r) continue
    champions.push(
      `${STRINGS.en.division[division]} yusho: ${escapeHtml(r.rankName.en)} ${nameOf(r)}${record(r)}${
        live?.playoff?.[division]?.length ? ', after a playoff' : ''
      }.`
    )
  }
  if (champions.length) lines.push(`<p>${champions.join(' ')}</p>`)
  const prizes = (live?.sansho ?? [])
    .map((s) => {
      const r = everyone.get(s.rikishiId)
      return r ? `${STRINGS.en.sansho[s.kind]} Prize: ${nameOf(r)}` : null
    })
    .filter((s): s is string => s !== null)
  if (prizes.length) lines.push(`<p>Special prizes (sansho): ${prizes.join('; ')}.</p>`)

  const rows = groupRowsByRank(data.makuuchi.rikishi).map((g) => {
    const rank = (g.east ?? g.west)?.rankName ?? g.name
    const cell = (r: Rikishi | null) => (r ? `${nameOf(r)}${record(r)}` : '')
    return `<tr><td>${cell(g.east)}</td><th scope="row">${escapeHtml(rank.en)} <span lang="ja">${escapeHtml(
      rank.jp
    )}</span></th><td>${cell(g.west)}</td></tr>`
  })
  lines.push(
    `<table><caption>Makuuchi banzuke, ${escapeHtml(
      bashoLabel(basho, 'en')
    )}</caption><thead><tr><th scope="col">East</th><th scope="col">Rank</th><th scope="col">West</th></tr></thead><tbody>${rows.join(
      ''
    )}</tbody></table>`
  )
  return lines.join('\n      ')
}

/**
 * The built index.html with the dated title (and its og/twitter copies) and the facts filled in,
 * and, while the tournament has a results file, a preload for it beside the banzuke's: the app
 * waits for it before the first draw (App.tsx, RESULTS_WAIT_MS), so it should not start late.
 */
export function injectHome(html: string, data: BanzukeSet, results: ResultsFile | null): string {
  const title = escapeHtml(homeTitle(data))
  const href =
    results && results.bashoId === data.makuuchi.basho.id
      ? `${BASE}results/${resultsFileName(results.bashoId)}`
      : null
  const preload = href ? `\n    <link rel="preload" as="fetch" href="${href}" crossorigin />` : ''
  return html
    .replace(
      /<link rel="preload" as="fetch" href="[^"]*latest-banzuke\.json" crossorigin \/>/,
      (link) => (href && html.includes(href) ? link : `${link}${preload}`)
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      (_, a: string, b: string) => `${a}${title}${b}`
    )
    .replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      (_, a: string, b: string) => `${a}${title}${b}`
    )
    .replace(FACTS_MARKER, renderNoscriptFacts(data, results))
}
