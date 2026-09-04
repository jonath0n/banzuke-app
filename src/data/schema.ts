/**
 * Raw upstream data types and validation for the sumo.or.jp banzuke endpoints.
 *
 * This module is intentionally free of DOM and React imports so it can be
 * shared by the browser app and the Node fetch scripts.
 *
 * The raw types describe the JSON exactly as the JSA API returns it, including
 * its quirks (numeric fields that are sometimes empty strings on placeholder
 * rows). The app never consumes these directly; see `normalize.ts`.
 */

export type Lang = 'en' | 'jp'

export const LANGS: readonly Lang[] = ['en', 'jp'] as const

/** A single wrestler row as returned by the API. */
export interface RawRikishi {
  /** Zero-padded composite sort key (rank + number + seat), e.g. "005000001700001". */
  sort?: string
  banzuke_name: string
  /** 1 = East, 2 = West. */
  ew: number | string
  banzuke_id: number | string
  kakuzuke_id: string
  rikishi_id: number | string
  rikishi_banzuke_id: number | string
  /** 100 Yokozuna, 200 Ozeki, 300 Sekiwake, 400 Komusubi, 500 Maegashira, 600 Juryo. */
  rank: number | string
  /** Promotion flag such as "新入幕", "再入幕", "新小結". Japanese in both languages. */
  rank_new?: string
  seat_order: number | string
  number: number | string
  numberKanji?: string
  photo: string
  pref_id: number | string
  pref_name: string
  heya_id: number | string
  heya_name: string
  shikona: string
}

export interface RawBashoInfo {
  today: string
  basho_id: number
  start_date: string
  end_date: string
  year_jp: string
  basho_name: string
  basho_name_eng: string
  start_datetime: string
  end_datetime: string
  ticket_advanceselling_start_datetime: string
  ticket_advanceselling_end_datetime: string
  ticket_preselling_datetime: string
  year_eng: string
  JpDate: string
  BattleNow: number
  banzuke_announcement_datetime: string
  day: number | string
  venue_id: number
}

export interface RawPayload {
  BanzukeTable: RawRikishi[]
  basho_name: string
  year_jp: string
  lang: string
  kakuzuke_id: string
  page: string
  Kakuzuke: string
  list_max: number
  basho_id: number
  BashoInfo: RawBashoInfo
  Result: string
}

/** The file written to `public/latest-banzuke.json`. */
export interface RawSnapshot {
  version?: 1
  /** ISO timestamp of when the data was fetched. */
  fetchedAt: string
  /** Where each language payload came from. */
  sources: Record<Lang, string>
  payloads: Record<Lang, RawPayload>
  /** rikishi_id → hiragana reading of the ring name, when available. */
  readings?: Record<string, string>
}

export type ValidationResult =
  | { ok: true; snapshot: RawSnapshot; warnings: string[] }
  | { ok: false; errors: string[] }

/** Minimum plausible number of wrestlers in a division payload. */
const MIN_ROWS = 20

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string') return value.trim() !== '' && Number.isFinite(Number(value))
  return false
}

/**
 * The API pads a division with blank rows to keep East/West aligned when a
 * rank has a vacancy. These rows have an empty shikona and no rikishi_id.
 */
export function isPlaceholderRow(row: unknown): boolean {
  if (!isRecord(row)) return false
  const shikona = row.shikona
  return typeof shikona !== 'string' || shikona.trim() === ''
}

function validateRow(row: unknown, label: string, errors: string[]): row is RawRikishi {
  if (!isRecord(row)) {
    errors.push(`${label}: row is not an object`)
    return false
  }
  const before = errors.length
  if (typeof row.shikona !== 'string' || row.shikona.trim() === '') {
    errors.push(`${label}: missing shikona`)
  }
  if (!isNumeric(row.rikishi_id)) errors.push(`${label}: rikishi_id is not numeric`)
  if (!isNumeric(row.rank)) errors.push(`${label}: rank is not numeric`)
  const ew = Number(row.ew)
  if (ew !== 1 && ew !== 2) errors.push(`${label}: ew must be 1 or 2`)
  if (typeof row.banzuke_name !== 'string' || row.banzuke_name === '') {
    errors.push(`${label}: missing banzuke_name`)
  }
  if (typeof row.photo !== 'string') errors.push(`${label}: photo must be a string`)
  return errors.length === before
}

/**
 * Validates a single language payload. Returns the list of problems found
 * (empty when valid).
 */
