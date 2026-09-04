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

function Freshness({ data }: { data: Banzuke }) {
  const { language } = useLanguage()
  const strings = useStrings()
  if (data.source === 'sample') {
    return <p className={styles.freshness}>{strings.sampleData}</p>
  }
  const checked = formatRelativeTime(data.fetchedAt, language)
  return (
    <p className={styles.freshness}>
      {strings.dataFrom}
      {checked ? ` · ${strings.checked(checked)}` : ''}
    </p>
  )
}

export function Hero({ data }: HeroProps) {
  const { language, setLanguage } = useLanguage()
  const strings = useStrings()
  const basho = data?.basho
  const bashoName = basho ? basho.name[language] || basho.name.en : '—'
  const division = data ? ` (${strings.division[data.division]})` : ''
  const dates = basho ? formatDateRange(basho.startDate, basho.endDate, language) : ''
  const announced = basho?.announcedAt ? formatDateTime(basho.announcedAt, language) : ''
  const venue = basho ? getVenue(basho.month) : null

  return (
    <header className={styles.hero} lang={langAttr(language)}>
      <div className={styles.titleRow}>
        <div className={styles.titleGroup}>
          <h1 lang="en">Grand Sumo Banzuke</h1>
          <span className={styles.seal} lang="ja" aria-hidden="true">
            番付
          </span>
          {data && <TournamentStatus data={data} />}
        </div>
        <LanguageToggle language={language} onLanguageChange={setLanguage} />
      </div>
      <dl className={styles.summary} aria-live="polite">
        <div>
          <dt>{strings.basho}</dt>
          <dd>{`${bashoName}${division}`}</dd>
        </div>
        <div>
          <dt>{strings.dates}</dt>
          <dd>{dates || '—'}</dd>
        </div>
        <div>
          <dt>{strings.venue}</dt>
          <dd>{venue ? venue[language] : '—'}</dd>
        </div>
        <div>
          <dt>{strings.announced}</dt>
          <dd>{announced || '—'}</dd>
        </div>
      </dl>
      {data && <Freshness data={data} />}
    </header>
  )
}
