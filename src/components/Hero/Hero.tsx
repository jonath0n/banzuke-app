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
  /** When the results file is loaded, its own fetch time; it is what moves in season. */
  resultsFetchedAt?: string | null
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
 * The head of the sheet, not a title card above it: the wordmark and seal, the
 * tournament in a single line beneath, and the banzuke's own printed masthead
 * (令和八年九月場所, set vertically in mincho) as a spine down the right edge
 * of both.
 */
export function Hero({ data, resultsFetchedAt = null }: HeroProps) {
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
    // The snapshot is rewritten only when the sheet itself changes, so in
    // season its stamp reads stale while the results file moves every run;
    // the freshness shown is whichever of the two is being refreshed.
    const checked = formatRelativeTime(resultsFetchedAt ?? data.fetchedAt, language)
    const label = resultsFetchedAt ? strings.resultsUpdated : strings.checked
    provenance.push(checked ? `${strings.dataFrom}, ${label(checked)}` : strings.dataFrom)
  }

  return (
    <header className={styles.hero} lang={langAttr(language)}>
      <div className={styles.titleRow}>
        <div className={styles.title}>
          <h1 lang={langAttr(language)}>{strings.appTitle}</h1>
          <span className={styles.seal} lang="ja" aria-hidden="true">
            番付
          </span>
        </div>
        <div className={styles.toggle}>
          <LanguageToggle language={language} onLanguageChange={setLanguage} />
        </div>
      </div>
      {/* A spine down the right edge, beside the wordmark and the deck both,
          rather than an item in the title row: eight characters stand taller
          than the wordmark, and in the row they set its height and left the
          wordmark floating halfway down. */}
      {masthead && (
        <span className={styles.masthead} lang="ja" aria-hidden="true">
          {masthead}
        </span>
      )}

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
