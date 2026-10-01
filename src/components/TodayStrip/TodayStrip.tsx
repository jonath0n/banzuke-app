import type { Division, Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { useNow } from '../../hooks/useNow'
import { formatRelativeTime } from '../../utils/dates'
import { yushoRace, type ResultsFile } from '../../data/results'
import styles from './TodayStrip.module.css'

interface TodayStripProps {
  results: ResultsFile
  division: Division
  /** The division's rows: which of today's bouts are this division's, and who leads it. */
  rows: Rikishi[]
  /** The calendar day of the tournament, 1–15, from the dates — not the results file. */
  day: number
  totalDays: number
}

/**
 * In season, one line above the paper with what a fan wants first: which
 * day it is, how much of today's card is fought, who leads, how fresh the
 * numbers are, and a way down to the card. Ink on paper, no motion; it is
 * not printed, since the sheet is the document.
 */
export function TodayStrip({ results, division, rows, day, totalDays }: TodayStripProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const now = useNow()
  const lang = langAttr(language)
  const ids = new Set(rows.map((r) => r.id))
  const card = (results.torikumi[String(day)] ?? []).filter(
    (m) => (m.east.id !== null && ids.has(m.east.id)) || (m.west.id !== null && ids.has(m.west.id))
  )
  const fought = card.filter((m) => m.winnerId !== null).length
  const race = results.day >= 1 ? yushoRace(results, division, rows) : null
  const name = (r: Rikishi) => r.shikona[language] || r.shikona.en
  const leaders = race?.champion
    ? strings.todayChampion(name(race.champion))
    : race && race.tiers.length > 0
      ? strings.todayLeads(
          race.tiers[0].rikishi.map(name).join(language === 'jp' ? '、' : ', '),
          strings.raceLosses(race.tiers[0].losses)
        )
      : ''
  const updated = formatRelativeTime(results.fetchedAt, language, now)

  return (
    <aside className={styles.strip} aria-label={strings.todayLabel} lang={lang} data-print="hide">
      <span className={styles.day}>{strings.dayName(day, totalDays)}</span>
      <span className={styles.item}>
        {card.length > 0 ? strings.todayFought(fought, card.length) : strings.todayNoCard}
      </span>
      {leaders && <span className={styles.item}>{leaders}</span>}
      {updated && <span className={styles.updated}>{strings.todayUpdated(updated)}</span>}
      <a className={styles.link} href="#bouts">
        {strings.todayToCard}
      </a>
    </aside>
  )
}
