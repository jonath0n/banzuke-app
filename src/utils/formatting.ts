import type { Rikishi, RankGroup, RankLevel, Language, BanzukeSnapshot } from '../types/banzuke'

export const DEFAULT_LANGUAGE: Language = 'en'

export function formatDate(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function formatRankLabel(group: RankGroup): string {
  const sample = group.east || group.west
  if (!sample) return group.name || ''
  const rank = Number(sample.rank)
  if (rank === 100) return 'Y'
  if (rank === 200) return 'O'
  if (rank === 300) return 'S'
  if (rank === 400) return 'K'
  if (rank >= 500) {
    const number =
      sample.number != null && sample.number !== ''
        ? String(sample.number)
        : sample.numberKanji || ''
    return `M${number}`
  }
  return group.name || ''
}

export function getRankLevel(row: Rikishi): RankLevel {
  const rank = Number(row.rank)
  if (rank === 100) return 'yokozuna'
  if (rank === 200) return 'ozeki'
  if (rank === 300) return 'sekiwake'
  if (rank === 400) return 'komusubi'
  return 'maegashira'
}

export function normalizeLanguage(value: string | null | undefined): Language {
  return value === 'jp' ? 'jp' : 'en'
}

export function buildPhotoUrl(filename: string): string {
  return `https://www.sumo.or.jp/img/sumo_data/rikishi/60x60/${filename}`
}

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

    if (!group[side]) {
      group[side] = row
    } else if (!group.east) {
      group.east = row
    } else if (!group.west) {
      group.west = row
    }
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
