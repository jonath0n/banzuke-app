import type { Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { describePromotion } from '../../utils/promotion'
import styles from './PromotionPill.module.css'

interface PromotionPillProps {
  rikishi: Pick<Rikishi, 'promotion' | 'rankName'>
  /** An Ozeki on the brink: shown when the JSA prints no flag of its own. */
  kadoban?: boolean
}

/**
 * The promotion flag the JSA prints beside a name on its own banzuke page —
 * 新入幕, 再入幕, 新十両, 新小結 … — in vermilion, the short form beside the
 * name. The pill is a visual; the wrestler button's accessible name says the
 * same in words.
 */
export function PromotionPill({ rikishi, kadoban = false }: PromotionPillProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const short = describePromotion(rikishi, language, 'short')
  const lang = language === 'jp' ? 'ja' : 'en'
  if (short) {
    return (
      <span
        className={styles.pill}
        title={describePromotion(rikishi, language) ?? undefined}
        lang={lang}
      >
        {short}
      </span>
    )
  }
  // 角番 is not printed on the banzuke — it is read off the last one — so it
  // stands in ink with a hairline, not the vermilion of a printed flag.
  if (kadoban) {
    return (
      <span className={`${styles.pill} ${styles.kadoban}`} title={strings.kadobanLong} lang={lang}>
        {strings.kadoban}
      </span>
    )
  }
  return null
}
