import { describe, expect, it } from 'vitest'
import { careerSteps, isRikishiProfile, validateProfiles, type RikishiProfile } from './profiles'

export const onosatoProfile: RikishiProfile = {
  id: 4227,
  realName: { en: 'Daiki Nakamura', jp: '中村 泰輝' },
  birthDate: '2000-06-07',
  birthplace: { en: 'Ishikawa', jp: '石川県河北郡津幡町' },
  heightCm: 190,
  weightKg: 188,
  kimarite: { en: 'tsuki, oshi, migi-yotsu, yori', jp: '突き・押し・右四つ・寄り' },
  debut: '2023-05',
  highestRank: { en: 'Yokozuna', jp: '横綱' },
  milestones: { juryo: '2023-09', makuuchi: '2024-01', yokozuna: '2025-07' },
  bashoId: 637,
}

const file = { version: 1, fetchedAt: '2026-09-04T00:00:00Z', profiles: { '4227': onosatoProfile } }

describe('validateProfiles', () => {
  it('accepts a well-formed file', () => {
    const result = validateProfiles(file)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.file.profiles['4227'].heightCm).toBe(190)
  })

  it('rejects the wrong shape', () => {
    expect(validateProfiles(null)).toEqual({ ok: false, error: 'profiles file is not an object' })
    expect(validateProfiles({ ...file, version: 2 }).ok).toBe(false)
    expect(validateProfiles({ ...file, profiles: [] }).ok).toBe(false)
    expect(validateProfiles({ ...file, fetchedAt: 5 }).ok).toBe(false)
  })

  it('rejects a malformed or mis-keyed profile', () => {
    const bad = validateProfiles({ ...file, profiles: { '4227': { id: 4227 } } })
    expect(bad).toEqual({ ok: false, error: 'profile 4227 is malformed' })
    const misKeyed = validateProfiles({ ...file, profiles: { '1': onosatoProfile } })
    expect(misKeyed).toEqual({ ok: false, error: 'profile 1 has id 4227' })
  })

  it('lists the recorded career steps in order', () => {
    expect(careerSteps(onosatoProfile)).toEqual([
      ['debut', '2023-05'],
      ['juryo', '2023-09'],
      ['makuuchi', '2024-01'],
      ['yokozuna', '2025-07'],
    ])
    expect(careerSteps({ debut: null, milestones: { ozeki: '2026-01' } })).toEqual([
      ['ozeki', '2026-01'],
    ])
    expect(careerSteps({ debut: null, milestones: {} })).toEqual([])
  })

  it('allows unknown values to be null', () => {
    const sparse: RikishiProfile = {
      ...onosatoProfile,
      birthDate: null,
      heightCm: null,
      weightKg: null,
      debut: null,
      milestones: {},
    }
    expect(isRikishiProfile(sparse)).toBe(true)
  })
})
