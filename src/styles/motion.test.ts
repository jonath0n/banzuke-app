/**
 * The motion budget: four keyframe effects in the whole app, none infinite.
 * This is a printed document; adding an effect means removing one.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return name.endsWith('.css') ? [path] : []
  })
}

describe('motion budget', () => {
  const sources = cssFiles(root).map((path) => ({ path, css: readFileSync(path, 'utf8') }))
  const names = sources.flatMap(({ css }) =>
    [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1])
  )

  it('declares exactly four keyframe effects, each once', () => {
    expect([...names].sort()).toEqual(['backdropIn', 'fadeIn', 'modalSlideUp', 'riseIn'])
  })

  it('never loops', () => {
    for (const { path, css } of sources) {
      expect(css, path).not.toMatch(/animation[^;]*\binfinite\b/)
    }
  })
})
