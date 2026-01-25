import styles from './Footer.module.css'

export function Footer() {
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
        <span>© 2026 Jon Allen. All Rights Reserved.</span>
        <span>Last updated January 2026</span>
      </p>
    </footer>
  )
}
