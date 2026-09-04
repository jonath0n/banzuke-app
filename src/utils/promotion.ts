import type { Language, Rikishi } from '../types/banzuke'

/**
 * Describes a wrestler's promotion flag for display.
 * Japanese uses the official wording as printed on the banzuke (新入幕 …);
 * English is derived from the kind and the rank.
 */
export function describePromotion(
  rikishi: Pick<Rikishi, 'promotion' | 'rankName'>,
  lang: Language,
  style: 'short' | 'long' = 'long'
): string | null {
  const promotion = rikishi.promotion
  if (!promotion) return null
  if (lang === 'jp') return promotion.raw

  const division = promotion.raw.includes('十両') ? 'Juryo' : 'Makuuchi'
  switch (promotion.kind) {
    case 'new-to-division':
      return style === 'short' ? 'New' : `New to ${division}`
    case 'returning':
      if (style === 'short') return 'Back'
      return promotion.raw.includes('入') ? `Back in ${division}` : `Back at ${rikishi.rankName.en}`
    case 'new-rank':
      return `New ${rikishi.rankName.en}`
  }
}
