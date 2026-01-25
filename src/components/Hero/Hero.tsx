import type { BanzukePayload, Language } from '../../types/banzuke'
import { formatDate, formatDateTime } from '../../utils/formatting'
import styles from './Hero.module.css'

interface HeroProps {
  data: BanzukePayload | null
  language: Language
  onLanguageChange: (language: Language) => void
}

export function Hero({ data, language, onLanguageChange }: HeroProps) {
  const info = data?.BashoInfo
  const start = formatDate(info?.start_date)
  const end = formatDate(info?.end_date)
  const bashoName = data?.basho_name || '—'
  const division = data?.Kakuzuke
    ? ` (${data.Kakuzuke.replace(/&nbsp;/g, ' ')})`
    : ''

  const handleLanguageChange = (next: Language) => () => {
    onLanguageChange(next)
  }

  return (
    <header className={styles.hero}>
      <div className={styles.meta}>
        <p className={styles.badge}>Live from the Japan Sumo Association</p>
        <div className={styles.languageToggle} role="group" aria-label="Language">
          <button
            className={
              language === 'en'
                ? `${styles.languageButton} ${styles.languageButtonActive}`
                : styles.languageButton
            }
            type="button"
            onClick={handleLanguageChange('en')}
            aria-pressed={language === 'en'}
          >
            EN
          </button>
          <button
            className={
              language === 'jp'
                ? `${styles.languageButton} ${styles.languageButtonActive}`
                : styles.languageButton
            }
            type="button"
            onClick={handleLanguageChange('jp')}
            aria-pressed={language === 'jp'}
          >
            JP
          </button>
        </div>
      </div>
      <h1>Grand Sumo Banzuke</h1>
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
    </header>
  )
}
