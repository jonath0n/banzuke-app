import { describe, expect, it } from 'vitest'
import { makeRecord, makeRikishi } from '../test/fixtures'
import { describeWrestler } from './describe'
import type { Movement } from './diff'

const up: Movement = {
  kind: 'up',
  previous: { division: 'makuuchi', rankCode: 200, rankNumber: 1, seat: 1, side: 'east' },
  sideChanged: false,
}

describe('describeWrestler', () => {
  it('opens with name and side, then the rank, then the action', () => {
    expect(describeWrestler(makeRikishi(), 'en')).toBe('Hoshoryu, East. Yokozuna. View details')
    expect(describeWrestler(makeRikishi(), 'jp')).toBe('豊昇龍、東、横綱。詳細を見る')
  })

  it('spells out everything the eye reads from a pill, a badge or a mark', () => {
    const rikishi = makeRikishi({ promotion: { kind: 'new-rank', raw: '新横綱' } })
    const record = makeRecord()
    expect(describeWrestler(rikishi, 'en', { movement: up, record, champion: true })).toBe(
      'Hoshoryu, East. Yokozuna. New Yokozuna. Up from O. 8 wins, 3 losses, 1 absence. Kachi-koshi. Yusho. View details'
    )
    expect(describeWrestler(rikishi, 'jp', { movement: up, record, champion: true })).toBe(
      '豊昇龍、東、横綱。新横綱。大関から。8勝3敗1休、勝ち越し。優勝。詳細を見る'
    )
  })

  it('can leave the action off for a name that is not a button', () => {
    expect(describeWrestler(makeRikishi(), 'en', { action: false })).toBe(
      'Hoshoryu, East. Yokozuna.'
    )
    expect(describeWrestler(makeRikishi(), 'jp', { action: false })).toBe('豊昇龍、東、横綱。')
  })

  it('falls back to the English name and rank when the Japanese is empty', () => {
    const rikishi = makeRikishi({
      shikona: { en: 'Ura', jp: '' },
      rankName: { en: 'Komusubi', jp: '' },
    })
    expect(describeWrestler(rikishi, 'jp')).toBe('Ura、東、Komusubi。詳細を見る')
  })
})
