import type { BanzukePayload, BanzukeSnapshot, Rikishi } from '../types/banzuke'

/**
 * Validates that an object has the basic structure of a Rikishi.
 * Does not validate all fields, just the essential ones for display.
 */
export function isValidRikishi(obj: unknown): obj is Rikishi {
  if (!obj || typeof obj !== 'object') return false
  const rikishi = obj as Record<string, unknown>

  // Must have shikona (wrestler name) and ew (east/west indicator)
  return (
    typeof rikishi.shikona === 'string' &&
    (typeof rikishi.ew === 'number' || typeof rikishi.ew === 'string')
  )
}

/**
 * Validates that an object has the basic structure of a BanzukePayload.
 */
export function isValidBanzukePayload(obj: unknown): obj is BanzukePayload {
  if (!obj || typeof obj !== 'object') return false
  const payload = obj as Record<string, unknown>

  // Must have BanzukeTable array
  if (!Array.isArray(payload.BanzukeTable)) return false

  // Validate that at least some entries are valid rikishi
  // (empty arrays are technically valid but not useful)
  const validEntries = payload.BanzukeTable.filter(isValidRikishi)

  return validEntries.length > 0
}

/**
 * Validates that an object has the structure of a BanzukeSnapshot.
 */
export function isValidBanzukeSnapshot(obj: unknown): obj is BanzukeSnapshot {
  if (!obj || typeof obj !== 'object') return false
  const snapshot = obj as Record<string, unknown>

  // New format: has payloads object
  if (snapshot.payloads && typeof snapshot.payloads === 'object') {
    const payloads = snapshot.payloads as Record<string, unknown>
    // Check if at least one payload is valid
    return Object.values(payloads).some(isValidBanzukePayload)
  }

  // Legacy format: has single payload
  if (snapshot.payload) {
    return isValidBanzukePayload(snapshot.payload)
  }

  return false
}

/**
 * Filters a BanzukeTable to only include valid, non-empty rikishi entries.
 */
export function filterValidRikishi(rows: unknown[]): Rikishi[] {
  return rows.filter((row): row is Rikishi => {
    if (!isValidRikishi(row)) return false
    // Filter out empty placeholder entries
    return row.shikona !== '' && row.shikona !== '—'
  })
}
