/**
 * Wrestler profile data scraped from the JSA profile pages by
 * `scripts/fetch-profiles.ts` into `public/rikishi-profiles.json`.
 *
 * Profiles are an optional enrichment: the app works without the file, and a
 * profile may be missing or partially filled for any wrestler.
 */
import type { Localized } from '../types/banzuke'

export type CareerMilestone = 'juryo' | 'makuuchi' | 'sanyaku' | 'ozeki' | 'yokozuna'

/** The debut plus each milestone, in career order. */
export type CareerStep = 'debut' | CareerMilestone

export const CAREER_STEPS: readonly CareerStep[] = [
  'debut',
  'juryo',
  'makuuchi',
  'sanyaku',
  'ozeki',
  'yokozuna',
]

/** The steps a profile records, in order, as [step, YYYY-MM] pairs. */
export function careerSteps(
  profile: Pick<RikishiProfile, 'debut' | 'milestones'>
): Array<[CareerStep, string]> {
  const steps: Array<[CareerStep, string]> = []
  for (const step of CAREER_STEPS) {
    const date = step === 'debut' ? profile.debut : profile.milestones[step]
    if (date) steps.push([step, date])
  }
  return steps
}

export interface RikishiProfile {
  /** JSA rikishi id. */
  id: number
  realName: Localized
  /** YYYY-MM-DD, or null when unknown. */
  birthDate: string | null
  /** English: prefecture or country; Japanese: down to the town. */
  birthplace: Localized
  heightCm: number | null
  weightKg: number | null
  /** Favoured techniques, e.g. "tsuki, oshi" / "突き・押し". */
  kimarite: Localized
  /** First tournament as YYYY-MM, or null. */
  debut: string | null
  highestRank: Localized
  /** First tournament at each career step, as YYYY-MM. */
  milestones: Partial<Record<CareerMilestone, string>>
  /** The tournament this profile was fetched for. */
  bashoId: number
}

export interface ProfilesFile {
  version: 1
  /** ISO timestamp of the last successful run. */
  fetchedAt: string
  /** Keyed by rikishi id. */
  profiles: Record<string, RikishiProfile>
}

export type ProfilesValidation = { ok: true; file: ProfilesFile } | { ok: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLocalized(value: unknown): value is Localized {
  return isRecord(value) && typeof value.en === 'string' && typeof value.jp === 'string'
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string'
}

function isNullableNumber(value: unknown): boolean {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

/** Structural check of one profile. */
export function isRikishiProfile(value: unknown): value is RikishiProfile {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'number' &&
    isLocalized(value.realName) &&
    isNullableString(value.birthDate) &&
    isLocalized(value.birthplace) &&
    isNullableNumber(value.heightCm) &&
    isNullableNumber(value.weightKg) &&
    isLocalized(value.kimarite) &&
    isNullableString(value.debut) &&
    isLocalized(value.highestRank) &&
    isRecord(value.milestones) &&
    typeof value.bashoId === 'number'
  )
}

/** Validates the profiles file; malformed entries make the whole file invalid. */
export function validateProfiles(input: unknown): ProfilesValidation {
  if (!isRecord(input)) return { ok: false, error: 'profiles file is not an object' }
  if (input.version !== 1)
    return { ok: false, error: `unsupported version ${String(input.version)}` }
  if (typeof input.fetchedAt !== 'string') return { ok: false, error: 'fetchedAt is missing' }
  if (!isRecord(input.profiles)) return { ok: false, error: 'profiles is missing' }
  for (const [key, profile] of Object.entries(input.profiles)) {
    if (!isRikishiProfile(profile)) return { ok: false, error: `profile ${key} is malformed` }
    if (String(profile.id) !== key)
      return { ok: false, error: `profile ${key} has id ${profile.id}` }
  }
  return { ok: true, file: input as unknown as ProfilesFile }
}
