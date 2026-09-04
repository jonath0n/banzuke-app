import { useStrings } from '../../i18n/useStrings'
import styles from './Footer.module.css'

/** Returns the current year for copyright display */
function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function Footer() {
  const strings = useStrings()
  const currentYear = getCurrentYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.attribution}>
        <p>
          {strings.footerMadeBy}{' '}
          <a href="https://www.linkedin.com/in/jonathon2" target="_blank" rel="noreferrer">
            Jon Allen
          </a>
          <span className={styles.hanko} aria-hidden="true"></span>
        </p>
        <p>
          {strings.footerDataSource}{' '}
          <a href="https://sumo.or.jp/" target="_blank" rel="noreferrer">
            {strings.footerJsa}
          </a>
        </p>
        <p>
          <span className={styles.franSans}>Fran Sans</span> {strings.footerFontBy}{' '}
          <a href="https://emilysneddon.com" target="_blank" rel="noreferrer">
            Emily Sneddon
          </a>
          {' · '}
          <span className={styles.instrumentSans}>Instrument Sans</span> {strings.footerFontBy}{' '}
          <a href="https://github.com/Instrument/instrument-sans" target="_blank" rel="noreferrer">
            Instrument
          </a>
        </p>
      </div>
      <p className={styles.disclaimer}>{strings.footerDisclaimer}</p>
      <p className={styles.meta}>
        <span>{strings.footerRights(currentYear)}</span>
      </p>
    </footer>
  )
}
