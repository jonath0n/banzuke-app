/**
 * Who is in a stable, read off the banzuke itself. Every row carries the JSA
 * stable id, so the members of a stable are simply the rows that share it —
 * no network, and correct for whichever tournament is on screen (the sample
 * fallback included, where it is Makuuchi only). The divisions below Juryo
 * join the roster once their file has loaded.
 */
import type { BanzukeSet, Division, Localized, Rikishi } from '../types/banzuke'
import { divisionsIn } from '../data/divisions'

export interface StableRoster {
  id: number
  name: Localized
  /** Banzuke order: top division first, East before West at each rank. */
  members: Rikishi[]
  makuuchi: number
  juryo: number
  /** Members below Juryo (0 while those divisions are not loaded). */
  lower: number
  /** Members per loaded division. */
  byDivision: Partial<Record<Division, number>>
}

/** The stable's wrestlers on this banzuke, or null when none carries the id. */
export function rosterFor(set: BanzukeSet, heyaId: number): StableRoster | null {
  // An empty upstream id normalizes to 0: a vacant seat, never a stable.
  if (!Number.isInteger(heyaId) || heyaId <= 0) return null
  const byDivision: Partial<Record<Division, number>> = {}
  const members: Rikishi[] = []
  for (const division of divisionsIn(set)) {
    const here = (set[division]?.rikishi ?? []).filter((r) => r.heya.id === heyaId)
    if (here.length === 0) continue
    byDivision[division] = here.length
    members.push(...here)
  }
  if (members.length === 0) return null
  const makuuchi = byDivision.makuuchi ?? 0
  const juryo = byDivision.juryo ?? 0
  return {
    id: heyaId,
    name: members[0].heya,
    members,
    makuuchi,
    juryo,
    lower: members.length - makuuchi - juryo,
    byDivision,
  }
}
