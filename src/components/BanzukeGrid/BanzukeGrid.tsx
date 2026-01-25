import type { Rikishi } from '../../types/banzuke'
import { groupRowsByRank } from '../../utils/formatting'
import { RankRow } from '../RankRow/RankRow'
import styles from './BanzukeGrid.module.css'

interface BanzukeGridProps {
  rows: Rikishi[]
}

export function BanzukeGrid({ rows }: BanzukeGridProps) {
  // Filter out empty entries and sort by rank
  const cleanRows = rows.filter(
    (entry) => entry && entry.shikona && entry.shikona.trim()
  )
  cleanRows.sort((a, b) => Number(a.sort) - Number(b.sort))

  const grouped = groupRowsByRank(cleanRows)

  if (grouped.length === 0) {
    return (
      <div role="status" className="status">
        No rikishi available right now.
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {grouped.map((group, index) => (
        <RankRow key={`${group.name}-${index}`} group={group} />
      ))}
    </div>
  )
}
