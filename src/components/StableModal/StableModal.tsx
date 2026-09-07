import { useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Division, Rikishi } from '../../types/banzuke'
import type { Stable } from '../../data/stables'
import type { StableRoster } from '../../utils/stables'
import { SIDE_KANJI } from '../../data/kanji'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { describeMovement, type Movement } from '../../utils/diff'
import { describeRecord, type RikishiRecord } from '../../data/results'
import { MovementBadge } from '../MovementBadge/MovementBadge'
import { Hoshitori } from '../Hoshitori/Hoshitori'
import { CloseIcon } from '../CloseIcon/CloseIcon'
import styles from './StableModal.module.css'

interface StableModalProps {
  /** The stable to show; null closes the dialog. */
  heyaId: number | null
  /** The stable's sekitori on this banzuke; null when none is left. */
  roster: StableRoster | null
  /** The stables file's entry, when the file has one. */
  stable: Stable | null
  /** True while the stables file is still on its way. */
  stableLoading: boolean
  movements?: Map<number, Movement> | null
  records?: Record<string, RikishiRecord> | null
  /** Tournament champion per division, once decided. */
  champions?: Partial<Record<Division, number>>
  onClose: () => void
  onSelectRikishi: (rikishi: Rikishi) => void
  /** Leave the dialog with the sheet filtered to this stable's members. */
  onShowOnBanzuke: (name: string) => void
}

/**
 * The stable dialog: who the stable is (the master, from the stables file)
 * and who is in it (the sekitori, from the banzuke itself). A sibling of the
 * wrestler dialog, built on the same native <dialog>; opening one from the
 * other pushes a history entry, so Back walks the chain back.
 */
