import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import {
  boutMark,
  kachikoshiState,
  MAX_DAYS,
  scoreLabel,
  type RikishiRecord,
} from '../../data/results'
import styles from './Hoshitori.module.css'

interface HoshitoriProps {
  record: RikishiRecord
  /** Tournament champion, once decided. */
  champion?: boolean
}

/**
 * The star chart. Decorative: the button around it says the record in words
 * (`describeRecord`), since ○ and ● are not a sentence. Kachi-koshi is ink
 * weight and make-koshi is muted; nothing here is a new colour, and the
 * champion's mark is a hairline seal, never gold, which belongs to the
 * Yokozuna alone.
 */
export function Hoshitori({ record, champion = false }: HoshitoriProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const state = kachikoshiState(record)
  const lang = langAttr(language)
  const stateLabel =
    state === 'kachikoshi' ? strings.kachikoshi : state === 'makekoshi' ? strings.makekoshi : ''

  const byDay = new Map(record.bouts.map((bout) => [bout.day, bout]))
  return (
    <span className={styles.badge} data-state={state} lang={lang} aria-hidden="true">
      <span className={styles.strip} lang="ja">
        {Array.from({ length: MAX_DAYS }, (_, i) => {
          const bout = byDay.get(i + 1)
          return (
            <span key={i} className={styles.cell} data-day={i + 1} data-outcome={bout?.outcome}>
              {bout ? boutMark(bout.outcome) : '·'}
            </span>
          )
        })}
      </span>
      <span className={styles.score}>{scoreLabel(record, language)}</span>
      {champion ? (
        <span className={`${styles.state} ${styles.seal}`}>{strings.yusho}</span>
      ) : (
        stateLabel && <span className={styles.state}>{stateLabel}</span>
      )}
    </span>
  )
}
