import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Type sizes come from the --text-* ladder in tokens.css, never typed by hand:
 * a 0.6rem here and a 0.65rem there is how the smallest text drifts apart. Sizes
 * in em scale with their parent and are allowed; the Sheet's name ladder is
 * computed from --col-scale and is allowed too.
 */
const componentsDir = resolve(__dirname, '../components')

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return name.endsWith('.css') ? [path] : []
  })
}

describe('type sizes', () => {
  it('come from the tokens, not from a literal rem in component CSS', () => {
    const offenders: string[] = []
    for (const path of cssFiles(componentsDir)) {
      const css = readFileSync(path, 'utf8')
      for (const match of css.matchAll(/font-size:\s*(\d*\.?\d+)rem/g)) {
        const line = css.slice(0, match.index).split('\n').length
        offenders.push(`${path.slice(componentsDir.length + 1)}:${line} ${match[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('declares the ladder in order', () => {
    const tokens = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8')
    const ladder = ['2xs', 'xs', 'sm', 'base', 'md', 'lg', '2xl'].map((step) => {
      const match = tokens.match(new RegExp(`--text-${step}:\\s*([\\d.]+)rem;`))
      expect(match, `--text-${step}`).not.toBeNull()
      return Number(match![1])
    })
    expect([...ladder].sort((a, b) => a - b)).toEqual(ladder)
  })
})
