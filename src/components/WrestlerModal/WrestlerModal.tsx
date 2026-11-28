import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { focusFirst } from '../../utils/focus'
import type { RankLevel, Rikishi } from '../../types/banzuke'
import { careerSteps, type CareerStep, type RikishiProfile } from '../../data/profiles'
import { buildPhotoUrl, profileUrl, PHOTO_DIMENSIONS } from '../../utils/formatting'
import { jpRankShort, SIDE_KANJI } from '../../data/kanji'
import { describePromotion } from '../../utils/promotion'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { useProfileState } from '../../hooks/useProfiles'
import { useLingeringProps } from '../../hooks/useLingeringProps'
import { ageOn, formatBirthDate, formatMeasure, formatYearMonth } from '../../utils/profile'
import {
  boutMark,
  isKinboshi,
  kachikoshiOutlook,
  kachikoshiState,
  MAX_DAYS,
  nextBout,
  scoreLabel,
  type Bout,
  type ResultsFile,
  type RikishiRecord,
} from '../../data/results'
import { kimariteLabel } from '../../data/kimarite'
import { explainShikona } from '../../data/shikona-glossary'
import { CloseIcon } from '../CloseIcon/CloseIcon'
import { ChevronIcon } from '../ChevronIcon/ChevronIcon'
import { ExternalIcon } from '../ExternalIcon/ExternalIcon'
import styles from './WrestlerModal.module.css'

interface WrestlerModalProps {
  rikishi: Rikishi | null
  onClose: () => void
  /** This tournament's record, when the wrestler has fought. */
  record?: RikishiRecord | null
  /** The whole results file, for the next bout and the day count. */
  results?: ResultsFile | null
  /** Every wrestler on the banzuke by id: the opponent's rank says whether a win is a kinboshi. */
  rankById?: Map<number, Rikishi>
  /** The wrestlers immediately before and after this one on the banzuke. */
  neighbours?: { previous: Rikishi | null; next: Rikishi | null }
  /** Step to a neighbouring wrestler, replacing the current one. */
  onStep?: (rikishi: Rikishi) => void
  /** Open the wrestler's stable; without it the Stable row is plain text. */
  onSelectStable?: (heyaId: number) => void
  /** An Ozeki whose make-koshi would cost the rank. */
  kadoban?: boolean
  /** This tournament's champion in the wrestler's division, once decided. */
  champion?: boolean
}

/**
 * Wrestler detail dialog built on the native <dialog> element: `showModal()`
 * puts it in the top layer, traps focus, makes the rest of the page inert and
 * handles Escape. The element stays mounted so open/close transitions work;
 * its content renders only while a wrestler is selected.
 */
