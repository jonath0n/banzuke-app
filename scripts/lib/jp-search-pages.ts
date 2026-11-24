/**
 * The Japanese rikishi list shows fifty wrestlers a page (its `v` field is
 * ignored), so a division below Juryo spans several: Makushita three, Jonidan
 * four. The page is chosen by POSTing `p`. This fetches as many pages as the
 * English banzuke has wrestlers for and merges them into one page's worth.
 */
import { parseJpSearchPage, type JpSearchPage } from './jp-search-page.ts'

/** Wrestlers per page of the Japanese list. */
export const JP_PAGE_SIZE = 50

/** Pages needed for a division of `wrestlers` (at least one). */
export function jpPageCount(wrestlers: number): number {
  return Math.max(1, Math.ceil(wrestlers / JP_PAGE_SIZE))
}

/** One page's rows after another, each wrestler once; prefectures from them all. */
export function mergeJpPages(pages: JpSearchPage[]): JpSearchPage {
  const seen = new Set<number>()
  const rows: JpSearchPage['rows'] = []
  const prefectures: JpSearchPage['prefectures'] = {}
  for (const page of pages) {
    Object.assign(prefectures, page.prefectures)
    for (const row of page.rows) {
      if (seen.has(row.rikishiId)) continue
      seen.add(row.rikishiId)
      rows.push(row)
    }
  }
  return { rows, prefectures }
}

/**
 * Fetches pages 1…n in turn (gently: one request at a time) and merges them.
 * `fetchPage` returns the HTML for a page number.
 */
export async function fetchJpPages(
  wrestlers: number,
  fetchPage: (page: number) => Promise<string>
): Promise<JpSearchPage> {
  const pages: JpSearchPage[] = []
  for (let p = 1; p <= jpPageCount(wrestlers); p++) {
    pages.push(parseJpSearchPage(await fetchPage(p)))
  }
  return mergeJpPages(pages)
}
