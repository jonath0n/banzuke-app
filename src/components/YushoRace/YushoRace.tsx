import type { Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { scoreLabel, type RikishiRecord, type YushoRace as Race } from '../../data/results'
import styles from './YushoRace.module.css'

interface YushoRaceProps {
  race: Race
  records: Record<string, RikishiRecord>
  onSelectRikishi?: (rikishi: Rikishi) => void
}

/**
 * The one line every basho carries: who leads, by how many losses, and who
 * can still catch them — or, once it is settled, who took the yusho. A
 * sentence, never a table; names are buttons into the dialog, as on the card.
 */
export function YushoRace({ race, records, onSelectRikishi }: YushoRaceProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const lang = langAttr(language)
  const name = (r: Rikishi) => r.shikona[language] || r.shikona.en
  const wrestler = (r: Rikishi) =>
    onSelectRikishi ? (
      <button type="button" className={styles.name} onClick={() => onSelectRikishi(r)}>
        {name(r)}
      </button>
    ) : (
      <span className={styles.name}>{name(r)}</span>
    )
  const separate = (nodes: React.ReactNode[], separator: string) =>
    nodes.flatMap((node, i) => (i === 0 ? [node] : [separator, node]))

  if (race.champion) {
    const record = records[String(race.champion.id)]
    return (
      <p className={styles.race} lang={lang}>
        <span className={styles.label}>{strings.yusho}</span>{' '}
        <span className={styles.decided}>
          {wrestler(race.champion)}
          {record && <span className={styles.score}> {scoreLabel(record, language)}</span>}
        </span>
      </p>
    )
  }
  if (race.tiers.length === 0) return null

  return (
    <p className={styles.race} lang={lang}>
      <span className={styles.label}>{strings.raceAfter(race.day)}</span>{' '}
      {race.tiers.map((tier, i) => (
        <span key={tier.losses} className={styles.tier}>
          {i > 0 && <span className={styles.separator}> · </span>}
          <span className={styles.losses}>{strings.raceLosses(tier.losses)}</span>{' '}
          {separate(
            tier.rikishi.map((r) => <span key={r.id}>{wrestler(r)}</span>),
            language === 'jp' ? '、' : ', '
          )}
        </span>
      ))}
      {race.decided && <span className={styles.note}> — {strings.raceDecided}</span>}
      {race.coLeaderBout && <span className={styles.note}> — {strings.raceCoLeaders}</span>}
    </p>
  )
}
