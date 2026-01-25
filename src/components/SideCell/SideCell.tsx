import type { Rikishi, RankLevel } from '../../types/banzuke'
import { buildPhotoUrl } from '../../utils/formatting'
import styles from './SideCell.module.css'

interface SideCellProps {
  rikishi: Rikishi | null
  side: 'east' | 'west'
  rankLevel: RankLevel
}

export function SideCell({ rikishi, side, rankLevel }: SideCellProps) {
  const sideLabel = side === 'west' ? 'W' : 'E'

  const renderBadge = () => {
    if (!rikishi?.rank_new) return null
    return <span className={styles.pill}>{rikishi.rank_new}</span>
  }

  const renderAvatar = () => {
    if (!rikishi?.photo) return null
    return (
      <img
        src={buildPhotoUrl(rikishi.photo)}
        alt={`${rikishi.shikona || 'Rikishi'} portrait`}
        loading="lazy"
        width={48}
        height={48}
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
