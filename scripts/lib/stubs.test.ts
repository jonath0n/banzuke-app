import { describe, expect, it } from 'vitest'
import { makeBanzuke, makeJuryoBanzuke, makeRikishi } from '../../src/test/fixtures.ts'
import { renderJsonLd, renderSitemap, renderStub, stableStub, wrestlerStub } from './stubs.ts'

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

  it('describes a stable by its sekitori on this banzuke, or nothing for an unknown id', () => {
    const stub = stableStub(data, 1, 'September Grand Sumo Tournament')
    expect(stub?.path).toBe('heya/1/')
    expect(stub?.title).toMatch(/^Tatsunami stable 立浪部屋/)
    expect(stub?.description).toMatch(/sekitori on the September Grand Sumo Tournament banzuke: /)
    expect(stableStub(data, 999, 'x')).toBeNull()
  })

  it('renders a page that unfurls, forwards with the query kept, and escapes', () => {
    const html = renderStub({
      ...wrestlerStub(makeRikishi({ shikona: { en: 'A & "B"', jp: '<x>' } }), 'Aki'),
    })
    expect(html).toContain(
      '<meta property="og:title" content="A &amp; &quot;B&quot; &lt;x&gt; · Yokozuna" />'
    )
    expect(html).toContain(
      '<link rel="canonical" href="https://jonath0n.github.io/banzuke-app/?rikishi=3842" />'
    )
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain('location.replace(to.toString())')
    expect(html).toContain(
      '<noscript><meta http-equiv="refresh" content="0; url=https://jonath0n.github.io/banzuke-app/?rikishi=3842" /></noscript>'
    )
  })

  it('lists the app pages with language alternates and an x-default, then every stub', () => {
    const xml = renderSitemap([wrestlerStub(makeRikishi(), 'Aki')])
    expect(xml).toContain('<loc>https://jonath0n.github.io/banzuke-app/</loc>')
    expect(xml).toContain('hreflang="ja" href="https://jonath0n.github.io/banzuke-app/?lang=jp"')
    expect(xml).toContain('hreflang="x-default" href="https://jonath0n.github.io/banzuke-app/"')
    expect(xml).toContain('href="https://jonath0n.github.io/banzuke-app/?div=juryo&amp;lang=en"')
    expect(xml).toContain('<loc>https://jonath0n.github.io/banzuke-app/r/3842/</loc>')
  })

  it('writes the tournament as a SportsEvent', () => {
    const json = renderJsonLd(data)
    expect(json).toContain('"@type":"SportsEvent"')
    expect(json).toContain('"startDate":"2026-09-13"')
    expect(json).toContain('"name":"September Grand Sumo Tournament"')
  })
})
