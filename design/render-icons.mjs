// Rasterizes the hanko favicon into the PNG icons the web manifest and iOS
// need. Run with `node design/render-icons.mjs` (playwright on the PATH, or
// NODE_PATH=$(npm root -g) when it is installed globally).
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync, readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const here = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(resolve(here, '../public/favicon.svg'), 'utf8')
const outDir = resolve(here, '../public/icons')
mkdirSync(outDir, { recursive: true })

// name, size, padding as a fraction of the size (maskable icons keep the
// seal inside the 80% safe zone; iOS draws its own corner radius).
const ICONS = [
  ['icon-192.png', 192, 0],
  ['icon-512.png', 512, 0],
  ['icon-maskable-512.png', 512, 0.1],
  ['apple-touch-icon.png', 180, 0],
]

const browser = await chromium.launch({ args: ['--no-proxy-server'] })
const page = await browser.newPage({ deviceScaleFactor: 1 })
for (const [name, size, pad] of ICONS) {
  const inner = Math.round(size * (1 - pad * 2))
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#b3301f;display:grid;place-items:center;width:${size}px;height:${size}px"><div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(outDir, name), type: 'png', clip: { x: 0, y: 0, width: size, height: size } })
  console.log(`Wrote icons/${name} (${size}px)`)
}
await browser.close()
