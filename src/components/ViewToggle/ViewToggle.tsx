import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import styles from './ViewToggle.module.css'

/** How the rankings are laid out: as the printed sheet, or as rows. */
export type View = 'sheet' | 'list'

interface ViewToggleProps {
  view: View
  onViewChange: (view: View) => void
}

/**
 * Sheet or List. Built on the same two-cell seal as the language toggle
 * rather than a new pattern — this is a choice between two renderings of the
 * same rankings, not a settings control.
 */
export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const isSheet = view === 'sheet'
  const lang = language === 'jp' ? 'ja' : 'en'

  return (
    <div className={styles.toggle} role="group" aria-label={strings.viewGroup} data-print="hide">
      <button
        type="button"
        className={`${styles.option} ${isSheet ? styles.active : ''}`}
        onClick={() => onViewChange('sheet')}
        aria-pressed={isSheet}
        lang={lang}
      >
        {strings.viewSheet}
      </button>
      <button
        type="button"
        className={`${styles.option} ${!isSheet ? styles.active : ''}`}
        onClick={() => onViewChange('list')}
        aria-pressed={!isSheet}
        lang={lang}
      >
        {strings.viewList}
      </button>
      <span
        className={styles.slider}
        style={{ transform: isSheet ? 'translateX(0)' : 'translateX(100%)' }}
        aria-hidden="true"
      />
    </div>
  )
}
