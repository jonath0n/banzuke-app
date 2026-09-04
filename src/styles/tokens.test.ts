import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guards the colour tokens against contrast regressions: every text/background
 * pairing the UI relies on must meet WCAG AA (4.5:1) in both colour schemes.
 */
const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')

function parseBlock(source: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const match of source.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[match[1]] = match[2].trim()
  }
  return vars
}

const lightSource = css.slice(0, css.indexOf('@media (prefers-color-scheme: dark)'))
const darkSource = css.slice(css.indexOf('@media (prefers-color-scheme: dark)'))
const light = parseBlock(lightSource)
const dark = { ...light, ...parseBlock(darkSource) }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrast(a: string, b: string): number {
  const la = luminance(hexToRgb(a))
  const lb = luminance(hexToRgb(b))
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** [foreground token, background token] pairs that render text. */
const TEXT_PAIRS: Array<[string, string]> = [
  ['text', 'bg'],
  ['text', 'card-bg'],
  ['muted', 'bg'],
  ['muted', 'card-bg'],
  ['accent', 'bg'],
  ['accent', 'card-bg'],
  ['on-accent', 'accent'],
  ['on-tier', 'tier-yokozuna'],
  ['on-tier', 'tier-ozeki'],
  ['on-tier', 'tier-sekiwake'],
  ['status-live', 'bg'],
  ['status-upcoming', 'bg'],
]

describe.each([
  ['light', light],
  ['dark', dark],
])('%s tokens', (_scheme, tokens) => {
  it('defines every token used in the contrast pairs as a hex colour', () => {
    for (const pair of TEXT_PAIRS) {
      for (const name of pair) {
        expect(tokens[name], name).toMatch(/^#[0-9a-f]{3,6}$/i)
      }
    }
  })

  it.each(TEXT_PAIRS)('%s on %s meets WCAG AA (4.5:1)', (fg, bg) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps --accent-rgb in sync with --accent', () => {
    const rgb = tokens['accent-rgb'].split(/\s+/).map(Number)
    expect(rgb).toEqual(hexToRgb(tokens.accent))
  })
})
