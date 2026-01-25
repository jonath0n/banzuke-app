import type { Rikishi } from '../../types/banzuke'
import { groupRowsByRank } from '../../utils/formatting'
import { RankRow } from '../RankRow/RankRow'
import styles from './BanzukeGrid.module.css'

interface BanzukeGridProps {
  rows: Rikishi[]
}

/** Number of skeleton rows to display during loading */
const SKELETON_ROW_COUNT = 8

/** Skeleton row for loading state */
function SkeletonRow({ index }: { index: number }) {
  // Alternate between name lengths for visual variety
  const nameClasses = ['long', 'medium', 'short']
  const eastNameClass = nameClasses[index % 3]
  const westNameClass = nameClasses[(index + 1) % 3]

  return (
    <div
      className={styles['skeleton-row']}
      style={{ '--row-index': index } as React.CSSProperties}
    >
      <div className={styles['skeleton-inner']}>
        <div className={styles['skeleton-cell']} data-side="east">
          <div className={`${styles['skeleton-name']} ${styles[eastNameClass]}`} />
          <div className={styles['skeleton-avatar']} />
        </div>
        <div className={styles['skeleton-label']} />
        <div className={styles['skeleton-cell']} data-side="west">
          <div className={styles['skeleton-avatar']} />
          <div className={`${styles['skeleton-name']} ${styles[westNameClass]}`} />
        </div>
      </div>
    </div>
  )
}

/** Loading skeleton for the banzuke grid */
export function BanzukeGridSkeleton() {
  return (
    <div className={styles['skeleton-grid']} aria-busy="true" aria-label="Loading banzuke data">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <SkeletonRow key={i} index={i} />
      ))}
    </div>
  )
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
      <div role="status" className={styles.status}>
        No rikishi available right now.
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {grouped.map((group, index) => (
        <RankRow key={`${group.name}-${index}`} group={group} index={index} />
      ))}
    </div>
  )
}
