import type { MouseEvent, ReactNode } from 'react'
import { ChevronIcon } from '../ChevronIcon/ChevronIcon'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import type { ArchiveIndexEntry } from '../../data/archive'
import { bashoLabel } from '../../utils/formatting'
import type { PickerControl } from './focus'
import styles from './BashoPicker.module.css'

interface BashoPickerProps {
  /** The archived tournament on screen, or null for the live banzuke. */
  current: ArchiveIndexEntry | null
  previous: ArchiveIndexEntry | null
  next: ArchiveIndexEntry | null
  /** Stepping forward from the newest archived tournament returns to the live sheet. */
  nextIsLive: boolean
  /** `control` is the one used, so focus can find its counterpart on the new sheet. */
  onChange: (bashoId: number | null, control: PickerControl) => void
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
  const link = (
    id: number | null,
    label: ReactNode,
    title: string,
    className: string,
    control: PickerControl
  ) => (
    <a
      className={className}
      data-picker={control}
      href={href(id)}
      title={title}
      aria-label={title}
      onClick={(e) => {
        if (!plainClick(e)) return
        e.preventDefault()
        onChange(id, control)
      }}
    >
      {label}
    </a>
  )
  return (
    <nav
      className={styles.picker}
      aria-label={strings.archiveNav}
      lang={langAttr(language)}
      data-basho={current?.bashoId ?? 'live'}
    >
      {previous ? (
        link(
          previous.bashoId,
          <ChevronIcon direction="previous" />,
          `${strings.archivePrevious}: ${bashoLabel(previous, language)}`,
          styles.step,
          'previous'
        )
      ) : (
        <span className={`${styles.step} ${styles.disabled}`} aria-hidden="true">
          <ChevronIcon direction="previous" />
        </span>
      )}
      {/* Focusable by script only: where focus lands when the control used is not on
          the new sheet (› to the live one, "Current banzuke"). */}
      <span className={styles.label} data-picker="label" tabIndex={-1}>
        {current ? strings.archiveViewing(bashoLabel(current, language)) : strings.archiveLive}
      </span>
      {current &&
        (nextIsLive
          ? link(
              null,
              <ChevronIcon direction="next" />,
              strings.archiveCurrent,
              styles.step,
              'next'
            )
          : next
            ? link(
                next.bashoId,
                <ChevronIcon direction="next" />,
                `${strings.archiveNext}: ${bashoLabel(next, language)}`,
                styles.step,
                'next'
              )
            : null)}
      {current &&
        link(null, strings.archiveCurrent, strings.archiveCurrent, styles.current, 'current')}
    </nav>
  )
}
