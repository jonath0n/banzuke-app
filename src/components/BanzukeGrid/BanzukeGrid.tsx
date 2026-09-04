import type { Division, RankGroup, RankLevel, Rikishi } from '../../types/banzuke'
import { groupRowsByRank } from '../../utils/formatting'
import { RANK_LEVEL_NAMES, RANK_LEVEL_KANJI } from '../../constants/ranks'
import { useLanguage } from '../../contexts/LanguageContext'
import { langAttr } from '../../i18n/strings'
import { RankRow } from '../RankRow/RankRow'
import { useStrings } from '../../i18n/useStrings'
import styles from './BanzukeGrid.module.css'

/** Matches in the other division, offered when this one has none. */
export interface OtherMatches {
  division: Division
  count: number
  onShow: () => void
}

interface BanzukeGridProps {
  /** Wrestlers in banzuke order. */
  rows: Rikishi[]
  onSelectRikishi?: (rikishi: Rikishi) => void
  /**
   * Ids matching the current search. Rows with a match stay whole (the
   * partner is dimmed, not dropped); rows without one are left out.
   * Null or undefined shows every row.
   */
  highlight?: Set<number> | null
  /** Why the grid might be empty: no data at all, or a search with no matches. */
  emptyReason?: 'no-data' | 'no-matches'
  /** The search text, quoted back in the no-matches state. */
  query?: string
  otherMatches?: OtherMatches | null
  /** Shown in the no-matches state to reset the search. */
  onClearSearch?: () => void
}

/** Tiers whose single row already stamps the rank on its rail need no band. */
const BANDED_TIERS: ReadonlySet<RankLevel> = new Set(['maegashira', 'juryo'])

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

/** An open brush circle (ensō): the sheet has nothing to show here. */
function EnsoIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <path
        d="M39 9.5A21 21 0 1 0 47.5 27"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EmptyState({
  reason,
  query,
  otherMatches,
  onClearSearch,
}: {
  reason: 'no-data' | 'no-matches'
  query?: string
  otherMatches?: OtherMatches | null
  onClearSearch?: () => void
}) {
  const strings = useStrings()
  const { language } = useLanguage()
  return (
    <div role="status" className={styles.emptyState} lang={langAttr(language)}>
      <div className={styles.emptyIcon}>
        <EnsoIcon />
      </div>
      {reason === 'no-matches' ? (
        <>
          <p>{strings.noMatches(query?.trim() ?? '')}</p>
          <p className={styles.emptyHint}>{strings.noMatchesHint}</p>
          <div className={styles.emptyActions}>
            {otherMatches && (
              <button type="button" className={styles.emptyAction} onClick={otherMatches.onShow}>
                {strings.showMatchesIn(otherMatches.count, strings.division[otherMatches.division])}
              </button>
            )}
            {onClearSearch && (
              <button
                type="button"
                className={otherMatches ? styles.emptyActionQuiet : styles.emptyAction}
                onClick={onClearSearch}
              >
                {strings.showAll}
              </button>
            )}
          </div>
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

/** Rows where at least one side is a match; every row when not filtering. */
function visibleGroups(groups: RankGroup[], highlight?: Set<number> | null): RankGroup[] {
  if (!highlight) return groups
  return groups.filter(
    (group) =>
      (group.east && highlight.has(group.east.id)) || (group.west && highlight.has(group.west.id))
  )
}

export function BanzukeGrid({
  rows,
  onSelectRikishi,
  highlight,
  emptyReason = 'no-data',
  query,
  otherMatches,
  onClearSearch,
}: BanzukeGridProps) {
  const grouped = visibleGroups(groupRowsByRank(rows), highlight)

  if (grouped.length === 0) {
    return (
      <EmptyState
        reason={emptyReason}
        query={query}
        otherMatches={otherMatches}
        onClearSearch={onClearSearch}
      />
    )
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
          {/* Sanyaku headings stay for structure but the rail already shows them */}
          <h2
            id={`tier-${tier.level}`}
            className={BANDED_TIERS.has(tier.level) ? styles.tierDivider : 'visually-hidden'}
            data-rank-level={tier.level}
          >
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
              highlight={highlight}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
