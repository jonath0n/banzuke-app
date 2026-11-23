import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test, type Page } from '@playwright/test'

const require = createRequire(import.meta.url)
const AXE = require.resolve('axe-core/axe.min.js')

/**
 * The clock is read off the committed data, so it never goes stale: the archive index ends at the
 * live tournament (src/data/archive-files.test.ts insists), and its results file says how far it
 * has been fought. A finished tournament is opened on day 8, as the spec always did; one in
 * progress on its latest decided day. 09:00Z is 18:00 JST, after the day's last bout.
 */
const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const LIVE: { bashoId: number; startDate: string } = readJson(
  '../public/banzuke/index.json'
).basho.at(-1)
const RESULTS_FILE = new URL(`../public/results/${LIVE.bashoId}.json`, import.meta.url)
const DECIDED: number = existsSync(RESULTS_FILE)
  ? JSON.parse(readFileSync(RESULTS_FILE, 'utf8')).day
  : 0
const DAY = DECIDED >= 15 ? 8 : Math.max(DECIDED, 1)
const IN_SEASON = new Date(
  Date.parse(`${LIVE.startDate}T09:00:00Z`) + (DAY - 1) * 86_400_000
).toISOString()
const WIDTHS = [360, 768, 1280] as const
const LANGS = ['en', 'jp'] as const
const VIEWS = ['sheet', 'list'] as const

async function open(page: Page, query: string) {
  await page.clock.setFixedTime(IN_SEASON)
  await page.goto(`./${query}`)
  await page.locator('button[data-id]').first().waitFor()
}

type Box = { x: number; y: number; width: number; height: number }

/** Every wrestler button with its side, pair and box, in DOM order. */
async function columns(page: Page) {
  return page.locator('button[data-id][data-pair]').evaluateAll((buttons) =>
    buttons.map((b) => {
      const r = b.getBoundingClientRect()
      const band = b.querySelector('[aria-hidden="true"]')?.getBoundingClientRect()
      return {
        id: b.getAttribute('data-id')!,
        side: b.getAttribute('data-side')!,
        pair: b.getAttribute('data-pair')!,
        box: { x: r.x, y: r.y, width: r.width, height: r.height } as Box,
        bandTop: band ? band.y : r.y,
      }
    })
  )
}

