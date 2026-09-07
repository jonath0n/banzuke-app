import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  archiveFromSumoApi,
  cleanShikonaJp,
  parseRank,
  shusshinRegion,
  type SumoApiBanzuke,
  type SumoApiRikishi,
} from './sumo-api.ts'
import { validateArchive } from '../../src/data/archive.ts'

const fixtures = resolve(__dirname, '__fixtures__')
const load = <T>(name: string): T => JSON.parse(readFileSync(resolve(fixtures, name), 'utf8')) as T

describe('parseRank', () => {
  it.each([
    ['Yokozuna 1 East', { rankCode: 100, rankNumber: 1, seat: 1, side: 'east' }],
    ['Ozeki 2 West', { rankCode: 200, rankNumber: 1, seat: 2, side: 'west' }],
    ['Sekiwake 1 East', { rankCode: 300, rankNumber: 1, seat: 1, side: 'east' }],
    ['Komusubi 1 West', { rankCode: 400, rankNumber: 1, seat: 1, side: 'west' }],
    ['Maegashira 16 East', { rankCode: 500, rankNumber: 16, seat: 1, side: 'east' }],
    ['Juryo 14 West', { rankCode: 600, rankNumber: 14, seat: 1, side: 'west' }],
  ])('parses %s', (rank, expected) => {
    expect(parseRank(rank)).toEqual(expected)
  })

  it('rejects anything else', () => {
    expect(parseRank('Makushita 1 East')).toBeNull()
    expect(parseRank('Maegashira East')).toBeNull()
    expect(parseRank('')).toBeNull()
  })
})

describe('cleanShikonaJp', () => {
  it('keeps the ring name and drops the given name and any reading', () => {
    expect(cleanShikonaJp('豊昇龍　智勝', 'Hoshoryu')).toBe('豊昇龍')
    expect(cleanShikonaJp('旭富士(あさひふじ)', 'Asahifuji')).toBe('旭富士')
    expect(cleanShikonaJp('安青錦　新大', 'Aonishiki')).toBe('安青錦')
  })

  it('falls back to the English name when there is no Japanese', () => {
    expect(cleanShikonaJp(undefined, 'Hoshoryu')).toBe('Hoshoryu')
    expect(cleanShikonaJp('', 'Hoshoryu')).toBe('Hoshoryu')
  })
})

describe('shusshinRegion', () => {
  it('reduces a birthplace to its prefecture or country', () => {
    expect(shusshinRegion('Ishikawa-ken, Kahoku-gun, Tsubata-machi')).toBe('Ishikawa')
    expect(shusshinRegion('Mongolia, Ulaanbaatar')).toBe('Mongolia')
    expect(shusshinRegion('Tokyo-to, Koto-ku')).toBe('Tokyo')
    expect(shusshinRegion('Osaka-fu, Sakai-shi')).toBe('Osaka')
    expect(shusshinRegion('Hokkaido, Sapporo-shi')).toBe('Hokkaido')
    expect(shusshinRegion(undefined)).toBe('')
  })
})