export function validatePayload(payload: unknown, label = 'payload'): string[] {
  const errors: string[] = []
  if (!isRecord(payload)) return [`${label}: not an object`]

  if (String(payload.Result) !== '1') {
    errors.push(`${label}: Result is "${String(payload.Result)}", expected "1"`)
  }

  const table = payload.BanzukeTable
  if (!Array.isArray(table)) {
    errors.push(`${label}: BanzukeTable is not an array`)
    return errors
  }

  if (isNumeric(payload.list_max) && Number(payload.list_max) !== table.length) {
    errors.push(
      `${label}: list_max is ${String(payload.list_max)} but BanzukeTable has ${table.length} rows`
    )
  }

  const realRows = table.filter((row) => !isPlaceholderRow(row))
  if (realRows.length < MIN_ROWS) {
    errors.push(`${label}: only ${realRows.length} wrestlers (expected at least ${MIN_ROWS})`)
  }

  realRows.forEach((row, index) => validateRow(row, `${label}.BanzukeTable[${index}]`, errors))

  const seenIds = new Set<string>()
  for (const row of realRows) {
    const id = String((row as RawRikishi).rikishi_id)
    if (seenIds.has(id)) errors.push(`${label}: duplicate rikishi_id ${id}`)
    seenIds.add(id)
  }

  if (!isNumeric(payload.basho_id)) errors.push(`${label}: basho_id is not numeric`)

  const info = payload.BashoInfo
  if (!isRecord(info)) {
    errors.push(`${label}: missing BashoInfo`)
  } else {
    for (const key of ['start_date', 'end_date'] as const) {
      if (typeof info[key] !== 'string' || !ISO_DATE.test(info[key] as string)) {
        errors.push(`${label}: BashoInfo.${key} is not YYYY-MM-DD`)
      }
    }
  }

  return errors
}

function realIds(payload: RawPayload): Set<string> {
  return new Set(
    payload.BanzukeTable.filter((row) => !isPlaceholderRow(row)).map((row) =>
      String(row.rikishi_id)
    )
  )
}

/**
 * Validates a complete snapshot: both languages present and internally valid,
 * and consistent with each other (same tournament, same set of wrestlers).
 */
export function validateSnapshot(input: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isRecord(input)) return { ok: false, errors: ['snapshot is not an object'] }

  if (typeof input.fetchedAt !== 'string' || Number.isNaN(Date.parse(input.fetchedAt))) {
    errors.push('fetchedAt is not a valid timestamp')
  }

  if (!isRecord(input.payloads)) {
    return { ok: false, errors: [...errors, 'payloads is missing'] }
  }

  for (const lang of LANGS) {
    if (!(lang in input.payloads)) {
      errors.push(`payloads.${lang} is missing`)
      continue
    }
    errors.push(...validatePayload(input.payloads[lang], `payloads.${lang}`))
  }

  if (errors.length > 0) return { ok: false, errors }

  const payloads = input.payloads as Record<Lang, RawPayload>
  const en = payloads.en
  const jp = payloads.jp

  if (Number(en.basho_id) !== Number(jp.basho_id)) {
    errors.push(`basho_id differs between languages (en ${en.basho_id}, jp ${jp.basho_id})`)
  }

  const enIds = realIds(en)
  const jpIds = realIds(jp)
  const missingInJp = [...enIds].filter((id) => !jpIds.has(id))
  const missingInEn = [...jpIds].filter((id) => !enIds.has(id))
  if (missingInJp.length > 0) {
    errors.push(`rikishi_id present in en but not jp: ${missingInJp.join(', ')}`)
  }
  if (missingInEn.length > 0) {
    errors.push(`rikishi_id present in jp but not en: ${missingInEn.join(', ')}`)
  }

  if (!isRecord(input.sources)) {
    warnings.push('sources is missing')
  }

  if (errors.length > 0) return { ok: false, errors }

  return { ok: true, snapshot: input as unknown as RawSnapshot, warnings }
}

/**
 * Deep-compares two snapshots by their payloads only, ignoring `fetchedAt`
 * and `sources`. Used to decide whether a refreshed snapshot is worth committing.
 */
export function snapshotsEqualIgnoringFetchedAt(a: RawSnapshot, b: RawSnapshot): boolean {
  return stableStringify(a.payloads) === stableStringify(b.payloads)
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/** Convenience accessor for the tournament id of a valid snapshot. */
export function snapshotBashoId(snapshot: RawSnapshot): number {
  return Number(snapshot.payloads.en.basho_id)
}
