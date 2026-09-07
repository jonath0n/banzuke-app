import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildStable, parseEnStable, parseJpStable } from './stable-parser'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, '__fixtures__', name), 'utf8')

describe('parseEnStable', () => {
  it('reads the stable name and the master card', () => {
    expect(parseEnStable(fixture('stable-en-1.html'))).toEqual({
      name: 'Tatsunami',
      masterName: 'Tatsunami Taiji',
      masterRank: 'Komusubi',
      masterShikona: 'Asahiyutaka',
    })
  })

  it('returns empty fields for a page without the card', () => {
    expect(parseEnStable('<html><body><p>Not found</p></body></html>')).toEqual({
      name: '',
      masterName: '',
      masterRank: '',
      masterShikona: '',
    })
  })
})

describe('parseJpStable', () => {
  it('reads the stable name, the address and the master card without readings', () => {
    expect(parseJpStable(fixture('stable-jp-1.html'))).toEqual({
      name: '立浪',
      address: '〒111-0023 東京都台東区橋場1-16-5',
      masterName: '立浪 耐治',
      masterRank: '小結',
      masterShikona: '旭豊',
    })
  })
})

describe('buildStable', () => {
  const en = parseEnStable(fixture('stable-en-1.html'))
  const jp = parseJpStable(fixture('stable-jp-1.html'))

  it('merges both languages into one record', () => {
    expect(buildStable(1, en, jp, 637)).toEqual({
      id: 1,
      name: { en: 'Tatsunami', jp: '立浪' },
      master: {
        name: { en: 'Tatsunami Taiji', jp: '立浪 耐治' },
        formerShikona: { en: 'Asahiyutaka', jp: '旭豊' },
        highestRank: { en: 'Komusubi', jp: '小結' },
      },
      address: '〒111-0023 東京都台東区橋場1-16-5',
      bashoId: 637,
    })
  })

  it('has no master when neither page names one, and no record when neither names the stable', () => {
    const noMaster = { ...en, masterName: '', masterRank: '', masterShikona: '' }
    expect(buildStable(1, noMaster, null, 637)?.master).toBeNull()
    expect(buildStable(1, { ...noMaster, name: '' }, null, 637)).toBeNull()
  })
})
