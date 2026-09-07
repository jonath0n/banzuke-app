import { describe, expect, it } from 'vitest'
import { rosterFor } from './stables'
import { makeBanzuke, makeBanzukeSet, makeRikishi } from '../test/fixtures'

describe('rosterFor', () => {
  // The fixture set: Tatsunami (id 1) has Hoshoryu in Makuuchi and, once
  // added below, a Juryo man; Nishonoseki (32) has Onosato alone.
  const set = makeBanzukeSet()

  it('lists the sekitori in banzuke order with the division counts', () => {
    const juryoMan = makeRikishi({
      id: 2100,
      rankCode: 600,
      rankLevel: 'juryo',
      rankNumber: 3,
      side: 'west',
      shikona: { en: 'Tatsunami Two', jp: '立浪二' },
    })
    const withJuryo = makeBanzukeSet({
      juryo: { ...set.juryo!, rikishi: [...set.juryo!.rikishi, juryoMan] },
    })
    const roster = rosterFor(withJuryo, 1)
    expect(roster).not.toBeNull()
    expect(roster!.name).toEqual({ id: 1, en: 'Tatsunami', jp: '立浪' })
    expect(roster!.members.map((r) => r.id)).toEqual([3842, 2100])
    expect(roster!.makuuchi).toBe(1)
    expect(roster!.juryo).toBe(1)
  })

  it('keeps East before West at the same rank', () => {
    const shared = makeBanzuke({
      rikishi: [
        makeRikishi({ id: 1, side: 'east', heya: { id: 9, en: 'Kise', jp: '木瀬' } }),
        makeRikishi({ id: 2, side: 'west', heya: { id: 9, en: 'Kise', jp: '木瀬' } }),
      ],
    })
    expect(rosterFor({ makuuchi: shared, juryo: null }, 9)!.members.map((r) => r.id)).toEqual([
      1, 2,
    ])
  })

  it('works on a Makuuchi-only set', () => {
    const roster = rosterFor({ makuuchi: set.makuuchi, juryo: null }, 32)
    expect(roster!.members.map((r) => r.shikona.en)).toEqual(['Onosato'])
    expect(roster!.juryo).toBe(0)
  })

  it('returns null for an unknown id and never matches the empty id', () => {
    expect(rosterFor(set, 999)).toBeNull()
    const vacantish = makeBanzuke({
      rikishi: [makeRikishi({ heya: { id: 0, en: '', jp: '' } })],
    })
    expect(rosterFor({ makuuchi: vacantish, juryo: null }, 0)).toBeNull()
  })
})
