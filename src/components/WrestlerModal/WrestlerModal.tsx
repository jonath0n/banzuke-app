import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Rikishi } from '../../types/banzuke'
import type { RikishiProfile } from '../../data/profiles'
import { buildPhotoUrl, profileUrl, PHOTO_DIMENSIONS } from '../../utils/formatting'
import { jpRankShort } from '../../data/kanji'
import { describePromotion } from '../../utils/promotion'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { useProfile } from '../../hooks/useProfiles'
import { ageOn, formatBirthDate, formatMeasure, formatYearMonth } from '../../utils/profile'
import styles from './WrestlerModal.module.css'

interface WrestlerModalProps {
  rikishi: Rikishi | null
  onClose: () => void
}

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
  const strings = useStrings()
  const nameId = useId()
  const [copied, setCopied] = useState(false)
  const profile = useProfile(rikishi?.id ?? null)

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
    setCopied(false)
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

  const handleCopyLink = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
      }
    } catch {
      // Cancelled share sheet or clipboard denied: nothing to report.
    }
  }

  const portrait = PHOTO_DIMENSIONS['270x474']
  const lang = langAttr(language)

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
      lang={lang}
    >
      {rikishi && (
        <div className={styles.content}>
          <button
            className={styles.close}
            onClick={onClose}
            type="button"
            aria-label={strings.closeDetails}
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
            {/* The seal under the portrait reads the rank in kanji, as the rail does;
                the Rank row below carries it in the UI language for assistive tech. */}
            <div
              className={styles.rankBadge}
              data-rank-level={rikishi.rankLevel}
              lang="ja"
              aria-hidden="true"
            >
              {jpRankShort(rikishi.rankCode, rikishi.rankNumber) || rikishi.rankName.jp}
            </div>
          </div>

          <div className={styles.details}>
            <h2 id={nameId} className={styles.primaryName} lang={lang}>
              {rikishi.shikona[language] || rikishi.shikona.en}
            </h2>
            <SecondaryName rikishi={rikishi} />

            <dl className={styles.meta}>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>{strings.rank}</dt>
                <dd className={styles.metaValue}>{rikishi.rankName[language]}</dd>
              </div>
              <div className={styles.metaItem}>
                <dt className={styles.metaLabel}>{strings.sideLabel}</dt>
                <dd className={styles.metaValue}>
                  {strings.side[rikishi.side]}
                  {language === 'en' && (
                    <span className={styles.sideKanji} lang="ja">
                      {rikishi.side === 'east' ? '東' : '西'}
                    </span>
                  )}
                </dd>
              </div>
              {rikishi.heya.en && (
                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>{strings.stable}</dt>
                  <dd className={styles.metaValue}>{rikishi.heya[language]}</dd>
                </div>
              )}
              {rikishi.pref.en && (
                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>{strings.from}</dt>
                  <dd className={styles.metaValue}>
                    {profile?.birthplace[language] || rikishi.pref[language]}
                  </dd>
                </div>
              )}
              {rikishi.promotion && (
                <div className={styles.metaItem}>
                  <dt className={styles.metaLabel}>{strings.status}</dt>
                  <dd className={`${styles.metaValue} ${styles.statusBadge}`}>
                    {describePromotion(rikishi, language)}
                  </dd>
                </div>
              )}
            </dl>

            {profile && <ProfileRows profile={profile} />}

            <div className={styles.actions}>
              <a
                className={styles.action}
                href={profileUrl(rikishi.id, language)}
                target="_blank"
                rel="noreferrer noopener"
              >
                {strings.officialProfile}
                <span className={styles.external} aria-hidden="true">
                  ↗
                </span>
              </a>
              <button type="button" className={styles.action} onClick={handleCopyLink}>
                {copied ? strings.linkCopied : strings.copyLink}
              </button>
            </div>
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

/** Vital statistics and career facts from the scraped profile, when available. */
function ProfileRows({ profile }: { profile: RikishiProfile }) {
  const { language } = useLanguage()
  const strings = useStrings()
  const age = profile.birthDate ? ageOn(profile.birthDate) : null
  const rows: Array<{ label: string; value: string; wide?: boolean }> = []

  if (profile.realName[language]) {
    rows.push({ label: strings.realName, value: profile.realName[language] })
  }
  if (profile.birthDate) {
    const born = formatBirthDate(profile.birthDate, language)
    rows.push({ label: strings.born, value: age === null ? born : `${born} ${strings.age(age)}` })
  }
  if (profile.heightCm !== null) {
    rows.push({ label: strings.height, value: formatMeasure(profile.heightCm, 'cm', language) })
  }
  if (profile.weightKg !== null) {
    rows.push({ label: strings.weight, value: formatMeasure(profile.weightKg, 'kg', language) })
  }
  if (profile.debut) {
    rows.push({ label: strings.debut, value: formatYearMonth(profile.debut, language) })
  }
  if (profile.highestRank[language]) {
    rows.push({ label: strings.highestRank, value: profile.highestRank[language] })
  }
  if (profile.kimarite[language]) {
    rows.push({ label: strings.kimarite, value: profile.kimarite[language], wide: true })
  }
  if (rows.length === 0) return null

  return (
    <dl className={`${styles.meta} ${styles.profile}`}>
      {rows.map((row) => (
        <div key={row.label} className={`${styles.metaItem} ${row.wide ? styles.wide : ''}`}>
          <dt className={styles.metaLabel}>{row.label}</dt>
          <dd className={styles.metaValue}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
