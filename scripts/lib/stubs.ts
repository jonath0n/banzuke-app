/**
 * Share pages. A link to a wrestler is `?rikishi=<id>` on the one page, which
 * gives every link the same preview card. These small static pages — one per
 * wrestler under r/<id>/ and one per stable under heya/<id>/ — carry their own
 * title, description and portrait for the unfurl, then send the visitor on to
 * the app with the query preserved. Pure: the CLI in scripts/build-stubs.ts
 * does the reading and writing.
 */
import type { BanzukeSet, Rikishi } from '../../src/types/banzuke.ts'
import { getVenue, getVenueCity } from '../../src/constants/venues.ts'
import type { ResultsFile } from '../../src/data/results.ts'
import { rosterFor } from '../../src/utils/stables.ts'
import { SITE_URL } from './site.ts'

export const SITE = SITE_URL
/** The JSA portrait, the one size that suits a card (src/utils/formatting.ts has the app's copy). */
const PORTRAIT = 'https://www.sumo.or.jp/img/sumo_data/rikishi/270x474'

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export interface Stub {
  /** Path under the site root, with a trailing slash: 'r/4227/'. */
  path: string
  title: string
  description: string
  image: string
  imageAlt: string
  /** The app URL the stub forwards to, relative to the site root. */
  target: string
}

export function wrestlerStub(rikishi: Rikishi, bashoName: string): Stub {
  const where = [rikishi.heya.en && `${rikishi.heya.en} stable`, rikishi.pref.en]
    .filter(Boolean)
    .join(', ')
  return {
    path: `r/${rikishi.id}/`,
    title: `${rikishi.shikona.en} ${rikishi.shikona.jp} · ${rikishi.rankName.en}`,
    description: `${rikishi.shikona.en}, ${rikishi.rankName.en} ${rikishi.side === 'east' ? 'East' : 'West'} on the ${bashoName} banzuke${where ? `. ${where}` : ''}.`,
    image: rikishi.photo ? `${PORTRAIT}/${rikishi.photo}` : `${SITE}og-image.png`,
    imageAlt: rikishi.photo ? `${rikishi.shikona.en}` : 'Grand Sumo Banzuke: the rankings sheet',
    target: `?rikishi=${rikishi.id}`,
  }
}

/** Names a stable's share page lists before "and N more". */
const STABLE_NAMES = 8

export function stableStub(data: BanzukeSet, heyaId: number, bashoName: string): Stub | null {
  const roster = rosterFor(data, heyaId)
  if (!roster) return null
  // Top of the stable first; a big stable's tail of lower-division names is counted, not listed.
  const shown = roster.members.slice(0, STABLE_NAMES)
  const rest = roster.members.length - shown.length
  const names = `${shown.map((r) => r.shikona.en).join(', ')}${rest > 0 ? ` and ${rest} more` : ''}`
  const count = roster.members.length
  return {
    path: `heya/${heyaId}/`,
    title: `${roster.name.en} stable ${roster.name.jp}部屋 · Grand Sumo Banzuke`,
    description: `${count} ${count === 1 ? 'wrestler' : 'wrestlers'} on the ${bashoName} banzuke: ${names}.`,
    image: `${SITE}og-image.png`,
    imageAlt: 'Grand Sumo Banzuke: the rankings sheet',
    target: `?heya=${heyaId}`,
  }
}

/** The page: tags for the unfurl, a redirect for a person, a link for everyone else. */
export function renderStub(stub: Stub): string {
  const url = `${SITE}${stub.path}`
  const target = `${SITE}${stub.target}`
  const title = escapeHtml(stub.title)
  const description = escapeHtml(stub.description)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${escapeHtml(target)}" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(stub.image)}" />
    <meta property="og:image:alt" content="${escapeHtml(stub.imageAlt)}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeHtml(stub.image)}" />
    <script>
      // On to the app, keeping any ?lang= the link carried.
      (function () {
        var q = new URLSearchParams(location.search)
        var to = new URL(${JSON.stringify(target)})
        q.forEach(function (v, k) { to.searchParams.set(k, v) })
        location.replace(to.toString())
      })()
    </script>
    <noscript><meta http-equiv="refresh" content="0; url=${escapeHtml(target)}" /></noscript>
  </head>
  <body>
    <p><a href="${escapeHtml(target)}">${title}</a></p>
  </body>
</html>
`
}

/**
 * The sitemap: the app's one page and nothing else. Every view (`?div=`, `?lang=`, `?rikishi=`,
 * `?heya=`, `?basho=`) is the same document with a canonical to `/`, and the share pages are
 * `noindex`, so listing any of them would only contradict those signals.
 */
export function renderSitemap(lastmod?: string): string {
  const date = lastmod ? `\n    <lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE}</loc>${date}\n  </url>\n</urlset>\n`
}

/** robots.txt: everything is crawlable, and the sitemap is at the site root. */
export function renderRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`
}

/** JSON-LD for the tournament on the sheet, injected into the built index.html. */
/** The newest moment the data on the page changed: the banzuke snapshot or the day's results. */
export function dataModified(data: BanzukeSet, results: ResultsFile | null): string {
  const times = [data.makuuchi.fetchedAt]
  if (results && results.bashoId === data.makuuchi.basho.id) times.push(results.fetchedAt)
  return times.sort().at(-1) as string
}

/** JSON-LD for the page and the tournament on the sheet, injected into the built index.html. */
export function renderJsonLd(
  data: BanzukeSet,
  results: ResultsFile | null = null,
  /** The page's own title and description, so the markup says what the <head> says. */
  page: { name: string; description: string } | null = null
): string {
  const basho = data.makuuchi.basho
  const venue = getVenue(basho.month)
  const city = getVenueCity(basho.month)
  const site = {
    '@type': 'WebSite',
    '@id': `${SITE}#website`,
    name: 'Grand Sumo Banzuke',
    alternateName: ['大相撲番付', 'banzuke.app'],
    url: SITE,
    inLanguage: ['en', 'ja'],
  }
  const event = {
    '@type': 'SportsEvent',
    '@id': `${SITE}#basho-${basho.id}`,
    name: basho.name.en,
    alternateName: basho.name.jp,
    description: `The ${basho.name.en} of ${basho.year}: fifteen days of top-division sumo${
      venue ? ` at ${venue.en}` : ''
    }, ranked by the banzuke the Japan Sumo Association published before it.`,
    sport: 'Sumo',
    startDate: basho.startDate,
    endDate: basho.endDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(venue && {
      location: {
        '@type': 'Place',
        name: venue.en,
        address: {
          '@type': 'PostalAddress',
          ...(city && { addressLocality: city }),
          addressCountry: 'JP',
        },
      },
    }),
    image: `${SITE}og-image.png`,
    url: SITE,
    organizer: {
      '@type': 'SportsOrganization',
      name: 'Japan Sumo Association',
      url: 'https://www.sumo.or.jp/',
    },
  }
  const webPage = {
    '@type': 'WebPage',
    '@id': `${SITE}#page`,
    url: SITE,
    name: page?.name ?? 'Grand Sumo Banzuke',
    ...(page && { description: page.description }),
    isPartOf: { '@id': site['@id'] },
    about: { '@id': event['@id'] },
    inLanguage: 'en',
    dateModified: dataModified(data, results),
  }
  const graph = { '@context': 'https://schema.org', '@graph': [site, webPage, event] }
  return `<script type="application/ld+json">${JSON.stringify(graph)}</script>`
}
