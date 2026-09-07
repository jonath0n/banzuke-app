/**
 * public/sample-data.json is the last-resort fallback shown when the live
 * snapshot fails validation and nothing is cached. It must be valid on its
 * own, clearly labelled, and deliberately smaller than the live file so it
 * cannot be mistaken for it. Regenerate with `npm run make-sample`.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateSnapshot } from './schema'

const root = resolve(__dirname, '../..')
const sample: unknown = JSON.parse(readFileSync(resolve(root, 'public/sample-data.json'), 'utf8'))

describe('public/sample-data.json', () => {
  const result = validateSnapshot(sample)

  it('is a valid version 2 snapshot', () => {
    expect(result.ok).toBe(true)
  })

  it('carries Makuuchi only', () => {
    if (!result.ok) throw new Error(result.errors.join('; '))
    expect(result.snapshot.divisions.juryo).toBeUndefined()
    expect(result.snapshot.divisions.makuuchi.payloads.en.BanzukeTable.length).toBeGreaterThan(0)
  })

  it('says what it is in its sources', () => {
    if (!result.ok) throw new Error(result.errors.join('; '))
    const { sources } = result.snapshot.divisions.makuuchi
    expect(sources.en).toMatch(/^Bundled sample/)
    expect(sources.jp).toMatch(/^Bundled sample/)
  })

  it('is not a copy of the live snapshot', () => {
    const live = readFileSync(resolve(root, 'public/latest-banzuke.json'), 'utf8')
    const text = readFileSync(resolve(root, 'public/sample-data.json'), 'utf8')
    expect(text).not.toBe(live)
  })
})
