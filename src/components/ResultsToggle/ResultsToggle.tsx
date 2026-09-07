import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import styles from './ResultsToggle.module.css'

interface ResultsToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  /** The latest day with a decided bout. */
  day: number
}

/** Shows or hides the star chart. The same pressed seal as ChangesToggle. */
export function ResultsToggle({ on, onChange, day }: ResultsToggleProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const through = strings.resultsThrough(day)
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.on : ''}`}
      aria-pressed={on}
      title={through}
      onClick={() => onChange(!on)}
      lang={langAttr(language)}
      data-print="hide"
    >
      <span className={styles.mark} aria-hidden="true">
        ○●
      </span>
      {strings.results}
      <span className="visually-hidden"> — {through}</span>
    </button>
  )
}
