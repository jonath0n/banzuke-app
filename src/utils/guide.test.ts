import { describe, expect, it } from 'vitest'
import { buildGuide } from './guide'
import { makeBanzuke, makeRikishi } from '../test/fixtures'

const rows = makeBanzuke().rikishi // 3842 Y-E, 4227 Y-W, 4055 M1-E

describe('buildGuide', () => {
  it('numbers the marks in legend order over the rows on screen', () => {
    const guide = buildGuide(rows, { movements: false, records: false })
    expect(guide.items).toEqual(['size', 'east', 'tier', 'numeral', 'origin', 'name', 'gold'])
    expect(guide.marks).toEqual([
      { n: 1, key: 'size', zone: 'name', rikishiId: 3842 },
      { n: 2, key: 'east', zone: 'sideMark', rikishiId: null },
      { n: 3, key: 'tier', zone: 'rank', rikishiId: 4055 },
      { n: 4, key: 'numeral', zone: 'numeral', rikishiId: 4055 },
      { n: 5, key: 'origin', zone: 'origin', rikishiId: 4055 },
      { n: 6, key: 'name', zone: 'name', rikishiId: 4055 },
      { n: 7, key: 'gold', zone: 'top', rikishiId: 3842 },
    ])
  })

  it('adds the overlay items only when the overlays are on', () => {
    const guide = buildGuide(rows, { movements: true, records: true })
    expect(guide.items.slice(-2)).toEqual(['changes', 'results'])
    expect(guide.marks.at(-2)).toEqual({
      n: 8,
      key: 'changes',
      zone: 'movement',
      rikishiId: 3842,
    })
    expect(guide.marks.at(-1)).toEqual({
      n: 9,
      key: 'results',
      zone: 'record',
      rikishiId: 3842,
    })
  })

  it('skips the gold item when no Yokozuna is on the sheet and the numeral when no numbered rank is', () => {
    const ozekiOnly = [
      makeRikishi({
        id: 1,
        rankCode: 200,
        rankLevel: 'ozeki',
        rankName: { en: 'Ozeki', jp: '大関' },
      }),
    ]
    const guide = buildGuide(ozekiOnly, { movements: false, records: false })
    expect(guide.items).toEqual(['size', 'east', 'tier', 'origin', 'name'])
    expect(guide.marks.map((m) => m.rikishiId)).toEqual([1, null, 1, 1, 1])
  })

  it('marks the two ends of the Maegashira ladder', () => {
    const many = [
      ...rows,
      makeRikishi({
        id: 9,
        rankCode: 500,
        rankLevel: 'maegashira',
        rankNumber: 17,
        side: 'east',
        rankName: { en: 'Maegashira #17', jp: '前頭十七枚目' },
      }),
    ]
    const guide = buildGuide(many, { movements: false, records: false })
    const by = (key: string) => guide.marks.find((m) => m.key === key)!.rikishiId
    expect(by('tier')).toBe(9)
    expect(by('numeral')).toBe(9)
    expect(by('origin')).toBe(9)
    expect(by('name')).toBe(4055)
  })

  it('is empty for an empty sheet', () => {
    expect(buildGuide([], { movements: false, records: false })).toEqual({
      marks: [],
      items: [],
    })
  })
})
