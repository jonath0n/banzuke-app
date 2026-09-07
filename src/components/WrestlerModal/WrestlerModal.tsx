import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Rikishi } from '../../types/banzuke'
import { careerSteps, type RikishiProfile } from '../../data/profiles'
import { buildPhotoUrl, profileUrl, PHOTO_DIMENSIONS } from '../../utils/formatting'
import { jpRankShort } from '../../data/kanji'
import { describePromotion } from '../../utils/promotion'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { useProfileState } from '../../hooks/useProfiles'
import { ageOn, formatBirthDate, formatMeasure, formatYearMonth } from '../../utils/profile'
import { boutMark, scoreLabel, type Bout, type RikishiRecord } from '../../data/results'
import { kimariteLabel } from '../../data/kimarite'
import { explainShikona } from '../../data/shikona-glossary'
import styles from './WrestlerModal.module.css'

interface WrestlerModalProps {
  rikishi: Rikishi | null
  onClose: () => void
  /** This tournament's record, when the wrestler has fought. */
  record?: RikishiRecord | null
  /** The wrestlers immediately before and after this one on the banzuke. */
  neighbours?: { previous: Rikishi | null; next: Rikishi | null }
  /** Step to a neighbouring wrestler, replacing the current one. */
  onStep?: (rikishi: Rikishi) => void
}

/**
 * Wrestler detail dialog built on the native <dialog> element: `showModal()`
 * puts it in the top layer, traps focus, makes the rest of the page inert and
 * handles Escape. The element stays mounted so open/close transitions work;
 * its content renders only while a wrestler is selected.
 */
export function WrestlerModal({
  rikishi,
  onClose,
  record,
  neighbours,
  onStep,
}: WrestlerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<Element | null>(null)
  const currentIdRef = useRef<number | null>(null)
  const openedIdRef = useRef<number | null>(null)
  const { language } = useLanguage()
  const strings = useStrings()
  const nameId = useId()
  const [copied, setCopied] = useState(false)
  const { loading: profileLoading, profile } = useProfileState(rikishi?.id ?? null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (rikishi) {
      if (!dialog.open) {
        openerRef.current = document.activeElement
        openedIdRef.current = rikishi.id
        dialog.showModal()
      } else if (currentIdRef.current !== rikishi.id) {
        // Stepped to a neighbour while already open: move focus to the new name.
        headingRef.current?.focus()
      }
      currentIdRef.current = rikishi.id
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
    const id = currentIdRef.current
    const stepped = currentIdRef.current !== openedIdRef.current
    openedIdRef.current = null
    const current =
      id === null ? null : document.querySelector<HTMLElement>(`button[data-id="${id}"]`)
    const target = stepped ? (current ?? opener) : (opener ?? current)
    if (target instanceof HTMLElement && document.contains(target)) {
      target.focus()
    }
  }

  // A click on the dialog element itself (not its content) is a backdrop click.
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  // Arrow keys step to the neighbouring wrestler, the way the sheet reads: the
  // banzuke runs right to left, so ← is the next (lower) rank and → the previous.
  // Tab keeps roving inside the dialog.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (!neighbours || !onStep) return
    const step =
      e.key === 'ArrowLeft' ? neighbours.next : e.key === 'ArrowRight' ? neighbours.previous : null
    if (step) {
      e.preventDefault()
      onStep(step)
    }
  }

  const nameOf = (r: Rikishi) => r.shikona[language] || r.shikona.en

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
    // or the Close button.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      className={styles.modal}
      data-rank-level={rikishi?.rankLevel}
      aria-labelledby={nameId}
      onClose={handleClose}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
            {neighbours && onStep && (
              <div className={styles.stepper}>
                {/* Right to left, as the sheet reads: next (lower rank) on the left */}
                {neighbours.next ? (
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onStep(neighbours.next!)}
                    aria-label={strings.nextWrestler(nameOf(neighbours.next))}
                  >
                    ‹
                  </button>
                ) : (
                  <span className={styles.stepGap} aria-hidden="true" />
                )}
                {neighbours.previous ? (
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onStep(neighbours.previous!)}
                    aria-label={strings.previousWrestler(nameOf(neighbours.previous))}
                  >
                    ›
                  </button>
                ) : (
                  <span className={styles.stepGap} aria-hidden="true" />
                )}
              </div>
            )}
            <h2
              id={nameId}
              ref={headingRef}
              tabIndex={-1}
              className={styles.primaryName}
              lang={lang}
            >
              {rikishi.shikona[language] || rikishi.shikona.en}
            </h2>
            <SecondaryName rikishi={rikishi} />
            <NameSection rikishi={rikishi} />

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

            {profileLoading && <div className={styles.profilePending} aria-busy="true" />}
            {profile && <ProfileRows profile={profile} />}
            {record && <RecordSection record={record} />}

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

