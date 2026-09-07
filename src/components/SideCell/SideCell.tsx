import { memo } from 'react'
import type { Language, Rikishi, RankLevel } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { describePromotion } from '../../utils/promotion'
import { SIDE_KANJI } from '../../data/kanji'
import { useStrings } from '../../i18n/useStrings'
import styles from './SideCell.module.css'

interface SideCellProps {
  rikishi: Rikishi | null
  side: 'east' | 'west'
  rankLevel: RankLevel
  /** Callback when wrestler is clicked */
  onSelect?: (rikishi: Rikishi) => void
  /** True while a search matches the partner but not this wrestler. */
  dimmed?: boolean
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
 */
function SideCellInner({ rikishi, side, rankLevel, onSelect, dimmed = false }: SideCellProps) {
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
  // Stable and home region under the name; shown on wide sheets only (CSS).
  const detail = rikishi
    ? [rikishi.heya[language], rikishi.pref[language]].filter(Boolean).join(' · ')
    : ''

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
        {detail && (
          <span className={styles.detail} lang={langAttr}>
            {detail}
          </span>
        )}
      </span>
      {badge}
    </>
  )

  const className = [
    styles.cell,
    rikishi && onSelect ? styles.clickable : '',
    rikishi ? '' : styles.vacant,
  ].join(' ')

  if (rikishi && onSelect) {
    return (
      <button
        type="button"
        className={className}
        data-side={side}
        data-rank-level={rankLevel}
        data-dimmed={dimmed || undefined}
        onClick={() => onSelect(rikishi)}
        aria-label={`${displayName}, ${strings.side[side]}. ${strings.viewDetails}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={className}
      data-side={side}
      data-rank-level={rankLevel}
      data-dimmed={dimmed || undefined}
    >
      {content}
    </div>
  )
}

// Memoize to prevent re-renders from parent (RankRow) changes.
// SideCell uses language context internally, so it will still
// re-render when language changes to update the displayed name.
export const SideCell = memo(SideCellInner)
