import type { MouseEvent } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import type { ArchiveIndexEntry } from '../../data/archive'
import { bashoLabel } from '../../utils/formatting'
import styles from './BashoPicker.module.css'

interface BashoPickerProps {
  /** The archived tournament on screen, or null for the live banzuke. */
  current: ArchiveIndexEntry | null
  previous: ArchiveIndexEntry | null
  next: ArchiveIndexEntry | null
  /** Stepping forward from the newest archived tournament returns to the live sheet. */
  nextIsLive: boolean
  onChange: (bashoId: number | null) => void
}

function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

/**
 * Walks the archive one tournament at a time: ‹ to the older sheet, › to the
 * newer, and back to the live one at the end. Real links, so a modified click
 * opens a tab; a plain click is handled in place.
 */
export function BashoPicker({ current, previous, next, nextIsLive, onChange }: BashoPickerProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const href = (id: number | null) => {
    const url = new URL(window.location.href)
    if (id === null) url.searchParams.delete('basho')
    else url.searchParams.set('basho', String(id))
    return `${url.pathname}${url.search}${url.hash}`
  }
  const link = (id: number | null, label: string, title: string, className: string) => (
    <a
      className={className}
      href={href(id)}
      title={title}
      aria-label={title}
      onClick={(e) => {
        if (!plainClick(e)) return
        e.preventDefault()
        onChange(id)
      }}
    >
      {label}
    </a>
  )
  return (
    <nav className={styles.picker} aria-label={strings.archiveNav} lang={langAttr(language)}>
      {previous ? (
        link(
          previous.bashoId,
          '‹',
          `${strings.archivePrevious}: ${bashoLabel(previous, language)}`,
          styles.step
        )
      ) : (
        <span className={`${styles.step} ${styles.disabled}`} aria-hidden="true">
          ‹
        </span>
      )}
      <span className={styles.label}>
        {current ? strings.archiveViewing(bashoLabel(current, language)) : strings.archiveLive}
      </span>
      {current &&
        (nextIsLive
          ? link(null, '›', strings.archiveCurrent, styles.step)
          : next
            ? link(
                next.bashoId,
                '›',
                `${strings.archiveNext}: ${bashoLabel(next, language)}`,
                styles.step
              )
            : null)}
      {current && link(null, strings.archiveCurrent, strings.archiveCurrent, styles.current)}
    </nav>
  )
}
