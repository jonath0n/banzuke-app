import type { Localized } from '../types/banzuke'

/**
 * Honbasho venues by tournament month. The six tournaments rotate on a fixed
 * calendar, so the month is a more reliable key than the API's venue_id.
 */
const VENUES: Record<number, Localized> = {
  1: { en: 'Ryogoku Kokugikan, Tokyo', jp: '両国国技館（東京）' },
  3: { en: 'EDION Arena, Osaka', jp: 'エディオンアリーナ大阪' },
  5: { en: 'Ryogoku Kokugikan, Tokyo', jp: '両国国技館（東京）' },
  7: { en: 'IG Arena, Nagoya', jp: 'IGアリーナ（名古屋）' },
  9: { en: 'Ryogoku Kokugikan, Tokyo', jp: '両国国技館（東京）' },
  11: { en: 'Fukuoka Kokusai Center', jp: '福岡国際センター' },
}

export function getVenue(month: number): Localized | null {
  return VENUES[month] ?? null
}
