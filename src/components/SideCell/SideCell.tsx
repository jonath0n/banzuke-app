import { memo, useState } from 'react'
import type { Rikishi, RankLevel } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { buildPhotoUrl } from '../../utils/formatting'
import styles from './SideCell.module.css'

/** Size of wrestler avatar images in pixels */
const AVATAR_SIZE = 44

interface SideCellProps {
  rikishi: Rikishi | null
  side: 'east' | 'west'
  rankLevel: RankLevel
  /** Row index for staggered animations */
  rowIndex?: number
}

/** Gets the display name for a rikishi based on current language */
function getDisplayName(rikishi: Rikishi | null, language: 'en' | 'jp'): string {
  if (!rikishi) return '—'
  if (language === 'jp' && rikishi.shikona_jp) {
    return rikishi.shikona_jp
  }
  if (language === 'en' && rikishi.shikona_en) {
    return rikishi.shikona_en
  }
  return rikishi.shikona || '—'
}

function SideCellInner({ rikishi, side, rankLevel, rowIndex = 0 }: SideCellProps) {
  const { language } = useLanguage()
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const isEast = side === 'east'
  const sideLabel = isEast ? 'E' : 'W'
  
  // Stagger delay for language switch animation (20ms per row, max 400ms)
  const staggerDelay = Math.min(rowIndex * 20, 400)

  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const badge = rikishi?.rank_new ? (
    <span className={styles.pill}>{rikishi.rank_new}</span>
  ) : null

  const hasPhoto = rikishi?.photo && !imageError
  const avatar = hasPhoto ? (
    <span className={`${styles['avatar-wrapper']} ${imageLoaded ? styles.loaded : ''}`}>
      <img
        src={buildPhotoUrl(rikishi.photo)}
        alt={`Portrait of ${rikishi.shikona || 'wrestler'} from ${rikishi.heya_name || 'unknown'} stable`}
        loading="lazy"
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={imageLoaded ? styles.visible : ''}
      />
    </span>
  ) : null

  const displayName = getDisplayName(rikishi, language)
  const directionClass = language === 'jp' ? styles['name-rtl'] : styles['name-ltr']
  const name = (
    <span 
      key={language} 
      className={`${styles.name} ${directionClass}`}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      {displayName}
    </span>
  )

  const sideLabelElement = (
    <span className={styles['side-label']}>{sideLabel}</span>
  )

  // East: name then avatar; West: avatar then name
  const infoContent = isEast ? [name, avatar] : [avatar, name]
  const info = <span className={styles.info}>{infoContent}</span>

  // East: badge, label, info; West: info, label, badge (mirrored layout)
  const content = isEast
    ? [badge, sideLabelElement, info]
    : [info, sideLabelElement, badge]

  return (
    <div className={styles.cell} data-side={side} data-rank-level={rankLevel}>
      {content}
    </div>
  )
}

// Memoize to prevent re-renders from parent (RankRow) changes.
// SideCell uses language context internally, so it will still
// re-render when language changes to update the displayed name.
export const SideCell = memo(SideCellInner)
