import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { previousRankLabel, type Movement } from '../../utils/diff'
import styles from './MovementBadge.module.css'

interface MovementBadgeProps {
  movement: Movement
  /** On the sheet the badge stands under the name; on a row it sits beside it. */
  variant: 'sheet' | 'row'
}

const ARROW = { up: '▲', down: '▼' } as const

/**
 * The rank a wrestler came from, with an arrow for direction. Decorative:
 * the button that contains it says the same thing in words
 * (`describeMovement`), because an arrow glyph is not a sentence.
 *
 * Side swaps show in both variants — including the sheet, which otherwise
 * stays silent on an unchanged rank — because the Yokozuna are the columns
 * most likely to swap sides, and the overlay must not look as if it skipped
 * them.
 */
export function MovementBadge({ movement, variant }: MovementBadgeProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const { kind, previous, sideChanged } = movement

  if (kind === 'same' && !sideChanged) return null

  let text: string
  if (kind === 'new' || !previous) {
    text = strings.movementNew
  } else if (kind === 'same') {
    text = previous.side === 'west' ? strings.movementToEast : strings.movementToWest
  } else {
    text = `${ARROW[kind]}${previousRankLabel(previous, language)}`
  }

  return (
    <span
      className={`${styles.badge} ${styles[variant]}`}
      data-kind={kind}
      lang={langAttr(language)}
      aria-hidden="true"
    >
      {text}
    </span>
  )
}
