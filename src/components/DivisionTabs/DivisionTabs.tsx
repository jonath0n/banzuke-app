import { useRef, type KeyboardEvent } from 'react'
import type { Division } from '../../types/banzuke'
import { DIVISION_KANJI } from '../../data/kanji'
import { DIVISION_PREFIX } from '../../constants/ranks'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { PANEL_ID, tabId } from './ids'
import styles from './DivisionTabs.module.css'

interface DivisionTabsProps {
  value: Division
  onChange: (division: Division) => void
  /** The divisions offered, top first (a lower one may still be loading). */
  divisions: readonly Division[]
  /** Wrestler counts per loaded division; a division still loading shows none. */
  counts: Partial<Record<Division, number>>
  /** Search matches per division while filtering, shown as matched/total. */
  matched?: Partial<Record<Division, number>>
}

/**
 * Switches between divisions. Follows the WAI-ARIA tabs pattern: arrow keys
 * move between tabs and select them, Home/End jump to the ends.
 */
export function DivisionTabs({ value, onChange, divisions, counts, matched }: DivisionTabsProps) {
  const strings = useStrings()
  const { language } = useLanguage()
  const listRef = useRef<HTMLDivElement>(null)
  const available = divisions

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = available.indexOf(value)
    let next = current
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % available.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + available.length) % available.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = available.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const division = available[next]
    onChange(division)
    listRef.current?.querySelector<HTMLButtonElement>(`#${tabId(division)}`)?.focus()
  }

  return (
    <div
      ref={listRef}
      className={styles.tabs}
      role="tablist"
      aria-label={strings.divisionGroup}
      data-print="hide"
    >
      {available.map((division) => {
        const selected = division === value
        const hits = matched?.[division]
        return (
          <button
            key={division}
            type="button"
            role="tab"
            id={tabId(division)}
            className={`${styles.tab} ${selected ? styles.selected : ''}`}
            aria-selected={selected}
            aria-controls={PANEL_ID}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(division)}
            onKeyDown={handleKeyDown}
          >
            {language === 'jp' ? (
              <span className={styles.kanji} lang="ja">
                {DIVISION_KANJI[division]}
              </span>
            ) : (
              <>
                <span className={styles.name}>{strings.division[division]}</span>
                {/* On a phone the six names do not fit: the rank prefix stands in.
                    It stays in the accessible name beside the full name, so a voice
                    user can say what they see (WCAG 2.5.3); above 720px it is
                    display: none and out of the name. */}
                <span className={styles.abbr}>{DIVISION_PREFIX[division]}</span>
              </>
            )}
            {counts[division] != null && (
              <span className={`${styles.count} ${hits === 0 ? styles.none : ''}`}>
                {hits != null ? `${hits}/${counts[division]}` : counts[division]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
