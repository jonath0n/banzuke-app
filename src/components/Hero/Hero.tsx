import type { Banzuke } from '../../types/banzuke'
import {
  formatDateRange,
  formatDateTime,
  formatRelativeTime,
  getTournamentStatus,
} from '../../utils/dates'
import { useLanguage } from '../../contexts/LanguageContext'
import { LanguageToggle } from '../LanguageToggle/LanguageToggle'
import styles from './Hero.module.css'

interface HeroProps {
  data: Banzuke | null
}

const DIVISION_LABELS = {
  makuuchi: { en: 'Makuuchi', jp: '幕内' },
  juryo: { en: 'Juryo', jp: '十両' },
} as const

function TournamentStatus({ data }: { data: Banzuke }) {
  const status = getTournamentStatus(data.basho)

  switch (status.kind) {
    case 'live':
      return (
        <span className={styles.statusBadge} data-status="live">
          <span className={styles.liveDot} aria-hidden="true" />
          Day {status.day}
        </span>
      )
    case 'upcoming':
      return (
        <span className={styles.statusBadge} data-status="upcoming">
          {status.daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${status.daysUntil} days`}
        </span>
      )
    case 'finished':
      return (
        <span className={styles.statusBadge} data-status="completed">
          Completed
        </span>
      )
    default:
      return null
  }
}

function Freshness({ data }: { data: Banzuke }) {
  const { language } = useLanguage()
  if (data.source === 'sample') {
    return <p className={styles.freshness}>Bundled sample data</p>
  }
  const checked = formatRelativeTime(data.fetchedAt, language)
  return (
    <p className={styles.freshness}>Data from sumo.or.jp{checked ? ` · checked ${checked}` : ''}</p>
  )
}

export function Hero({ data }: HeroProps) {
  const { language, setLanguage } = useLanguage()
  const basho = data?.basho
  const bashoName = basho ? basho.name[language] || basho.name.en : '—'
  const division = data ? ` (${DIVISION_LABELS[data.division][language]})` : ''
  const dates = basho ? formatDateRange(basho.startDate, basho.endDate, language) : ''
  const announced = basho?.announcedAt ? formatDateTime(basho.announcedAt, language) : ''

  return (
    <header className={styles.hero}>
      <div className={styles.titleRow}>
        <div className={styles.titleGroup}>
          <h1>Grand Sumo Banzuke</h1>
          <span className={styles.seal} lang="ja" aria-hidden="true">
            番付
          </span>
          {data && <TournamentStatus data={data} />}
        </div>
        <LanguageToggle language={language} onLanguageChange={setLanguage} />
      </div>
      <dl className={styles.summary} aria-live="polite">
        <div>
          <dt>Basho</dt>
          <dd lang={language === 'jp' ? 'ja' : undefined}>{`${bashoName}${division}`}</dd>
        </div>
        <div>
          <dt>Dates</dt>
          <dd>{dates || '—'}</dd>
        </div>
        <div>
          <dt>Announced</dt>
          <dd>{announced || '—'}</dd>
        </div>
      </dl>
      {data && <Freshness data={data} />}
    </header>
  )
}
