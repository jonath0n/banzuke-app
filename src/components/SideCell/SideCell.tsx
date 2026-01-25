import { useState, ReactNode } from 'react'
import type { Rikishi, RankLevel } from '../../types/banzuke'
import { buildPhotoUrl } from '../../utils/formatting'
import styles from './SideCell.module.css'

/** Size of wrestler avatar images in pixels */
const AVATAR_SIZE = 44

interface SideCellProps {
  rikishi: Rikishi | null
  side: 'east' | 'west'
  rankLevel: RankLevel
}

export function SideCell({ rikishi, side, rankLevel }: SideCellProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const isEast = side === 'east'
  const sideLabel = isEast ? 'E' : 'W'

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

  const name = <span className={styles.name}>{rikishi?.shikona || '—'}</span>

  const sideLabelElement = (
    <span className={styles['side-label']}>{sideLabel}</span>
  )

  // East: name then avatar; West: avatar then name
  const infoContent: ReactNode[] = isEast ? [name, avatar] : [avatar, name]

  const info = <span className={styles.info}>{infoContent}</span>

  // East: badge, label, info; West: info, label, badge (mirrored layout)
  const content: ReactNode[] = isEast
    ? [badge, sideLabelElement, info]
    : [info, sideLabelElement, badge]

  return (
    <div className={styles.cell} data-side={side} data-rank-level={rankLevel}>
      {content}
    </div>
  )
}
