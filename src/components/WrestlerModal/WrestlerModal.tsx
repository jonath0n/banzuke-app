import { useEffect, useRef, useCallback } from 'react'
import type { Rikishi, RankLevel } from '../../types/banzuke'
import { getRankLevel, buildPhotoUrl } from '../../utils/formatting'
import { getRankLabel } from '../../constants/ranks'
import { useLanguage } from '../../contexts/LanguageContext'
import styles from './WrestlerModal.module.css'

const LARGE_PHOTO_BASE = 'https://www.sumo.or.jp/img/sumo_data/rikishi/240x240/'

interface WrestlerModalProps {
  rikishi: Rikishi | null
  onClose: () => void
}

function getRankDisplay(rikishi: Rikishi): string {
  const rankCode = Number(rikishi.rank)
  const number = rikishi.number != null && rikishi.number !== '' ? String(rikishi.number) : ''
  const label = getRankLabel(rankCode, number)
  return label || rikishi.banzuke_name || ''
}

function getSideLabel(ew: number): string {
  return Number(ew) === 2 ? 'West' : 'East'
}

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

  const rankLevel: RankLevel = getRankLevel(rikishi)
  const rankDisplay = getRankDisplay(rikishi)
  const side = getSideLabel(rikishi.ew)
  const enName = rikishi.shikona_en || rikishi.shikona
  const jpName = rikishi.shikona_jp || ''
  const primaryName = language === 'jp' ? jpName || enName : enName
  const secondaryName = language === 'jp' ? enName : jpName
  const photoUrl = rikishi.photo ? `${LARGE_PHOTO_BASE}${rikishi.photo}` : ''
  const smallPhotoUrl = rikishi.photo ? buildPhotoUrl(rikishi.photo) : ''

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
        aria-label={`Details for ${enName}`}
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
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`Portrait of ${enName}`}
                width={160}
                height={160}
                onError={(e) => {
                  // Fall back to small photo if large isn't available
                  if (smallPhotoUrl && e.currentTarget.src !== smallPhotoUrl) {
                    e.currentTarget.src = smallPhotoUrl
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
          <h2 className={styles.primaryName}>{primaryName}</h2>
          {secondaryName && secondaryName !== primaryName && (
            <p className={styles.secondaryName}>{secondaryName}</p>
          )}

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Rank</span>
              <span className={styles.metaValue}>
                {rikishi.banzuke_name_en || rikishi.banzuke_name}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Side</span>
              <span className={styles.metaValue}>
                {side}
                <span className={styles.sideKanji}>{Number(rikishi.ew) === 2 ? '西' : '東'}</span>
              </span>
            </div>
            {rikishi.heya_name && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Stable</span>
                <span className={styles.metaValue}>{rikishi.heya_name}</span>
              </div>
            )}
            {rikishi.pref_name && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>From</span>
                <span className={styles.metaValue}>{rikishi.pref_name}</span>
              </div>
            )}
            {rikishi.rank_new && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status</span>
                <span className={`${styles.metaValue} ${styles.statusBadge}`}>
                  {rikishi.rank_new}
                </span>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </div>
  )
}
