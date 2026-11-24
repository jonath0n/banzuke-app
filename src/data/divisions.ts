/**
 * Helpers over a `BanzukeSet` now that it holds up to six divisions, any of
 * which but Makuuchi may be absent (Juryo when the snapshot lacks it, the
 * lower divisions until their file loads).
 */
import type { Banzuke, BanzukeSet, Division, Rikishi } from '../types/banzuke'
import { DIVISIONS } from './schema'

/** The divisions present in a set, top first. */
export function divisionsIn(set: BanzukeSet): Division[] {
  return DIVISIONS.filter((division) => set[division] != null)
}

/** One division of a set, or null when it is not loaded. */
export function banzukeOf(set: BanzukeSet, division: Division): Banzuke | null {
  return set[division] ?? null
}

/** Every wrestler in the set, in banzuke order from the top of Makuuchi down. */
export function everyRikishi(set: BanzukeSet): Rikishi[] {
  return divisionsIn(set).flatMap((division) => set[division]?.rikishi ?? [])
}

/** Which loaded division a wrestler is in, by JSA id. */
export function divisionOfId(set: BanzukeSet, id: number): Division | null {
  for (const division of divisionsIn(set)) {
    if (set[division]?.rikishi.some((r) => r.id === id)) return division
  }
  return null
}
