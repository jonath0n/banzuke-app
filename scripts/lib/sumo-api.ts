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
import { DIVISIONS } from '../../src/data/schema.ts'
import { bashoIdFromSumoApi, bashoYearMonth } from '../../src/data/bashoIds.ts'
import { ringName } from '../../src/data/normalize.ts'
import type {
  BoutOutcome,
  Bout,
  Fighter,
  Match,
  ResultsFile,
  RikishiRecord,
} from '../../src/data/results.ts'

export interface SumoApiBanzukeEntry {
  side: 'East' | 'West'
  rikishiID: number
  shikonaEn: string
  shikonaJp?: string
  rankValue?: number
  /** "Maegashira 16 East", "Sekiwake 2 West" — sanyaku are numbered per side. */
  rank: string
  record?: SumoApiBoutRecord[]
  wins?: number
  losses?: number
  absences?: number
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
  yusho?: SumoApiYusho[]
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

  for (const table of input.banzuke) {
    const division = DIVISION_OF[table.division]
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
  const divisions = DIVISIONS.filter((d) => rows.some((r) => r.division === d))

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

export interface SumoApiBoutRecord {
  result: string
  opponentShikonaEn: string
  opponentShikonaJp: string
  opponentID: number
  kimarite: string
}

export interface SumoApiMatch {
  division: string
  day: number
  matchNo: number
  eastId: number
  eastShikona: string
  eastRank: string
  westId: number
  westShikona: string
  westRank: string
  kimarite: string
  winnerId: number
  winnerEn: string
  winnerJp: string
}

export interface SumoApiTorikumi {
  date: string
  /** Absent until the JSA publishes the day's card. */
  torikumi?: SumoApiMatch[]
}

export interface SumoApiYusho {
  type: string
  rikishiId: number
  shikonaEn: string
  shikonaJp: string
}

const OUTCOMES: Record<string, BoutOutcome> = {
  win: 'win',
  loss: 'loss',
  'fusen win': 'fusen-win',
  'fusen loss': 'fusen-loss',
  absent: 'absent',
}

export function parseOutcome(result: string): BoutOutcome | null {
  return OUTCOMES[result] ?? null
}

/** A fighter by sumo-api id: the JSA id when known, otherwise just the name. */
function fighter(
  sumoApiId: number,
  shikonaEn: string,
  shikonaJp: string | undefined,
  rikishi: Map<number, SumoApiRikishi>
): Fighter {
  const person = rikishi.get(sumoApiId)
  return {
    id: person?.nskId || null,
    shikona: { en: shikonaEn, jp: cleanShikonaJp(shikonaJp ?? person?.shikonaJp, shikonaEn) },
  }
}

function recordFromEntry(
  entry: SumoApiBanzukeEntry,
  rikishi: Map<number, SumoApiRikishi>
): RikishiRecord {
  const bouts: Bout[] = []
  for (const [i, raw] of (entry.record ?? []).entries()) {
    const outcome = parseOutcome(raw.result)
    if (!outcome) continue
    bouts.push({
      day: i + 1,
      outcome,
      opponent:
        outcome === 'absent'
          ? null
          : fighter(raw.opponentID, raw.opponentShikonaEn, raw.opponentShikonaJp, rikishi),
      kimarite: raw.kimarite ?? '',
    })
  }
  const count = (test: (b: Bout) => boolean) => bouts.filter(test).length
  return {
    wins: entry.wins ?? count((b) => b.outcome === 'win' || b.outcome === 'fusen-win'),
    losses: entry.losses ?? count((b) => b.outcome === 'loss' || b.outcome === 'fusen-loss'),
    absences: entry.absences ?? count((b) => b.outcome === 'absent'),
    bouts,
  }
}

export function resultsFromSumoApi(input: {
  bashoId: number
  fetchedAt: string
  basho: SumoApiBasho
  banzuke: SumoApiBanzuke[]
  torikumi: Map<number, SumoApiTorikumi>
  rikishi: Map<number, SumoApiRikishi>
}): { results: ResultsFile; problems: string[]; warnings: string[] } {
  const problems: string[] = []
  const warnings: string[] = []
  const records: ResultsFile['records'] = {}
  let day = 0

  for (const table of input.banzuke) {
    for (const entry of [...table.east, ...table.west]) {
      const person = input.rikishi.get(entry.rikishiID)
      if (!person?.nskId) {
        problems.push(
          `${table.division}: ${entry.shikonaEn} (sumo-api ${entry.rikishiID}) has no JSA id`
        )
        continue
      }
      const record = recordFromEntry(entry, input.rikishi)
      records[String(person.nskId)] = record
      day = Math.max(day, record.bouts.at(-1)?.day ?? 0)
    }
  }

  const torikumi: ResultsFile['torikumi'] = {}
  for (const [dayNumber, card] of [...input.torikumi.entries()].sort((a, b) => a[0] - b[0])) {
    const matches = card.torikumi ?? []
    if (matches.length === 0) continue
    const mapped: Match[] = []
    for (const m of [...matches].sort((a, b) => a.matchNo - b.matchNo)) {
      const division = DIVISION_OF[m.division as SumoApiBanzuke['division']]
      if (!division) {
        warnings.push(`day ${dayNumber} match ${m.matchNo}: unknown division "${m.division}"`)
        continue
      }
      const east = fighter(m.eastId, m.eastShikona, undefined, input.rikishi)
      const west = fighter(m.westId, m.westShikona, undefined, input.rikishi)
      let winnerId: number | null = null
      if (m.winnerId) {
        winnerId = m.winnerId === m.eastId ? east.id : m.winnerId === m.westId ? west.id : null
        if (winnerId === null) {
          warnings.push(
            `day ${dayNumber} match ${m.matchNo}: winner ${m.winnerEn} (sumo-api ${m.winnerId}) has no JSA id`
          )
        } else {
          day = Math.max(day, dayNumber)
        }
      }
      mapped.push({
        division,
        matchNo: m.matchNo,
        east,
        west,
        winnerId,
        kimarite: m.kimarite ?? '',
      })
    }
    torikumi[String(dayNumber)] = mapped
  }

  const yusho: ResultsFile['yusho'] = {}
  for (const champion of input.basho.yusho ?? []) {
    const division = DIVISION_OF[champion.type as SumoApiBanzuke['division']]
    const id = input.rikishi.get(champion.rikishiId)?.nskId
    if (division && id) yusho[division] = id
  }

  const divisions = input.banzuke.map((table) => DIVISION_OF[table.division])
  return {
    results: {
      version: 1,
      bashoId: input.bashoId,
      fetchedAt: input.fetchedAt,
      day,
      divisions,
      records,
      torikumi,
      yusho,
    },
    problems,
    warnings,
  }
}
