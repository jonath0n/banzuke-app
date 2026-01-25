import type { Rikishi, RankGroup, RankLevel } from '../types/banzuke'
import { getRankLevelFromCode, getRankLabel } from '../constants/ranks'

/**
 * Formats a date string in ISO-style format (YYYY/MM/DD).
 */
export function formatDate(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * Formats a datetime string for display with simple time (e.g., "2025/12/22, 6am").
 */
export function formatDateTime(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const dateStr = formatDate(value)
  const hours = date.getHours()
  const minutes = date.getMinutes()

  // Format time as simple "6am" or "2:30pm"
  const period = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12
  const timeStr =
    minutes === 0 ? `${hour12}${period}` : `${hour12}:${String(minutes).padStart(2, '0')}${period}`

  return `${dateStr}, ${timeStr}`
}

/**
 * Gets the short label for a rank group (e.g., "Y" for Yokozuna, "M1" for Maegashira 1).
 */
export function formatRankLabel(group: RankGroup): string {
  const sample = group.east || group.west
  if (!sample) return group.name || ''

  const rankCode = Number(sample.rank)
  const number =
    sample.number != null && sample.number !== '' ? String(sample.number) : sample.numberKanji || ''

  return getRankLabel(rankCode, number) || group.name || ''
}

/**
 * Determines the rank level (tier) for styling purposes.
 */
export function getRankLevel(row: Rikishi): RankLevel {
  const rankCode = Number(row.rank)
  return getRankLevelFromCode(rankCode)
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
