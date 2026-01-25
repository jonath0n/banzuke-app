import styles from './Footer.module.css'

/** Returns the current year for copyright display */
function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function Footer() {
  const currentYear = getCurrentYear()
  
  return (
    <footer className={styles.footer}>
      <p className={styles.attribution}>
        Data source:{' '}
        <a href="https://sumo.or.jp/" target="_blank" rel="noreferrer">
          Japan Sumo Association
        </a>
        . Made by{' '}
        <a
          href="https://www.linkedin.com/in/jonathon2"
          target="_blank"
          rel="noreferrer"
        >
          Jon Allen
        </a>
        .
      </p>
      <p className={styles.disclaimer}>
        This is an unofficial fan project and is not affiliated with the Japan
        Sumo Association.
      </p>
      <p className={styles.meta}>
        <span>© {currentYear} Jon Allen. All Rights Reserved.</span>
      </p>
    </footer>
  )
}
