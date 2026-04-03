import type { BanzukePayload } from '../../types/banzuke'
import { formatDate, formatDateTime } from '../../utils/formatting'
import { useLanguage } from '../../contexts/LanguageContext'
import { LanguageToggle } from '../LanguageToggle/LanguageToggle'
import styles from './Hero.module.css'

interface HeroProps {
  data: BanzukePayload | null
  sourceLabel?: string
}

function TournamentStatus({ data }: { data: BanzukePayload }) {
  const info = data.BashoInfo
  if (!info) return null

  const isActive = info.BattleNow === 1
  const day = info.day

  if (isActive && day) {
    return (
      <span className={styles.statusBadge} data-status="live">
        <span className={styles.liveDot} aria-hidden="true" />
        Day {day}
      </span>
    )
  }

  // Check if tournament is upcoming or completed
  const now = new Date()
  const start = new Date(info.start_date)
  const end = new Date(info.end_date)

  if (!Number.isNaN(start.getTime()) && now < start) {
    return (
      <span className={styles.statusBadge} data-status="upcoming">
        Upcoming
      </span>
    )
  }

  if (!Number.isNaN(end.getTime()) && now > end) {
    return (
      <span className={styles.statusBadge} data-status="completed">
        Completed
      </span>
    )
  }

  return null
}

export function Hero({ data, sourceLabel }: HeroProps) {
  const { language, setLanguage } = useLanguage()
  const info = data?.BashoInfo
  const start = formatDate(info?.start_date)
  const end = formatDate(info?.end_date)
  const bashoName = data?.basho_name || '—'
  const division = data?.Kakuzuke ? ` (${data.Kakuzuke.replace(/&nbsp;/g, ' ')})` : ''

  return (
    <header className={styles.hero}>
      <div className={styles.titleRow}>
        <div className={styles.titleGroup}>
          <h1>Grand Sumo Banzuke</h1>
          {data && <TournamentStatus data={data} />}
        </div>
        <LanguageToggle language={language} onLanguageChange={setLanguage} />
      </div>
      <dl className={styles.summary} aria-live="polite">
        <div>
          <dt>Basho</dt>
          <dd>{`${bashoName}${division}`}</dd>
        </div>
        <div>
          <dt>Dates</dt>
          <dd>{start && end ? `${start} → ${end}` : '—'}</dd>
        </div>
        <div>
          <dt>Announced</dt>
          <dd>{formatDateTime(info?.banzuke_announcement_datetime)}</dd>
        </div>
      </dl>
      {sourceLabel && <p className={styles.freshness}>{sourceLabel}</p>}
    </header>
  )
}
