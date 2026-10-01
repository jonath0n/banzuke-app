/**
 * Tournament results: one file per basho under public/results/, written by
 * scripts/fetch-results.ts from sumo-api.com during the tournament and read
 * by the app to lay the hoshitori over the banzuke. Free of DOM and React
 * imports so the scripts can share it.
 */
import type { Division, Language, Localized, Rikishi } from '../types/banzuke'
import { DIVISIONS } from './schema'

/**
 * win/loss: fought. fusen: a forfeit, awarded without a bout. absent: sat out.
 * draw (引き分け) and injury-draw (痛み分け): a bout nobody won — vanishingly
 * rare today, but part of the hoshitori's vocabulary, so the file can hold one.
 */
export type BoutOutcome =
  'win' | 'loss' | 'fusen-win' | 'fusen-loss' | 'absent' | 'draw' | 'injury-draw'
export const BOUT_OUTCOMES: readonly BoutOutcome[] = [
  'win',
  'loss',
  'fusen-win',
  'fusen-loss',
  'absent',
  'draw',
  'injury-draw',
]
export const MAX_DAYS = 15
/** sumo-api serves a playoff (優勝決定戦) as a sixteenth day. */
export const PLAYOFF_DAY = 16

/** The three special prizes, decided on senshuraku for Maegashira and sanyaku below Ozeki. */
export type SanshoKind = 'shukun' | 'kanto' | 'gino'
export const SANSHO_KINDS: readonly SanshoKind[] = ['shukun', 'kanto', 'gino']

export interface Sansho {
  kind: SanshoKind
  /** JSA id. */
  rikishiId: number
}

export interface Fighter {
  /** JSA id when the wrestler is one we know; null for a visitor from below Juryo. */
  id: number | null
  shikona: Localized
}

export interface Bout {
  day: number
  outcome: BoutOutcome
  /** Null on an absence. */
  opponent: Fighter | null
  /** Romaji as sumo-api spells it ('yorikiri', 'fusen'); '' when none. */
  kimarite: string
}

export interface RikishiRecord {
  wins: number
  losses: number
  absences: number
  /** Decided bouts only, in day order. */
  bouts: Bout[]
}

export interface Match {
  /**
   * The card this match was published on. Cross-division bouts appear on the
   * Makuuchi card only; select a division's bouts by fighter id, not by this
   * field.
   */
  division: Division
  matchNo: number
  east: Fighter
  west: Fighter
  /** Null until fought. */
  winnerId: number | null
  kimarite: string
}

