import { useEffect, useRef, useCallback } from 'react'
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

export function WrestlerModal({ rikishi, onClose }: WrestlerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const { language } = useLanguage()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (rikishi) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKeyDown)
      // Focus the dialog after animation starts
      requestAnimationFrame(() => {
        dialogRef.current?.focus()
      })
    }

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [rikishi, handleKeyDown])

  if (!rikishi) return null

  const rankLevel = rikishi.rankLevel
  const rankDisplay = getRankLabel(rikishi.rankCode, rikishi.rankNumber) || rikishi.rankName.en
  const primaryName = rikishi.shikona[language] || rikishi.shikona.en
  const secondaryName =
    language === 'jp' ? rikishi.reading || rikishi.shikona.en : rikishi.shikona.jp
  const portrait = PHOTO_DIMENSIONS['270x474']
  const promotion = describePromotion(rikishi, language)

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} aria-hidden="true">
      <dialog
        ref={dialogRef}
        className={styles.modal}
        data-rank-level={rankLevel}
        open
        aria-label={`Details for ${rikishi.shikona.en}`}
        tabIndex={-1}
      >
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
          <div className={styles.photoWrapper} data-rank-level={rankLevel}>
            {rikishi.photo ? (
              <img
                src={buildPhotoUrl(rikishi.photo, '270x474')}
                alt={`Portrait of ${rikishi.shikona.en}`}
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
          <div className={styles.rankBadge} data-rank-level={rankLevel}>
            {rankDisplay}
          </div>
        </div>

        <div className={styles.details}>
          <h2 className={styles.primaryName} lang={language === 'jp' ? 'ja' : 'en'}>
            {primaryName}
          </h2>
          {secondaryName && secondaryName !== primaryName && (
            <p className={styles.secondaryName} lang={language === 'jp' ? 'ja' : 'ja'}>
              {secondaryName}
            </p>
          )}

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Rank</span>
              <span className={styles.metaValue}>{rikishi.rankName[language]}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Side</span>
              <span className={styles.metaValue}>
                {SIDE_LABELS[rikishi.side].en}
                <span className={styles.sideKanji} lang="ja">
                  {SIDE_LABELS[rikishi.side].jp}
                </span>
              </span>
            </div>
            {rikishi.heya.en && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Stable</span>
                <span className={styles.metaValue}>{rikishi.heya[language]}</span>
              </div>
            )}
            {rikishi.pref.en && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>From</span>
                <span className={styles.metaValue}>{rikishi.pref[language]}</span>
              </div>
            )}
            {promotion && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status</span>
                <span className={`${styles.metaValue} ${styles.statusBadge}`}>{promotion}</span>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  )
}
