import { useState } from 'react'
import type { Banzuke } from '../../types/banzuke'
import {
  formatDateRange,
  formatDateTime,
  formatRelativeTime,
  getTournamentStatus,
} from '../../utils/dates'
import { getVenue } from '../../constants/venues'
import { bashoNickname, jpBashoName } from '../../data/kanji'
import { SANSHO_KINDS, scoreLabel, type ResultsFile } from '../../data/results'
import type { Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useNow } from '../../hooks/useNow'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { LanguageToggle } from '../LanguageToggle/LanguageToggle'
import styles from './Hero.module.css'

interface HeroProps {
  data: Banzuke | null
  /** When the results file is loaded, its own fetch time; it is what moves in season. */
  resultsFetchedAt?: string | null
  /** The tournament's results, for the champion's line once the yusho is decided. */
  results?: ResultsFile | null
  /** Everyone on the banzuke by id, to name the champion and the prize winners. */
  rankById?: Map<number, Rikishi>
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
 * The front page: the paper's red masthead band (wordmark, 番付, the era
 * masthead 令和八年九月場所, the language switch), then on newsprint the
 * tournament in one line and, once it is decided, the champion as the
 * headline with the 優勝 stamp.
 */
export function Hero({ data, resultsFetchedAt = null, results = null, rankById }: HeroProps) {
  // "updated 3 minutes ago" keeps counting on an evening the tab stays open.
  const now = useNow()
  const { language, setLanguage } = useLanguage()
  const strings = useStrings()
  const basho = data?.basho
  const bashoName = basho ? basho.name[language] || basho.name.en : ''
  const venue = basho ? getVenue(basho.month) : null
  const dates = basho ? formatDateRange(basho.startDate, basho.endDate, language) : ''
  const announced = basho?.announcedAt ? formatDateTime(basho.announcedAt, language) : ''
  // The masthead as the sheet prints it: era year over month-tournament.
  const masthead = basho ? `${basho.yearJp}${jpBashoName(basho.month)}` : ''
  // "September Grand Sumo Tournament (Aki)": the season name fans use, English only.
  const nickname = basho && language === 'en' ? bashoNickname(basho.month) : ''

  // Once the yusho is decided: the champion with the record, the three prizes,
  // the Juryo champion small. The one line a finished basho is remembered by.
  const nameOf = (id: number) => {
    const r = rankById?.get(id)
    return r ? r.shikona[language] || r.shikona.en : ''
  }
  const championId = results?.yusho.makuuchi
  // The 優勝 stamp is pressed once per page load: for the first champion this
  // Hero shows, and never again once the page has moved to another tournament
  // (or to none), so an archive switch sets the stamp in place. Kept as state
  // adjusted during render, so a re-render mid-press never cancels it.
  const [press, setPress] = useState<{ id: number | null; done: boolean }>({
    id: null,
    done: false,
  })
  if (championId != null && press.id === null) {
    setPress({ id: championId, done: false })
  } else if (press.id !== null && !press.done && championId !== press.id) {
    setPress({ id: press.id, done: true })
  }
  const pressStamp = championId != null && championId === press.id && !press.done
  const champion = championId != null ? nameOf(championId) : ''
  const championRecord = championId != null ? results?.records[String(championId)] : undefined
  const prizes = SANSHO_KINDS.flatMap((kind) => {
    const names = (results?.sansho ?? [])
      .filter((s) => s.kind === kind)
      .map((s) => nameOf(s.rikishiId))
      .filter(Boolean)
    return names.length > 0 ? [{ kind, names }] : []
  })
  const juryoChampion = results?.yusho.juryo != null ? nameOf(results.yusho.juryo) : ''

  const provenance: string[] = []
  if (announced) provenance.push(strings.announcedOn(announced))
  if (data?.source === 'sample') {
    provenance.push(strings.sampleData)
  } else if (data) {
    // The snapshot is rewritten only when the sheet itself changes, so in
    // season its stamp reads stale while the results file moves every run;
    // the freshness shown is whichever of the two is being refreshed.
    const checked = formatRelativeTime(resultsFetchedAt ?? data.fetchedAt, language, now)
    const label = resultsFetchedAt ? strings.resultsUpdated : strings.checked
    const comma = language === 'jp' ? '、' : ', '
    provenance.push(checked ? `${strings.dataFrom}${comma}${label(checked)}` : strings.dataFrom)
  }

  const headline = champion
    ? strings.headlineYusho(champion, championRecord ? scoreLabel(championRecord, language) : '')
    : ''
  // The 優勝 stamp carries the word in Japanese; in English it echoes "Yusho:".
  const headlineText = language === 'jp' ? headline.replace(/^優勝\s*/, '') : headline
  // The record in brackets never breaks across lines: "(13–" / "2)" is not a headline
  const [, headlineHead = headlineText, headlineRecord = ''] =
    /^(.*?)([（(][^（(]*[）)])$/.exec(headlineText) ?? []

  return (
    <header className={styles.hero} lang={langAttr(language)}>
      {/* The masthead band: the paper's red, edge to edge */}
      <div className={styles.band}>
        <div className={`${styles.bandInner} page-measure`}>
          <div className={styles.title}>
            <h1 lang={langAttr(language)}>{strings.appTitle}</h1>
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
      </div>

      <div className={`${styles.front} page-measure`}>
        {/* The standfirst: what this page is, for a reader who arrived from a search */}
        <p className={styles.standfirst}>{strings.standfirst}</p>
        <p className={styles.deck}>
          {data ? (
            <>
              <span className={styles.name}>
                <strong className={styles.bashoName}>{bashoName}</strong>
                {nickname ? ` (${nickname})` : ''}
              </span>
              <span className={styles.where}>
                {[venue?.[language], dates].filter(Boolean).join(SEPARATOR)}
              </span>
              <TournamentStatus data={data} />
            </>
          ) : (
            '—'
          )}
        </p>

        {champion && (
          <div className={styles.headline}>
            <p className={styles.champion}>
              <span
                className={styles.stamp}
                data-press={pressStamp || undefined}
                lang="ja"
                aria-hidden={language === 'jp' ? undefined : true}
              >
                優勝
              </span>
              <span className={styles.championText}>
                {headlineHead}
                {headlineRecord && <span className={styles.record}>{headlineRecord}</span>}
              </span>
            </p>
            {(prizes.length > 0 || juryoChampion) && (
              <p className={styles.prizes}>
                {prizes.map(({ kind, names }) => (
                  <span key={kind} className={styles.prize}>
                    <span className={styles.prizeName}>{strings.sansho[kind]}</span>{' '}
                    {names.join(language === 'jp' ? '、' : ', ')}
                  </span>
                ))}
                {juryoChampion && (
                  <span className={styles.juryo}>{strings.headlineJuryoYusho(juryoChampion)}</span>
                )}
              </p>
            )}
          </div>
        )}

        {provenance.length > 0 && <p className={styles.provenance}>{provenance.join(SEPARATOR)}</p>}
      </div>
    </header>
  )
}