export interface ResultsFile {
  version: 1
  bashoId: number
  fetchedAt: string
  /** The latest day with a decided bout; 0 before day 1. */
  day: number
  divisions: Division[]
  /** Keyed by JSA id. */
  records: Record<string, RikishiRecord>
  /** Keyed by day ('1'…'15'), in matchNo order. */
  torikumi: Record<string, Match[]>
  /** JSA id of the champion, once decided. */
  yusho: Partial<Record<Division, number>>
  /**
   * The playoff bouts after senshuraku, per division, in the order fought —
   * one bout between two, or a 巴戦 (tomoe-sen) among three where the first
   * to win twice in a row takes it. Absent when no playoff was needed.
   */
  playoff?: Partial<Record<Division, Match[]>>
  /** The special prizes, once every senshuraku bout is decided. */
  sansho?: Sansho[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLocalized(value: unknown): value is Localized {
  return isRecord(value) && typeof value.en === 'string' && typeof value.jp === 'string'
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isDay(value: unknown): value is number {
  return isInteger(value) && value >= 1 && value <= MAX_DAYS
}

function isDivision(value: unknown): value is Division {
  return (DIVISIONS as readonly string[]).includes(value as string)
}

function isFighter(value: unknown): value is Fighter {
  return (
    isRecord(value) &&
    (value.id === null || (isInteger(value.id) && value.id > 0)) &&
    isLocalized(value.shikona)
  )
}

function boutProblem(bout: unknown): string | null {
  if (!isRecord(bout)) return 'bout is not an object'
  if (!isDay(bout.day)) return 'bout day out of range'
  if (!BOUT_OUTCOMES.includes(bout.outcome as BoutOutcome)) return 'unknown outcome'
  if (bout.opponent !== null && !isFighter(bout.opponent)) return 'opponent malformed'
  if (typeof bout.kimarite !== 'string') return 'kimarite must be a string'
  return null
}

function recordProblem(record: unknown): string | null {
  if (!isRecord(record)) return 'record is not an object'
  for (const key of ['wins', 'losses', 'absences'] as const) {
    if (!isInteger(record[key]) || (record[key] as number) < 0) return `${key} must be ≥ 0`
  }
  if (!Array.isArray(record.bouts)) return 'bouts must be an array'
  for (const [i, bout] of record.bouts.entries()) {
    const problem = boutProblem(bout)
    if (problem) return `bouts[${i}]: ${problem}`
  }
  return null
}

function matchProblem(match: unknown): string | null {
  if (!isRecord(match)) return 'match is not an object'
  if (!isDivision(match.division)) return 'division is unknown'
  if (!isInteger(match.matchNo) || match.matchNo < 1) return 'matchNo must be ≥ 1'
  if (!isFighter(match.east) || !isFighter(match.west)) return 'fighters malformed'
  if (match.winnerId !== null && !isInteger(match.winnerId)) return 'winnerId malformed'
  if (typeof match.kimarite !== 'string') return 'kimarite must be a string'
  return null
}

export function validateResults(
  input: unknown
): { ok: true; results: ResultsFile } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'results file is not an object' }
  if (input.version !== 1) return { ok: false, error: 'version must be 1' }
  if (!isInteger(input.bashoId) || input.bashoId <= 0) return { ok: false, error: 'bashoId' }
  if (typeof input.fetchedAt !== 'string') return { ok: false, error: 'fetchedAt' }
  if (!isInteger(input.day) || input.day < 0 || input.day > MAX_DAYS) {
    return { ok: false, error: 'day must be 0…15' }
  }
  if (!Array.isArray(input.divisions) || !input.divisions.every(isDivision)) {
    return { ok: false, error: 'divisions must list known divisions' }
  }
  if (!isRecord(input.records)) return { ok: false, error: 'records must be an object' }
  for (const [key, record] of Object.entries(input.records)) {
    if (!/^\d+$/.test(key)) return { ok: false, error: `records: key ${key} is not an id` }
    const problem = recordProblem(record)
    if (problem) return { ok: false, error: `records[${key}]: ${problem}` }
  }
  if (!isRecord(input.torikumi)) return { ok: false, error: 'torikumi must be an object' }
  for (const [key, matches] of Object.entries(input.torikumi)) {
    if (!/^\d+$/.test(key) || String(Number(key)) !== key || !isDay(Number(key))) {
      return { ok: false, error: `torikumi: key ${key} is not a day` }
    }
    if (!Array.isArray(matches)) return { ok: false, error: `torikumi[${key}] must be an array` }
    for (const [i, match] of matches.entries()) {
      const problem = matchProblem(match)
      if (problem) return { ok: false, error: `torikumi[${key}][${i}]: ${problem}` }
    }
  }
  if (!isRecord(input.yusho)) return { ok: false, error: 'yusho must be an object' }
  for (const [division, id] of Object.entries(input.yusho)) {
    if (!isDivision(division)) return { ok: false, error: `yusho: unknown division ${division}` }
    if (!isInteger(id)) return { ok: false, error: `yusho[${division}] must be an id` }
  }
  if (input.playoff !== undefined) {
    if (!isRecord(input.playoff)) return { ok: false, error: 'playoff must be an object' }
    for (const [division, matches] of Object.entries(input.playoff)) {
      if (!isDivision(division)) {
        return { ok: false, error: `playoff: unknown division ${division}` }
      }
      if (!Array.isArray(matches) || matches.length === 0) {
        return { ok: false, error: `playoff[${division}] must be a non-empty array` }
      }
      for (const [i, match] of matches.entries()) {
        const problem = matchProblem(match)
        if (problem) return { ok: false, error: `playoff[${division}][${i}]: ${problem}` }
        if ((match as Match).winnerId === null) {
          return { ok: false, error: `playoff[${division}][${i}]: a playoff bout is decided` }
        }
      }
    }
  }
  if (input.sansho !== undefined) {
    if (!Array.isArray(input.sansho)) return { ok: false, error: 'sansho must be an array' }
    for (const [i, prize] of input.sansho.entries()) {
      if (
        !isRecord(prize) ||
        !SANSHO_KINDS.includes(prize.kind as SanshoKind) ||
        !isInteger(prize.rikishiId) ||
        (prize.rikishiId as number) <= 0
      ) {
        return { ok: false, error: `sansho[${i}] must be a kind and a JSA id` }
      }
    }
  }
  return { ok: true, results: input as unknown as ResultsFile }
}

export function resultsFileName(bashoId: number): string {
  return `${bashoId}.json`
}

export function resultsEqualIgnoringFetchedAt(a: ResultsFile, b: ResultsFile): boolean {
  const strip = ({ fetchedAt: _ignored, ...rest }: ResultsFile) => rest
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
}

/**
 * Why writing `next` over `previous` would lose something a visitor has
 * already seen: the day going backwards, a wrestler's record shrinking or
 * vanishing, or a decided bout becoming undecided. Empty when it is safe.
 * An upstream hiccup — an empty response, a half-ingested day — must never
 * overwrite a good file; the fetch script refuses unless forced.
 */
export function resultsRegressed(previous: ResultsFile, next: ResultsFile): string[] {
  const reasons: string[] = []
  if (next.day < previous.day) reasons.push(`day ${next.day} is behind ${previous.day}`)
  for (const [id, before] of Object.entries(previous.records)) {
    const after = next.records[id]
    const was = before.wins + before.losses + before.absences
    if (!after) {
      reasons.push(`record ${id} is gone (had ${was} bouts)`)
      continue
    }
    const now = after.wins + after.losses + after.absences
    if (now < was) reasons.push(`record ${id} shrank from ${was} to ${now} bouts`)
  }
  for (const [day, matches] of Object.entries(previous.torikumi)) {
    for (const match of matches) {
      if (match.winnerId === null) continue
      const same = next.torikumi[day]?.find(
        (m) => m.division === match.division && m.matchNo === match.matchNo
      )
      if (!same || same.winnerId === null) {
        reasons.push(`day ${day} ${match.division} match ${match.matchNo} lost its winner`)
      }
    }
  }
  return reasons
}

export type KachikoshiState = 'kachikoshi' | 'makekoshi' | 'pending'

/** Eight wins is kachi-koshi; eight losses (an absence counts as one) is make-koshi. */
export function kachikoshiState(
  r: Pick<RikishiRecord, 'wins' | 'losses' | 'absences'>
): KachikoshiState {
  if (r.wins >= 8) return 'kachikoshi'
  if (r.losses + r.absences >= 8) return 'makekoshi'
  return 'pending'
}

/**
 * '8–3' / '8–3–1' in English; 8勝3敗 / 8勝3敗1休 in Japanese, and 全休 for a wrestler
 * who sat out all fifteen days — the only time the Japanese column drops the counts.
 */
export function scoreLabel(
  r: Pick<RikishiRecord, 'wins' | 'losses' | 'absences'>,
  language: Language
): string {
  if (language === 'jp') {
    if (r.absences >= 15 && r.wins === 0 && r.losses === 0) return '全休'
    return `${r.wins}勝${r.losses}敗${r.absences > 0 ? `${r.absences}休` : ''}`
  }
  return `${r.wins}–${r.losses}${r.absences > 0 ? `–${r.absences}` : ''}`
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** A sentence for accessible names and the dialog. */
export function describeRecord(
  r: Pick<RikishiRecord, 'wins' | 'losses' | 'absences'>,
  language: Language
): string {
  const state = kachikoshiState(r)
  if (language === 'jp') {
    const tail = state === 'kachikoshi' ? '、勝ち越し' : state === 'makekoshi' ? '、負け越し' : ''
    return `${scoreLabel(r, 'jp')}${tail}`
  }
  const parts = [plural(r.wins, 'win', 'wins'), plural(r.losses, 'loss', 'losses')]
  if (r.absences > 0) parts.push(plural(r.absences, 'absence', 'absences'))
  const tail =
    state === 'kachikoshi' ? ' Kachi-koshi.' : state === 'makekoshi' ? ' Make-koshi.' : ''
  return `${parts.join(', ')}.${tail}`
}

/**
 * The hoshitori's marks: ○ win, ● loss, □ fusen win, ■ fusen loss (the square
 * says no bout was fought), 休 absent, × a draw, △ an injury draw.
 */
export function boutMark(outcome: BoutOutcome): '○' | '●' | '□' | '■' | '休' | '×' | '△' {
  switch (outcome) {
    case 'win':
      return '○'
    case 'loss':
      return '●'
    case 'fusen-win':
      return '□'
    case 'fusen-loss':
      return '■'
    case 'absent':
      return '休'
    case 'draw':
      return '×'
    case 'injury-draw':
      return '△'
  }
}

/** The playoff is a 巴戦 when three fighters took part. */
export function playoffFighters(matches: Match[]): Fighter[] {
  const seen = new Map<string, Fighter>()
  for (const m of matches) {
    for (const f of [m.east, m.west]) seen.set(f.id === null ? f.shikona.en : String(f.id), f)
  }
  return [...seen.values()]
}

export interface NextBout {
  day: number
  opponent: Fighter
  match: Match
}

/**
 * The wrestler's next bout on a published card: the first undecided match
 * with them in it, from the current day on (today's bout before it is fought,
 * or tomorrow's once the card is out). Null between cards or after a withdrawal.
 */
export function nextBout(
  results: Pick<ResultsFile, 'day' | 'torikumi'>,
  rikishiId: number
): NextBout | null {
  for (let day = Math.max(1, results.day); day <= MAX_DAYS; day++) {
    for (const match of results.torikumi[String(day)] ?? []) {
      if (match.winnerId !== null) continue
      if (match.east.id === rikishiId) return { day, opponent: match.west, match }
      if (match.west.id === rikishiId) return { day, opponent: match.east, match }
    }
  }
  return null
}

/**
 * A gold star: a Maegashira beating a Yokozuna in the ring. A forfeit is no
 * kinboshi, and nor is a sanyaku win — those are the ranks expected to fight
 * the Yokozuna.
 */
export function isKinboshi(
  bout: Pick<Bout, 'outcome' | 'opponent'>,
  rikishi: Pick<Rikishi, 'rankCode'>,
  rankCodeOf: (id: number) => number | undefined
): boolean {
  if (bout.outcome !== 'win' || rikishi.rankCode !== 500 || bout.opponent?.id == null) return false
  return rankCodeOf(bout.opponent.id) === 100
}

export type KachikoshiOutlook =
  { state: 'kachikoshi' | 'makekoshi' } | { state: 'pending'; needed: number; remaining: number }

/** What it still takes to reach eight wins, with the days left in the tournament. */
export function kachikoshiOutlook(
  r: Pick<RikishiRecord, 'wins' | 'losses' | 'absences'>,
  day: number
): KachikoshiOutlook {
  const state = kachikoshiState(r)
  if (state !== 'pending') return { state }
  return { state, needed: 8 - r.wins, remaining: Math.max(0, MAX_DAYS - day) }
}

/** One rung of the race: everyone on the same number of losses, in banzuke order. */
export interface RaceTier {
  /** Losses and absences together: an absence is a loss in the race. */
  losses: number
  wins: number
  rikishi: Rikishi[]
}

export interface YushoRace {
  /** The day the race stands after. */
  day: number
  /** Still in it: the leaders and, within two losses, whoever can still catch them. */
  tiers: RaceTier[]
  /** The champion, once the race is decided — in regulation or by playoff. */
  champion: Rikishi | null
  /** Nobody can catch the leader any more, though senshuraku may be unfought. */
  decided: boolean
  /** The two sole leaders meet on the next card: 相星決戦. */
  coLeaderBout: Match | null
}

/**
 * The yusho race as a fan reads it off the hoshitori: the leaders by losses,
 * then whoever is within two losses and can still catch them, and whether it
 * is already over. A wrestler who has withdrawn (last entry an absence, or
 * fewer bouts than days) is out. Ties in banzuke order, so the East Yokozuna
 * heads a rung he shares.
 */
export function yushoRace(
  results: Pick<ResultsFile, 'day' | 'records' | 'torikumi' | 'yusho' | 'playoff'>,
  division: Division,
  rows: Rikishi[]
): YushoRace {
  const day = results.day
  const remaining = Math.max(0, MAX_DAYS - day)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const champion =
    results.yusho[division] != null ? (byId.get(results.yusho[division]!) ?? null) : null

  const standing = rows.flatMap((rikishi) => {
    const record = results.records[String(rikishi.id)]
    if (!record || record.bouts.length === 0) return []
    const last = record.bouts[record.bouts.length - 1]
    const withdrawn = last.outcome === 'absent' || record.bouts.length < day
    if (withdrawn) return []
    return [{ rikishi, wins: record.wins, losses: record.losses + record.absences }]
  })
  if (standing.length === 0) {
    return { day, tiers: [], champion, decided: champion !== null, coLeaderBout: null }
  }

  const leaderWins = Math.max(...standing.map((s) => s.wins))
  const leaderLosses = Math.min(...standing.map((s) => s.losses))
  const alive = standing.filter(
    (s) => s.wins + remaining >= leaderWins && s.losses <= leaderLosses + 2
  )
  const byLosses = new Map<number, RaceTier>()
  for (const s of alive) {
    const tier = byLosses.get(s.losses) ?? { losses: s.losses, wins: s.wins, rikishi: [] }
    tier.rikishi.push(s.rikishi)
    byLosses.set(s.losses, tier)
  }
  const tiers = [...byLosses.values()].sort((a, b) => a.losses - b.losses)

  const leaders = standing.filter((s) => s.wins === leaderWins)
  const chasers = standing.filter((s) => s.wins < leaderWins)
  const bestChase = chasers.length > 0 ? Math.max(...chasers.map((s) => s.wins)) : -1
  const decided =
    champion !== null ||
    (leaders.length === 1 && (remaining === 0 || bestChase + remaining < leaderWins))

  let coLeaderBout: Match | null = null
  if (leaders.length === 2 && remaining > 0) {
    const [a, b] = leaders.map((s) => s.rikishi.id)
    const next = results.torikumi[String(day + 1)] ?? []
    coLeaderBout =
      next.find(
        (m) =>
          m.winnerId === null &&
          ((m.east.id === a && m.west.id === b) || (m.east.id === b && m.west.id === a))
      ) ?? null
  }

  return { day, tiers, champion, decided, coLeaderBout }
}