for (const width of WIDTHS) {
  for (const lang of LANGS) {
    for (const view of VIEWS) {
      test(`${view} at ${width}px in ${lang}: geometry, seating, axe`, async ({ page }, info) => {
        await page.setViewportSize({ width, height: 900 })
        await open(page, `?lang=${lang}${view === 'list' ? '&view=list' : ''}`)
        const cols = await columns(page)
        expect(cols.length).toBeGreaterThan(40)

        // Print order: on the List, East is the right-hand cell of its row; on
        // the Sheet, the East half is the upper half, so East stands above its
        // West partner (both halves run right to left within themselves).
        const bySide = new Map<string, Record<string, Box>>()
        for (const c of cols) bySide.set(c.pair, { ...bySide.get(c.pair), [c.side]: c.box })
        let pairs = 0
        for (const [pair, sides] of bySide) {
          if (!sides.east || !sides.west) continue
          pairs += 1
          if (view === 'list') {
            expect(sides.east.x, `pair ${pair}: East right of West`).toBeGreaterThan(sides.west.x)
          } else {
            expect(sides.east.y, `pair ${pair}: East above West`).toBeLessThan(sides.west.y)
          }
        }
        expect(pairs).toBeGreaterThanOrEqual(18)
        if (view === 'sheet') {
          // Each half reads right to left: the first column in DOM order is the rightmost of its band
          for (const side of ['east', 'west']) {
            const half = cols.filter((c) => c.side === side)
            const firstBand = half.filter((c) => Math.abs(c.box.y - half[0].box.y) < 8)
            expect(
              Math.max(...firstBand.map((c) => c.box.x)),
              `${side}: highest rank rightmost`
            ).toBe(half[0].box.x)
          }
        }

        // No horizontal scroll: the sheet wraps, the list fits
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
        expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(1)

        if (view === 'sheet') {
          // Columns in one band hang from the same top rule, within a pixel
          for (const side of ['east', 'west']) {
            const bands = new Map<number, number[]>()
            for (const c of cols.filter((c) => c.side === side)) {
              const key = Math.round(c.box.y / 8)
              bands.set(key, [...(bands.get(key) ?? []), c.bandTop])
            }
            for (const [, tops] of bands) {
              expect(
                Math.max(...tops) - Math.min(...tops),
                `${side} band tops`
              ).toBeLessThanOrEqual(1)
            }
          }
        }

        // The selected tab seats into the panel's frame: its bottom sits just below the panel's top
        const tab = await page.locator('[role="tab"][aria-selected="true"]').boundingBox()
        const panel = await page.locator('#division-panel > :first-child').boundingBox()
        expect(tab && panel).toBeTruthy()
        const overlap = tab!.y + tab!.height - panel!.y
        expect(overlap, 'tab seated into the frame').toBeGreaterThanOrEqual(1)
        expect(overlap, 'tab seated into the frame').toBeLessThanOrEqual(8)

        await info.attach(`${view}-${width}-${lang}.png`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        })

        // Accessibility: nothing serious or critical
        await page.addScriptTag({ path: AXE })
        const violations = await page.evaluate(async () => {
          type Result = { violations: Array<{ id: string; impact: string; nodes: unknown[] }> }
          const axe = (
            window as unknown as {
              axe: { run(context?: unknown, options?: unknown): Promise<Result> }
            }
          ).axe
          // Label in Name (WCAG 2.5.3) is checked for the wrestler buttons below instead: their
          // visible rank band, side seal, province and score are aria-hidden decoration that the
          // spoken name deliberately says in words, which axe's literal containment test rejects.
          const rule = 'label-content-name-mismatch'
          const everything = await axe.run(document, { rules: { [rule]: { enabled: false } } })
          const others = await axe.run(
            { include: [document], exclude: [['button[data-id]']] },
            { runOnly: [rule] }
          )
          return [...everything.violations, ...others.violations]
            .filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => `${v.id} (${v.impact}, ${v.nodes.length} nodes)`)
        })
        expect(violations).toEqual([])

        // Label in Name for the wrestler buttons: the ring name they show leads what they are
        // called, so "click Onosato" works in voice control in either language.
        const mismatched = await page.locator('button[data-id]').evaluateAll((buttons) =>
          buttons
            .map((b) => ({
              shown: b.querySelector('[class*="_name_"]')?.textContent?.trim() ?? '',
              label: b.getAttribute('aria-label') ?? '',
            }))
            .filter(({ shown, label }) => !shown || !label.startsWith(shown))
        )
        expect(mismatched).toEqual([])
      })
    }
  }
}

test('keyboard: the arrows walk the Sheet and the dialog opens on the name', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, '')
  const first = page.locator('button[data-id][data-side="east"]').first()
  await first.focus()
  const startId = await first.getAttribute('data-id')
  await page.keyboard.press('ArrowLeft')
  const next = page.locator('button[data-id]:focus')
  await expect(next).toHaveAttribute('data-side', 'east')
  expect(await next.getAttribute('data-id')).not.toBe(startId)
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('button[data-id]:focus')).toHaveAttribute('data-side', 'west')

  await page.keyboard.press('Enter')
  const dialog = page.locator('dialog[open]')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('h2')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('button[data-id]:focus')).toHaveCount(1)
})

test('in season the strip, the hoshitori and the card are on', async ({ page }) => {
  test.skip(
    DECIDED === 0,
    'No bouts decided yet for the live tournament (banzuke out, day 1 to come)'
  )
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, '')
  await expect(page.getByRole('complementary', { name: 'Today' })).toContainText(`Day ${DAY}`)
  // A complete file opens the card on senshuraku whatever the clock says; otherwise on today
  const card = DECIDED >= 15 ? /Senshuraku/ : new RegExp(`Day ${DAY}\\b`)
  await expect(page.getByRole('region', { name: card })).toBeVisible()
  const scored = page.locator('button[data-id]').filter({ hasText: /\d+–\d+/ })
  expect(await scored.count()).toBeGreaterThan(40)
})
