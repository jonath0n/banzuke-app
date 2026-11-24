import { ExternalIcon } from '../ExternalIcon/ExternalIcon'
import { useId } from 'react'
import type { Division, Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { DIVISION_KANJI } from '../../data/kanji'
import { DIVISIONS } from '../../data/schema'
import { profileUrl } from '../../utils/formatting'
import { previousRankLabel, type Departure, type Departures } from '../../utils/diff'
import styles from './Departed.module.css'

interface DepartedProps {
  division: Division
  departures: Departures
  sinceLabel: string
  /** Whether the divisions below Juryo are loaded, so "gone" means off the banzuke. */
  lowerLoaded?: boolean
  onSelectRikishi?: (rikishi: Rikishi) => void
}

/**
 * The names that left this division since the previous banzuke, in a smaller
 * hand below the paper: first those still on the sheet, by the division they
 * are in now, then those in none that is loaded — retired or off the banzuke
 * (or, while the lower divisions are not loaded, somewhere below Juryo).
 */
export function Departed({
  division,
  departures,
  sinceLabel,
  lowerLoaded = false,
  onSelectRikishi,
}: DepartedProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const lang = langAttr(language)
  const divisionLabel = (d: Division) =>
    language === 'jp' ? DIVISION_KANJI[d] : strings.division[d]
  const divisionName = divisionLabel(division)

  const name = (d: Departure) => d.was.shikona[language] || d.was.shikona.en
  const wasRank = (d: Departure) => previousRankLabel(d.was, language)
  const nowRank = (d: Departure) =>
    d.now && d.nowDivision
      ? previousRankLabel(
          {
            division: d.nowDivision,
            rankCode: d.now.rankCode,
            rankNumber: d.now.rankNumber,
            seat: d.now.seat,
            side: d.now.side,
          },
          language
        )
      : ''

  const movedGroups = DIVISIONS.map(
    (to) => [to, departures.moved.filter((d) => d.nowDivision === to)] as const
  ).filter(([, group]) => group.length > 0)
  const empty = departures.moved.length === 0 && departures.gone.length === 0

  return (
    <section className={styles.departed} aria-labelledby={headingId} lang={lang}>
      <h2 id={headingId} className={styles.heading}>
        {strings.departedHeading(divisionName, sinceLabel)}
      </h2>
      {empty && <p className={styles.none}>{strings.departedNone}</p>}
      {movedGroups.map(([to, group]) => (
        <div key={to}>
          <h3 className={styles.subheading}>{strings.departedMovedTo(divisionLabel(to))}</h3>
          <ul className={styles.list}>
            {group.map((d) => (
              <li key={d.was.id}>
                {onSelectRikishi ? (
                  <button
                    type="button"
                    className={styles.name}
                    onClick={() => d.now && onSelectRikishi(d.now)}
                    aria-label={`${name(d)}, ${strings.departedNow(nowRank(d))}. ${strings.viewDetails}`}
                  >
                    <span className={styles.shikona}>{name(d)}</span>
                    <span className={styles.rank}>{strings.departedNow(nowRank(d))}</span>
                  </button>
                ) : (
                  <span className={styles.name}>
                    <span className={styles.shikona}>{name(d)}</span>
                    <span className={styles.rank}>{strings.departedNow(nowRank(d))}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {departures.gone.length > 0 && (
        <div>
          <h3 className={styles.subheading}>
            {lowerLoaded ? strings.departedOffBanzuke : strings.departedGone}
          </h3>
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
                    <ExternalIcon />
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