/**
 * The ring name, character by character, with what each means. English only:
 * a Japanese reader does not need 海 explained. Shown when at least one part
 * of the name is in the glossary.
 */
function NameSection({ rikishi }: { rikishi: Rikishi }) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  if (language !== 'en' || !rikishi.shikona.jp || rikishi.shikona.jp === rikishi.shikona.en) {
    return null
  }
  const segments = explainShikona(rikishi.shikona.jp)
  if (!segments.some((s) => s.gloss)) return null
  // A stable's mark beats a note on the joining kana, which every の-name would repeat.
  const note =
    segments.find((s) => !s.gloss?.joining && s.gloss?.note)?.gloss?.note ??
    segments.find((s) => s.gloss?.note)?.gloss?.note
  return (
    <section className={styles.nameSection} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.careerTitle}>
        {strings.nameMeaning}
      </h3>
      {/* list-style: none loses list semantics in Safari; role restores it. */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul className={styles.segments} role="list">
        {segments.map((s, i) => (
          <li key={`${s.text}-${i}`} className={styles.segment} data-segment={s.text}>
            <span className={styles.segmentText} lang="ja">
              {s.text}
            </span>
            {s.gloss && <span className={styles.segmentGloss}>{s.gloss.en}</span>}
          </li>
        ))}
      </ul>
      {note && <p className={styles.segmentNote}>{note}</p>}
    </section>
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
  if (profile.highestRank[language]) {
    rows.push({ label: strings.highestRank, value: profile.highestRank[language] })
  }
  if (profile.kimarite[language]) {
    rows.push({ label: strings.kimarite, value: profile.kimarite[language], wide: true })
  }
  return (
    <>
      {rows.length > 0 && (
        <dl className={`${styles.meta} ${styles.profile}`}>
          {rows.map((row) => (
            <div key={row.label} className={`${styles.metaItem} ${row.wide ? styles.wide : ''}`}>
              <dt className={styles.metaLabel}>{row.label}</dt>
              <dd className={styles.metaValue}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <CareerLadder profile={profile} />
    </>
  )
}

/** Debut and each promotion as steps along a rule, oldest first. */
function CareerLadder({ profile }: { profile: RikishiProfile }) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const steps = careerSteps(profile)
  if (steps.length === 0) return null

  return (
    <section className={styles.career} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.careerTitle}>
        {strings.career}
      </h3>
      <ol className={styles.ladder}>
        {steps.map(([step, date]) => (
          <li key={step} className={styles.step}>
            <span className={styles.stepLabel}>{strings.milestone[step]}</span>
            <time dateTime={date} className={styles.stepDate}>
              {formatYearMonth(date, language, 'short')}
            </time>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The tournament so far: score, then every bout as a line. */
function RecordSection({ record }: { record: RikishiRecord }) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const outcomeText = (bout: Bout) =>
    bout.outcome === 'absent'
      ? strings.absentDay
      : bout.outcome === 'fusen-win'
        ? strings.fusenWin
        : bout.outcome === 'fusen-loss'
          ? strings.fusenLoss
          : kimariteLabel(bout.kimarite, language)
  return (
    <section className={styles.career} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.careerTitle}>
        {strings.record}
      </h3>
      <p className={styles.score}>{scoreLabel(record, language)}</p>
      <ol className={styles.bouts}>
        {record.bouts.map((bout) => (
          <li
            key={bout.day}
            className={styles.bout}
            data-day={bout.day}
            data-outcome={bout.outcome}
          >
            <span className={styles.boutDay}>{bout.day}</span>
            <span className={styles.boutMark} lang="ja" aria-hidden="true">
              {boutMark(bout.outcome)}
            </span>
            <span className={styles.boutOpponent}>
              {bout.opponent
                ? strings.boutAgainst(bout.opponent.shikona[language] || bout.opponent.shikona.en)
                : ''}
            </span>
            <span className={styles.boutHow}>{outcomeText(bout)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
