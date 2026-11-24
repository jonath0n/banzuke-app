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

/** Divisions the app knows about, in banzuke order (top first). */
export const DIVISIONS = [
  'makuuchi',
  'juryo',
  'makushita',
  'sandanme',
  'jonidan',
  'jonokuchi',
] as const

export type Division = (typeof DIVISIONS)[number]

/** The salaried divisions, carried by `latest-banzuke.json`. */
export const SEKITORI_DIVISIONS = ['makuuchi', 'juryo'] as const satisfies readonly Division[]

export type SekitoriDivision = (typeof SEKITORI_DIVISIONS)[number]

/** The divisions below Juryo, carried by `latest-lower.json` and loaded on demand. */
export const LOWER_DIVISIONS = [
  'makushita',
  'sandanme',
  'jonidan',
  'jonokuchi',
] as const satisfies readonly Division[]

export type LowerDivision = (typeof LOWER_DIVISIONS)[number]

export function isLowerDivision(division: Division): division is LowerDivision {
  return (LOWER_DIVISIONS as readonly string[]).includes(division)
}

/** Upstream `kakuzuke_id` for each division. */
export const DIVISION_IDS: Record<Division, number> = {
  makuuchi: 1,
  juryo: 2,
  makushita: 3,
  sandanme: 4,
  jonidan: 5,
  jonokuchi: 6,
}

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
  /**
   * 100 Yokozuna, 200 Ozeki, 300 Sekiwake, 400 Komusubi, 500 Maegashira, 600 Juryo,
   * 700 Makushita, 800 Sandanme, 900 Jonidan, 1000 Jonokuchi.
   */
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

/** One division's bilingual payloads. */
export interface RawDivisionSnapshot {
  /** Where each language payload came from. */
  sources: Record<Lang, string>
  payloads: Record<Lang, RawPayload>
  /** rikishi_id → hiragana reading of the ring name, when available. */
  readings?: Record<string, string>
}

/**
 * The file written to `public/latest-banzuke.json` (format 2). Makuuchi is
 * always present; lower divisions are optional so an older file, or a run
 * where only the top division could be fetched, still works.
 */
export interface RawSnapshot {
  version: 2
  /** ISO timestamp of when the data was fetched. */
  fetchedAt: string
  divisions: { makuuchi: RawDivisionSnapshot } & Partial<
    Record<SekitoriDivision, RawDivisionSnapshot>
  >
}

/**
 * The file written to `public/latest-lower.json`: the divisions below Juryo,
 * in the same per-division shape, loaded by the app only when needed.
 */
export interface RawLowerSnapshot {
  version: 2
  fetchedAt: string
  divisions: Partial<Record<LowerDivision, RawDivisionSnapshot>>
}

/** Either file: what the shared helpers below need. */
export interface RawDivisionFile {
  fetchedAt: string
  divisions: Partial<Record<Division, RawDivisionSnapshot>>
}

/** The original single-division file layout, still accepted on read. */
export interface RawSnapshotV1 extends RawDivisionSnapshot {
  version?: 1
  fetchedAt: string
}

export type ValidationResult =
  { ok: true; snapshot: RawSnapshot; warnings: string[] } | { ok: false; errors: string[] }

export type LowerValidationResult =
  { ok: true; snapshot: RawLowerSnapshot; warnings: string[] } | { ok: false; errors: string[] }

/**
 * Minimum plausible number of wrestlers in each division's payload: well under
 * the usual size, so only a truncated fetch trips it. Makushita is fixed at
 * 120; Jonokuchi swings with each year's recruits.
 */
export const MIN_ROWS: Record<Division, number> = {
  makuuchi: 20,
  juryo: 20,
  makushita: 100,
  sandanme: 120,
  jonidan: 120,
  jonokuchi: 10,
}

