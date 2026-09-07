import { useId, type MouseEvent } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import type { GuideKey } from '../../utils/guide'
import styles from './Guide.module.css'

/** The current URL with the guide switched on or off, for a real, shareable link. */
function guideHref(on: boolean): string {
  const url = new URL(window.location.href)
  if (on) url.searchParams.set('guide', '1')
  else url.searchParams.delete('guide')
  return `${url.pathname}${url.search}${url.hash}`
}

/** A plain left-click is handled in place; modified clicks open the link as links do. */
function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

interface GuideLinkProps {
  on: boolean
  onToggle: (on: boolean) => void
}

/** The way in: a quiet link beside the controls, read once rather than left on. */
export function GuideLink({ on, onToggle }: GuideLinkProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  return (
    <a
      className={styles.link}
      href={guideHref(!on)}
      lang={langAttr(language)}
      data-print="hide"
      onClick={(e) => {
        if (!plainClick(e)) return
        e.preventDefault()
        onToggle(!on)
      }}
    >
      {on ? strings.guideClose : strings.guideOpen}
    </a>
  )
}

interface GuideProps {
  /** Legend items in mark order: item i carries mark i + 1. */
  items: GuideKey[]
  onClose: () => void
}

/**
 * The legend beneath the paper. Each item repeats its number as the same
 * circle the sheet carries, so a reader matches mark to meaning by eye; the
 * list is real content, and reads on its own when the marks are out of view.
 */
export function Guide({ items, onClose }: GuideProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  return (
    <section className={styles.guide} aria-labelledby={headingId} lang={langAttr(language)}>
      <h2 id={headingId} className={styles.heading}>
        {strings.guideTitle}
      </h2>
      <p className={styles.intro}>{strings.guideIntro}</p>
      <ol className={styles.list}>
        {items.map((key, i) => (
          <li key={key} className={styles.item}>
            <span className={styles.mark} aria-hidden="true">
              {i + 1}
            </span>
            <span className="visually-hidden">{i + 1}. </span>
            <span className={styles.text}>{strings.guideItem[key]}</span>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        <GuideLink on onToggle={() => onClose()} />
      </p>
    </section>
  )
}
