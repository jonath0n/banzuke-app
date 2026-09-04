import type { Rikishi } from '../../types/banzuke'
import { groupRowsByRank } from '../../utils/formatting'
import { RANK_LEVEL_NAMES } from '../../constants/ranks'
import { RankRow } from '../RankRow/RankRow'
import styles from './BanzukeGrid.module.css'

interface BanzukeGridProps {
  /** Wrestlers in banzuke order. */
  rows: Rikishi[]
  onSelectRikishi?: (rikishi: Rikishi) => void
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
    <div className={styles['skeleton-row']} style={{ '--row-index': index } as React.CSSProperties}>
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

export function BanzukeGrid({ rows, onSelectRikishi }: BanzukeGridProps) {
  const grouped = groupRowsByRank(rows)

  if (grouped.length === 0) {
    return (
      <div role="status" className={styles.emptyState}>
        <div className={styles.emptyIcon} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M8 15s1.5 2 4 2 4-2 4-2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="9" cy="10" r="1" fill="currentColor" />
            <circle cx="15" cy="10" r="1" fill="currentColor" />
          </svg>
        </div>
        <p>No rikishi available right now.</p>
        <p className={styles.emptyHint}>Check back when the next banzuke is announced.</p>
      </div>
    )
  }

  // Build elements with rank tier dividers
  const elements: React.ReactNode[] = []
  let lastRankLevel = ''

  grouped.forEach((group, index) => {
    const rankLevel = group.rankLevel

    // Insert tier divider when rank level changes
    if (rankLevel !== lastRankLevel) {
      elements.push(
        <div
          key={`divider-${rankLevel}`}
          className={styles.tierDivider}
          data-rank-level={rankLevel}
          role="separator"
        >
          <span className={styles.tierLabel}>{RANK_LEVEL_NAMES[rankLevel]}</span>
        </div>
      )
      lastRankLevel = rankLevel
    }

    elements.push(
      <RankRow key={group.key} group={group} index={index} onSelectRikishi={onSelectRikishi} />
    )
  })

  return <div className={styles.grid}>{elements}</div>
}
