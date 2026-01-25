import { useEffect, useRef } from 'react'
import styles from './Footer.module.css'

/** Returns the current year for copyright display */
function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function Footer() {
  const currentYear = getCurrentYear()
  const attributionRef = useRef<HTMLParagraphElement | null>(null)
  const disclaimerRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const attributionFont = attributionRef.current
      ? window.getComputedStyle(attributionRef.current).fontFamily
      : null
    const disclaimerFont = disclaimerRef.current
      ? window.getComputedStyle(disclaimerRef.current).fontFamily
      : null

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'Footer.tsx:useEffect:attributionFont',
        message: 'Computed font-family for footer attribution',
        data: { element: 'attribution', fontFamily: attributionFont },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H4',
        location: 'Footer.tsx:useEffect:disclaimerFont',
        message: 'Computed font-family for footer disclaimer',
        data: { element: 'disclaimer', fontFamily: disclaimerFont },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [])

  return (
    <footer className={styles.footer}>
      <p className={styles.attribution} ref={attributionRef}>
        Data source:{' '}
        <a href="https://sumo.or.jp/" target="_blank" rel="noreferrer">
          Japan Sumo Association
        </a>
        . Made by{' '}
        <a href="https://www.linkedin.com/in/jonathon2" target="_blank" rel="noreferrer">
          Jon Allen
        </a>
        .
      </p>
      <p className={styles.disclaimer} ref={disclaimerRef}>
        This is an unofficial fan project and is not affiliated with the Japan Sumo Association.
      </p>
      <p className={styles.meta}>
        <span>© {currentYear} Jon Allen. All Rights Reserved.</span>
      </p>
    </footer>
  )
}
