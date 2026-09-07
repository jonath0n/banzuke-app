import { memo, useCallback, useMemo, useState } from 'react'
import type { Division, RankGroup, Rikishi, Side } from '../../types/banzuke'
import { groupRowsByRank } from '../../utils/formatting'
import { shortPrefecture, SIDE_KANJI, toKanjiNumber } from '../../data/kanji'
import { RANK_CODES, RANK_LEVEL_KANJI } from '../../constants/ranks'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { describeMovement, type Movement } from '../../utils/diff'
import { MovementBadge } from '../MovementBadge/MovementBadge'
import { describeRecord, type RikishiRecord } from '../../data/results'
import { Hoshitori } from '../Hoshitori/Hoshitori'
import { handleRovingKey } from '../../utils/rovingFocus'
import type { Guide, GuideZone } from '../../utils/guide'
import styles from './BanzukeSheet.module.css'

interface BanzukeSheetProps {
  /** Wrestlers in banzuke order. */
  rows: Rikishi[]
  onSelectRikishi?: (rikishi: Rikishi) => void
  /** Ids matching the current search; everyone else is dimmed. */
  highlight?: Set<number> | null
  /** Movement since the previous banzuke, keyed by wrestler id. */
  movements?: Map<number, Movement> | null
  /** This tournament's records, keyed by wrestler id. */
  records?: Record<string, RikishiRecord> | null
  /** Tournament champion per division, once decided. */
  champions?: Partial<Record<Division, number>>
  /** Guided-tour marks to overlay, or null/undefined when the guide is off. */
  guide?: Guide | null
}

/** Fixed rendering order for a column's marks, matching the bands top to bottom. */
const ZONES: GuideZone[] = ['top', 'rank', 'numeral', 'origin', 'name', 'movement', 'record']

/**
 * Character size at each rank, in rem. This is the sheet: a banzuke is
 * readable across a room because the ring names shrink continuously from the
 * Yokozuna at the outer edges to the lowest Maegashira in the middle.
 */
const SANYAKU_SCALE: Record<string, number> = {
  yokozuna: 2.6,
  ozeki: 2.15,
  sekiwake: 1.85,
  komusubi: 1.65,
}

const NUMBERED_SCALE = { top: 1.45, bottom: 0.95 }

interface PairRef {
  pair: string
  side: string
}

const refOf = (target: EventTarget | null): PairRef | null => {
  const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-pair]')
  return el?.dataset.pair && el.dataset.side
    ? { pair: el.dataset.pair, side: el.dataset.side }
    : null
}

const samePair = (a: PairRef | null, b: PairRef | null) =>
  a === b || (a?.pair === b?.pair && a?.side === b?.side)

/** Commits a hover/focus update only when the pair actually changed, so a
 * pointer wandering within one column doesn't retrigger a render. */
function setPairIfChanged(
  setter: React.Dispatch<React.SetStateAction<PairRef | null>>,
  next: PairRef | null
) {
  setter((prev) => (samePair(prev, next) ? prev : next))
}

function columnScale(rikishi: Rikishi, lowestNumber: number): number {
  const fixed = SANYAKU_SCALE[rikishi.rankLevel]
  if (fixed) return fixed
  const { top, bottom } = NUMBERED_SCALE
  if (lowestNumber <= 1) return top
  const progress = (rikishi.rankNumber - 1) / (lowestNumber - 1)
  return Number((top - progress * (top - bottom)).toFixed(3))
}

/** Rows where at least one side matches; every row when not filtering. */
function visibleGroups(groups: RankGroup[], highlight?: Set<number> | null): RankGroup[] {
  if (!highlight) return groups
  return groups.filter(
    (group) =>
      (group.east && highlight.has(group.east.id)) || (group.west && highlight.has(group.west.id))
  )
}

