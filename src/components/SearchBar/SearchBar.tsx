import { useEffect, useRef, useState } from 'react'
import { useStrings } from '../../i18n/useStrings'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  totalCount: number
  matchedCount: number
}

/**
 * Search input that is safe for IME composition: while a Japanese reading is
 * being composed the draft stays local, and the query is committed once the
 * composition ends, so results don't flicker through intermediate kana.
 */
export function SearchBar({ value, onChange, totalCount, matchedCount }: SearchBarProps) {
  const strings = useStrings()
  const [draft, setDraft] = useState(value)
  const composing = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the draft in step with external changes (Escape, URL, Clear).
  useEffect(() => {
    if (!composing.current) setDraft(value)
  }, [value])

  const isFiltering = value.trim().length > 0

  return (
    <div className={styles.searchBar} role="search" data-print="hide">
      <div className={styles.inputWrapper}>
        <svg
          className={styles.icon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder={strings.searchPlaceholder}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (!composing.current) onChange(e.target.value)
          }}
          onCompositionStart={() => {
            composing.current = true
          }}
          onCompositionEnd={(e) => {
            composing.current = false
            onChange(e.currentTarget.value)
          }}
          aria-label={strings.searchLabel}
          aria-keyshortcuts="/"
          autoComplete="off"
          enterKeyHint="search"
          data-search-input
        />
        {isFiltering ? (
          <button
            className={styles.clear}
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            type="button"
            aria-label={strings.searchClear}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : (
          <kbd className={styles.kbd} aria-hidden="true">
            /
          </kbd>
        )}
      </div>
      <span className={styles.count} role="status" aria-live="polite">
        {isFiltering ? strings.searchCount(matchedCount, totalCount) : ''}
      </span>
    </div>
  )
}
