import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import styles from './ChangesToggle.module.css'

interface ChangesToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  /** The previous tournament, e.g. "July 2026" / 「七月場所」. */
  sinceLabel: string
}

/**
 * Switches the movement overlay on and off. A single pressed button rather
 * than another two-cell seal: this annotates the sheet, it does not choose
 * between two renderings of it.
 */
export function ChangesToggle({ on, onChange, sinceLabel }: ChangesToggleProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const since = strings.changesSince(sinceLabel)
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.on : ''}`}
      aria-pressed={on}
      title={since}
      onClick={() => onChange(!on)}
      lang={langAttr(language)}
      data-print="hide"
    >
      <span className={styles.mark} aria-hidden="true">
        ▲▼
      </span>
      {strings.changes}
      <span className="visually-hidden"> — {strings.since(sinceLabel)}</span>
    </button>
  )
}
