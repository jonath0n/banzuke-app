import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { Rikishi } from '../types/banzuke'
import { buildGuide, type Guide } from '../utils/guide'

export interface GuideState {
  on: boolean
  guide: Guide | null
  /** Opened from the link (as against a deep link): the legend then takes focus. */
  openedHere: boolean
  onToggle: (on: boolean) => void
  linkRef: RefObject<HTMLAnchorElement | null>
}

/**
 * The guide annotates the paper, so it exists only on the Sheet with
 * something on it; a search that drops rank groups also drops the marks the
 * legend numbers, so filtering hides it too.
 */
export function useGuide(
  guideParam: string | null,
  setGuideParam: (value: string | null) => void,
  possible: boolean,
  rows: Rikishi[],
  hasMovements: boolean,
  hasRecords: boolean
): GuideState {
  const on = guideParam === '1' && possible
  const guide = useMemo(
    () => (on ? buildGuide(rows, { movements: hasMovements, records: hasRecords }) : null),
    [on, rows, hasMovements, hasRecords]
  )
  const [openedHere, setOpenedHere] = useState(false)
  const onToggle = useCallback(
    (next: boolean) => {
      setOpenedHere(next)
      setGuideParam(next ? '1' : null)
    },
    [setGuideParam]
  )

  // Closing the guide from the legend unmounts its own Close link; return
  // focus to the controls-row link that reopens it rather than dropping it.
  const linkRef = useRef<HTMLAnchorElement>(null)
  const wasOn = useRef(on)
  useEffect(() => {
    if (wasOn.current && !on) linkRef.current?.focus()
    wasOn.current = on
  }, [on])

  return { on, guide, openedHere, onToggle, linkRef }
}
