import type { RankGroup, RankLevel, Rikishi } from '../../types/banzuke'
import { groupRowsByRank } from '../../utils/formatting'
import { RANK_LEVEL_NAMES, RANK_LEVEL_KANJI } from '../../constants/ranks'
import { RankRow } from '../RankRow/RankRow'
import { useStrings } from '../../i18n/useStrings'
import styles from './BanzukeGrid.module.css'

interface BanzukeGridProps {
  /** Wrestlers in banzuke order. */
  rows: Rikishi[]
  onSelectRikishi?: (rikishi: Rikishi) => void
  /** Why the grid might be empty: no data at all, or a search with no matches. */
  emptyReason?: 'no-data' | 'no-matches'
  /** Shown in the no-matches state to reset the search. */
  onClearSearch?: () => void
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
  const strings = useStrings()
  return (
    <div className={styles['skeleton-grid']} role="status" aria-busy="true">
      <span className="visually-hidden">{strings.loading}</span>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <SkeletonRow key={i} index={i} aria-hidden="true" />
      ))}
    </div>
  )
}

interface Tier {
  level: RankLevel
  groups: RankGroup[]
}

/** Splits grouped rows into consecutive rank tiers (Yokozuna, Ozeki, …). */
function splitIntoTiers(groups: RankGroup[]): Tier[] {
  const tiers: Tier[] = []
  for (const group of groups) {
    const last = tiers[tiers.length - 1]
    if (last && last.level === group.rankLevel) {
      last.groups.push(group)
    } else {
      tiers.push({ level: group.rankLevel, groups: [group] })
    }
  }
  return tiers
}

function EmptyState({
  reason,
  onClearSearch,
}: {
  reason: 'no-data' | 'no-matches'
  onClearSearch?: () => void
}) {
  const strings = useStrings()
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
      {reason === 'no-matches' ? (
        <>
          <p>{strings.noMatches}</p>
          <p className={styles.emptyHint}>{strings.noMatchesHint}</p>
          {onClearSearch && (
            <button type="button" className={styles.emptyAction} onClick={onClearSearch}>
              {strings.showAll}
            </button>
          )}
        </>
      ) : (
        <>
          <p>{strings.noData}</p>
          <p className={styles.emptyHint}>{strings.noDataHint}</p>
        </>
      )}
    </div>
  )
}

export function BanzukeGrid({
  rows,
  onSelectRikishi,
  emptyReason = 'no-data',
  onClearSearch,
}: BanzukeGridProps) {
  const grouped = groupRowsByRank(rows)

  if (grouped.length === 0) {
    return <EmptyState reason={emptyReason} onClearSearch={onClearSearch} />
  }

  let rowIndex = 0

  return (
    <div className={styles.grid}>
      {splitIntoTiers(grouped).map((tier) => (
        <section
          key={tier.level}
          className={styles.tier}
          aria-labelledby={`tier-${tier.level}`}
          data-rank-level={tier.level}
        >
          <h2 id={`tier-${tier.level}`} className={styles.tierDivider} data-rank-level={tier.level}>
            <span className={styles.tierKanji} lang="ja">
              {RANK_LEVEL_KANJI[tier.level]}
            </span>
            <span className={styles.tierLabel}>{RANK_LEVEL_NAMES[tier.level]}</span>
          </h2>
          {tier.groups.map((group) => (
            <RankRow
              key={group.key}
              group={group}
              index={rowIndex++}
              onSelectRikishi={onSelectRikishi}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
