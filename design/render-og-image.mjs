// Rasterizes design/og-image.html to public/og-image.png (1200×630).
// Needs a Playwright install on the PATH: `npx playwright install chromium`,
// then `node design/render-og-image.mjs` (or NODE_PATH=$(npm root -g) if
// playwright is installed globally).
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, 'og-image.html')
const output = resolve(here, '../public/og-image.png')

const browser = await chromium.launch({ args: ['--no-proxy-server'] })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
await page.goto(`file://${source}`)
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: output, type: 'png' })
await browser.close()
console.log(`Wrote ${output}`)
