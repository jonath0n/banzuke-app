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
/** The top division, and the biggest below Juryo (two hundred names, ranks past a hundred). */
const DIVISIONS = ['makuuchi', 'jonidan'] as const

async function open(page: Page, query: string) {
  await page.clock.setFixedTime(IN_SEASON)
  await page.goto(`./${query}`)
  await page.locator('button[data-id]').first().waitFor()
}

type Box = { x: number; y: number; width: number; height: number }

/** Every wrestler button with its side, pair and box, in DOM order. */
async function cells(page: Page) {
  return page.locator('button[data-id][data-pair]').evaluateAll((buttons) =>
    buttons.map((b) => {
      const r = b.getBoundingClientRect()
      return {
        id: b.getAttribute('data-id')!,
        side: b.getAttribute('data-side')!,
        pair: b.getAttribute('data-pair')!,
        box: { x: r.x, y: r.y, width: r.width, height: r.height } as Box,
      }
    })
  )
}

for (const division of DIVISIONS) {
  for (const width of WIDTHS) {
    for (const lang of LANGS) {
      test(`${division} list at ${width}px in ${lang}: geometry, seating, axe`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 900 })
        await open(page, `?lang=${lang}${division === 'makuuchi' ? '' : `&div=${division}`}`)
        const all = await cells(page)
        expect(all.length).toBeGreaterThan(40)

        // Print order: East is the right-hand cell of its row, and the rows run down in rank order
        const bySide = new Map<string, Record<string, Box>>()
        for (const c of all) bySide.set(c.pair, { ...bySide.get(c.pair), [c.side]: c.box })
        let pairs = 0
        for (const [pair, sides] of bySide) {
          if (!sides.east || !sides.west) continue
          pairs += 1
          expect(sides.east.x, `pair ${pair}: East right of West`).toBeGreaterThan(sides.west.x)
        }
        expect(pairs).toBeGreaterThanOrEqual(18)
        for (const side of ['east', 'west']) {
          const ys = all.filter((c) => c.side === side).map((c) => c.box.y)
          expect(
            ys.every((y, i) => i === 0 || y > ys[i - 1]),
            `${side}: ranks run down`
          ).toBe(true)
        }

        // No horizontal scroll: the list fits
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        )
        expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(1)

        // All six division tabs sit on one line inside the viewport
        const tabs = await page
          .locator('[role="tab"]')
          .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))
        expect(tabs).toHaveLength(6)
        expect(new Set(tabs.map((t) => Math.round(t.y))).size, 'tabs on one line').toBe(1)
        const sheet = await page.locator('#division-panel').boundingBox()
        expect(Math.max(...tabs.map((t) => t.right)), 'tabs within the sheet').toBeLessThanOrEqual(
          sheet!.x + sheet!.width + 1
        )
        expect(
          Math.min(...tabs.map((t) => t.left)),
          'tabs within the sheet'
        ).toBeGreaterThanOrEqual(sheet!.x - 1)

        // The selected tab seats into the panel's frame: its bottom sits just below the panel's top
        const tab = await page.locator('[role="tab"][aria-selected="true"]').boundingBox()
        const panel = await page.locator('#division-panel > :first-child').boundingBox()
        expect(tab && panel).toBeTruthy()
        const overlap = tab!.y + tab!.height - panel!.y
        expect(overlap, 'tab seated into the frame').toBeGreaterThanOrEqual(1)
        expect(overlap, 'tab seated into the frame').toBeLessThanOrEqual(8)

        await info.attach(`list-${division}-${width}-${lang}.png`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        })

        // Accessibility: nothing serious or critical, on the settled page. The entrance (rows
        // rising, the 優勝 stamps pressed in) passes through partial opacity on purpose, and axe
        // would measure a stamp mid-press as low contrast.
        await page.locator('main[data-entered]').waitFor()
        // Let the 優勝 stamp's press and the foil finish first: axe samples colours, and a stamp
        // caught half-pressed reads as low contrast. Nothing in the app loops, so this ends.
        await page.waitForFunction(() =>
          document.getAnimations().every((a) => a.playState !== 'running')
        )
        await page.addScriptTag({ path: AXE })
        const violations = await page.evaluate(async () => {
          type Result = { violations: Array<{ id: string; impact: string; nodes: unknown[] }> }
          const axe = (
            window as unknown as {
              axe: { run(context?: unknown, options?: unknown): Promise<Result> }
            }
          ).axe
          // Label in Name (WCAG 2.5.3) is checked for the wrestler buttons below instead: their
          // visible rank, side, details and score are aria-hidden decoration that the
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

test('keyboard: the arrows walk the List and the dialog opens on the name', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, '')
  const first = page.locator('button[data-id][data-side="east"]').first()
  await first.focus()
  const startId = await first.getAttribute('data-id')
  await page.keyboard.press('ArrowDown')
  const next = page.locator('button[data-id]:focus')
  await expect(next).toHaveAttribute('data-side', 'east')
  expect(await next.getAttribute('data-id')).not.toBe(startId)
  await page.keyboard.press('ArrowLeft')
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

/** An archived sheet with one on each side, so the picker shows ‹, its label, › and "Current". */
const ARCHIVED: number = readJson('../public/banzuke/index.json').basho.at(-3).bashoId

for (const width of [320, 360] as const) {
  for (const lang of LANGS) {
    test(`an archived sheet fits ${width}px in ${lang}, picker and all`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await open(page, `?lang=${lang}&basho=${ARCHIVED}`)
      await expect(page.locator(`nav[data-basho="${ARCHIVED}"]`)).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      )
      expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(1)
    })
  }
}

test('keyboard: the picker keeps focus and the List keeps it clear of the tier bar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  // Instant scrolling (base.css under reduced motion), so each step is measured where it settles
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, `?basho=${ARCHIVED}`)
  // ‹ to the older sheet: focus lands on that sheet's own ‹ (WCAG 2.4.3)
  await page.locator('[data-picker="previous"]').focus()
  await page.keyboard.press('Enter')
  await expect(
    page.locator(`nav[data-basho="${ARCHIVED - 1}"] [data-picker="previous"]`)
  ).toBeFocused()
  // "Current banzuke" has no counterpart on the live sheet: its picker's label takes focus
  await page.locator('[data-picker="current"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('nav[data-basho="live"] [data-picker="label"]')).toBeFocused()

  // Down the Maegashira and back up: the focused wrestler is never under the sticky bar (2.4.11)
  await page.locator('button[data-id][data-side="east"]').first().focus()
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowDown')
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('ArrowUp')
    const hidden = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return hit !== null && !el.contains(hit) && hit.closest('h2') !== null
    })
    expect(hidden, `step ${i}: focused wrestler under a tier bar`).toBe(false)
  }
})
