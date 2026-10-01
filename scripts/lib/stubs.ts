/**
 * Share pages. A link to a wrestler is `?rikishi=<id>` on the one page, which
 * gives every link the same preview card. These small static pages — one per
 * wrestler under r/<id>/ and one per stable under heya/<id>/ — carry their own
 * title, description and portrait for the unfurl, then send the visitor on to
 * the app with the query preserved. Pure: the CLI in scripts/build-stubs.ts
 * does the reading and writing.
 */
import type { BanzukeSet, Rikishi } from '../../src/types/banzuke.ts'
import { rosterFor } from '../../src/utils/stables.ts'

export const SITE = 'https://jonath0n.github.io/banzuke-app/'
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

export function stableStub(data: BanzukeSet, heyaId: number, bashoName: string): Stub | null {
  const roster = rosterFor(data, heyaId)
  if (!roster) return null
  const names = roster.members.map((r) => r.shikona.en).join(', ')
  return {
    path: `heya/${heyaId}/`,
    title: `${roster.name.en} stable ${roster.name.jp}部屋 · Grand Sumo Banzuke`,
    description: `${roster.members.length} sekitori on the ${bashoName} banzuke: ${names}.`,
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

/** The sitemap: the app's pages with their language alternates, then every stub. */
export function renderSitemap(stubs: Stub[]): string {
  const alternates = (loc: string) =>
    [
      `    <xhtml:link rel="alternate" hreflang="en" href="${loc}${loc.includes('?') ? '&amp;' : '?'}lang=en" />`,
      `    <xhtml:link rel="alternate" hreflang="ja" href="${loc}${loc.includes('?') ? '&amp;' : '?'}lang=jp" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}" />`,
    ].join('\n')
  const page = (loc: string, changefreq: string) =>
    `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n${alternates(loc)}\n  </url>`
  const entries = [
    page(SITE, 'daily'),
    page(`${SITE}?div=juryo`, 'daily'),
    page(`${SITE}?view=list`, 'daily'),
    ...stubs.map((s) => page(`${SITE}${s.path}`, 'weekly')),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`
}

/** JSON-LD for the tournament on the sheet, injected into the built index.html. */
export function renderJsonLd(data: BanzukeSet): string {
  const basho = data.makuuchi.basho
  const event = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: basho.name.en,
    alternateName: basho.name.jp,
    sport: 'Sumo',
    startDate: basho.startDate,
    endDate: basho.endDate,
    url: SITE,
    organizer: {
      '@type': 'SportsOrganization',
      name: 'Japan Sumo Association',
      url: 'https://www.sumo.or.jp/',
    },
  }
  return `<script type="application/ld+json">${JSON.stringify(event)}</script>`
}
