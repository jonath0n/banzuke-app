import { useStrings } from '../../i18n/useStrings'
import styles from './ShortcutsHelp.module.css'

interface ShortcutsHelpProps {
  open: boolean
  onToggle: (open: boolean) => void
}

/** A small disclosure listing the keyboard shortcuts; `?` toggles it. */
export function ShortcutsHelp({ open, onToggle }: ShortcutsHelpProps) {
  const strings = useStrings()
  const rows: Array<[string, string]> = [
    ['/', strings.shortcutSearch],
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
    </details>
  )
}
