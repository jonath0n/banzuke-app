import styles from './Footer.module.css'

/** Returns the current year for copyright display */
function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function Footer() {
  const currentYear = getCurrentYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.attribution}>
        <p>
          Made by{' '}
          <a href="https://www.linkedin.com/in/jonathon2" target="_blank" rel="noreferrer">
            Jon Allen
          </a>
          <span className={styles.hanko} aria-label="丈"></span>
        </p>
        <p>
          Data source:{' '}
          <a href="https://sumo.or.jp/" target="_blank" rel="noreferrer">
            Japan Sumo Association
          </a>
        </p>
        <p>
          <span className={styles.franSans}>Fran Sans</span> by{' '}
          <a href="https://emilysneddon.com" target="_blank" rel="noreferrer">
            Emily Sneddon
          </a>
        </p>
      </div>
      <p className={styles.disclaimer}>
        This is an unofficial fan project and is not affiliated with the Japan Sumo Association.
      </p>
      <p className={styles.meta}>
        <span>© {currentYear} Jon Allen. All Rights Reserved.</span>
      </p>
    </footer>
  )
}
