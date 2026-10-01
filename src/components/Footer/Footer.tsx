import type { ReactNode } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { ShortcutsHelp } from '../ShortcutsHelp/ShortcutsHelp'
import styles from './Footer.module.css'

interface FooterProps {
  /** The keyboard-shortcuts panel lives in the footer; `?` toggles it too. */
  helpOpen?: boolean
  onToggleHelp?: (open: boolean) => void
  singleKeys?: boolean
  onSingleKeysChange?: (on: boolean) => void
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** "Fran Sans by Emily Sneddon" / "Fran Sans（Emily Sneddon 作）". */
function FontCredit({
  name,
  className,
  author,
  href,
}: {
  name: string
  className: string
  author: string
  href: string
}) {
  const { language } = useLanguage()
  const strings = useStrings()
  const sample = <span className={className}>{name}</span>
  const link = <ExternalLink href={href}>{author}</ExternalLink>
  if (language === 'jp') {
    return (
      <span className={styles.credit}>
        {sample}（{link} {strings.footerFontBy}）
      </span>
    )
  }
  return (
    <span className={styles.credit}>
      {sample} {strings.footerFontBy} {link}
    </span>
  )
}

export function Footer({
  helpOpen = false,
  onToggleHelp,
  singleKeys,
  onSingleKeysChange,
}: FooterProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  // A full-width colon carries its own spacing; a half-width one needs a space after it.
  const gap = language === 'jp' ? '' : ' '
  const comma = language === 'jp' ? '、' : ', '
  const currentYear = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <p className={styles.line}>
        <span className={styles.credit}>
          {strings.footerMadeBy}
          {gap}
          <ExternalLink href="https://www.linkedin.com/in/jonathon2">Jon Allen</ExternalLink>
          <span className={styles.hanko} aria-hidden="true" />
        </span>
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
        <span className={styles.credit}>
          {strings.footerDataSource}
          {gap}
          <ExternalLink href="https://sumo.or.jp/">{strings.footerJsa}</ExternalLink>
          {comma}
          <ExternalLink href="https://www.sumo-api.com/">{strings.footerSumoApi}</ExternalLink>
        </span>
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
        <span className={styles.credit}>
          {strings.footerType}
          {gap}
          <FontCredit
            name="Fran Sans"
            className={styles.franSans}
            author="Emily Sneddon"
            href="https://emilysneddon.com"
          />
          {comma}
          <FontCredit
            name="Archivo"
            className={styles.archivo}
            author="Omnibus-Type"
            href="https://github.com/Omnibus-Type/Archivo"
          />
        </span>
      </p>
      <p className={styles.small}>
        <span>{strings.footerDisclaimer}</span> <span>{strings.footerRights(currentYear)}</span>
      </p>
      {onToggleHelp && (
        <ShortcutsHelp
          open={helpOpen}
          onToggle={onToggleHelp}
          singleKeys={singleKeys}
          onSingleKeysChange={onSingleKeysChange}
        />
      )}
    </footer>
  )
}
