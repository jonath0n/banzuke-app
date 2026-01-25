import { useEffect, useRef } from 'react'
import type { BanzukePayload, Language } from '../../types/banzuke'
import { formatDate, formatDateTime } from '../../utils/formatting'
import { useLanguage } from '../../contexts/LanguageContext'
import { LanguageToggle } from '../LanguageToggle/LanguageToggle'
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
  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const badgeRef = useRef<HTMLParagraphElement | null>(null)
  const fontListenerAttachedRef = useRef(false)

  const handleLanguageChange = (next: Language) => () => {
    onLanguageChange(next)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const titleFont = titleRef.current
      ? window.getComputedStyle(titleRef.current).fontFamily
      : null
    const badgeFont = badgeRef.current
      ? window.getComputedStyle(badgeRef.current).fontFamily
      : null
    const fontsStatus = 'fonts' in document ? document.fonts.status : 'unsupported'
    const franSansCheckTitle =
      'fonts' in document
        ? document.fonts.check('16px "FranSans Solid"', 'Grand Sumo Banzuke')
        : null
    const franSansCheckLatin =
      'fonts' in document
        ? document.fonts.check('16px "FranSans Solid"', 'ENGLISH TEXT')
        : null

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'Hero.tsx:useEffect:titleFont',message:'Computed font-family for title',data:{language,element:'h1',fontFamily:titleFont},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'Hero.tsx:useEffect:badgeFont',message:'Computed font-family for badge',data:{language,element:'badge',fontFamily:badgeFont},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'Hero.tsx:useEffect:fontCheck',message:'Font loading checks for FranSans',data:{language,fontsStatus,franSansCheckTitle,franSansCheckLatin},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if ('fonts' in document && !fontListenerAttachedRef.current) {
      fontListenerAttachedRef.current = true
      document.fonts.ready.then(() => {
        const readyStatus = document.fonts.status
        const franSansReadyCheck = document.fonts.check(
          '16px "FranSans Solid"',
          'Grand Sumo Banzuke'
        )

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H7',location:'Hero.tsx:fonts.ready',message:'Font readiness resolved',data:{readyStatus,franSansReadyCheck},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
      })
    }
  }, [language])

  return (
    <header className={styles.hero}>
      <div className={styles.meta}>
        <p className={styles.badge} ref={badgeRef}>
          Live from the Japan Sumo Association
        </p>
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
      <h1 ref={titleRef}>Grand Sumo Banzuke</h1>
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