const KAKUZUKE_TO_DIVISION = new Map<number, Division>(
  DIVISIONS.map((division) => [DIVISION_IDS[division], division])
)

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
  const division = KAKUZUKE_TO_DIVISION.get(Number(payload.kakuzuke_id))
  const minRows = MIN_ROWS[division ?? 'makuuchi']
  if (realRows.length < minRows) {
    errors.push(`${label}: only ${realRows.length} wrestlers (expected at least ${minRows})`)
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
 * Validates one division: both languages present and internally valid, and
 * consistent with each other (same tournament, same set of wrestlers).
 */
export function validateDivision(
  input: unknown,
  label = 'division'
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isRecord(input)) return { errors: [`${label}: not an object`], warnings }

  if (!isRecord(input.payloads)) {
    return { errors: [`${label}: payloads is missing`], warnings }
  }

  for (const lang of LANGS) {
    if (!(lang in input.payloads)) {
      errors.push(`${label}: payloads.${lang} is missing`)
      continue
    }
    errors.push(...validatePayload(input.payloads[lang], `${label}: payloads.${lang}`))
  }

  if (errors.length > 0) return { errors, warnings }

  const payloads = input.payloads as Record<Lang, RawPayload>
  const en = payloads.en
  const jp = payloads.jp

  if (Number(en.basho_id) !== Number(jp.basho_id)) {
    errors.push(
      `${label}: basho_id differs between languages (en ${en.basho_id}, jp ${jp.basho_id})`
    )
  }

  const enIds = realIds(en)
  const jpIds = realIds(jp)
  const missingInJp = [...enIds].filter((id) => !jpIds.has(id))
  const missingInEn = [...jpIds].filter((id) => !enIds.has(id))
  if (missingInJp.length > 0) {
    errors.push(`${label}: rikishi_id present in en but not jp: ${missingInJp.join(', ')}`)
  }
  if (missingInEn.length > 0) {
    errors.push(`${label}: rikishi_id present in jp but not en: ${missingInEn.join(', ')}`)
  }

  if (!isRecord(input.sources)) {
    warnings.push(`${label}: sources is missing`)
  }

  return { errors, warnings }
}

interface CheckedDivisions {
  present: Division[]
  valid: Partial<Record<Division, RawDivisionSnapshot>>
}

/**
 * The checks both files share: every present division (of `allowed`) is valid,
 * carries its expected `kakuzuke_id`, describes the same tournament as the
 * first one present, and no wrestler appears in two of them.
 */
function checkDivisions(
  divisions: Record<string, unknown>,
  allowed: readonly Division[],
  errors: string[],
  warnings: string[]
): CheckedDivisions | null {
  const present = allowed.filter((division) => division in divisions)
  for (const division of present) {
    const result = validateDivision(divisions[division], `divisions.${division}`)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }
  for (const key of Object.keys(divisions)) {
    if (!(allowed as readonly string[]).includes(key)) {
      warnings.push(`divisions.${key} is not expected in this file and will be ignored`)
    }
  }

  if (errors.length > 0 || present.length === 0) return null

  const valid = divisions as Record<Division, RawDivisionSnapshot>
  const first = present[0]
  const bashoId = Number(valid[first].payloads.en.basho_id)
  const seen = new Map<string, Division>()
  for (const division of present) {
    const en = valid[division].payloads.en
    const expectedId = DIVISION_IDS[division]
    if (Number(en.kakuzuke_id) !== expectedId) {
      errors.push(`divisions.${division}: kakuzuke_id is ${en.kakuzuke_id}, expected ${expectedId}`)
    }
    if (Number(en.basho_id) !== bashoId) {
      errors.push(
        `divisions.${division}: basho_id ${en.basho_id} differs from ${first} (${bashoId})`
      )
    }
    for (const id of realIds(en)) {
      const other = seen.get(id)
      if (other) errors.push(`rikishi_id ${id} appears in both ${other} and ${division}`)
      seen.set(id, division)
    }
  }

  if (errors.length > 0) return null
  return { present, valid }
}

function pickDivisions({
  present,
  valid,
}: CheckedDivisions): Partial<Record<Division, RawDivisionSnapshot>> {
  return Object.fromEntries(
    present.map((division) => {
      const { sources, payloads, readings } = valid[division] as RawDivisionSnapshot
      return [division, { sources, payloads, ...(readings ? { readings } : {}) }]
    })
  )
}

/**
 * Validates a complete snapshot in either file format and returns it in the
 * current (version 2) shape. Every present division must be valid, describe
 * the same tournament, carry the expected `kakuzuke_id`, and no wrestler may
 * appear in two divisions.
 */
