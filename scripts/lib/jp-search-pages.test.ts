// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { fetchJpPages, jpPageCount, mergeJpPages } from './jp-search-pages'
import { parseJpSearchPage } from './jp-search-page'

const fixture = (name: string) => readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8')

const page1 = fixture('jp-search-makushita-p1.html')
const page3 = fixture('jp-search-makushita-p3.html')

describe('jpPageCount', () => {
  it('asks for fifty wrestlers a page', () => {
    expect(jpPageCount(0)).toBe(1)
    expect(jpPageCount(42)).toBe(1)
    expect(jpPageCount(50)).toBe(1)
    expect(jpPageCount(120)).toBe(3)
    expect(jpPageCount(200)).toBe(4)
  })
})

describe('mergeJpPages', () => {
  it('joins the pages in order, each wrestler once', () => {
    const first = parseJpSearchPage(page1)
    const third = parseJpSearchPage(page3)
    const merged = mergeJpPages([first, third, first])
    expect(merged.rows.map((r) => r.rikishiId)).toEqual([4242, 4357, 4189, 4156])
    expect(merged.rows[0]).toMatchObject({
      shikona: '伊波',
      reading: 'いなみ',
      side: 'east',
      rankName: '幕下筆頭',
      heyaName: '尾上',
    })
    expect(merged.rows[3]).toMatchObject({ side: 'west', rankName: '幕下六十枚目' })
    expect(merged.prefectures[46]).toBe('鹿児島県')
  })
})

describe('fetchJpPages', () => {
  it('fetches as many pages as the division needs, one at a time', async () => {
    const fetchPage = vi.fn(async (p: number) => (p === 3 ? page3 : page1))
    const merged = await fetchJpPages(120, fetchPage)
    expect(fetchPage.mock.calls.map(([p]) => p)).toEqual([1, 2, 3])
    expect(merged.rows).toHaveLength(4)
  })
})
