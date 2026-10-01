import type { ArchivedBanzuke } from '../data/archive'
import type { RikishiRecord } from '../data/results'
import type { Rikishi } from '../types/banzuke'

const OZEKI = 200

/**
 * Who is kadoban (角番): an Ozeki who was Ozeki on the previous banzuke and
 * made make-koshi there, so an eighth loss this time drops him to Sekiwake.
 * Derived, never stored — the previous banzuke and its results say it all.
 * Nobody is kadoban when either is missing; a fresh Ozeki (promoted this
 * banzuke) never is, since his make-koshi was as Sekiwake.
 */
export function kadobanIds(
  current: Rikishi[],
  previous: ArchivedBanzuke | null,
  previousRecords: Record<string, RikishiRecord> | null
): Set<number> {
  const ids = new Set<number>()
  if (!previous || !previousRecords) return ids
  const wasOzeki = new Set(previous.rikishi.filter((r) => r.rankCode === OZEKI).map((r) => r.id))
  for (const rikishi of current) {
    if (rikishi.rankCode !== OZEKI || !wasOzeki.has(rikishi.id)) continue
    const record = previousRecords[String(rikishi.id)]
    if (record && record.losses + record.absences >= 8) ids.add(rikishi.id)
  }
  return ids
}
