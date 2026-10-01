import { useId } from 'react'
import { useStrings } from '../../i18n/useStrings'
import styles from './ShortcutsHelp.module.css'

interface ShortcutsHelpProps {
  open: boolean
  onToggle: (open: boolean) => void
  /** The single printable keys can be switched off (WCAG 2.1.4). */
  singleKeys?: boolean
  onSingleKeysChange?: (on: boolean) => void
}

/** A small disclosure listing the keyboard shortcuts; `?` toggles it. */
export function ShortcutsHelp({
  open,
  onToggle,
  singleKeys = true,
  onSingleKeysChange,
}: ShortcutsHelpProps) {
  const strings = useStrings()
  const hintId = useId()
  const rows: Array<[string, string]> = [
    ['/', strings.shortcutSearch],
    ['← → ↑ ↓', strings.shortcutArrows],
    ['L', strings.shortcutLanguage],
    ['Esc', strings.shortcutEscape],
    ['?', strings.shortcutHelp],
  ]

  return (
    <details
      className={styles.help}
      open={open}
      onToggle={(e) => onToggle(e.currentTarget.open)}
      data-print="hide"
    >
      <summary className={styles.summary}>{strings.shortcuts}</summary>
      <dl className={styles.list}>
        {rows.map(([key, label]) => (
          <div key={key} className={styles.row}>
            <dt>
              <kbd className={styles.kbd}>{key}</kbd>
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
      {onSingleKeysChange && (
        <p className={styles.setting}>
          <label>
            <input
              type="checkbox"
              checked={singleKeys}
              onChange={(e) => onSingleKeysChange(e.target.checked)}
              aria-describedby={hintId}
            />{' '}
            {strings.shortcutsSingleKey}
          </label>
          <span id={hintId} className={styles.hint}>
            {strings.shortcutsSingleKeyHint}
          </span>
        </p>
      )}
    </details>
  )
}