export function WrestlerModal(props: WrestlerModalProps) {
  // The file renders from `shown`, which holds the last wrestler through the
  // close fade; opening and closing follow the live selection.
  const live = props.rikishi
  const [shown, release] = useLingeringProps(props, live != null)
  const {
    rikishi,
    onClose,
    record,
    results,
    rankById,
    neighbours,
    onStep,
    onSelectStable,
    kadoban = false,
    champion = false,
  } = shown
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<Element | null>(null)
  const currentIdRef = useRef<number | null>(null)
  const openedIdRef = useRef<number | null>(null)
  // Set when the stable is opened from here: the stable dialog takes over, so
  // this dialog's close must not pull focus back out to the sheet.
  const handingOverRef = useRef(false)
  const { language } = useLanguage()
  const strings = useStrings()
  const nameId = useId()
  const [copied, setCopied] = useState(false)
  const { loading: profileLoading, profile } = useProfileState(rikishi?.id ?? null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (live) {
      if (!dialog.open) {
        openerRef.current = document.activeElement
        openedIdRef.current = live.id
        handingOverRef.current = false
        // A hop from the sibling dialog: its sheet has just gone, so the scrim
        // is already down and must not fade in again (data-hop, in the CSS).
        dialog.toggleAttribute(
          'data-hop',
          document.querySelector('dialog[open], dialog[data-handoff]') !== null
        )
        dialog.removeAttribute('data-handoff')
        dialog.showModal()
        // The name, not the first button: a reader hears who opened, then walks down.
        headingRef.current?.focus()
      } else if (currentIdRef.current !== live.id) {
        // Stepped to a neighbour while already open: move focus to the new name.
        headingRef.current?.focus()
      }
      currentIdRef.current = live.id
    } else {
      // Escape has already closed it natively; the close button and Back have not.
      // Handing over to the sibling dialog: go at once (data-handoff), so the
      // incoming sheet never rises over this one still fading.
      dialog.toggleAttribute('data-handoff', handingOverRef.current)
      if (dialog.open) dialog.close()
      release(dialog)
    }
    setCopied(false)
  }, [live, release])

  // Fires for Escape, the close button and programmatic close alike.
  const handleClose = () => {
    const opener = openerRef.current
    openerRef.current = null
    onClose()
    const id = currentIdRef.current
    const stepped = currentIdRef.current !== openedIdRef.current
    openedIdRef.current = null
    if (handingOverRef.current) return
    const current =
      id === null ? null : document.querySelector<HTMLElement>(`button[data-id="${id}"]`)
    // The opener may be gone: a deep link has none (<body>), and one captured on a hop
    // from the stable dialog sits inside that dialog, closed by now. focusFirst skips
    // those for the wrestler's own List button, then the sheet itself.
    const main = document.getElementById('main')
    const opened = opener === main ? null : opener
    focusFirst(stepped ? [current, opened, main] : [opened, current, main])
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

  // "Copy link" copies. The share sheet is offered only on a touch device, where
  // it is the native way to pass a link on; on a desktop it is a surprise.
  const handleCopyLink = async () => {
    // The share page under r/<id>/ carries this wrestler's own preview card
    // and forwards to the app, keeping the language.
    const url = rikishi
      ? `${new URL(import.meta.env.BASE_URL, window.location.origin).href}r/${rikishi.id}/${
          language === 'jp' ? '?lang=jp' : ''
        }`
      : window.location.href
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
    try {
      if (coarse && navigator.share) {
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
          {/* Pinned while the file scrolls: the way along the banzuke and the way out */}
          <div className={styles.toolbar}>
            {neighbours && onStep ? (
              <div className={styles.stepper}>
                {/* Right to left, as the sheet reads: next (lower rank) on the left */}
                {neighbours.next ? (
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onStep(neighbours.next!)}
                    aria-label={strings.nextWrestler(nameOf(neighbours.next))}
                  >
                    <ChevronIcon direction="previous" size={18} />
                  </button>
                ) : (
                  <span className={styles.stepGap} aria-hidden="true">
                    <ChevronIcon direction="previous" size={18} />
                  </span>
                )}
                {neighbours.previous ? (
                  <button
                    type="button"
                    className={styles.stepButton}
                    onClick={() => onStep(neighbours.previous!)}
                    aria-label={strings.previousWrestler(nameOf(neighbours.previous))}
                  >
                    <ChevronIcon direction="next" size={18} />
                  </button>
                ) : (
                  <span className={styles.stepGap} aria-hidden="true">
                    <ChevronIcon direction="next" size={18} />
                  </span>
                )}
              </div>
            ) : (
              <span />
            )}
            <button
              className={styles.close}
              onClick={onClose}
              type="button"
              aria-label={strings.closeDetails}
            >
              <CloseIcon />
            </button>
          </div>

          <div className={styles.head}>
            <div className={styles.portrait}>
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
                // No portrait (common below Makushita): the ring name set
                // down the plate in mincho, as a paper fills a missing photo.
                <span className={styles.portraitName} lang="ja" aria-hidden="true">
                  {rikishi.shikona.jp || rikishi.shikona.en}
                </span>
              )}
            </div>

            <div className={styles.identity}>
              {/* The rank kanji reads the rank as the rail does; the words beside
                  it carry it in the UI language for assistive tech. */}
              <p className={styles.rankLine}>
                <span
                  className={styles.rankKanji}
                  data-rank-level={rikishi.rankLevel}
                  lang="ja"
                  aria-hidden="true"
                >
                  {jpRankShort(rikishi.rankCode, rikishi.rankNumber) || rikishi.rankName.jp}
                </span>
                <span className={styles.sideSeal} lang="ja" aria-hidden="true">
                  {SIDE_KANJI[rikishi.side]}
                </span>
                <span className={language === 'jp' ? 'visually-hidden' : styles.rankLabel}>
                  <span>{rikishi.rankName[language]}</span>{' '}
                  <span className={styles.rankSide}>{strings.side[rikishi.side]}</span>
                </span>
              </p>
              <h2
                id={nameId}
                ref={headingRef}
                tabIndex={-1}
                className={styles.primaryName}
                lang={lang}
              >
                <span className={champion ? styles.gold : undefined}>
                  {rikishi.shikona[language] || rikishi.shikona.en}
                </span>
              </h2>
              <SecondaryName rikishi={rikishi} />
              <p className={styles.affiliation}>
                {rikishi.heya.en &&
                  (onSelectStable && rikishi.heya.id > 0 ? (
                    <button
                      type="button"
                      className={styles.stableButton}
                      aria-label={strings.openStable(rikishi.heya[language])}
                      onClick={() => {
                        handingOverRef.current = true
                        onSelectStable(rikishi.heya.id)
                      }}
                    >
                      {rikishi.heya[language]}
                      <ChevronIcon direction="next" size={14} />
                    </button>
                  ) : (
                    <span className={styles.stableName}>{rikishi.heya[language]}</span>
                  ))}
                {rikishi.heya.en && rikishi.pref.en && (
                  <span className={styles.dot} aria-hidden="true">
                    ·
                  </span>
                )}
                {rikishi.pref.en && (
                  <span className={styles.from}>
                    <span className="visually-hidden">{strings.from} </span>
                    {profile?.birthplace[language] || rikishi.pref[language]}
                  </span>
                )}
              </p>
              {rikishi.promotion ? (
                <p className={styles.status}>
                  <span className={styles.stamp}>{describePromotion(rikishi, language)}</span>
                </p>
              ) : (
                kadoban && (
                  <p className={styles.status}>
                    <span className={`${styles.stamp} ${styles.stampOutline}`}>
                      {strings.kadoban}
                    </span>
                    <span className={styles.statusNote}>{strings.kadobanNote}</span>
                  </p>
                )
              )}
            </div>
          </div>

          {record && (
            <RecordSection
              rikishi={rikishi}
              record={record}
              results={results ?? null}
              rankById={rankById}
              champion={champion}
            />
          )}
          {profileLoading && <div className={styles.profilePending} aria-busy="true" />}
          {profile && <ProfileRows profile={profile} rankLevel={rikishi.rankLevel} />}
          <NameSection rikishi={rikishi} />

          <div className={styles.actions}>
            <a
              className={styles.action}
              href={profileUrl(rikishi.id, language)}
              target="_blank"
              rel="noreferrer noopener"
            >
              {strings.officialProfile}
              <ExternalIcon />
            </a>
            <button type="button" className={styles.action} onClick={handleCopyLink}>
              {copied ? strings.linkCopied : strings.copyLink}
            </button>
            <span role="status" className="visually-hidden">
              {copied ? strings.linkCopied : ''}
            </span>
          </div>
        </div>
      )}
    </dialog>,
    document.body
  )
}

