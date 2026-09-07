import { useId } from 'react'
import type { Division, Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { kimariteLabel } from '../../data/kimarite'
import { leaders, MAX_DAYS, scoreLabel, type Fighter, type ResultsFile } from '../../data/results'
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

/** The last day worth stepping to: the latest card, or the day after the last fought one. */
// eslint-disable-next-line react-refresh/only-export-components
export function lastSteppableDay(results: ResultsFile): number {
  const published = Object.keys(results.torikumi).map(Number)
  return Math.min(MAX_DAYS, Math.max(results.day + 1, ...published, 1))
}

/**
 * The day's card beneath the paper, in the sheet's smaller hand: who met
 * whom, who won and how. Above it, the leaders — the one narrative every
 * basho carries — as a single line, never a table.
 */
export function Bouts({ results, rows, day, onChangeDay, onSelectRikishi }: BoutsProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const lang = langAttr(language)
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Cross-division bouts are published on the Makuuchi card only, so select by
  // who is fighting, not by the card the match came from.
  const matches = (results.torikumi[String(day)] ?? []).filter(
    (m) =>
      (m.east.id !== null && byId.has(m.east.id)) || (m.west.id !== null && byId.has(m.west.id))
  )
  // The Next button stops at the latest day this card actually knows
  // about — the last published torikumi, or the last decided day, whichever
  // is later. lastSteppableDay() (below) additionally allows one day beyond
  // that, for callers that want to default to "today's" as-yet-empty card.
  const published = Object.keys(results.torikumi).map(Number)
  const lastKnownDay = Math.min(MAX_DAYS, Math.max(results.day, ...published, 1))
  const tiers = results.day >= 1 ? leaders(results.records, rows) : []

  const name = (f: Fighter) => f.shikona[language] || f.shikona.en
  const fighter = (f: Fighter, winner: boolean) => {
    const rikishi = f.id !== null ? byId.get(f.id) : undefined
    const text = winner ? <strong>{name(f)}</strong> : name(f)
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

  return (
    <section className={styles.bouts} aria-labelledby={headingId} lang={lang}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChangeDay(day - 1)}
          disabled={day <= 1}
          aria-label={strings.previousDay}
        >
          ‹
        </button>
        <h2 id={headingId} className={styles.heading}>
          {strings.boutsHeading(day)}
        </h2>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChangeDay(day + 1)}
          disabled={day >= lastKnownDay}
          aria-label={strings.nextDay}
        >
          ›
        </button>
      </div>
      {tiers.length > 0 && (
        <p className={`${styles.leaders} ${styles.leadersLabel}`}>
          {strings.leadersAfter(results.day)}{' '}
          {tiers.map((tier, i) => (
            <span key={tier.wins} className={styles.tier}>
              {i > 0 && ' · '}
              {tier.rikishi.map((r) => r.shikona[language] || r.shikona.en).join(', ')}{' '}
              {scoreLabel(results.records[String(tier.rikishi[0].id)], language)}
            </span>
          ))}
        </p>
      )}
      {matches.length === 0 ? (
        <p className={styles.none}>{strings.boutsNone}</p>
      ) : (
        <ol className={styles.list}>
          {matches.map((m) => (
            <li
              key={m.matchNo}
              className={styles.match}
              data-decided={m.winnerId !== null || undefined}
            >
              <span className={styles.east}>
                {fighter(m.east, m.winnerId !== null && m.winnerId === m.east.id)}
              </span>
              <span className={styles.result}>
                {m.winnerId === null ? strings.undecided : kimariteLabel(m.kimarite, language)}
              </span>
              <span className={styles.west}>
                {fighter(m.west, m.winnerId !== null && m.winnerId === m.west.id)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
