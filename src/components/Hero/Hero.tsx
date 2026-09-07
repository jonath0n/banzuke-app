import type { Banzuke } from '../../types/banzuke'
import {
  formatDateRange,
  formatDateTime,
  formatRelativeTime,
  getTournamentStatus,
} from '../../utils/dates'
import { getVenue } from '../../constants/venues'
import { jpBashoName } from '../../data/kanji'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { LanguageToggle } from '../LanguageToggle/LanguageToggle'
import styles from './Hero.module.css'

interface HeroProps {
  data: Banzuke | null
}

function TournamentStatus({ data }: { data: Banzuke }) {
  const strings = useStrings()
  const status = getTournamentStatus(data.basho)

  switch (status.kind) {
    case 'live':
      return (
        <span className={styles.statusBadge} data-status="live">
          {status.day === status.totalDays
            ? strings.statusSenshuraku
            : strings.statusLive(status.day)}
        </span>
      )
    case 'upcoming':
      return (
        <span className={styles.statusBadge} data-status="upcoming">
          {status.daysUntil === 1
            ? strings.statusUpcomingTomorrow
            : strings.statusUpcoming(status.daysUntil)}
        </span>
      )
    case 'finished':
      return (
        <span className={styles.statusBadge} data-status="completed">
          {strings.statusCompleted}
        </span>
      )
    default:
      return null
  }
}

const SEPARATOR = ' · '

/**
 * The head of the sheet, not a title card above it: the wordmark and seal on
 * one side, the banzuke's own printed masthead (令和八年九月場所, set
 * vertically in mincho) on the other, then the tournament in a single line.
 */
export function Hero({ data }: HeroProps) {
  const { language, setLanguage } = useLanguage()
  const strings = useStrings()
  const basho = data?.basho
  const bashoName = basho ? basho.name[language] || basho.name.en : ''
  const venue = basho ? getVenue(basho.month) : null
  const dates = basho ? formatDateRange(basho.startDate, basho.endDate, language) : ''
  const announced = basho?.announcedAt ? formatDateTime(basho.announcedAt, language) : ''
  // The masthead as the sheet prints it: era year over month-tournament.
  const masthead = basho ? `${basho.yearJp}${jpBashoName(basho.month)}` : ''

  const provenance: string[] = []
  if (announced) provenance.push(strings.announcedOn(announced))
  if (data?.source === 'sample') {
    provenance.push(strings.sampleData)
  } else if (data) {
    const checked = formatRelativeTime(data.fetchedAt, language)
    provenance.push(checked ? `${strings.dataFrom}, ${strings.checked(checked)}` : strings.dataFrom)
  }

  return (
    <header className={styles.hero} lang={langAttr(language)}>
      <div className={styles.titleRow}>
        <div className={styles.title}>
          <h1 lang="en">Grand Sumo Banzuke</h1>
          <span className={styles.seal} lang="ja" aria-hidden="true">
            番付
          </span>
        </div>
        {masthead && (
          <span className={styles.masthead} lang="ja" aria-hidden="true">
            {masthead}
          </span>
        )}
        <div className={styles.toggle}>
          <LanguageToggle language={language} onLanguageChange={setLanguage} />
        </div>
      </div>

      <p className={styles.deck}>
        {data ? (
          <>
            <strong>{bashoName}</strong>
            {venue ? `${SEPARATOR}${venue[language]}` : ''}
            {dates ? `${SEPARATOR}${dates}` : ''}
            <TournamentStatus data={data} />
          </>
        ) : (
          '—'
        )}
      </p>

      {provenance.length > 0 && <p className={styles.provenance}>{provenance.join(SEPARATOR)}</p>}
    </header>
  )
}
