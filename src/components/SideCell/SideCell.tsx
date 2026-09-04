import { memo, useState } from 'react'
import type { Language, Rikishi, RankLevel } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { buildPhotoUrl } from '../../utils/formatting'
import { describePromotion } from '../../utils/promotion'
import { SIDE_KANJI } from '../../data/kanji'
import { useStrings } from '../../i18n/useStrings'
import styles from './SideCell.module.css'

/** Intrinsic size hint for wrestler avatars (the CSS size is a token). */
const AVATAR_SIZE = 48

/** Stagger for the language-switch animation: per row, capped. */
const STAGGER_MS_PER_ROW = 20
const STAGGER_MAX_MS = 400

interface SideCellProps {
  rikishi: Rikishi | null
  side: 'east' | 'west'
  rankLevel: RankLevel
  /** Row index for staggered animations */
  rowIndex?: number
  /** Callback when wrestler is clicked */
  onSelect?: (rikishi: Rikishi) => void
}

/** Gets the display name for a rikishi based on current language */
function getDisplayName(rikishi: Rikishi | null, language: Language): string {
  if (!rikishi) return '—'
  return rikishi.shikona[language] || rikishi.shikona.en || '—'
}

function SideCellInner({ rikishi, side, rankLevel, rowIndex = 0, onSelect }: SideCellProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const [imageState, setImageState] = useState<'pending' | 'loaded' | 'error'>('pending')
  const isEast = side === 'east'

  const staggerDelay = Math.min(rowIndex * STAGGER_MS_PER_ROW, STAGGER_MAX_MS)

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

  const photo = rikishi?.photo
  const imageLoaded = imageState === 'loaded'
  const avatar =
    rikishi && photo && imageState !== 'error' ? (
      <span className={`${styles['avatar-wrapper']} ${imageLoaded ? styles.loaded : ''}`}>
        <img
          src={buildPhotoUrl(photo)}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          onError={() => setImageState('error')}
          onLoad={() => setImageState('loaded')}
          className={imageLoaded ? styles.visible : ''}
        />
      </span>
    ) : null

  const displayName = getDisplayName(rikishi, language)
  const directionClass = language === 'jp' ? styles['name-jp'] : styles['name-en']
  const langAttr = language === 'jp' ? 'ja' : 'en'
  // Stable and home region under the name; shown on wide sheets only (CSS).
  const detail = rikishi
    ? [rikishi.heya[language], rikishi.pref[language]].filter(Boolean).join(' · ')
    : ''
  const name = (
    <span key="text" className={styles.text}>
      {/* Keyed by language so the swap animation replays on toggle. */}
      <span
        key={language}
        className={`${styles.name} ${directionClass}`}
        style={{ animationDelay: `${staggerDelay}ms` }}
        lang={langAttr}
      >
        {displayName}
      </span>
      {detail && (
        <span className={styles.detail} lang={langAttr}>
          {detail}
        </span>
      )}
    </span>
  )

  // 東 / 西 seal; the side is already part of the button's accessible name
  const sideSeal = (
    <span key="side" className={styles['side-seal']} lang="ja" aria-hidden="true">
      {SIDE_KANJI[side]}
    </span>
  )

  // East: name then avatar; West: avatar then name
  const info = (
    <span key="info" className={styles.info}>
      {isEast ? (
        <>
          {name}
          {avatar}
        </>
      ) : (
        <>
          {avatar}
          {name}
        </>
      )}
    </span>
  )

  // East: badge, seal, info; West: info, seal, badge (mirrored layout)
  const content = isEast ? (
    <>
      {badge}
      {sideSeal}
      {info}
    </>
  ) : (
    <>
      {info}
      {sideSeal}
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
        onClick={() => onSelect(rikishi)}
        aria-label={`${displayName}, ${strings.side[side]}. ${strings.viewDetails}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={className} data-side={side} data-rank-level={rankLevel}>
      {content}
    </div>
  )
}

// Memoize to prevent re-renders from parent (RankRow) changes.
// SideCell uses language context internally, so it will still
// re-render when language changes to update the displayed name.
export const SideCell = memo(SideCellInner)
