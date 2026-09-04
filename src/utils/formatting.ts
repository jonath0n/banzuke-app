import type { Rikishi, RankGroup } from '../types/banzuke'
import { getRankLabel } from '../constants/ranks'

const PHOTO_BASE = 'https://www.sumo.or.jp/img/sumo_data/rikishi'

/**
 * Photo sizes served by the JSA CDN. `60x60` is the thumbnail used on the
 * banzuke table; `270x474` is the tall portrait used on profile pages.
 * (Other sizes such as 240x240 do not exist and redirect to a placeholder.)
 */
export type PhotoSize = '60x60' | '270x474'

export const PHOTO_DIMENSIONS: Record<PhotoSize, { width: number; height: number }> = {
  '60x60': { width: 60, height: 60 },
  '270x474': { width: 270, height: 474 },
}

export function buildPhotoUrl(filename: string, size: PhotoSize = '60x60'): string {
  return `${PHOTO_BASE}/${size}/${filename}`
}

/**
 * Gets the short label for a rank group (e.g., "Y" for Yokozuna, "M1" for Maegashira 1).
 */
export function formatRankLabel(
  group: Pick<RankGroup, 'rankCode' | 'rankNumber' | 'name'>
): string {
  return getRankLabel(group.rankCode, group.rankNumber) || group.name.en
}

/**
 * Groups rikishi by rank position, pairing East and West. Input order is
 * preserved, so pass rows in banzuke order.
 */
export function groupRowsByRank(rows: Rikishi[]): RankGroup[] {
  const groups: RankGroup[] = []
  const lookup = new Map<string, RankGroup>()

  for (const rikishi of rows) {
    const key = `${rikishi.rankCode}-${rikishi.rankNumber}`
    let group = lookup.get(key)
    if (!group) {
      group = {
        key,
        rankCode: rikishi.rankCode,
        rankNumber: rikishi.rankNumber,
        rankLevel: rikishi.rankLevel,
        name: rikishi.rankName,
        east: null,
        west: null,
      }
      lookup.set(key, group)
      groups.push(group)
    }

    if (!group[rikishi.side]) {
      group[rikishi.side] = rikishi
    } else {
      // Two wrestlers marked for the same side at the same position: the
      // upstream table lists them consecutively, so fill the other slot.
      const other = rikishi.side === 'east' ? 'west' : 'east'
      if (!group[other]) group[other] = rikishi
    }
  }

  return groups
}

/** Official JSA profile page for a wrestler, in the UI language. */
export function profileUrl(id: number, language: 'en' | 'jp'): string {
  return language === 'jp'
    ? `https://www.sumo.or.jp/ResultRikishiData/profile/${id}/`
    : `https://www.sumo.or.jp/EnSumoDataRikishi/profile/${id}/`
}
