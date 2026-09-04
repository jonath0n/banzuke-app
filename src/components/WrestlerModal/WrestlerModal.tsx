import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Rikishi } from '../../types/banzuke'
import { buildPhotoUrl, PHOTO_DIMENSIONS } from '../../utils/formatting'
import { getRankLabel } from '../../constants/ranks'
import { describePromotion } from '../../utils/promotion'
import { useLanguage } from '../../contexts/LanguageContext'
import styles from './WrestlerModal.module.css'

interface WrestlerModalProps {
  rikishi: Rikishi | null
  onClose: () => void
}

const SIDE_LABELS = {
  east: { en: 'East', jp: '東' },
  west: { en: 'West', jp: '西' },
} as const

/**
 * Wrestler detail dialog built on the native <dialog> element: `showModal()`
 * puts it in the top layer, traps focus, makes the rest of the page inert and
 * handles Escape. The element stays mounted so open/close transitions work;
 * its content renders only while a wrestler is selected.
 */
export function WrestlerModal({ rikishi, onClose }: WrestlerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<Element | null>(null)
  const { language } = useLanguage()
  const nameId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (rikishi) {
      if (!dialog.open) {
        openerRef.current = document.activeElement
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [rikishi])

  // Fires for Escape, the close button and programmatic close alike.
  const handleClose = () => {
    const opener = openerRef.current
    openerRef.current = null
    onClose()
    if (opener instanceof HTMLElement && document.contains(opener)) {
      opener.focus()
    }
  }

  // A click on the dialog element itself (not its content) is a backdrop click.
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  const portrait = PHOTO_DIMENSIONS['270x474']
  const langAttr = language === 'jp' ? 'ja' : 'en'

  return createPortal(
    // The click handler only implements "click the backdrop to dismiss", a
    // pointer convenience; keyboard users close the dialog with Escape (native)
    // or the Close button, so no key handler is needed here.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={styles.modal}
      data-rank-level={rikishi?.rankLevel}
      aria-labelledby={nameId}
      onClose={handleClose}
      onClick={handleClick}
    >
      {rikishi && (
        <div className={styles.content}>
          <button
            className={styles.close}
            onClick={onClose}
            type="button"
            aria-label="Close wrestler details"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className={styles.photoSection}>
            <div className={styles.photoWrapper} data-rank-level={rikishi.rankLevel}>
              {rikishi.photo ? (
                <img
                  src={buildPhotoUrl(rikishi.photo, '270x474')}
                  alt=""
                  width={portrait.width}
                  height={portrait.height}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fall back to the thumbnail if the portrait isn't available
                    const small = buildPhotoUrl(rikishi.photo!, '60x60')
                    if (e.currentTarget.src !== small) {
                      e.currentTarget.src = small
                    }
                  }}
                />
              ) : (
                <div className={styles.photoPlaceholder} aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                    <path
                      d="M4 20c0-4 4-7 8-7s8 3 8 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className={styles.rankBadge} data-rank-level={rikishi.rankLevel}>
              {getRankLabel(rikishi.rankCode, rikishi.rankNumber) || rikishi.rankName.en}
            </div>
          </div>

          <div className={styles.details}>
            <h2 id={nameId} className={styles.primaryName} lang={langAttr}>
              {rikishi.shikona[language] || rikishi.shikona.en}
            </h2>
            <SecondaryName rikishi={rikishi} />

            <dl className={styles.meta}>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Rank</dt>
                <dd className={styles.metaValue} lang={langAttr}>
                  {rikishi.rankName[language]}
                </dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>Side</dt>
                <dd className={styles.metaValue}>
                  {SIDE_LABELS[rikishi.side].en}
                  <span className={styles.sideKanji} lang="ja">
                    {SIDE_LABELS[rikishi.side].jp}
                  </span>
                </dd>
              </div>
              {rikishi.heya.en && (
                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>Stable</dt>
                  <dd className={styles.metaValue} lang={langAttr}>
                    {rikishi.heya[language]}
                  </dd>
                </div>
              )}
              {rikishi.pref.en && (
                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>From</dt>
                  <dd className={styles.metaValue} lang={langAttr}>
                    {rikishi.pref[language]}
                  </dd>
                </div>
              )}
              {rikishi.promotion && (
                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>Status</dt>
                  <dd className={`${styles.metaValue} ${styles.statusBadge}`} lang={langAttr}>
                    {describePromotion(rikishi, language)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </dialog>,
    document.body
  )
}

/** The name in the other script: reading (or romaji) under kanji, kanji under romaji. */
function SecondaryName({ rikishi }: { rikishi: Rikishi }) {
  const { language } = useLanguage()
  const primary = rikishi.shikona[language] || rikishi.shikona.en
  const secondary = language === 'jp' ? rikishi.reading || rikishi.shikona.en : rikishi.shikona.jp
  if (!secondary || secondary === primary) return null
  const isJapanese = language === 'en' || Boolean(rikishi.reading)
  return (
    <p className={styles.secondaryName} lang={isJapanese ? 'ja' : 'en'}>
      {secondary}
    </p>
  )
}
