// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseJpSearchPage } from './jp-search-page'

const html = readFileSync(resolve(__dirname, '__fixtures__/jp-search-makuuchi.html'), 'utf8')

describe('parseJpSearchPage', () => {
  const page = parseJpSearchPage(html)

  it('finds every makuuchi wrestler', () => {
    expect(page.rows).toHaveLength(42)
    expect(new Set(page.rows.map((r) => r.rikishiId)).size).toBe(42)
  })

  it('parses the first row completely', () => {
    expect(page.rows[0]).toEqual({
      rikishiId: 4227,
      shikona: '大の里',
      reading: 'おおのさと',
      side: 'east',
      rankName: '横綱',
      prefId: 17,
      prefName: '石川県',
      heyaId: 32,
      heyaName: '二所ノ関',
    })
  })

  it('parses west side and numbered maegashira ranks', () => {
    const hoshoryu = page.rows.find((r) => r.rikishiId === 3842)
    expect(hoshoryu).toMatchObject({
      shikona: '豊昇龍',
      reading: 'ほうしょうりゅう',
      side: 'west',
      rankName: '横綱',
      prefName: 'モンゴル',
      heyaName: '立浪',
    })
    const last = page.rows[page.rows.length - 1]
    expect(last.rankName).toBe('前頭十七枚目')
    expect(last.side).toBe('east')
  })

  it('collects the prefecture list from the search form', () => {
    expect(page.prefectures[1]).toBe('北海道')
    expect(page.prefectures[17]).toBe('石川県')
    expect(page.prefectures[49]).toBe('モンゴル')
    expect(Object.keys(page.prefectures).length).toBeGreaterThan(50)
  })

  it('returns nothing for unrelated HTML', () => {
    expect(parseJpSearchPage('<html><body><p>nope</p></body></html>')).toEqual({
      rows: [],
      prefectures: {},
    })
  })
})
