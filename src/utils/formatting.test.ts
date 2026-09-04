import { describe, expect, it, vi } from 'vitest'
import { makeRikishi } from '../test/fixtures'
import { buildPhotoUrl, formatRankLabel, groupRowsByRank } from './formatting'

describe('buildPhotoUrl', () => {
  it('defaults to the 60x60 thumbnail', () => {
    expect(buildPhotoUrl('20170096.jpg')).toBe(
      'https://www.sumo.or.jp/img/sumo_data/rikishi/60x60/20170096.jpg'
    )
  })

  it('supports the tall portrait', () => {
    expect(buildPhotoUrl('20170096.jpg', '270x474')).toBe(
      'https://www.sumo.or.jp/img/sumo_data/rikishi/270x474/20170096.jpg'
    )
  })
})

describe('formatRankLabel', () => {
  it('uses short codes for sanyaku and numbered ranks', () => {
    expect(
      formatRankLabel({ rankCode: 100, rankNumber: 1, name: { en: 'Yokozuna', jp: '横綱' } })
    ).toBe('Y')
    expect(
      formatRankLabel({ rankCode: 500, rankNumber: 17, name: { en: 'Maegashira #17', jp: '' } })
    ).toBe('M17')
    expect(
      formatRankLabel({ rankCode: 600, rankNumber: 3, name: { en: 'Juryo #3', jp: '' } })
    ).toBe('J3')
  })

  it('falls back to the English name for unknown codes', () => {
    expect(formatRankLabel({ rankCode: 999, rankNumber: 1, name: { en: 'Mystery', jp: '' } })).toBe(
      'Mystery'
    )
  })
})

describe('groupRowsByRank', () => {
  it('pairs East and West at the same position and keeps order', () => {
    const rows = [
      makeRikishi({ id: 1, side: 'east' }),
      makeRikishi({ id: 2, side: 'west' }),
      makeRikishi({ id: 3, side: 'east', rankCode: 500, rankLevel: 'maegashira', rankNumber: 1 }),
      makeRikishi({ id: 4, side: 'west', rankCode: 500, rankLevel: 'maegashira', rankNumber: 1 }),
      makeRikishi({ id: 5, side: 'east', rankCode: 500, rankLevel: 'maegashira', rankNumber: 2 }),
    ]
    const groups = groupRowsByRank(rows)
    expect(groups.map((g) => g.key)).toEqual(['100-1-1', '500-1-1', '500-2-1'])
    expect(groups[0].east?.id).toBe(1)
    expect(groups[0].west?.id).toBe(2)
    expect(groups[2].east?.id).toBe(5)
    expect(groups[2].west).toBeNull()
    expect(groups[1].rankLevel).toBe('maegashira')
  })

  it('places a duplicate-side wrestler in the free slot', () => {
    const rows = [makeRikishi({ id: 1, side: 'east' }), makeRikishi({ id: 2, side: 'east' })]
    const [group] = groupRowsByRank(rows)
    expect(group.east?.id).toBe(1)
    expect(group.west?.id).toBe(2)
  })

  it('keeps a second Ozeki pair as its own row (three Ozeki)', () => {
    const ozeki = { rankCode: 200, rankLevel: 'ozeki' as const, rankNumber: 1 }
    const rows = [
      makeRikishi({ ...ozeki, id: 3622, side: 'east', sortKey: '002000000100001' }),
      makeRikishi({ ...ozeki, id: 3661, side: 'west', sortKey: '002000000100001' }),
      makeRikishi({ ...ozeki, id: 4230, side: 'east', seat: 2, sortKey: '002000000100002' }),
    ]
    const groups = groupRowsByRank(rows)
    expect(groups.map((g) => g.key)).toEqual(['200-1-1', '200-1-2'])
    expect(groups[1].seat).toBe(2)
    expect(groups[1].east?.id).toBe(4230)
    // The vacant West beside the third Ozeki stays empty
    expect(groups[1].west).toBeNull()
  })

  it('warns instead of silently dropping a wrestler at a full position', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const rows = [
      makeRikishi({ id: 1, side: 'east' }),
      makeRikishi({ id: 2, side: 'west' }),
      makeRikishi({ id: 3, side: 'west' }),
    ]
    const groups = groupRowsByRank(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].west?.id).toBe(2)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