describe('archiveFromSumoApi', () => {
  const basho = {
    date: '202607',
    startDate: '2026-07-12T00:00:00Z',
    endDate: '2026-07-26T00:00:00Z',
  }
  const rikishi = new Map<number, SumoApiRikishi>([
    [
      19,
      {
        id: 19,
        nskId: 3842,
        shikonaEn: 'Hoshoryu',
        shikonaJp: '豊昇龍　智勝',
        heya: 'Tatsunami',
        shusshin: 'Mongolia, Ulaanbaatar',
      },
    ],
    [
      8850,
      {
        id: 8850,
        nskId: 4227,
        shikonaEn: 'Onosato',
        shikonaJp: '大の里　泰輝',
        heya: 'Nishonoseki',
        shusshin: 'Ishikawa-ken, Kahoku-gun',
      },
    ],
    [999, { id: 999, nskId: 0, shikonaEn: 'Nobody' }],
  ])
  const banzuke: SumoApiBanzuke[] = [
    {
      bashoId: '202607',
      division: 'Makuuchi',
      east: [
        {
          side: 'East',
          rikishiID: 19,
          shikonaEn: 'Hoshoryu',
          shikonaJp: '豊昇龍　智勝',
          rank: 'Yokozuna 1 East',
        },
      ],
      west: [
        {
          side: 'West',
          rikishiID: 8850,
          shikonaEn: 'Onosato',
          shikonaJp: '大の里　泰輝',
          rank: 'Yokozuna 1 West',
        },
      ],
    },
    {
      bashoId: '202607',
      division: 'Juryo',
      east: [{ side: 'East', rikishiID: 999, shikonaEn: 'Nobody', rank: 'Juryo 1 East' }],
      west: [],
    },
  ]

  it('builds a valid archive keyed by JSA id, in banzuke order', () => {
    const { archive, problems } = archiveFromSumoApi({ basho, banzuke, rikishi })
    expect(archive.bashoId).toBe(636)
    expect(archive.year).toBe(2026)
    expect(archive.month).toBe(7)
    expect(archive.startDate).toBe('2026-07-12')
    expect(archive.endDate).toBe('2026-07-26')
    expect(archive.source).toBe('sumo-api')
    // Nobody, the sole Juryo entry, has no JSA id and is dropped — no Juryo rows means
    // divisions honestly reports only makuuchi.
    expect(archive.divisions).toEqual(['makuuchi'])
    expect(archive.rikishi.map((r) => r.id)).toEqual([3842, 4227])
    expect(archive.rikishi[0]).toEqual({
      id: 3842,
      shikona: { en: 'Hoshoryu', jp: '豊昇龍' },
      division: 'makuuchi',
      rankCode: 100,
      rankNumber: 1,
      seat: 1,
      side: 'east',
      heya: { en: 'Tatsunami', jp: '' },
      pref: { en: 'Mongolia', jp: '' },
    })
    expect(problems).toEqual(['Juryo: Nobody (sumo-api 999) has no JSA id'])
    expect(validateArchive(archive).ok).toBe(true)
  })

  it('orders East before West within a position and positions by rank', () => {
    const swapped: SumoApiBanzuke[] = [
      {
        ...banzuke[0],
        east: banzuke[0].west.map((e) => ({ ...e, side: 'East' as const, rank: 'Ozeki 1 East' })),
        west: banzuke[0].east.map((e) => ({
          ...e,
          side: 'West' as const,
          rank: 'Yokozuna 1 West',
        })),
      },
    ]
    const { archive } = archiveFromSumoApi({ basho, banzuke: swapped, rikishi })
    expect(archive.rikishi.map((r) => [r.id, r.rankCode, r.side])).toEqual([
      [3842, 100, 'west'],
      [4227, 200, 'east'],
    ])
  })
})

describe('against the JSA snapshot for the same tournament', () => {
  it('reproduces basho 637 (public/banzuke/637.json) from the sumo-api 202609 fixtures', () => {
    const result = validateArchive(
      JSON.parse(readFileSync(resolve(__dirname, '../../public/banzuke/637.json'), 'utf8'))
    )
    if (!result.ok) throw new Error(result.error)
    const expected = result.archive

    const rikishi = new Map(
      load<SumoApiRikishi[]>('sumo-api-202609-rikishis.json').map((r) => [r.id, r])
    )
    const { archive, problems } = archiveFromSumoApi({
      basho: { date: '202609', startDate: '2026-09-13T00:00:00Z', endDate: '2026-09-27T00:00:00Z' },
      banzuke: [
        load<SumoApiBanzuke>('sumo-api-202609-makuuchi.json'),
        load<SumoApiBanzuke>('sumo-api-202609-juryo.json'),
      ],
      rikishi,
    })
    expect(problems).toEqual([])

    const key = (r: {
      id: number
      rankCode: number
      rankNumber: number
      seat: number
      side: string
    }) => `${r.id}:${r.rankCode}:${r.rankNumber}:${r.seat}:${r.side}`
    const fromJsa = expected.rikishi.map(key)
    const fromApi = archive.rikishi.map(key)
    expect(fromApi).toEqual(fromJsa)

    const jsaNames = new Map(expected.rikishi.map((r) => [r.id, r.shikona.jp]))
    for (const r of archive.rikishi) expect(r.shikona.jp, r.shikona.en).toBe(jsaNames.get(r.id))
  })
})
