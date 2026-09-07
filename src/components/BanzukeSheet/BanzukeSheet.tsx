import type { RankGroup, Rikishi, Side } from '../../types/banzuke'
import { groupRowsByRank } from '../../utils/formatting'
import { shortPrefecture, SIDE_KANJI, toKanjiNumber } from '../../data/kanji'
import { RANK_CODES, RANK_LEVEL_KANJI } from '../../constants/ranks'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import styles from './BanzukeSheet.module.css'

interface BanzukeSheetProps {
  /** Wrestlers in banzuke order. */
  rows: Rikishi[]
  onSelectRikishi?: (rikishi: Rikishi) => void
  /** Ids matching the current search; everyone else is dimmed. */
  highlight?: Set<number> | null
}

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

function Column({
  rikishi,
  scale,
  onSelect,
  dimmed,
}: {
  rikishi: Rikishi
  scale: number
  onSelect?: (rikishi: Rikishi) => void
  dimmed: boolean
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
  const label = `${name}, ${strings.side[rikishi.side]}. ${rikishi.rankName[language]}. ${strings.viewDetails}`

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
      <span className={styles.name} lang={lang}>
        {name}
      </span>
    </>
  )

  const style = { '--col-scale': scale } as React.CSSProperties

  if (!onSelect) {
    return (
      <div
        className={styles.column}
        style={style}
        data-rank-level={rikishi.rankLevel}
        data-dimmed={dimmed || undefined}
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
      data-side={rikishi.side}
      data-rank-level={rikishi.rankLevel}
      data-dimmed={dimmed || undefined}
      onClick={() => onSelect(rikishi)}
      aria-label={label}
    >
      {content}
    </button>
  )
}

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
export function BanzukeSheet({ rows, onSelectRikishi, highlight }: BanzukeSheetProps) {
  const strings = useStrings()
  const { language } = useLanguage()
  const groups = visibleGroups(groupRowsByRank(rows), highlight)

  // The lowest numbered rank on this sheet sets the bottom of the size ladder.
  const lowestNumber = rows.reduce(
    (low, rikishi) => (rikishi.rankCode >= 500 ? Math.max(low, rikishi.rankNumber) : low),
    1
  )

  const isDimmed = (rikishi: Rikishi) => Boolean(highlight && !highlight.has(rikishi.id))

  const half = (side: Side) => {
    const wrestlers = groups
      .map((group) => group[side])
      .filter((rikishi): rikishi is Rikishi => rikishi !== null)
    if (wrestlers.length === 0) return null
    // A group, not the landmark a named <section> would otherwise become:
    // these are the two halves of one sheet, not two regions of the page.
    return (
      <section className={styles.half} role="group" aria-label={strings.side[side]}>
        {/* 東 / 西 head their half from the top centre, as the sheet marks them */}
        <p className={styles.sideMark} lang="ja" aria-hidden="true">
          {SIDE_KANJI[side]}
        </p>
        <div className={styles.bands}>
          {wrestlers.map((rikishi) => (
            <Column
              key={rikishi.id}
              rikishi={rikishi}
              scale={columnScale(rikishi, lowestNumber)}
              onSelect={onSelectRikishi}
              dimmed={isDimmed(rikishi)}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className={styles.sheet} lang={langAttr(language)}>
      <div className={styles.paper} role="group" aria-label={strings.sheetLabel}>
        {half('east')}
        {half('west')}
      </div>
    </div>
  )
}
