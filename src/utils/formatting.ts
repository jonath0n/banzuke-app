import type { Rikishi, RankGroup, RankLevel, Language, BanzukeSnapshot } from '../types/banzuke'
import { getRankLevelFromCode, getRankLabel } from '../constants/ranks'

export const DEFAULT_LANGUAGE: Language = 'en'

/**
 * Formats a date string for display, handling invalid dates gracefully.
 */
export function formatDate(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

/**
 * Formats a datetime string for display, with fallback for invalid dates.
 */
export function formatDateTime(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

/**
 * Gets the short label for a rank group (e.g., "Y" for Yokozuna, "M1" for Maegashira 1).
 */
export function formatRankLabel(group: RankGroup): string {
  const sample = group.east || group.west
  if (!sample) return group.name || ''
  
  const rankCode = Number(sample.rank)
  const number = sample.number != null && sample.number !== ''
    ? String(sample.number)
    : sample.numberKanji || ''
  
  return getRankLabel(rankCode, number) || group.name || ''
}

/**
 * Determines the rank level (tier) for styling purposes.
 */
export function getRankLevel(row: Rikishi): RankLevel {
  const rankCode = Number(row.rank)
  return getRankLevelFromCode(rankCode)
}

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'jp' ? 'jp' : 'en'
}

export function buildPhotoUrl(filename: string): string {
  return `https://www.sumo.or.jp/img/sumo_data/rikishi/60x60/${filename}`
}

/**
 * Groups rikishi rows by their rank name, pairing east and west wrestlers.
 */
export function groupRowsByRank(rows: Rikishi[]): RankGroup[] {
  const groups: RankGroup[] = []
  const lookup = new Map<string, RankGroup>()

  rows.forEach((row) => {
    const key = row.banzuke_name || `Rank ${row.rank}`
    if (!lookup.has(key)) {
      const group: RankGroup = { name: key, east: null, west: null }
      lookup.set(key, group)
      groups.push(group)
    }

    const group = lookup.get(key)!
    const side = Number(row.ew) === 2 ? 'west' : 'east'

    // Assign to the designated side, or fill the first empty slot
    if (!group[side]) {
      group[side] = row
    } else if (side === 'east' && !group.west) {
      // If east is taken and this was marked as east, put in west
      group.west = row
    } else if (side === 'west' && !group.east) {
      // If west is taken and this was marked as west, put in east
      group.east = row
    }
    // Otherwise, ignore duplicate entries for the same position
  })

  return groups
}

export function pickPayloadForLanguage(
  snapshot: BanzukeSnapshot,
  language: Language
) {
  if (!snapshot || typeof snapshot !== 'object') return null
  if (snapshot.payloads && snapshot.payloads[language]) {
    return snapshot.payloads[language]
  }
  if (snapshot.payloads && snapshot.payloads[DEFAULT_LANGUAGE]) {
    return snapshot.payloads[DEFAULT_LANGUAGE]
  }
  if (snapshot.payload) {
    return snapshot.payload
  }
  return null
}

export function describeSnapshot(
  snapshot: BanzukeSnapshot,
  language: Language
): string {
  const parts = ['Static snapshot']
  if (snapshot?.fetchedAt) {
    try {
      const date = new Date(snapshot.fetchedAt)
      parts.push(
        Number.isNaN(date.getTime()) ? snapshot.fetchedAt : date.toLocaleString()
      )
    } catch {
      parts.push(snapshot.fetchedAt)
    }
  }
  if (snapshot?.sources?.[language]) {
    parts.push(snapshot.sources[language])
  }
  return parts.join(' • ')
}
