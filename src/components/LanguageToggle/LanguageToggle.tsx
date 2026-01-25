import type { Language } from '../../types/banzuke'
import styles from './LanguageToggle.module.css'

interface LanguageToggleProps {
  language: Language
  onLanguageChange: (lang: Language) => void
}

export function LanguageToggle({ language, onLanguageChange }: LanguageToggleProps) {
  const isEnglish = language === 'en'

  return (
    <div className={styles.toggle} role="group" aria-label="Language selection">
      <button
        type="button"
        className={`${styles.option} ${isEnglish ? styles.active : ''}`}
        onClick={() => onLanguageChange('en')}
        aria-pressed={isEnglish}
      >
        EN
      </button>
      <button
        type="button"
        className={`${styles.option} ${!isEnglish ? styles.active : ''}`}
        onClick={() => onLanguageChange('jp')}
        aria-pressed={!isEnglish}
      >
        JP
      </button>
      <span 
        className={styles.slider} 
        style={{ transform: isEnglish ? 'translateX(0)' : 'translateX(100%)' }}
        aria-hidden="true"
      />
    </div>
  )
}
