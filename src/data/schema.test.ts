import { describe, expect, it } from 'vitest'
import {
  isPlaceholderRow,
  snapshotBashoId,
  snapshotDivisions,
  snapshotsEqualIgnoringFetchedAt,
  validateDivision,
  validatePayload,
  validateSnapshot,
  type Lang,
  type RawDivisionSnapshot,
  type RawPayload,
  type RawRikishi,
} from './schema'
import {
  makeRawDivision,
  makeRawPayload,
  makeRawSnapshot,
  makeRawSnapshotV1,
  placeholderRow,
} from '../test/fixtures'

function expectErrorMatching(result: ReturnType<typeof validateSnapshot>, pattern: RegExp) {
  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(
      result.errors.some((e) => pattern.test(e)),
      result.errors.join('\n')
    ).toBe(true)
  }
}

/** A snapshot whose makuuchi payloads were tweaked by `mutate`. */
function withMakuuchi(mutate: (en: RawPayload, jp: RawPayload) => void) {
  const snapshot = makeRawSnapshot()
  mutate(snapshot.divisions.makuuchi.payloads.en, snapshot.divisions.makuuchi.payloads.jp)
  return snapshot
}

describe('validateSnapshot', () => {
  it('accepts a complete two-division snapshot', () => {
    const result = validateSnapshot(makeRawSnapshot())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(snapshotBashoId(result.snapshot)).toBe(637)
      expect(snapshotDivisions(result.snapshot)).toEqual(['makuuchi', 'juryo'])
      expect(result.warnings).toEqual([])
    }
  })

  it('accepts a makuuchi-only snapshot', () => {
    const result = validateSnapshot(makeRawSnapshot({ divisions: { makuuchi: makeRawDivision() } }))
    expect(result.ok).toBe(true)
    if (result.ok) expect(snapshotDivisions(result.snapshot)).toEqual(['makuuchi'])
  })

  it('upgrades a version 1 file to the current shape', () => {
    const result = validateSnapshot(makeRawSnapshotV1())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.snapshot.version).toBe(2)
      expect(result.snapshot.divisions.juryo).toBeUndefined()
      expect(result.snapshot.divisions.makuuchi.payloads.en.BanzukeTable).toHaveLength(24)
      expect(result.snapshot.divisions.makuuchi.readings?.['1000']).toBe('ほうしょうりゅう')
    }
  })

  it('accepts placeholder rows used for vacancy alignment', () => {
    const snapshot = withMakuuchi((en, jp) => {
      en.BanzukeTable.push(placeholderRow)
      en.list_max += 1
      jp.BanzukeTable.push(placeholderRow)
      jp.list_max += 1
    })
    expect(isPlaceholderRow(placeholderRow)).toBe(true)
    expect(validateSnapshot(snapshot).ok).toBe(true)
  })

  it('rejects non-objects and missing divisions', () => {
    expect(validateSnapshot(null).ok).toBe(false)
    expect(validateSnapshot('nope').ok).toBe(false)
    expectErrorMatching(validateSnapshot({ fetchedAt: 'x' }), /divisions is missing/)
    expectErrorMatching(
      validateSnapshot({ fetchedAt: '2026-09-04T00:00:00Z', divisions: {} }),
      /divisions\.makuuchi is missing/
    )
  })

  it('rejects a division missing one language', () => {
    const snapshot = makeRawSnapshot()
    delete (snapshot.divisions.makuuchi.payloads as Partial<Record<Lang, RawPayload>>).jp
    expectErrorMatching(validateSnapshot(snapshot), /makuuchi: payloads\.jp is missing/)
  })

  it('rejects an invalid fetchedAt', () => {
    expectErrorMatching(validateSnapshot(makeRawSnapshot({ fetchedAt: 'yesterday' })), /fetchedAt/)
  })

  it('rejects an upstream error result', () => {
    const snapshot = withMakuuchi((en) => {
      en.Result = '0'
    })
    expectErrorMatching(validateSnapshot(snapshot), /Result is "0"/)
  })

  it('rejects a list_max that disagrees with the row count', () => {
    const snapshot = withMakuuchi((en) => {
      en.list_max = 99
    })
    expectErrorMatching(validateSnapshot(snapshot), /list_max is 99/)
  })

  it('rejects a payload with too few wrestlers', () => {
    const snapshot = makeRawSnapshot({
      divisions: {
        makuuchi: makeRawDivision('makuuchi', {
          payloads: { en: makeRawPayload('en', 4), jp: makeRawPayload('jp', 4) },
        }),
      },
    })
    expectErrorMatching(validateSnapshot(snapshot), /only 4 wrestlers/)
  })

  it('rejects rows with bad fields', () => {
    const snapshot = withMakuuchi((en) => {
      en.BanzukeTable[0].ew = 3
      en.BanzukeTable[1].rank = 'abc'
    })
    const result = validateSnapshot(snapshot)
    expectErrorMatching(result, /ew must be 1 or 2/)
    expectErrorMatching(result, /rank is not numeric/)
  })

  it('rejects duplicate wrestlers within a language', () => {
    const snapshot = withMakuuchi((en) => {
      en.BanzukeTable[1].rikishi_id = en.BanzukeTable[0].rikishi_id
    })
    expectErrorMatching(validateSnapshot(snapshot), /duplicate rikishi_id/)
  })

  it('rejects languages describing different tournaments', () => {
    const snapshot = withMakuuchi((_, jp) => {
      jp.basho_id = 636
    })
    expectErrorMatching(validateSnapshot(snapshot), /basho_id differs/)
  })

  it('rejects languages with different wrestler sets', () => {
    const snapshot = withMakuuchi((_, jp) => {
      jp.BanzukeTable[3].rikishi_id = 999999
    })
    const result = validateSnapshot(snapshot)
    expectErrorMatching(result, /present in en but not jp: 1003/)
    expectErrorMatching(result, /present in jp but not en: 999999/)
  })

  it('rejects malformed tournament dates', () => {
    const snapshot = withMakuuchi((en) => {
      en.BashoInfo.start_date = '13/09/2026'
    })
    expectErrorMatching(validateSnapshot(snapshot), /start_date is not YYYY-MM-DD/)
  })

  it('rejects divisions from different tournaments', () => {
    const snapshot = makeRawSnapshot()
    const juryo = snapshot.divisions.juryo as RawDivisionSnapshot
    juryo.payloads.en.basho_id = 636
    juryo.payloads.jp.basho_id = 636
    expectErrorMatching(validateSnapshot(snapshot), /juryo: basho_id 636 differs from makuuchi/)
  })

  it('rejects a division stored under the wrong key', () => {
    const snapshot = makeRawSnapshot({
      divisions: { makuuchi: makeRawDivision('makuuchi'), juryo: makeRawDivision('makuuchi') },
    })
    expectErrorMatching(validateSnapshot(snapshot), /juryo: kakuzuke_id is 1, expected 2/)
  })

  it('rejects a wrestler listed in two divisions', () => {
    const snapshot = makeRawSnapshot()
    const juryo = snapshot.divisions.juryo as RawDivisionSnapshot
    juryo.payloads.en.BanzukeTable[0].rikishi_id = 1000
    juryo.payloads.jp.BanzukeTable[0].rikishi_id = 1000
    expectErrorMatching(validateSnapshot(snapshot), /1000 appears in both makuuchi and juryo/)
  })

  it('warns instead of failing when sources or unknown divisions are present', () => {
    const snapshot = makeRawSnapshot()
    delete (snapshot.divisions.makuuchi as Partial<RawDivisionSnapshot>).sources
    ;(snapshot.divisions as Record<string, unknown>).sandanme = {}
    const result = validateSnapshot(snapshot)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.warnings).toContain('divisions.makuuchi: sources is missing')
      expect(result.warnings.some((w) => w.includes('sandanme'))).toBe(true)
      expect('sandanme' in result.snapshot.divisions).toBe(false)
    }
  })
})

