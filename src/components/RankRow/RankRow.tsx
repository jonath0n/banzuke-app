import { memo } from 'react'
import type { RankGroup, Rikishi } from '../../types/banzuke'
import { formatRankLabel } from '../../utils/formatting'
import { isSanyaku, RANK_LEVEL_NAMES } from '../../constants/ranks'
import { jpRankName, jpRankShort } from '../../data/kanji'
import { SideCell } from '../SideCell/SideCell'
import type { Movement } from '../../utils/diff'
import type { RikishiRecord } from '../../data/results'
import styles from './RankRow.module.css'

interface RankRowProps {
  group: RankGroup
  /** Index for staggered entrance animation */
  index?: number
  /** Callback when a wrestler is selected */
  onSelectRikishi?: (rikishi: Rikishi) => void
  /** Callback when a stable on a detail line is selected */
  onSelectStable?: (heyaId: number) => void
  /** Ids matching the current search; wrestlers outside it are dimmed. */
  highlight?: Set<number> | null
  /** Movement since the previous banzuke, keyed by wrestler id. */
  movements?: Map<number, Movement> | null
  /** This tournament's records, keyed by wrestler id. */
  records?: Record<string, RikishiRecord> | null
  /** Ids of the tournament champions, across every division. */
  championIds?: ReadonlySet<number>
}

function isDimmed(rikishi: Rikishi | null, highlight: Set<number> | null | undefined): boolean {
  return Boolean(highlight && rikishi && !highlight.has(rikishi.id))
}

export const RankRow = memo(function RankRow({
  group,
  index = 0,
  onSelectRikishi,
  onSelectStable,
  highlight,
  movements,
  records,
  championIds,
}: RankRowProps) {
  const short = jpRankShort(group.rankCode, group.rankNumber) || group.name.jp
  // The full printed rank on a wide sheet, the short form on a narrow one.
  // Both are rendered and CSS picks one, so the rail never reflows on resize.
  // The sanyaku ranks are written the same either way, so they render once.
  const long = jpRankName(group.rankCode, group.rankNumber) || short
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
          onSelect={onSelectRikishi}
          onSelectStable={onSelectStable}
          dimmed={isDimmed(group.east, highlight)}
          movement={group.east ? (movements?.get(group.east.id) ?? null) : null}
          record={group.east ? (records?.[String(group.east.id)] ?? null) : null}
          champion={!!group.east && !!championIds?.has(group.east.id)}
          pairKey={group.key}
        />
        <div className={styles.rail}>
          {long === short ? (
            <span className={styles.kanji} lang="ja">
              {short}
            </span>
          ) : (
            <>
              <span className={`${styles.kanji} ${styles.kanjiLong}`} lang="ja">
                {long}
              </span>
              <span className={`${styles.kanji} ${styles.kanjiShort}`} lang="ja" aria-hidden="true">
                {short}
              </span>
            </>
          )}
          <span className={styles.romaji}>{romaji}</span>
        </div>
        <SideCell
          rikishi={group.west}
          side="west"
          rankLevel={group.rankLevel}
          onSelect={onSelectRikishi}
          onSelectStable={onSelectStable}
          dimmed={isDimmed(group.west, highlight)}
          movement={group.west ? (movements?.get(group.west.id) ?? null) : null}
          record={group.west ? (records?.[String(group.west.id)] ?? null) : null}
          champion={!!group.west && !!championIds?.has(group.west.id)}
          pairKey={group.key}
        />
      </div>
    </div>
  )
})