export function validateSnapshot(input: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isRecord(input)) return { ok: false, errors: ['snapshot is not an object'] }

  if (typeof input.fetchedAt !== 'string' || Number.isNaN(Date.parse(input.fetchedAt))) {
    errors.push('fetchedAt is not a valid timestamp')
  }

  // Version 1 files carry a single (makuuchi) division at the top level.
  const isV1 = !('divisions' in input) && 'payloads' in input
  const divisions: unknown = isV1 ? { makuuchi: input } : input.divisions

  if (!isRecord(divisions)) {
    return { ok: false, errors: [...errors, 'divisions is missing'] }
  }
  if (!('makuuchi' in divisions)) {
    return { ok: false, errors: [...errors, 'divisions.makuuchi is missing'] }
  }

  const checked = checkDivisions(divisions, SEKITORI_DIVISIONS, errors, warnings)
  if (!checked || errors.length > 0) return { ok: false, errors }

  const snapshot: RawSnapshot = {
    version: 2,
    fetchedAt: input.fetchedAt as string,
    divisions: pickDivisions(checked) as RawSnapshot['divisions'],
  }

  return { ok: true, snapshot, warnings }
}

/**
 * Validates `latest-lower.json`: the same per-division checks as
 * `validateSnapshot`, over the divisions below Juryo, at least one of which
 * must be present. Whether it matches the live tournament is the caller's
 * check (`lowerSnapshotBashoId`).
 */
export function validateLowerSnapshot(input: unknown): LowerValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!isRecord(input)) return { ok: false, errors: ['snapshot is not an object'] }
  if (typeof input.fetchedAt !== 'string' || Number.isNaN(Date.parse(input.fetchedAt))) {
    errors.push('fetchedAt is not a valid timestamp')
  }
  if (!isRecord(input.divisions)) {
    return { ok: false, errors: [...errors, 'divisions is missing'] }
  }

  const checked = checkDivisions(input.divisions, LOWER_DIVISIONS, errors, warnings)
  if (errors.length > 0) return { ok: false, errors }
  if (!checked) return { ok: false, errors: ['no division below Juryo is present'] }

  return {
    ok: true,
    snapshot: {
      version: 2,
      fetchedAt: input.fetchedAt as string,
      divisions: pickDivisions(checked) as RawLowerSnapshot['divisions'],
    },
    warnings,
  }
}

/**
 * BashoInfo fields the JSA server rewrites daily (its own date, the day-of-tournament
 * counter) that say nothing about the banzuke. Ignored when deciding whether a fetch
 * is worth committing, or the pipeline would commit a "change" every morning.
 */
const VOLATILE_BASHO_INFO_KEYS = ['today', 'JpDate', 'BattleNow', 'day'] as const

/**
 * Deep-compares two snapshots by their data only, ignoring `fetchedAt`, `sources`,
 * and the BashoInfo fields the JSA rewrites daily regardless of the banzuke
 * (`today`, `JpDate`, `BattleNow`, `day`). Used to decide whether a refreshed
 * snapshot is worth committing.
 */
export function snapshotsEqualIgnoringFetchedAt(a: RawDivisionFile, b: RawDivisionFile): boolean {
  return stableStringify(comparable(a)) === stableStringify(comparable(b))
}

function comparable(snapshot: RawDivisionFile): unknown {
  return Object.fromEntries(
    snapshotDivisions(snapshot).map((division) => {
      const { payloads, readings } = snapshot.divisions[division] as RawDivisionSnapshot
      const stablePayloads = Object.fromEntries(
        (Object.entries(payloads) as [Lang, RawPayload][]).map(([lang, payload]) => {
          const bashoInfo = { ...payload.BashoInfo }
          for (const key of VOLATILE_BASHO_INFO_KEYS) delete bashoInfo[key]
          return [lang, { ...payload, BashoInfo: bashoInfo }]
        })
      ) as Record<Lang, RawPayload>
      return [division, { payloads: stablePayloads, readings: readings ?? {} }]
    })
  )
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) {
    const keys = Object.keys(value).sort()
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

/** Divisions present in a valid snapshot (either file), top division first. */
export function snapshotDivisions<F extends RawDivisionFile>(
  snapshot: F
): (keyof F['divisions'] & Division)[] {
  return DIVISIONS.filter(
    (division) => snapshot.divisions[division] != null
  ) as (keyof F['divisions'] & Division)[]
}

/** Convenience accessor for the tournament id of a valid snapshot. */
export function snapshotBashoId(snapshot: RawSnapshot): number {
  return Number(snapshot.divisions.makuuchi.payloads.en.basho_id)
}

/** The tournament id of a valid lower-division snapshot. */
export function lowerSnapshotBashoId(snapshot: RawLowerSnapshot): number {
  const first = snapshotDivisions(snapshot)[0]
  return Number(snapshot.divisions[first]?.payloads.en.basho_id)
}
