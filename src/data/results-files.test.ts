/**
 * Every committed results file validates and is named by its basho id, and
 * the July 2026 file — the seed and the fixture for the parser — is complete.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resultsFileName, validateResults } from './results'

const dir = resolve(__dirname, '../../public/results')

describe('public/results', () => {
  const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')) : []

  it('holds at least the July 2026 seed', () => {
    expect(files).toContain('636.json')
  })

  it.each(files)('%s validates and is named by its basho id', (file) => {
    const result = validateResults(JSON.parse(readFileSync(resolve(dir, file), 'utf8')))
    if (!result.ok) throw new Error(`${file}: ${result.error}`)
    expect(resultsFileName(result.results.bashoId)).toBe(file)
    expect(result.results.divisions).toEqual(['makuuchi', 'juryo'])
  })

  it('has fifteen complete days for July 2026', () => {
    const result = validateResults(JSON.parse(readFileSync(resolve(dir, '636.json'), 'utf8')))
    if (!result.ok) throw new Error(result.error)
    expect(result.results.day).toBe(15)
    expect(Object.keys(result.results.torikumi)).toHaveLength(15)
    expect(Object.keys(result.results.records)).toHaveLength(70)
    expect(result.results.yusho.makuuchi).toBeDefined()
  })
})
