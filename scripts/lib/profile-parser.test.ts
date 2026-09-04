import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildProfile,
  parseEnDate,
  parseEnProfile,
  parseJpProfile,
  translateRank,
} from './profile-parser'

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, '__fixtures__', name), 'utf8')

describe('parseEnProfile', () => {
  it('reads the basic information table', () => {
    expect(parseEnProfile(fixture('profile-en-4227.html'))).toEqual({
      stable: 'Nishonoseki',
      realName: 'Daiki Nakamura',
      ringName: 'Onosato',
      currentRank: 'Yokozuna',
      birthDate: '2000-06-07',
      birthplace: 'Ishikawa',
      heightCm: 190,
      weightKg: 188,
      kimarite: 'tsuki, oshi, migi-yotsu, yori',
    })
  })

  it('returns empty fields for a page without the table', () => {
    const profile = parseEnProfile('<html><body><p>Not found</p></body></html>')
    expect(profile.ringName).toBe('')
    expect(profile.heightCm).toBeNull()
    expect(profile.birthDate).toBeNull()
  })
})

describe('parseJpProfile', () => {
  it('reads the basic information table and career milestones', () => {
    expect(parseJpProfile(fixture('profile-jp-4227.html'))).toEqual({
      heya: '二所ノ関',
      realName: '中村 泰輝',
      shikona: '大の里',
      reading: 'おおのさと だいき',
      birthDate: '2000-06-07',
      birthplace: '石川県河北郡津幡町',
      heightCm: 190,
      weightKg: 188,
      kimarite: '突き・押し・右四つ・寄り',
      debut: '2023-05',
      milestones: {
        juryo: '2023-09',
        makuuchi: '2024-01',
        sanyaku: '2024-05',
        ozeki: '2024-11',
        yokozuna: '2025-07',
      },
      highestRank: '横綱',
    })
  })
})

describe('parseEnDate', () => {
  it('reads the English long date', () => {
    expect(parseEnDate('June 7, 2000')).toBe('2000-06-07')
    expect(parseEnDate('December 31, 1999')).toBe('1999-12-31')
    expect(parseEnDate('Smarch 1, 2000')).toBeNull()
    expect(parseEnDate(undefined)).toBeNull()
  })
})

describe('translateRank', () => {
  it('translates kanji ranks with positions', () => {
    expect(translateRank('横綱')).toBe('Yokozuna')
    expect(translateRank('前頭筆頭')).toBe('Maegashira #1')
    expect(translateRank('前頭三枚目')).toBe('Maegashira #3')
    expect(translateRank('十両十四枚目')).toBe('Juryo #14')
    expect(translateRank('幕下')).toBe('Makushita')
    expect(translateRank('unknown')).toBe('unknown')
  })
})

describe('buildProfile', () => {
  it('merges both languages and tolerates a missing page', () => {
    const en = parseEnProfile(fixture('profile-en-4227.html'))
    const jp = parseJpProfile(fixture('profile-jp-4227.html'))
    const profile = buildProfile(4227, en, jp, 637)
    expect(profile).toMatchObject({
      id: 4227,
      realName: { en: 'Daiki Nakamura', jp: '中村 泰輝' },
      birthDate: '2000-06-07',
      birthplace: { en: 'Ishikawa', jp: '石川県河北郡津幡町' },
      heightCm: 190,
      weightKg: 188,
      debut: '2023-05',
      highestRank: { en: 'Yokozuna', jp: '横綱' },
      bashoId: 637,
    })
    expect(profile.milestones.yokozuna).toBe('2025-07')

    const jpOnly = buildProfile(4227, null, jp, 637)
    expect(jpOnly.birthDate).toBe('2000-06-07')
    expect(jpOnly.realName.en).toBe('')
    expect(jpOnly.heightCm).toBe(190)

    const enOnly = buildProfile(4227, en, null, 637)
    expect(enOnly.debut).toBeNull()
    expect(enOnly.highestRank).toEqual({ en: '', jp: '' })
  })
})
