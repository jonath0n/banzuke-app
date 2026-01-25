import { memo } from 'react'
import type { RankGroup, RankLevel } from '../../types/banzuke'
import { formatRankLabel, getRankLevel } from '../../utils/formatting'
import { SideCell } from '../SideCell/SideCell'
import styles from './RankRow.module.css'

interface RankRowProps {
  group: RankGroup
  /** Index for staggered entrance animation */
  index?: number
}

export const RankRow = memo(function RankRow({ group, index = 0 }: RankRowProps) {
  const sample = group.east || group.west
  const rankLevel: RankLevel = sample ? getRankLevel(sample) : 'maegashira'

  return (
    <div
      className={styles.row}
      data-rank-level={rankLevel}
      style={{ '--row-index': index } as React.CSSProperties}
    >
      <div className={styles.inner}>
        <SideCell rikishi={group.east} side="east" rankLevel={rankLevel} rowIndex={index} />
        <div className={styles.label}>{formatRankLabel(group) || '—'}</div>
        <SideCell rikishi={group.west} side="west" rankLevel={rankLevel} rowIndex={index} />
      </div>
    </div>
  )
})
