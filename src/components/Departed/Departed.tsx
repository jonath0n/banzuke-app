import { useId } from 'react'
import type { Division, Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { DIVISION_KANJI } from '../../data/kanji'
import { profileUrl } from '../../utils/formatting'
import { previousRankLabel, type Departure, type Departures } from '../../utils/diff'
import styles from './Departed.module.css'

interface DepartedProps {
  division: Division
  departures: Departures
  sinceLabel: string
  onSelectRikishi?: (rikishi: Rikishi) => void
}

/**
 * The names that left this division since the previous banzuke, in a smaller
 * hand below the paper: first those still on the sheet in the other
 * division, then those on neither — retired, injured, or below Juryo.
 */
export function Departed({ division, departures, sinceLabel, onSelectRikishi }: DepartedProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const lang = langAttr(language)
  const divisionName = language === 'jp' ? DIVISION_KANJI[division] : strings.division[division]
  const otherDivision: Division = division === 'makuuchi' ? 'juryo' : 'makuuchi'
  const otherName =
    language === 'jp' ? DIVISION_KANJI[otherDivision] : strings.division[otherDivision]

  const name = (d: Departure) => d.was.shikona[language] || d.was.shikona.en
  const wasRank = (d: Departure) => previousRankLabel(d.was, language)
  const nowRank = (d: Departure) =>
    d.now
      ? previousRankLabel(
          {
            division: otherDivision,
            rankCode: d.now.rankCode,
            rankNumber: d.now.rankNumber,
            seat: d.now.seat,
            side: d.now.side,
          },
          language
        )
      : ''

  const empty = departures.moved.length === 0 && departures.gone.length === 0

  return (
    <section className={styles.departed} aria-labelledby={headingId} lang={lang}>
      <h2 id={headingId} className={styles.heading}>
        {strings.departedHeading(divisionName, sinceLabel)}
      </h2>
      {empty && <p className={styles.none}>{strings.departedNone}</p>}
      {departures.moved.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.subheading}>{strings.departedMovedTo(otherName)}</h3>
          <ul className={styles.list}>
            {departures.moved.map((d) => (
              <li key={d.was.id}>
                <button
                  type="button"
                  className={styles.name}
                  onClick={() => d.now && onSelectRikishi?.(d.now)}
                >
                  <span className={styles.shikona}>{name(d)}</span>
                  <span className={styles.rank}>{strings.departedNow(nowRank(d))}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {departures.gone.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.subheading}>{strings.departedGone}</h3>
          <ul className={styles.list}>
            {departures.gone.map((d) => (
              <li key={d.was.id}>
                <a
                  className={styles.name}
                  href={profileUrl(d.was.id, language)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className={styles.shikona}>{name(d)}</span>
                  <span className={styles.rank}>{strings.departedWas(wasRank(d))}</span>
                  <span className={styles.external} aria-hidden="true">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
