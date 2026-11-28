import { describe, expect, it } from 'vitest'
import { makeBanzuke, makeJuryoBanzuke, makeResultsFile } from '../../src/test/fixtures.ts'
import { FACTS_MARKER, homeTitle, injectHome, renderNoscriptFacts } from './home.ts'

const data = { makuuchi: makeBanzuke(), juryo: makeJuryoBanzuke() }
const page = `<title>Grand Sumo Banzuke</title>
    <meta property="og:title" content="Grand Sumo Banzuke" />
    <meta name="twitter:title" content="Grand Sumo Banzuke" />
    <link rel="preload" as="fetch" href="/latest-banzuke.json" crossorigin />
  <noscript>${FACTS_MARKER}</noscript>`

describe('the home page before JavaScript', () => {
  it('titles the page as the app does: dated, with the Japanese term', () => {
    expect(homeTitle(data)).toBe('Grand Sumo Banzuke · Sep 2026 (Aki) Rankings · 大相撲番付')
  })

  it('states the tournament and lists every Makuuchi rank, East and West', () => {
    const html = renderNoscriptFacts(data, null)
    expect(html).toContain('September Grand Sumo Tournament 2026')
    expect(html).toContain('13–27 September 2026, Ryogoku Kokugikan, Tokyo.')
    expect(html).toContain('<th scope="row">Yokozuna <span lang="ja">横綱</span></th>')
    expect(html).toMatch(/Hoshoryu <span lang="ja">豊昇龍<\/span><\/td><th scope="row">Yokozuna/)
    expect(html).toMatch(/Onosato <span lang="ja">大の里<\/span><\/td><\/tr>/)
    // No results yet: no records, no yusho
    expect(html).not.toContain('Makuuchi yusho:')
    expect(html).not.toMatch(/\(\d+–\d+\)/)
  })

  it('adds the records and, once decided, the champion and the prizes', () => {
    const results = makeResultsFile({
      day: 15,
      yusho: { makuuchi: 4227 },
      sansho: [{ kind: 'shukun', rikishiId: 4055 }],
    })
    const html = renderNoscriptFacts(data, results)
    expect(html).toContain('Results through day 15.')
    expect(html).toContain('Makuuchi yusho: Yokozuna Onosato <span lang="ja">大の里</span> (10–2).')
    expect(html).toMatch(/Outstanding Performance Prize: Wakatakakage/)
    expect(html).toContain('Onosato <span lang="ja">大の里</span> (10–2)</td>')
  })

  it('says the top of the sheet in a sentence and carries the reading guide in both languages', () => {
    const html = renderNoscriptFacts(data, null)
    expect(html).toMatch(/<p>Top of the banzuke\. Yokozuna: Hoshoryu, Onosato\./)
    expect(html).toContain('<h2 lang="en">Reading the banzuke</h2>')
    expect(html).toContain('<h2 lang="ja">番付の見方</h2>')
    expect(html).toMatch(/<p lang="ja">番付は大相撲の本場所の順位表です/)
  })

  it('ignores another tournament’s results', () => {
    const html = renderNoscriptFacts(
      data,
      makeResultsFile({ bashoId: 636, yusho: { makuuchi: 4227 } })
    )
    expect(html).not.toContain('Makuuchi yusho:')
  })

  it('fills the title, social titles, facts and the results preload into the built page', () => {
    const html = injectHome(page, data, makeResultsFile())
    const title = 'Grand Sumo Banzuke · Sep 2026 (Aki) Rankings · 大相撲番付'
    expect(html).toContain(`<title>${title}</title>`)
    expect(html).toContain(`<meta property="og:title" content="${title}" />`)
    expect(html).toContain(`<meta name="twitter:title" content="${title}" />`)
    expect(html).toContain('<link rel="preload" as="fetch" href="/results/637.json" crossorigin />')
    expect(html).not.toContain(FACTS_MARKER)
    expect(injectHome(page, data, null)).not.toContain('results/')
  })
})
