import { memo, useState } from 'react'
import type { Language, Rikishi, RankLevel } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { buildPhotoUrl } from '../../utils/formatting'
import { describePromotion } from '../../utils/promotion'
import styles from './SideCell.module.css'

/** Rendered size of wrestler avatars in CSS pixels (matches the stylesheet). */
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
  const [imageState, setImageState] = useState<'pending' | 'loaded' | 'error'>('pending')
  const isEast = side === 'east'
  const sideLabel = isEast ? 'E' : 'W'

  const staggerDelay = Math.min(rowIndex * STAGGER_MS_PER_ROW, STAGGER_MAX_MS)

  const promotionLabel = rikishi ? describePromotion(rikishi, language, 'short') : null
  const badge = promotionLabel ? (
    <span className={styles.pill} title={describePromotion(rikishi!, language) ?? undefined}>
      {promotionLabel}
    </span>
  ) : null

  const photo = rikishi?.photo
  const imageLoaded = imageState === 'loaded'
  const avatar =
    photo && imageState !== 'error' ? (
      <span className={`${styles['avatar-wrapper']} ${imageLoaded ? styles.loaded : ''}`}>
        <img
          src={buildPhotoUrl(photo)}
          alt={`Portrait of ${rikishi.shikona.en} from ${rikishi.heya.en || 'unknown'} stable`}
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
  const name = (
    // Keyed by language so the swap animation replays on toggle.
    <span
      key={language}
      className={`${styles.name} ${directionClass}`}
      style={{ animationDelay: `${staggerDelay}ms` }}
      lang={language === 'jp' ? 'ja' : 'en'}
    >
      {displayName}
    </span>
  )

  const sideLabelElement = (
    <span key="side" className={styles['side-label']}>
      {sideLabel}
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

  // East: badge, label, info; West: info, label, badge (mirrored layout)
  const content = isEast ? (
    <>
      {badge}
      {sideLabelElement}
      {info}
    </>
  ) : (
    <>
      {info}
      {sideLabelElement}
      {badge}
    </>
  )

  const handleClick = () => {
    if (rikishi && onSelect) {
      onSelect(rikishi)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && rikishi && onSelect) {
      e.preventDefault()
      onSelect(rikishi)
    }
  }

  const isClickable = !!rikishi && !!onSelect

  return (
    <div
      className={`${styles.cell} ${isClickable ? styles.clickable : ''}`}
      data-side={side}
      data-rank-level={rankLevel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `View details for ${displayName}` : undefined}
    >
      {content}
    </div>
  )
}

// Memoize to prevent re-renders from parent (RankRow) changes.
// SideCell uses language context internally, so it will still
// re-render when language changes to update the displayed name.
export const SideCell = memo(SideCellInner)
