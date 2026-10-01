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

/** The top two win counts among `rows`, ties in banzuke order. */
export function leaders(
  records: Record<string, RikishiRecord>,
  rows: Rikishi[]
): Array<{ wins: number; rikishi: Rikishi[] }> {
  const byWins = new Map<number, Rikishi[]>()
  for (const rikishi of rows) {
    const record = records[String(rikishi.id)]
    if (!record) continue
    const list = byWins.get(record.wins) ?? []
    list.push(rikishi)
    byWins.set(record.wins, list)
  }
  return [...byWins.keys()]
    .sort((a, b) => b - a)
    .slice(0, 2)
    .map((wins) => ({ wins, rikishi: byWins.get(wins)! }))
}
