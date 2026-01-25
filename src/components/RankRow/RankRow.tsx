import type { RankGroup, RankLevel } from '../../types/banzuke'
import { formatRankLabel, getRankLevel } from '../../utils/formatting'
import { SideCell } from '../SideCell/SideCell'
import styles from './RankRow.module.css'

interface RankRowProps {
  group: RankGroup
}

export function RankRow({ group }: RankRowProps) {
  const sample = group.east || group.west
  const rankLevel: RankLevel = sample ? getRankLevel(sample) : 'maegashira'

  return (
    <div className={styles.row} data-rank-level={rankLevel}>
      <div className={styles.inner}>
        <SideCell rikishi={group.east} side="east" rankLevel={rankLevel} />
        <div className={styles.label}>{formatRankLabel(group) || '—'}</div>
        <SideCell rikishi={group.west} side="west" rankLevel={rankLevel} />
      </div>
    </div>
  )
}
