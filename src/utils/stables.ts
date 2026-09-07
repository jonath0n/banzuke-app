/**
 * Who is in a stable, read off the banzuke itself. Every row carries the JSA
 * stable id, so the sekitori of a stable are simply the rows that share it —
 * no network, and correct for whichever tournament is on screen (the sample
 * fallback included, where it is Makuuchi only).
 */
import type { BanzukeSet, Localized, Rikishi } from '../types/banzuke'

export interface StableRoster {
  id: number
  name: Localized
  /** Banzuke order: Makuuchi then Juryo, East before West at each rank. */
  members: Rikishi[]
  makuuchi: number
  juryo: number
}

/** The stable's sekitori on this banzuke, or null when none carries the id. */
export function rosterFor(set: BanzukeSet, heyaId: number): StableRoster | null {
  // An empty upstream id normalizes to 0: a vacant seat, never a stable.
  if (!Number.isInteger(heyaId) || heyaId <= 0) return null
  const makuuchi = set.makuuchi.rikishi.filter((r) => r.heya.id === heyaId)
  const juryo = (set.juryo?.rikishi ?? []).filter((r) => r.heya.id === heyaId)
  const members = [...makuuchi, ...juryo]
  if (members.length === 0) return null
  return {
    id: heyaId,
    name: members[0].heya,
    members,
    makuuchi: makuuchi.length,
    juryo: juryo.length,
  }
}
