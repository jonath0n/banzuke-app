import type { Banzuke } from '../../types/banzuke'
import {
  formatDateRange,
  formatDateTime,
  formatRelativeTime,
  getTournamentStatus,
} from '../../utils/dates'
import { getVenue } from '../../constants/venues'
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
          <span className={styles.liveDot} aria-hidden="true" />
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
 * The title deck: wordmark and language toggle, then the tournament as one
 * line (name · venue), its status beside the dates, and a muted line for
 * provenance (announcement, data source, freshness).
 */
export function Hero({ data }: HeroProps) {
  const { language, setLanguage } = useLanguage()
  const strings = useStrings()
  const basho = data?.basho
  const bashoName = basho ? basho.name[language] || basho.name.en : ''
  const venue = basho ? getVenue(basho.month) : null
  const dates = basho ? formatDateRange(basho.startDate, basho.endDate, language) : ''
  const announced = basho?.announcedAt ? formatDateTime(basho.announcedAt, language) : ''

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
        <h1 lang="en">Grand Sumo Banzuke</h1>
        <span className={styles.seal} lang="ja" aria-hidden="true">
          番付
        </span>
        <div className={styles.toggle}>
          <LanguageToggle language={language} onLanguageChange={setLanguage} />
        </div>
      </div>

      <p className={styles.deck}>
        {data ? (
          <>
            <strong>{bashoName}</strong>
            {venue ? `${SEPARATOR}${venue[language]}` : ''}
          </>
        ) : (
          '—'
        )}
      </p>

      {data && (
        <p className={styles.statusRow}>
          <TournamentStatus data={data} />
          {dates && <span className={styles.dates}>{dates}</span>}
        </p>
      )}

      {provenance.length > 0 && <p className={styles.provenance}>{provenance.join(SEPARATOR)}</p>}
    </header>
  )
}
