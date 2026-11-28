import { describe, expect, it } from 'vitest'
import { makeBanzuke, makeJuryoBanzuke, makeRikishi } from '../../src/test/fixtures.ts'
import {
  renderJsonLd,
  renderRobots,
  renderSitemap,
  renderStub,
  stableStub,
  wrestlerStub,
} from './stubs.ts'

describe('share pages', () => {
  const data = { makuuchi: makeBanzuke(), juryo: makeJuryoBanzuke() }

  it('describes a wrestler with rank, side, stable and home, and the JSA portrait', () => {
    const stub = wrestlerStub(makeRikishi(), 'September Grand Sumo Tournament')
    expect(stub.path).toBe('r/3842/')
    expect(stub.title).toBe('Hoshoryu 豊昇龍 · Yokozuna')
    expect(stub.description).toBe(
      'Hoshoryu, Yokozuna East on the September Grand Sumo Tournament banzuke. Tatsunami stable, Mongolia.'
    )
    expect(stub.image).toMatch(/270x474\/20170096\.jpg$/)
    expect(stub.target).toBe('?rikishi=3842')
  })

  it('describes a stable by its wrestlers on this banzuke, or nothing for an unknown id', () => {
    const stub = stableStub(data, 1, 'September Grand Sumo Tournament')
    expect(stub?.path).toBe('heya/1/')
    expect(stub?.title).toMatch(/^Tatsunami stable 立浪部屋/)
    expect(stub?.description).toMatch(/wrestlers? on the September Grand Sumo Tournament banzuke: /)
    expect(stableStub(data, 999, 'x')).toBeNull()
  })

  it('renders a page that unfurls, forwards with the query kept, and escapes', () => {
    const html = renderStub({
      ...wrestlerStub(makeRikishi({ shikona: { en: 'A & "B"', jp: '<x>' } }), 'Aki'),
    })
    expect(html).toContain(
      '<meta property="og:title" content="A &amp; &quot;B&quot; &lt;x&gt; · Yokozuna" />'
    )
    expect(html).toContain('<link rel="canonical" href="https://banzuke.app/?rikishi=3842" />')
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain('location.replace(to.toString())')
    expect(html).toContain(
      '<noscript><meta http-equiv="refresh" content="0; url=https://banzuke.app/?rikishi=3842" /></noscript>'
    )
  })

  it('lists only the app page: no views, share pages or language alternates', () => {
    const xml = renderSitemap()
    expect(xml.match(/<loc>/g)).toHaveLength(1)
    expect(xml).toContain('<loc>https://banzuke.app/</loc>')
    expect(xml).not.toContain('hreflang')
    expect(xml).not.toContain('/r/')
    expect(xml).not.toMatch(/banzuke\.app\/\?/)
  })

  it('points robots.txt at the sitemap on the site', () => {
    expect(renderRobots()).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://banzuke.app/sitemap.xml\n'
    )
  })

  it('writes the tournament as a SportsEvent', () => {
    const json = renderJsonLd(data)
    expect(json).toContain('"@type":"SportsEvent"')
    expect(json).toContain('"startDate":"2026-09-13"')
    expect(json).toContain('"name":"September Grand Sumo Tournament"')
  })

  it('names the site and places the tournament at its venue', () => {
    const graph = JSON.parse(
      renderJsonLd(data)
        .replace(/^<script[^>]*>/, '')
        .replace(/<\/script>$/, '')
    ) as { '@graph': Record<string, unknown>[] }
    const [site, event] = graph['@graph']
    expect(site).toMatchObject({ '@type': 'WebSite', url: 'https://banzuke.app/' })
    expect(event).toMatchObject({
      eventStatus: 'https://schema.org/EventScheduled',
      location: { '@type': 'Place', name: 'Ryogoku Kokugikan, Tokyo' },
    })
  })
})