const Column = memo(function Column({
  rikishi,
  scale,
  onSelect,
  dimmed,
  movement,
  record,
  champion,
  pairKey,
  lit,
  marks,
}: {
  rikishi: Rikishi
  scale: number
  onSelect?: (rikishi: Rikishi) => void
  dimmed: boolean
  movement: Movement | null
  record: RikishiRecord | null
  champion: boolean
  pairKey: string
  lit: boolean
  marks?: Partial<Record<GuideZone, number>>
}) {
  const { language } = useLanguage()
  const strings = useStrings()
  const lang = langAttr(language)
  const name = rikishi.shikona[language] || rikishi.shikona.en
  // The printed sheet prints only the tier — 前頭, never 前頭十七枚目 — because
  // position along the band already says which one. Keeping the tier uniform is
  // what makes the rank band read as one heavy rule of characters. The numeral
  // is carried underneath, small, since a screen has no fixed sheet to count on.
  const tier = RANK_LEVEL_KANJI[rikishi.rankLevel]
  const numeral = rikishi.rankCode >= RANK_CODES.MAEGASHIRA ? toKanjiNumber(rikishi.rankNumber) : ''
  // The full rank goes into the accessible name: a screen reader cannot see how
  // large the characters are, or how far along the band the column sits.
  const movementText = movement ? describeMovement(movement, language) : ''
  const recordText = record ? describeRecord(record, language) : ''
  const label = `${name}, ${strings.side[rikishi.side]}. ${rikishi.rankName[language]}.${
    movementText ? ` ${movementText}.` : ''
  }${recordText ? ` ${recordText}` : ''}${champion ? ` ${strings.yusho}.` : ''} ${
    strings.viewDetails
  }`

  const content = (
    <>
      <span className={styles.rank} aria-hidden="true">
        <span className={styles.tier} lang="ja">
          {tier}
        </span>
        {numeral && (
          <span className={styles.numeral} lang="ja">
            {numeral}
          </span>
        )}
      </span>
      {/* Home province, where the sheet prints it: between rank and ring name */}
      <span className={styles.origin} lang={lang}>
        {language === 'jp' && rikishi.pref.jp ? shortPrefecture(rikishi.pref.jp) : rikishi.pref.en}
      </span>
      <span className={styles.nameBand}>
        <span className={styles.name} lang={lang}>
          {name}
        </span>
        {movement && <MovementBadge movement={movement} variant="sheet" />}
        {record && <Hoshitori record={record} variant="sheet" champion={champion} />}
      </span>
      {marks &&
        ZONES.filter((zone) => marks[zone] !== undefined).map((zone) => (
          <span key={zone} className={styles.mark} data-zone={zone} aria-hidden="true">
            {marks[zone]}
          </span>
        ))}
    </>
  )

  const style = { '--col-scale': scale } as React.CSSProperties

  if (!onSelect) {
    return (
      <div
        className={styles.column}
        style={style}
        data-id={rikishi.id}
        data-pair={pairKey}
        data-side={rikishi.side}
        data-rank-level={rikishi.rankLevel}
        data-dimmed={dimmed || undefined}
        data-lit={lit || undefined}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${styles.column} ${styles.clickable}`}
      style={style}
      data-id={rikishi.id}
      data-pair={pairKey}
      data-side={rikishi.side}
      data-rank-level={rikishi.rankLevel}
      data-dimmed={dimmed || undefined}
      data-lit={lit || undefined}
      onClick={() => onSelect(rikishi)}
      aria-label={label}
    >
      {content}
    </button>
  )
})

/**
 * The banzuke as it is printed. Each half is headed 東 or 西 and read right to
 * left, ranked from the highest down, with the rank standing as its own heavy
 * band of characters above the provinces and the ring names.
 *
 * A printed banzuke does not scroll: it wraps. The sheet is divided into
 * horizontal bands, each read right to left, stacking down the paper — which
 * is how makuuchi, juryo, makushita and the rest all fit on one sheet, and how
 * vertical Japanese reflows generally. This applies the same rule one level
 * down: each half fills as many bands as the screen has room for. Every half
 * is `direction: rtl`, so the highest rank sits at the right where reading
 * starts, and DOM order, focus order and reading order all agree.
 */
export function BanzukeSheet({
  rows,
  onSelectRikishi,
  highlight,
  movements,
  records,
  champions,
  guide,
}: BanzukeSheetProps) {
  const strings = useStrings()
  const { language } = useLanguage()
  const groups = useMemo(() => visibleGroups(groupRowsByRank(rows), highlight), [rows, highlight])
  const championIds = useMemo(() => new Set(Object.values(champions ?? {})), [champions])
  // Column is memoized, so marks objects must stay stable across renders that
  // don't change the guide; build the per-wrestler lookup once here.
  const marksById = useMemo(() => {
    const map = new Map<number, Partial<Record<GuideZone, number>>>()
    for (const mark of guide?.marks ?? []) {
      if (mark.rikishiId === null) continue
      const entry = map.get(mark.rikishiId) ?? {}
      entry[mark.zone] = mark.n
      map.set(mark.rikishiId, entry)
    }
    return map
  }, [guide])
  const sideMarkN = guide?.marks.find((m) => m.zone === 'sideMark')?.n
  const [hover, setHover] = useState<PairRef | null>(null)
  const [focus, setFocus] = useState<PairRef | null>(null)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => handleRovingKey(e.currentTarget, e, 'sheet'),
    []
  )

  // The lowest numbered rank on this sheet sets the bottom of the size ladder.
  const lowestNumber = useMemo(
    () =>
      rows.reduce(
        (low, rikishi) => (rikishi.rankCode >= 500 ? Math.max(low, rikishi.rankNumber) : low),
        1
      ),
    [rows]
  )

  const isDimmed = (rikishi: Rikishi) => Boolean(highlight && !highlight.has(rikishi.id))

  const active = hover ?? focus

  const half = (side: Side) => {
    const entries = groups.flatMap((group) =>
      group[side] ? [{ group, rikishi: group[side]! }] : []
    )
    if (entries.length === 0) return null
    // A group, not the landmark a named <section> would otherwise become:
    // these are the two halves of one sheet, not two regions of the page.
    return (
      <section className={styles.half} role="group" aria-label={strings.side[side]}>
        {/* 東 / 西 head their half from the top centre, as the sheet marks them */}
        <p className={styles.sideMark} lang="ja" aria-hidden="true">
          {SIDE_KANJI[side]}
          {side === 'east' && sideMarkN && (
            <span className={styles.mark} data-zone="sideMark" aria-hidden="true">
              {sideMarkN}
            </span>
          )}
        </p>
        <div className={styles.bands}>
          {entries.map(({ group, rikishi }) => (
            <Column
              key={rikishi.id}
              rikishi={rikishi}
              scale={columnScale(rikishi, lowestNumber)}
              onSelect={onSelectRikishi}
              dimmed={isDimmed(rikishi)}
              movement={movements?.get(rikishi.id) ?? null}
              record={records?.[String(rikishi.id)] ?? null}
              champion={championIds.has(rikishi.id)}
              pairKey={group.key}
              lit={active !== null && active.pair === group.key && active.side !== rikishi.side}
              marks={marksById.get(rikishi.id)}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className={styles.sheet} lang={langAttr(language)}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions --
          event delegation for the buttons inside */}
      <div
        className={styles.paper}
        role="group"
        aria-label={strings.sheetLabel}
        onPointerOver={(e) => setPairIfChanged(setHover, refOf(e.target))}
        onPointerOut={(e) => setPairIfChanged(setHover, refOf(e.relatedTarget))}
        onPointerLeave={() => setPairIfChanged(setHover, null)}
        onFocus={(e) => setPairIfChanged(setFocus, refOf(e.target))}
        onBlur={(e) => {
          setPairIfChanged(setFocus, refOf(e.relatedTarget))
          // Dialog opened on this wrestler: clear the stale hover state left
          // behind so nothing on the paper stays lit behind the dialog.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setPairIfChanged(setHover, null)
          }
        }}
        onKeyDown={handleKeyDown}
      >
        {half('east')}
        {half('west')}
      </div>
    </div>
  )
}