export function StableModal({
  heyaId,
  roster,
  stable,
  stableLoading,
  movements,
  records,
  champions,
  onClose,
  onSelectRikishi,
  onShowOnBanzuke,
}: StableModalProps) {
  const championIds = useMemo(() => new Set(Object.values(champions ?? {})), [champions])
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const openerRef = useRef<Element | null>(null)
  // Set when a member is opened from here: the wrestler dialog takes over, so
  // this dialog's close must not pull focus back out of it.
  const handingOverRef = useRef(false)
  const { language } = useLanguage()
  const strings = useStrings()
  const nameId = useId()
  const lang = langAttr(language)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (heyaId != null) {
      if (!dialog.open) {
        openerRef.current = document.activeElement
        handingOverRef.current = false
        dialog.showModal()
        headingRef.current?.focus()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [heyaId])

  // Fires for Escape, the close button and programmatic close alike.
  const handleClose = () => {
    const opener = openerRef.current
    openerRef.current = null
    onClose()
    if (handingOverRef.current) return
    if (opener instanceof HTMLElement && document.contains(opener)) opener.focus()
  }

  // A click on the dialog element itself (not its content) is a backdrop click.
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) onClose()
  }

  const handleSelect = (rikishi: Rikishi) => {
    handingOverRef.current = true
    onSelectRikishi(rikishi)
  }

  const name = roster?.name ?? stable?.name ?? null
  const primary = name ? name[language] || name.en : ''
  const secondary = name ? (language === 'jp' ? name.en : name.jp) : ''
  const master = stable?.master ?? null
  const masterName = master ? master.name[language] || master.name.en : ''
  const masterRank = master ? master.highestRank[language] || master.highestRank.en : ''
  const masterShikona = master ? master.formerShikona[language] || master.formerShikona.en : ''

  const counts = roster
    ? [
        strings.sekitoriCount(roster.members.length),
        roster.makuuchi > 0 ? strings.inMakuuchi(roster.makuuchi) : '',
        roster.juryo > 0 ? strings.inJuryo(roster.juryo) : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  return createPortal(
    // The click handler only implements "click the backdrop to dismiss", a
    // pointer convenience; keyboard users close the dialog with Escape (native)
    // or the Close button.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby={nameId}
      onClose={handleClose}
      onClick={handleClick}
      lang={lang}
    >
      {heyaId != null && (
        <div className={styles.content}>
          <button
            className={styles.close}
            onClick={onClose}
            type="button"
            aria-label={strings.closeStable}
          >
            <CloseIcon />
          </button>

          <div className={styles.head}>
            <h2 id={nameId} ref={headingRef} tabIndex={-1} className={styles.name} lang={lang}>
              {primary}
            </h2>
            {secondary && secondary !== primary && (
              <p className={styles.secondaryName} lang={language === 'jp' ? 'en' : 'ja'}>
                {secondary}
              </p>
            )}
            {counts && <p className={styles.counts}>{counts}</p>}
            {stableLoading && !master && <div className={styles.masterPending} aria-busy="true" />}
            {master && (
              <p className={styles.master}>
                {masterRank && masterShikona
                  ? strings.stablemaster(masterName, masterRank, masterShikona)
                  : strings.stablemasterUnranked(masterName)}
              </p>
            )}
          </div>

          <div className={styles.body}>
            <h3 className={styles.membersTitle}>{strings.members}</h3>
            {roster ? (
              <ol className={styles.members}>
                {roster.members.map((rikishi) => (
                  <MemberRow
                    key={rikishi.id}
                    rikishi={rikishi}
                    movement={movements?.get(rikishi.id) ?? null}
                    record={records?.[String(rikishi.id)] ?? null}
                    champion={championIds.has(rikishi.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </ol>
            ) : (
              <p className={styles.empty}>{strings.noSekitori}</p>
            )}
          </div>

          <div className={styles.actions}>
            {roster && (
              <button
                type="button"
                className={styles.action}
                onClick={() => onShowOnBanzuke(roster.name[language] || roster.name.en)}
              >
                {strings.showOnBanzuke}
              </button>
            )}
          </div>
        </div>
      )}
    </dialog>,
    document.body
  )
}

interface MemberRowProps {
  rikishi: Rikishi
  movement: Movement | null
  record: RikishiRecord | null
  champion: boolean
  onSelect: (rikishi: Rikishi) => void
}

/**
 * One sekitori: rank, side, ring name at the size its rank earns, home. The
 * movement badge and the hoshitori are decorative, so the accessible name
 * spells them out, as the List's cell does. No data-pair: the arrow keys do
 * not travel here.
 */
function MemberRow({ rikishi, movement, record, champion, onSelect }: MemberRowProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const lang = langAttr(language)
  const name = rikishi.shikona[language] || rikishi.shikona.en
  const rank = rikishi.rankName[language] || rikishi.rankName.en
  const movementText = movement ? describeMovement(movement, language) : ''
  const recordText = record ? describeRecord(record, language) : ''
  const label = `${name}, ${rank}, ${strings.side[rikishi.side]}.${
    movementText ? ` ${movementText}.` : ''
  }${recordText ? ` ${recordText}` : ''}${champion ? ` ${strings.yusho}.` : ''} ${
    strings.viewDetails
  }`
  return (
    <li className={styles.member}>
      <button
        type="button"
        className={styles.memberButton}
        data-id={rikishi.id}
        data-rank-level={rikishi.rankLevel}
        onClick={() => onSelect(rikishi)}
        aria-label={label}
      >
        <span className={styles.memberRank} lang={lang}>
          {rank}
        </span>
        <span className={styles.sideSeal} lang="ja" aria-hidden="true">
          {SIDE_KANJI[rikishi.side]}
        </span>
        <span className={styles.memberText}>
          <span className={styles.memberName} lang={lang}>
            {name}
          </span>
          {rikishi.pref[language] && (
            <span className={styles.memberFrom} lang={lang}>
              {rikishi.pref[language]}
            </span>
          )}
          {record && <Hoshitori record={record} variant="row" champion={champion} />}
        </span>
        {movement && <MovementBadge movement={movement} variant="row" />}
      </button>
    </li>
  )
}