describe('validateDivision', () => {
  it('reports a missing payloads object', () => {
    expect(validateDivision({}, 'x').errors).toEqual(['x: payloads is missing'])
    expect(validateDivision(null, 'x').errors).toEqual(['x: not an object'])
  })
})

describe('validatePayload', () => {
  it('returns an empty list for a valid payload', () => {
    expect(validatePayload(makeRawPayload('en'))).toEqual([])
  })

  it('reports a missing BanzukeTable', () => {
    expect(validatePayload({ Result: '1' }, 'x')).toContain('x: BanzukeTable is not an array')
  })
})

describe('snapshotsEqualIgnoringFetchedAt', () => {
  it('ignores fetchedAt, sources and key order', () => {
    const a = makeRawSnapshot()
    const b = makeRawSnapshot({ fetchedAt: '2030-01-01T00:00:00.000Z' })
    b.divisions.makuuchi.sources = { en: 'other', jp: 'other' }
    // Reorder keys of one row to prove comparison is order-insensitive.
    const table = b.divisions.makuuchi.payloads.en.BanzukeTable
    table[0] = Object.fromEntries(Object.entries(table[0]).reverse()) as unknown as RawRikishi
    expect(snapshotsEqualIgnoringFetchedAt(a, b)).toBe(true)
  })

  it('detects a changed wrestler in any division', () => {
    const a = makeRawSnapshot()
    const b = makeRawSnapshot()
    ;(b.divisions.juryo as RawDivisionSnapshot).payloads.en.BanzukeTable[0].shikona = 'Someone'
    expect(snapshotsEqualIgnoringFetchedAt(a, b)).toBe(false)
  })

  it('treats a missing division as a change', () => {
    const a = makeRawSnapshot()
    const b = makeRawSnapshot({ divisions: { makuuchi: makeRawDivision() } })
    expect(snapshotsEqualIgnoringFetchedAt(a, b)).toBe(false)
  })
})
