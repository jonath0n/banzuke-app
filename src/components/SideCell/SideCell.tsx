import { useState } from 'react'
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
  const sideLabel = side === 'west' ? 'W' : 'E'

  const handleImageError = () => {
    setImageError(true)
  }

  const renderBadge = () => {
    if (!rikishi?.rank_new) return null
    return <span className={styles.pill}>{rikishi.rank_new}</span>
  }

  const renderAvatar = () => {
    if (!rikishi?.photo || imageError) return null
    return (
      <img
        src={buildPhotoUrl(rikishi.photo)}
        alt={`Portrait of ${rikishi.shikona || 'wrestler'} from ${rikishi.heya_name || 'unknown'} stable`}
        loading="lazy"
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        onError={handleImageError}
      />
    )
  }

  if (side === 'east') {
    return (
      <div className={styles.cell} data-side="east" data-rank-level={rankLevel}>
        {renderBadge()}
        <span className={styles.sideLabel}>{sideLabel}</span>
        <span className={styles.info}>
          <span className={styles.name}>{rikishi?.shikona || '—'}</span>
          {renderAvatar()}
        </span>
      </div>
    )
  }

  return (
    <div className={styles.cell} data-side="west" data-rank-level={rankLevel}>
      <span className={styles.info}>
        {renderAvatar()}
        <span className={styles.name}>{rikishi?.shikona || '—'}</span>
      </span>
      <span className={styles.sideLabel}>{sideLabel}</span>
      {renderBadge()}
    </div>
  )
}
