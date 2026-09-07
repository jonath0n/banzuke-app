import { memo } from 'react'
import type { Language, Rikishi, RankLevel } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { describePromotion } from '../../utils/promotion'
import { SIDE_KANJI } from '../../data/kanji'
import { useStrings } from '../../i18n/useStrings'
import { describeMovement, type Movement } from '../../utils/diff'
import { MovementBadge } from '../MovementBadge/MovementBadge'
import { describeRecord, type RikishiRecord } from '../../data/results'
import { Hoshitori } from '../Hoshitori/Hoshitori'
import styles from './SideCell.module.css'

interface SideCellProps {
  rikishi: Rikishi | null
  side: 'east' | 'west'
  rankLevel: RankLevel
  /** Callback when wrestler is clicked */
  onSelect?: (rikishi: Rikishi) => void
  /** Callback when the stable on the detail line is clicked; without it the stable is plain text. */
  onSelectStable?: (heyaId: number) => void
  /** True while a search matches the partner but not this wrestler. */
  dimmed?: boolean
  /** Movement since the previous banzuke. */
  movement?: Movement | null
  /** This tournament's record. */
  record?: RikishiRecord | null
  /** Tournament champion, once decided. */
  champion?: boolean
  /** Pair key for keyboard navigation (shared by east/west partners). */
  pairKey?: string
}

/** Gets the display name for a rikishi based on current language */
function getDisplayName(rikishi: Rikishi | null, language: Language): string {
  if (!rikishi) return '—'
  return rikishi.shikona[language] || rikishi.shikona.en || '—'
}

/**
 * One wrestler on the sheet: the 東/西 seal, the ring name at the size its
 * rank earns, and stable · region under it where the sheet is wide enough.
 * No portrait — the banzuke is a printed document, and the size ladder is
 * what carries the hierarchy.
 *
 * The cell is a wrapper around two things: the wrestler button (seal, name,
 * record, badges) and, beneath it, the detail line, where the stable name is
 * a small button of its own. A button cannot hold a button, which is why the
 * detail line sits beside the wrestler button rather than inside it.
 */
function SideCellInner({
  rikishi,
  side,
  rankLevel,
  onSelect,
  onSelectStable,
  dimmed = false,
  movement = null,
  record = null,
  champion = false,
  pairKey,
}: SideCellProps) {
  const { language } = useLanguage()
  const strings = useStrings()

  const promotionLabel = rikishi ? describePromotion(rikishi, language, 'short') : null
  const badge =
    rikishi && promotionLabel ? (
      <span
        className={styles.pill}
        title={describePromotion(rikishi, language) ?? undefined}
        lang={language === 'jp' ? 'ja' : 'en'}
      >
        {promotionLabel}
      </span>
    ) : null

  const displayName = getDisplayName(rikishi, language)
  const langAttr = language === 'jp' ? 'ja' : 'en'

  // 東 / 西 seal; the side is already part of the button's accessible name
  const content = (
    <>
      <span className={styles['side-seal']} lang="ja" aria-hidden="true">
        {SIDE_KANJI[side]}
      </span>
      <span className={styles.text}>
        <span className={styles.name} lang={langAttr}>
          {displayName}
        </span>
        {record && <Hoshitori record={record} variant="row" champion={champion} />}
      </span>
      {badge}
      {movement && <MovementBadge movement={movement} variant="row" />}
    </>
  )

  // Stable and home region under the name; shown on wide sheets only (CSS).
  // The stable opens its dialog when the cell has somewhere to send it. Out of
  // the Tab order: the same stable is one Enter away inside the wrestler
  // dialog, and a stop on every cell would double the walk down the list.
  const heya = rikishi?.heya[language] ?? ''
  const pref = rikishi?.pref[language] ?? ''
  const detail =
    rikishi && (heya || pref) ? (
      <span className={styles.detail} lang={langAttr}>
        {heya && onSelectStable && rikishi.heya.id > 0 ? (
          <button
            type="button"
            className={styles.stableButton}
            tabIndex={-1}
            onClick={() => onSelectStable(rikishi.heya.id)}
            aria-label={strings.openStable(heya)}
          >
            {heya}
          </button>
        ) : (
          heya
        )}
        {heya && pref ? ' · ' : ''}
        {pref}
      </span>
    ) : null

  const className = [
    styles.cell,
    rikishi && onSelect ? styles.clickable : '',
    rikishi ? '' : styles.vacant,
  ].join(' ')

  if (rikishi && onSelect) {
    const movementText = movement ? describeMovement(movement, language) : ''
    const recordText = record ? describeRecord(record, language) : ''
    const label = `${displayName}, ${strings.side[side]}.${
      movementText ? ` ${movementText}.` : ''
    }${recordText ? ` ${recordText}` : ''}${champion ? ` ${strings.yusho}.` : ''} ${
      strings.viewDetails
    }`
    return (
      <div
        className={className}
        data-side={side}
        data-rank-level={rankLevel}
        data-dimmed={dimmed || undefined}
      >
        <button
          type="button"
          className={styles.wrestler}
          data-side={side}
          data-dimmed={dimmed || undefined}
          data-id={rikishi.id}
          data-pair={pairKey}
          onClick={() => onSelect(rikishi)}
          aria-label={label}
        >
          {content}
        </button>
        {detail}
      </div>
    )
  }

  return (
    <div
      className={className}
      data-side={side}
      data-rank-level={rankLevel}
      data-dimmed={dimmed || undefined}
      data-id={rikishi?.id}
      data-pair={pairKey}
    >
      <div className={styles.wrestler}>{content}</div>
      {detail}
    </div>
  )
}

// Memoize to prevent re-renders from parent (RankRow) changes.
// SideCell uses language context internally, so it will still
// re-render when language changes to update the displayed name.
export const SideCell = memo(SideCellInner)
