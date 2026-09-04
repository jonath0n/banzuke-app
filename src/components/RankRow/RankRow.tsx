import { memo } from 'react'
import type { RankGroup, Rikishi } from '../../types/banzuke'
import { formatRankLabel } from '../../utils/formatting'
import { isSanyaku, RANK_LEVEL_NAMES } from '../../constants/ranks'
import { jpRankShort } from '../../data/kanji'
import { SideCell } from '../SideCell/SideCell'
import styles from './RankRow.module.css'

interface RankRowProps {
  group: RankGroup
  /** Index for staggered entrance animation */
  index?: number
  /** Callback when a wrestler is selected */
  onSelectRikishi?: (rikishi: Rikishi) => void
}

export const RankRow = memo(function RankRow({ group, index = 0, onSelectRikishi }: RankRowProps) {
  const kanji = jpRankShort(group.rankCode, group.rankNumber) || group.name.jp
  const romaji = isSanyaku(group.rankCode)
    ? RANK_LEVEL_NAMES[group.rankLevel].toUpperCase()
    : formatRankLabel(group)

  return (
    <div
      className={styles.row}
      data-rank-level={group.rankLevel}
      style={{ '--row-index': index } as React.CSSProperties}
    >
      <div className={styles.inner}>
        <SideCell
          rikishi={group.east}
          side="east"
          rankLevel={group.rankLevel}
          rowIndex={index}
          onSelect={onSelectRikishi}
        />
        <div className={styles.rail}>
          <span className={styles.kanji} lang="ja">
            {kanji}
          </span>
          <span className={styles.romaji}>{romaji}</span>
        </div>
        <SideCell
          rikishi={group.west}
          side="west"
          rankLevel={group.rankLevel}
          rowIndex={index}
          onSelect={onSelectRikishi}
        />
      </div>
    </div>
  )
})
