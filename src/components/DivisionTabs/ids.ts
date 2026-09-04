import type { Division } from '../../types/banzuke'

/** DOM id of a division tab; the panel points back at it with aria-labelledby. */
export function tabId(division: Division): string {
  return `division-tab-${division}`
}

/** DOM id of the tab panel that holds the banzuke grid. */
export const PANEL_ID = 'division-panel'
