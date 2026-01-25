import { useEffect, useRef, useState } from 'react'
import type { Rikishi, RankLevel } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { buildPhotoUrl } from '../../utils/formatting'
import styles from './SideCell.module.css'

/** Size of wrestler avatar images in pixels */
const AVATAR_SIZE = 44

interface SideCellProps {
  rikishi: Rikishi | null
  side: 'east' | 'west'
  rankLevel: RankLevel
  /** Row index for staggered animations */
  rowIndex?: number
}

/** Gets the display name for a rikishi based on current language */
function getDisplayName(rikishi: Rikishi | null, language: 'en' | 'jp'): string {
  if (!rikishi) return '—'
  if (language === 'jp' && rikishi.shikona_jp) {
    return rikishi.shikona_jp
  }
  if (language === 'en' && rikishi.shikona_en) {
    return rikishi.shikona_en
  }
  return rikishi.shikona || '—'
}

function SideCellInner({ rikishi, side, rankLevel, rowIndex = 0 }: SideCellProps) {
  const { language } = useLanguage()
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const isEast = side === 'east'
  const sideLabel = isEast ? 'E' : 'W'
  const nameRef = useRef<HTMLSpanElement | null>(null)
  const sideLabelRef = useRef<HTMLSpanElement | null>(null)
  const hasLoggedRef = useRef(false)

  const handleImageError = () => {
    setImageError(true)
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
  }

  const badge = rikishi?.rank_new ? (
    <span className={styles.pill}>{rikishi.rank_new}</span>
  ) : null

  const hasPhoto = rikishi?.photo && !imageError
  const avatar = hasPhoto ? (
    <span className={`${styles['avatar-wrapper']} ${imageLoaded ? styles.loaded : ''}`}>
      <img
        src={buildPhotoUrl(rikishi.photo)}
        alt={`Portrait of ${rikishi.shikona || 'wrestler'} from ${rikishi.heya_name || 'unknown'} stable`}
        loading="lazy"
        width={AVATAR_SIZE}
        height={AVATAR_SIZE}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={imageLoaded ? styles.visible : ''}
      />
    </span>
  ) : null

  const name = (
    <span className={styles.name} ref={nameRef}>
      {rikishi?.shikona || '—'}
    </span>
  )

  const sideLabelElement = (
    <span className={styles['side-label']} ref={sideLabelRef}>
      {sideLabel}
    </span>
  )

  const ariaLabel = rikishi
    ? `${sideLabel} side ${rikishi.shikona || 'wrestler'}${
        rikishi.heya_name ? ` from ${rikishi.heya_name} stable` : ''
      }`
    : `${sideLabel} side vacant`

  // East: name then avatar; West: avatar then name
  const info = (
    <span className={styles.info}>
      {isEast ? (
        <>
          {name}
          {avatar}
        </>
      ) : (
        <>
          {avatar}
          {name}
        </>
      )}
    </span>
  )

  useEffect(() => {
    if (typeof window === 'undefined' || hasLoggedRef.current) return

    const nameFont = nameRef.current
      ? window.getComputedStyle(nameRef.current).fontFamily
      : null
    const sideFont = sideLabelRef.current
      ? window.getComputedStyle(sideLabelRef.current).fontFamily
      : null

    if (!nameFont && !sideFont) return
    hasLoggedRef.current = true

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'SideCell.tsx:useEffect:nameFont',message:'Computed font-family for rikishi name',data:{side,name:rikishi?.shikona || null,fontFamily:nameFont},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/8f13d096-f5b3-4a25-b1f7-9fa94764e743',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'SideCell.tsx:useEffect:sideLabelFont',message:'Computed font-family for side label',data:{side,label:sideLabel,fontFamily:sideFont},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [rikishi, side, sideLabel])

  return (
    <div
      className={styles.cell}
      data-side={side}
      data-rank-level={rankLevel}
      aria-label={ariaLabel}
      role="group"
      tabIndex={rikishi ? 0 : -1}
    >
      {isEast ? (
        <>
          {badge}
          {sideLabelElement}
          {info}
        </>
      ) : (
        <>
          {info}
          {sideLabelElement}
          {badge}
        </>
      )}
    </div>
  )
}

// Memoize to prevent re-renders from parent (RankRow) changes.
// SideCell uses language context internally, so it will still
// re-render when language changes to update the displayed name.
export const SideCell = memo(SideCellInner)
