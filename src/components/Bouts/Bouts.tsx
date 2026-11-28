import { ChevronIcon } from '../ChevronIcon/ChevronIcon'
import { useId } from 'react'
import type { Division, Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { kimariteGloss, kimariteLabel } from '../../data/kimarite'
import {
  MAX_DAYS,
  playoffFighters,
  yushoRace,
  type Fighter,
  type Match,
  type ResultsFile,
} from '../../data/results'
import { YushoRace } from '../YushoRace/YushoRace'
import styles from './Bouts.module.css'

interface BoutsProps {
  results: ResultsFile
  division: Division
  /** The division's rows, for opening the dialog and naming the leaders. */
  rows: Rikishi[]
  day: number
  onChangeDay: (day: number) => void
  onSelectRikishi?: (rikishi: Rikishi) => void
}

/** The last day worth stepping to: the latest published card or the latest fought day. */
function lastSteppableDay(results: ResultsFile): number {
  const published = Object.keys(results.torikumi).map(Number)
  return Math.min(MAX_DAYS, Math.max(results.day, ...published, 1))
}

/**
 * The day's card beneath the paper, in the sheet's smaller hand: who met
 * whom, who won and how. Above it, the leaders — the one narrative every
 * basho carries — as a single line, never a table.
 */
export function Bouts({ results, division, rows, day, onChangeDay, onSelectRikishi }: BoutsProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const lang = langAttr(language)
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Cross-division bouts are published on the Makuuchi card only, so select by
  // who is fighting, not by the card the match came from.
  // This division's own card comes first, in matchNo order; cross bouts
  // published on the other division's card come last.
  const matches = (results.torikumi[String(day)] ?? [])
    .filter(
      (m) =>
        (m.east.id !== null && byId.has(m.east.id)) || (m.west.id !== null && byId.has(m.west.id))
    )
    .sort((a, b) => {
      const own = (m: Match) => (m.division === division ? 0 : 1)
      return own(a) - own(b) || a.matchNo - b.matchNo
    })
  const last = lastSteppableDay(results)
  const race = results.day >= 1 ? yushoRace(results, division, rows) : null
  // The playoff follows senshuraku's card: the bouts after the fifteen days.
  const playoff = day === MAX_DAYS ? (results.playoff?.[division] ?? []) : []
  const playoffHeadingId = `${headingId}-playoff`

  const name = (f: Fighter) => f.shikona[language] || f.shikona.en
  // The ○/● marks and the bold are only for the eye, so a decided bout also says
  // who won in words, after the name (WCAG 1.3.1); the name still leads the
  // button's accessible name, as it leads what is visible.
  const fighter = (f: Fighter, winner: boolean, decided: boolean) => {
    const rikishi = f.id !== null ? byId.get(f.id) : undefined
    const outcome = decided ? (
      <span className="visually-hidden">
        {language === 'jp' ? '、' : ', '}
        {winner ? strings.boutWin : strings.boutLoss}
      </span>
    ) : null
    const text = (
      <>
        {winner ? <strong>{name(f)}</strong> : name(f)}
        {outcome}
      </>
    )
    if (rikishi && onSelectRikishi) {
      return (
        <button
          type="button"
          className={`${styles.fighter} ${styles.clickable}`}
          onClick={() => onSelectRikishi(rikishi)}
        >
          {text}
        </button>
      )
    }
    return <span className={styles.fighter}>{text}</span>
  }

  const matchRow = (m: Match) => (
    <li
      key={`${m.division}-${m.matchNo}`}
      className={styles.match}
      data-decided={m.winnerId !== null || undefined}
    >
      {/* data-won drives the ○/● marks beside each name (CSS, decorative) */}
      <span
        className={styles.east}
        data-won={(m.winnerId !== null && m.winnerId === m.east.id) || undefined}
      >
        {fighter(m.east, m.winnerId !== null && m.winnerId === m.east.id, m.winnerId !== null)}
      </span>
      <span className={styles.result} title={kimariteGloss(m.kimarite) ?? undefined}>
        {m.winnerId === null ? strings.undecided : kimariteLabel(m.kimarite, language)}
      </span>
      <span
        className={styles.west}
        data-won={(m.winnerId !== null && m.winnerId === m.west.id) || undefined}
      >
        {fighter(m.west, m.winnerId !== null && m.winnerId === m.west.id, m.winnerId !== null)}
      </span>
    </li>
  )

  return (
    <section id="bouts" className={styles.bouts} aria-labelledby={headingId} lang={lang}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChangeDay(day - 1)}
          disabled={day <= 1}
          aria-label={strings.previousDay}
        >
          <ChevronIcon direction="previous" />
        </button>
        <h2 id={headingId} className={styles.heading} aria-live="polite">
          {strings.dayName(day, MAX_DAYS)}
        </h2>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChangeDay(day + 1)}
          disabled={day >= last}
          aria-label={strings.nextDay}
        >
          <ChevronIcon direction="next" />
        </button>
      </div>
      {race && (
        <YushoRace race={race} records={results.records} onSelectRikishi={onSelectRikishi} />
      )}
      {/* The playoff decided the yusho: it leads, ahead of the day's card */}
      {playoff.length > 0 && (
        <section className={styles.playoff} aria-labelledby={playoffHeadingId}>
          <h3 id={playoffHeadingId} className={styles.playoffHeading}>
            {playoffFighters(playoff).length > 2 ? strings.playoffThreeWay : strings.playoff}
          </h3>
          <p className={styles.playoffNote}>{strings.playoffNote}</p>
          <ol className={styles.list} role="list">
            {playoff.map(matchRow)}
          </ol>
        </section>
      )}
      {matches.length === 0 ? (
        <p className={styles.none}>{strings.boutsNone}</p>
      ) : (
        <ol className={styles.list} role="list">
          {matches.map(matchRow)}
        </ol>
      )}
    </section>
  )
}
