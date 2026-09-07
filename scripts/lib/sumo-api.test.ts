import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  archiveFromSumoApi,
  cleanShikonaJp,
  parseOutcome,
  parseRank,
  resultsFromSumoApi,
  shusshinRegion,
  type SumoApiBanzuke,
  type SumoApiBasho,
  type SumoApiRikishi,
  type SumoApiTorikumi,
} from './sumo-api.ts'
import { validateArchive } from '../../src/data/archive.ts'
import { validateResults } from '../../src/data/results.ts'

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

describe('parseOutcome', () => {
  it.each([
    ['win', 'win'],
    ['loss', 'loss'],
    ['fusen win', 'fusen-win'],
    ['fusen loss', 'fusen-loss'],
    ['absent', 'absent'],
  ])('maps %s', (raw, outcome) => {
    expect(parseOutcome(raw)).toBe(outcome)
  })
  it('rejects anything else, including the empty result of an unfought day', () => {
    expect(parseOutcome('')).toBeNull()
    expect(parseOutcome('draw')).toBeNull()
  })
})

describe('resultsFromSumoApi (July 2026)', () => {
  const rikishi = new Map(
    load<SumoApiRikishi[]>('sumo-api-202609-rikishis.json').map((r) => [r.id, r])
  )
  const banzuke = [
    load<SumoApiBanzuke>('sumo-api-202607-makuuchi-results.json'),
    load<SumoApiBanzuke>('sumo-api-202607-juryo-results.json'),
  ]
  const torikumi = new Map<number, SumoApiTorikumi>([
    [1, load<SumoApiTorikumi>('sumo-api-202607-torikumi-makuuchi-1.json')],
    [15, load<SumoApiTorikumi>('sumo-api-202607-torikumi-makuuchi-15.json')],
  ])
  const basho = load<SumoApiBasho>('sumo-api-202607-basho.json')
  const { results, problems } = resultsFromSumoApi({
    bashoId: 636,
    fetchedAt: '2026-09-07T00:00:00.000Z',
    basho,
    banzuke,
    torikumi,
    rikishi,
  })

  it('maps every wrestler to a JSA id and validates', () => {
    expect(problems).toEqual([])
    expect(validateResults(results).ok).toBe(true)
    expect(results.bashoId).toBe(636)
    expect(results.divisions).toEqual(['makuuchi', 'juryo'])
    expect(Object.keys(results.records)).toHaveLength(
      banzuke[0].east.length +
        banzuke[0].west.length +
        banzuke[1].east.length +
        banzuke[1].west.length
    )
  })

  it('agrees with the archived July banzuke on who was there', () => {
    const archive = validateArchive(
      JSON.parse(readFileSync(resolve(__dirname, '../../public/banzuke/636.json'), 'utf8'))
    )
    if (!archive.ok) throw new Error(archive.error)
    const archivedIds = archive.archive.rikishi.map((r) => String(r.id)).sort()
    expect(Object.keys(results.records).sort()).toEqual(archivedIds)
  })

  it('keeps fifteen decided bouts per wrestler that add up to the totals', () => {
    for (const [id, record] of Object.entries(results.records)) {
      expect(record.bouts, id).toHaveLength(15)
      expect(record.wins + record.losses + record.absences, id).toBe(15)
      expect(record.bouts.filter((b) => b.outcome === 'absent').length, id).toBe(record.absences)
      expect(
        record.bouts.every((b, i) => b.day === i + 1),
        id
      ).toBe(true)
      expect(
        record.bouts.every((b) => (b.outcome === 'absent') === (b.opponent === null)),
        id
      ).toBe(true)
    }
  })

  it('reads Onosato as 12 wins and Hoshoryu with one fusen loss and one absence', () => {
    // JSA ids: Onosato 4227, Hoshoryu 3842 — the probe on 2026-09-07 showed 7-7-1 for Hoshoryu.
    const hoshoryu = results.records['3842']
    expect(hoshoryu.absences).toBe(1)
    expect(hoshoryu.bouts.some((b) => b.outcome === 'fusen-loss' && b.kimarite === 'fusen')).toBe(
      true
    )
    expect(results.records['4227'].wins + results.records['4227'].losses).toBe(15)
  })

  it('maps the day 15 torikumi to JSA ids with the winner among the two fighters', () => {
    const day15 = results.torikumi['15']
    expect(day15.length).toBeGreaterThan(15)
    for (const match of day15) {
      expect(match.division).toBe('makuuchi')
      expect(match.winnerId).not.toBeNull()
      expect([match.east.id, match.west.id]).toContain(match.winnerId)
      expect(match.kimarite).not.toBe('')
    }
    expect(day15.map((m) => m.matchNo)).toEqual(day15.map((_, i) => i + 1))
    expect(results.torikumi['1']).toBeDefined()
    expect(results.torikumi['2']).toBeUndefined()
    expect(results.day).toBe(15)
  })

  it('names the Makuuchi and Juryo champions by JSA id and ignores lower divisions', () => {
    expect(Object.keys(results.yusho).sort()).toEqual(['juryo', 'makuuchi'])
    expect(results.records[String(results.yusho.makuuchi)].wins).toBeGreaterThanOrEqual(12)
  })

  it('tolerates an unpublished torikumi and a partial record', () => {
    const partial: SumoApiBanzuke = {
      ...banzuke[0],
      east: [
        {
          ...banzuke[0].east[0],
          record: banzuke[0].east[0].record!.slice(0, 3).concat([
            {
              result: '',
              opponentShikonaEn: '',
              opponentShikonaJp: '',
              opponentID: 0,
              kimarite: '',
            },
          ]),
          wins: undefined,
          losses: undefined,
          absences: undefined,
        },
      ],
      west: [],
    }
    const out = resultsFromSumoApi({
      bashoId: 636,
      fetchedAt: 'x',
      basho: { date: '202607', startDate: '', endDate: '' },
      banzuke: [partial],
      torikumi: new Map([[4, { date: '202607' }]]),
      rikishi,
    })
    const only = Object.values(out.results.records)[0]
    expect(only.bouts).toHaveLength(3)
    expect(only.wins + only.losses + only.absences).toBe(3)
    expect(out.results.day).toBe(3)
    expect(out.results.torikumi).toEqual({})
    expect(out.results.yusho).toEqual({})
  })

  it('reports a wrestler without a JSA id instead of guessing', () => {
    const stranger: SumoApiBanzuke = {
      bashoId: '202607',
      division: 'Juryo',
      east: [
        {
          side: 'East',
          rikishiID: 999999,
          shikonaEn: 'Nobody',
          rank: 'Juryo 1 East',
          record: [],
          wins: 0,
          losses: 0,
          absences: 0,
        },
      ],
      west: [],
    }
    const out = resultsFromSumoApi({
      bashoId: 636,
      fetchedAt: 'x',
      basho,
      banzuke: [stranger],
      torikumi: new Map(),
      rikishi,
    })
    expect(out.problems).toEqual(['Juryo: Nobody (sumo-api 999999) has no JSA id'])
    expect(out.results.records).toEqual({})
  })
})
