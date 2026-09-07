/**
 * sumo-api.com shapes → the archive format. Pure: the CLI in
 * scripts/backfill-archive.ts does the fetching.
 *
 * The join to the JSA is `nskId` on sumo-api's rikishi records, which is the
 * JSA `rikishi_id`; entries without one are reported and left out rather
 * than guessed at by name.
 */
import type { ArchivedBanzuke, ArchivedRikishi } from '../../src/data/archive.ts'
import type { Division } from '../../src/data/schema.ts'
import { bashoIdFromSumoApi, bashoYearMonth } from '../../src/data/bashoIds.ts'
import { ringName } from '../../src/data/normalize.ts'

export interface SumoApiBanzukeEntry {
  side: 'East' | 'West'
  rikishiID: number
  shikonaEn: string
  shikonaJp?: string
  rankValue?: number
  /** "Maegashira 16 East", "Sekiwake 2 West" — sanyaku are numbered per side. */
  rank: string
}

export interface SumoApiBanzuke {
  bashoId: string
  division: 'Makuuchi' | 'Juryo'
  east: SumoApiBanzukeEntry[]
  west: SumoApiBanzukeEntry[]
}

export interface SumoApiRikishi {
  id: number
  /** JSA rikishi id; 0 or absent when sumo-api does not know it. */
  nskId?: number
  shikonaEn: string
  shikonaJp?: string
  heya?: string
  shusshin?: string
}

export interface SumoApiBasho {
  date: string
  startDate: string
  endDate: string
}

const TIERS: Record<string, number> = {
  Yokozuna: 100,
  Ozeki: 200,
  Sekiwake: 300,
  Komusubi: 400,
  Maegashira: 500,
  Juryo: 600,
}

const DIVISION_OF: Record<SumoApiBanzuke['division'], Division> = {
  Makuuchi: 'makuuchi',
  Juryo: 'juryo',
}

export function parseRank(
  rank: string
): { rankCode: number; rankNumber: number; seat: number; side: 'east' | 'west' } | null {
  const match = /^(Yokozuna|Ozeki|Sekiwake|Komusubi|Maegashira|Juryo) (\d+) (East|West)$/.exec(rank)
  if (!match) return null
  const rankCode = TIERS[match[1]]
  const n = Number(match[2])
  const side = match[3] === 'East' ? 'east' : 'west'
  // Sanyaku: the number is the pair (JSA seat); numbered ranks: it is the position.
  return rankCode < 500
    ? { rankCode, rankNumber: 1, seat: n, side }
    : { rankCode, rankNumber: n, seat: 1, side }
}

/* eslint-disable-next-line no-irregular-whitespace -- full-width space separates ring name from given name */
/** Ring name only: "豊昇龍　智勝" → 豊昇龍, "旭富士(あさひふじ)" → 旭富士. */
export function cleanShikonaJp(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  const withoutReading = raw.replace(/[（(][^）)]*[）)]/g, '')
  return ringName(withoutReading) || fallback
}

/** "Ishikawa-ken, Kahoku-gun" → Ishikawa; "Mongolia, Ulaanbaatar" → Mongolia. */
export function shusshinRegion(shusshin: string | undefined): string {
  if (!shusshin) return ''
  const first = shusshin.split(',')[0].trim()
  return first.replace(/-(ken|to|fu)$/, '')
}

function sortKey(r: ArchivedRikishi): number {
  // Makuuchi before Juryo is already implied by rankCode; East before West.
  return r.rankCode * 1_000_000 + r.rankNumber * 1000 + r.seat * 10 + (r.side === 'east' ? 0 : 1)
}

export function archiveFromSumoApi(input: {
  basho: SumoApiBasho
  banzuke: SumoApiBanzuke[]
  rikishi: Map<number, SumoApiRikishi>
}): { archive: ArchivedBanzuke; problems: string[] } {
  const bashoId = bashoIdFromSumoApi(input.basho.date)
  if (bashoId === null) throw new Error(`not a tournament month: ${input.basho.date}`)
  const { year, month } = bashoYearMonth(bashoId)
  const problems: string[] = []
  const rows: ArchivedRikishi[] = []
  const divisions: Division[] = []

  for (const table of input.banzuke) {
    const division = DIVISION_OF[table.division]
    divisions.push(division)
    for (const entry of [...table.east, ...table.west]) {
      const label = `${table.division}: ${entry.shikonaEn} (sumo-api ${entry.rikishiID})`
      const person = input.rikishi.get(entry.rikishiID)
      if (!person?.nskId) {
        problems.push(`${label} has no JSA id`)
        continue
      }
      const rank = parseRank(entry.rank)
      if (!rank) {
        problems.push(`${label} has an unreadable rank "${entry.rank}"`)
        continue
      }
      const region = shusshinRegion(person.shusshin)
      rows.push({
        id: person.nskId,
        shikona: {
          en: entry.shikonaEn,
          jp: cleanShikonaJp(entry.shikonaJp ?? person.shikonaJp, entry.shikonaEn),
        },
        division,
        ...rank,
        heya: person.heya ? { en: person.heya, jp: '' } : null,
        pref: region ? { en: region, jp: '' } : null,
      })
    }
  }
  rows.sort((a, b) => sortKey(a) - sortKey(b))

  return {
    archive: {
      version: 1,
      bashoId,
      year,
      month,
      startDate: input.basho.startDate.slice(0, 10),
      endDate: input.basho.endDate.slice(0, 10),
      source: 'sumo-api',
      divisions,
      rikishi: rows,
    },
    problems,
  }
}