/** An ink section bar heading one part of the file, as the sheet heads a tier. */
function SectionBar({
  id,
  title,
  kanji,
  children,
}: {
  id: string
  title: string
  /** The bar's head in kanji, set beside an English label as the sheet's tier bars are */
  kanji?: string
  children?: ReactNode
}) {
  const { language } = useLanguage()
  return (
    <div className={styles.bar}>
      <h3 id={id} className={styles.barTitle}>
        {kanji && language === 'en' && (
          <span className={styles.barKanji} lang="ja" aria-hidden="true">
            {kanji}
          </span>
        )}
        {title}
      </h3>
      {children}
    </div>
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
    <section className={styles.section} aria-labelledby={headingId}>
      <SectionBar id={headingId} title={strings.nameMeaning} kanji="四股名" />
      {/* list-style: none loses list semantics in Safari; role restores it. */}
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
function ProfileRows({ profile, rankLevel }: { profile: RikishiProfile; rankLevel: RankLevel }) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const age = profile.birthDate ? ageOn(profile.birthDate) : null
  const rows: Array<{ label: string; value: string }> = []

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
    rows.push({ label: strings.kimarite, value: profile.kimarite[language] })
  }
  return (
    <>
      {rows.length > 0 && (
        <section className={styles.section} aria-labelledby={headingId}>
          <SectionBar id={headingId} title={strings.profileHeading} kanji="名鑑" />
          {/* An agate table: label and value on one ruled line each */}
          <dl className={styles.facts}>
            {rows.map((row) => (
              <div key={row.label} className={styles.fact}>
                <dt className={styles.factLabel}>{row.label}</dt>
                <dd className={styles.factValue}>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <CareerLadder profile={profile} rankLevel={rankLevel} />
    </>
  )
}

/** Debut and each promotion as steps along a rule, oldest first. */
/** The career step a wrestler's present rank sits on; null below Juryo. */
const STEP_OF_LEVEL: Partial<Record<RankLevel, CareerStep>> = {
  yokozuna: 'yokozuna',
  ozeki: 'ozeki',
  sekiwake: 'sanyaku',
  komusubi: 'sanyaku',
  maegashira: 'makuuchi',
  juryo: 'juryo',
}

function CareerLadder({ profile, rankLevel }: { profile: RikishiProfile; rankLevel: RankLevel }) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const steps = careerSteps(profile)
  if (steps.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <SectionBar id={headingId} title={strings.career} kanji="昇進" />
      <ol className={styles.ladder} role="list">
        {steps.map(([step, date], i) => (
          <li
            key={step}
            className={styles.step}
            // Stamped red only when it is the rank he holds now: a demoted
            // former Ozeki's top step is history, not a fact about today.
            data-current={
              i === steps.length - 1 && STEP_OF_LEVEL[rankLevel] === step ? '' : undefined
            }
          >
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

/** The tournament so far: score, the star chart, what is still at stake, then every bout as a line. */
function RecordSection({
  rikishi,
  record,
  results,
  rankById,
  champion,
}: {
  rikishi: Rikishi
  record: RikishiRecord
  results: ResultsFile | null
  rankById?: Map<number, Rikishi>
  champion: boolean
}) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const nameOf = (f: { shikona: Rikishi['shikona'] }) => f.shikona[language] || f.shikona.en
  const outlook = results ? kachikoshiOutlook(record, results.day) : null
  const next = results ? nextBout(results, rikishi.id) : null
  const state = kachikoshiState(record)
  const stateLabel =
    state === 'kachikoshi' ? strings.kachikoshi : state === 'makekoshi' ? strings.makekoshi : ''
  const byDay = new Map(record.bouts.map((bout) => [bout.day, bout]))
  const kinboshi = (bout: Bout) => isKinboshi(bout, rikishi, (id) => rankById?.get(id)?.rankCode)
  const outcomeText = (bout: Bout) =>
    bout.outcome === 'absent'
      ? strings.absentDay
      : bout.outcome === 'fusen-win'
        ? strings.fusenWin
        : bout.outcome === 'fusen-loss'
          ? strings.fusenLoss
          : bout.outcome === 'draw'
            ? strings.boutDraw
            : bout.outcome === 'injury-draw'
              ? strings.boutInjuryDraw
              : kimariteLabel(bout.kimarite, language)
  // ○ and ● are hidden from readers; a fought bout says Win or Loss in words,
  // and a forfeit or an absence already says so in its visible text.
  const spokenOutcome = (bout: Bout) =>
    bout.outcome === 'win' ? strings.boutWin : bout.outcome === 'loss' ? strings.boutLoss : ''
  const needs = outlook?.state === 'pending' && outlook.remaining > 0
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <SectionBar id={headingId} title={strings.record} kanji="星取">
        <p className={styles.barScore} data-state={state}>
          <span className={styles.score}>{scoreLabel(record, language)}</span>
          {champion ? (
            <span className={styles.yusho}>{strings.yusho}</span>
          ) : (
            stateLabel && <span className={styles.barState}>{stateLabel}</span>
          )}
        </p>
      </SectionBar>

      {/* The 星取表: fifteen fixed cells in three groups of five, day under
          mark. Decorative; the bout lines below say each day in words. */}
      <div className={styles.plate} aria-hidden="true">
        {Array.from({ length: MAX_DAYS / 5 }, (_, group) => (
          <span key={group} className={styles.plateGroup}>
            {Array.from({ length: 5 }, (_, i) => {
              const day = group * 5 + i + 1
              const bout = byDay.get(day)
              return (
                <span key={day} className={styles.plateCell} data-outcome={bout?.outcome}>
                  <span className={styles.plateMark} lang="ja">
                    {bout ? boutMark(bout.outcome) : '·'}
                  </span>
                  <span className={styles.plateDay}>{day}</span>
                </span>
              )
            })}
          </span>
        ))}
      </div>

      {(needs || next) && (
        <p className={styles.stakes}>
          {needs && (
            <span className={styles.needs}>
              <span className={styles.highlight}>
                {strings.outlookNeeds(outlook.needed, outlook.remaining)}
              </span>
            </span>
          )}
          {next && <span>{strings.nextBout(nameOf(next.opponent), next.day)}</span>}
        </p>
      )}
      <ol className={styles.bouts} role="list">
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
            {spokenOutcome(bout) && <span className="visually-hidden">{spokenOutcome(bout)} </span>}
            <span className={styles.boutOpponent}>
              {bout.opponent
                ? strings.boutAgainst(bout.opponent.shikona[language] || bout.opponent.shikona.en)
                : ''}
            </span>
            <span className={styles.boutHow}>
              {kinboshi(bout) && (
                <>
                  <span className={styles.kinboshi} lang="ja" aria-hidden="true">
                    ☆
                  </span>
                  <span className="visually-hidden">{strings.kinboshi} </span>
                </>
              )}
              {outcomeText(bout)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
