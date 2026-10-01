import type { RikishiRecord } from '../data/results'
import { describeRecord } from '../data/results'
import { STRINGS } from '../i18n/strings'
import type { Language, Rikishi } from '../types/banzuke'
import { describeMovement, type Movement } from './diff'
import { describePromotion } from './promotion'

export interface DescribeOptions {
  /** Where the wrestler came from on the previous banzuke, when Changes is on. */
  movement?: Movement | null
  /** The tournament record, when Results is on. */
  record?: RikishiRecord | null
  /** Holder of the yusho. */
  champion?: boolean
  /** An Ozeki whose make-koshi would cost the rank. */
  kadoban?: boolean
  /** Append the "View details" affordance; off for a name that is not a button. */
  action?: boolean
}

/**
 * The one accessible name for a wrestler, wherever a button stands for them:
 * a Sheet column, a List cell, a stable's roster row. Everything the eye reads
 * from size, position, a pill or a mark is spelled out here in order —
 * name, side, rank, promotion, movement, record, yusho — then the action.
 *
 * English: "Onosato, East. Yokozuna. New Yokozuna. Up from O. 12 wins, 3 losses.
 * Kachi-koshi. Yusho. View details". The name-and-side opening is relied on by
 * tests and by anyone who has learned to skim the list.
 * Japanese: 「大の里、東、横綱。新横綱。大関から。12勝3敗、勝ち越し。優勝。詳細を見る」.
 */
export function describeWrestler(
  rikishi: Pick<Rikishi, 'shikona' | 'rankName' | 'side' | 'promotion'>,
  language: Language,
  { movement, record, champion = false, kadoban = false, action = true }: DescribeOptions = {}
): string {
  const strings = STRINGS[language]
  const name = rikishi.shikona[language] || rikishi.shikona.en
  const rank = rikishi.rankName[language] || rikishi.rankName.en
  const side = strings.side[rikishi.side]
  const sentences = [
    describePromotion(rikishi, language, 'long'),
    kadoban ? strings.kadoban : null,
    movement ? describeMovement(movement, language) : null,
    record ? describeRecord(record, language) : null,
    champion ? strings.yusho : null,
  ].filter((s): s is string => Boolean(s))

  if (language === 'jp') {
    const body = [`${name}、${side}、${rank}`, ...sentences].map((s) => `${s}。`).join('')
    return action ? `${body}${strings.viewDetails}` : body
  }
  // describeRecord already ends its English sentence with a full stop.
  const body = [
    `${name}, ${side}. ${rank}.`,
    ...sentences.map((s) => (s.endsWith('.') ? s : `${s}.`)),
  ]
  if (action) body.push(strings.viewDetails)
  return body.join(' ')
}
