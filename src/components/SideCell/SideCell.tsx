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
  const isEast = side === 'east'
  const sideLabel = isEast ? 'E' : 'W'

  const handleImageError = () => {
    setImageError(true)
  }

  const badge = rikishi?.rank_new ? (
    <span className={styles.pill}>{rikishi.rank_new}</span>
  ) : null

  const avatar =
    rikishi?.photo && !imageError ? (
      <img
        src={buildPhotoUrl(rikishi.photo)}
        alt={`Portrait of ${rikishi.shikona || 'wrestler'} from ${rikishi.heya_name || 'unknown'} stable`}
        loading="lazy"
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        onError={handleImageError}
      />
    ) : null

  const name = <span className={styles.name}>{rikishi?.shikona || '—'}</span>

  const sideLabelElement = (
    <span className={styles['side-label']}>{sideLabel}</span>
  )

  const ariaLabel = rikishi
    ? `${sideLabel} side ${rikishi.shikona || 'wrestler'}${
        rikishi.heya_name ? ` from ${rikishi.heya_name} stable` : ''
      }`
    : `${sideLabel} side vacant`

  // East: name then avatar; West: avatar then name
  const info = (
    <span className={styles.info}>
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

  return (
    <div
      className={styles.cell}
      data-side={side}
      data-rank-level={rankLevel}
      aria-label={ariaLabel}
      role="group"
      tabIndex={rikishi ? 0 : -1}
    >
      {isEast ? (
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
      )}
    </div>
  )
}
