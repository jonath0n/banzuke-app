/**
 * Stable (heya) data scraped from the JSA stable pages by
 * `scripts/fetch-stables.ts` into `public/stables.json`.
 *
 * Like the wrestler profiles this is optional enrichment: the app works
 * without the file, and a stable may be missing from it. Who is *in* a stable
 * is never read from here — the banzuke already says that (`src/utils/stables.ts`).
 */
import type { Localized } from '../types/banzuke'

export interface StableMaster {
  /** The elder's name, e.g. 'Tatsunami Taiji' / '立浪 耐治'. */
  name: Localized
  /** The ring name the master fought under. */
  formerShikona: Localized
  /** The highest rank the master reached, as printed: 'Komusubi' / '小結'. */
  highestRank: Localized
}

export interface Stable {
  /** JSA stable id, the same id the banzuke rows carry in `heya.id`. */
  id: number
  name: Localized
  master: StableMaster | null
  /** Japanese postal address; stored, not shown. */
  address: string | null
  /** The tournament this entry was fetched for. */
  bashoId: number
}

export interface StablesFile {
  version: 1
  /** ISO timestamp of the last successful run. */
  fetchedAt: string
  /** Keyed by stable id. */
  stables: Record<string, Stable>
}

export type StablesValidation = { ok: true; file: StablesFile } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLocalized(value: unknown): value is Localized {
  return isRecord(value) && typeof value.en === 'string' && typeof value.jp === 'string'
}

function isMaster(value: unknown): value is StableMaster {
  return (
    isRecord(value) &&
    isLocalized(value.name) &&
    isLocalized(value.formerShikona) &&
    isLocalized(value.highestRank)
  )
}

/** Structural check of one stable. */
export function isStable(value: unknown): value is Stable {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'number' &&
    isLocalized(value.name) &&
    (value.master === null || isMaster(value.master)) &&
    (value.address === null || typeof value.address === 'string') &&
    typeof value.bashoId === 'number'
  )
}

/** Validates the stables file; a malformed entry makes the whole file invalid. */
export function validateStablesFile(input: unknown): StablesValidation {
  if (!isRecord(input)) return { ok: false, error: 'stables file is not an object' }
  if (input.version !== 1)
    return { ok: false, error: `unsupported version ${String(input.version)}` }
  if (typeof input.fetchedAt !== 'string') return { ok: false, error: 'fetchedAt is missing' }
  if (!isRecord(input.stables)) return { ok: false, error: 'stables is missing' }
  for (const [key, stable] of Object.entries(input.stables)) {
    if (!isStable(stable)) return { ok: false, error: `stable ${key} is malformed` }
    if (String(stable.id) !== key) return { ok: false, error: `stable ${key} has id ${stable.id}` }
  }
  return { ok: true, file: input as unknown as StablesFile }
}
