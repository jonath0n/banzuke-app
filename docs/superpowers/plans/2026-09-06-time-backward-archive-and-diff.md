# Time Backward — Archive (A2), Diff Mode (A1), Departures (A5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> On approval this file is copied to `docs/superpowers/plans/2026-09-06-time-backward-archive-and-diff.md` and committed on the working branch (plan mode only permits writing here).

**Goal:** Keep every banzuke the site has ever shown, then let the current sheet say what changed since the last one — each name carries the rank it came from, and the names that left each division are listed beneath the paper.

**Architecture:** Part A adds a per-tournament archive (`public/banzuke/{bashoId}.json` + `index.json`) in a compact, source-agnostic, validated format; the deploy job writes the current banzuke into it whenever the JSA data changes, and a one-off backfill fills 2025-11 → 2026-07 from sumo-api.com (whose rikishi records carry the JSA id as `nskId`). Part B computes a diff between the current normalized rows and the previous archive entirely in `src/utils/diff.ts`, and renders it as an overlay toggled by `?diff=1`: a movement band under each name on the Sheet, a badge on each List row, and a per-division "departures" section under the paper. No new colours, no new motion, no runtime dependencies.

**Tech Stack:** React 19 + TypeScript, Vite 7, CSS Modules, Vitest + Testing Library; Node 22 scripts via `tsx`; GitHub Actions. External read-only source for backfill: `https://www.sumo-api.com/api`.

**Spec:** The "Design" section below (agreed in chat 2026-09-06: overlay toggle; arrow + previous rank; per-division departures; two PRs). No separate spec file.

## Global Constraints

- Prettier: no semicolons, single quotes, 100 columns (also `.css`). ESLint zero warnings. `npm run validate && npm run test:run && npm run build` green before every commit.
- No runtime dependencies beyond React. Scripts may use Node built-ins only (no new devDependencies in this plan).
- Palette is six values plus `--gold`; **this plan adds no colour**. Movement arrows are ink/muted; "new" reuses `--accent` exactly as the existing promotion pill does.
- Motion budget of four keyframes; **this plan adds no keyframes**. Toggling the diff settles in place like a search.
- Data flow: components consume the normalized model only. Archive JSON is validated by `validateArchive`/`validateArchiveIndex` in `src/data/archive.ts` at the boundary; nothing in components parses upstream fields.
- Tests use `src/test/fixtures.ts`; add factories there rather than ad-hoc shapes.
- Accessibility: real buttons, `aria-pressed` on the toggle, `lang` on Japanese runs, movement described in accessible names (a screen reader cannot see an arrow glyph).
- The Sheet never scrolls sideways; new bands must respect the fixed band heights (`--rank-band`, `--origin-band`) and only add an `auto` row.
- Never type CJK compatibility ideographs (U+F900–FAFF) as literals; use `\u{…}` escapes.
- Commits end with:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg
  ```
- Two branches / two PRs: `feat/banzuke-archive` (Tasks A1–A8) merged and observed in a real deploy before `feat/diff-mode` (Tasks B1–B9) starts.

---

## Design

### What exists

- `useBanzuke` loads `public/latest-banzuke.json` → `validateSnapshot` → `normalizeSnapshot` → `BanzukeSet { makuuchi, juryo | null }` of `Rikishi` (`id` = JSA `rikishi_id`, `rankCode` 100–600, `rankNumber`, `seat`, `side`, `shikona: {en, jp}` …). `App.tsx` holds URL state via `useUrlParam` (`q`, `div`, `view`, `rikishi`). `BanzukeSheet` and `BanzukeGrid`/`RankRow`/`SideCell` take the same `rows` + `highlight`. `useProfiles.ts` is the pattern for an optional, cached secondary fetch.
- Git history holds JSA snapshots for basho **632** (2025-11), **633** (2026-01), **634** (2026-03; all three v1, Makuuchi only) and **637** (2026-09). 635 and 636 are missing; 636 (July 2026) is the one Diff mode needs at launch.
- sumo-api.com (probed 2026-09-07): `GET /api/basho/202607` → `{date, startDate, endDate, …}`; `GET /api/basho/202607/banzuke/Makuuchi|Juryo` → `{bashoId, division, east: Entry[], west: Entry[]}` with `Entry {side:'East'|'West', rikishiID, shikonaEn, shikonaJp:'豊昇龍　智勝', rankValue, rank:'Maegashira 16 East' | 'Sekiwake 2 West', record[], wins, losses, absences}`; `GET /api/rikishis?limit=1000` → 601 active records, **every one with `nskId` = JSA id** (e.g. Onosato `nskId: 4227`, Hoshoryu `3842`), plus `heya` (English) and `shusshin` ('Ishikawa-ken, Kahoku-gun, …' / 'Mongolia, Ulaanbaatar'); `GET /api/rikishi/{id}` for retired ones (some retired records have `nskId: 0`). 202605, 202607 and 202609 all exist. Sanyaku rank strings number the pair per side (`Sekiwake 2 East` = JSA seat 2).
- JSA basho ids are consecutive, six per year: 632 = 2025-11 … 637 = 2026-09 (verified from the four snapshots). Tournaments fall in odd months.

### Archive format (`src/data/archive.ts`)

```ts
interface ArchivedRikishi {
  id: number                    // JSA rikishi id (sumo-api nskId)
  shikona: Localized            // ring name only (given name stripped)
  division: 'makuuchi' | 'juryo'
  rankCode: number              // 100 … 600
  rankNumber: number            // 1 for sanyaku
  seat: number                  // pair within a position; 1 unless a third Yokozuna/Ozeki
  side: 'east' | 'west'
  heya: Localized | null        // jp may be '' when the source had no Japanese
  pref: Localized | null
}
interface ArchivedBanzuke {
  version: 1
  bashoId: number
  year: number; month: number   // from bashoIds.ts
  startDate: string; endDate: string   // YYYY-MM-DD (JST calendar dates)
  source: 'jsa' | 'sumo-api'
  divisions: Division[]         // which divisions this file actually carries
  rikishi: ArchivedRikishi[]    // banzuke order
}
interface ArchiveIndex { version: 1; generatedAt: string; basho: ArchiveIndexEntry[] }  // ascending
interface ArchiveIndexEntry { bashoId; year; month; startDate; file: '637.json'; source; divisions }
```
~10 KB per basho. The app loads `index.json` (tiny) once, and one archive file only when the diff is switched on.

### Diff semantics (`src/utils/diff.ts`)

For each current wrestler (both divisions) look up the previous entry by `id`:
- not found → `kind: 'new'` (came from Makushita or below, or missing from a Makuuchi-only archive — the plan's launch archive has both divisions).
- found: compare **rank position** — tier order Y<O<S<K<M<J; within Maegashira/Juryo lower number is higher; sanyaku seats are equal rank. Higher now → `'up'`, lower → `'down'`, equal → `'same'` (with `sideChanged` when East↔West).
- The badge shows **arrow + previous rank label** (`▲ M5`, `▼ K`, `▲ J2`; Japanese via `jpRankShort`), never a step count. `'same'` shows nothing on the Sheet; the List and accessible names say "Unchanged (West → East)" when the side swapped.
- **Departures are per division** (the user's choice): for the division on screen, every previous entry of that division whose id is not in the current rows of that division, split into `moved` (still on the sheet, in the other division — with their new rank, clickable) and `gone` (on neither — with their last rank, linking to the official profile).

### UI

- `ChangesToggle`: one `<button aria-pressed>` in `.controls` beside `ViewToggle`, label "Changes" / 「変動」, `title` and visually-hidden description "since July 2026" / 「七月場所から」. Only rendered when the index has an earlier basho; URL `?diff=1`; works in both Sheet and List.
- Sheet `Column` gains a fourth band (`auto` row) under the name: `MovementBadge variant="sheet"` — vertical like the numeral, arrow then rank characters; `new` in `--accent`.
- `SideCell` shows `MovementBadge variant="row"` beside the promotion pill.
- `Departed` section renders under the panel (both views) with two lists; `lang` per run; prints.

### Pipeline

`deploy.yml` `data` job, when `changed == 'true'`: copy `public/banzuke/*.json` into `.data/banzuke/`, run `scripts/archive-banzuke.ts --snapshot .data/latest-banzuke.json --out-dir .data/banzuke` (writes `{bashoId}.json`, rebuilds `index.json`), **then** the existing mincho step with `--archive-dir .data/banzuke` (departed names must be in the subset), and the commit step adds `public/banzuke`. The artifact already lands in `public/`.

### Out of scope (deliberately)

A3 scrubber, A4 career line, a keyboard shortcut for the toggle, any motion, diffing against anything but the immediately previous basho, results/records from sumo-api (the `record` arrays are fetched but dropped).

---

## File structure

**Part A — archive**

| Path | Responsibility |
|---|---|
| `src/data/bashoIds.ts` (+test) | JSA basho id ↔ year/month ↔ sumo-api `YYYYMM` |
| `src/data/archive.ts` (+test) | Archive/index types, validators, `archiveFromBanzukeSet`, `buildIndex`, `previousEntry` |
| `src/test/fixtures.ts` | add `makeArchivedRikishi`, `makeArchivedBanzuke`, `makeArchiveIndex` |
| `scripts/lib/sumo-api.ts` (+test, +fixtures) | Parse sumo-api shapes → `ArchivedBanzuke` (pure) |
| `scripts/lib/archive-io.ts` (+test) | Read/write archive dir, rebuild index |
| `scripts/archive-banzuke.ts` | CLI: snapshot → archive file + index |
| `scripts/backfill-archive.ts` | CLI: sumo-api → archive files for given `YYYYMM`s |
| `public/banzuke/632.json … 637.json`, `index.json` | Data |
| `src/data/archive-files.test.ts` | Committed archive files validate and agree with the index |
| `scripts/subset-fonts.ts`, `scripts/lib/font-coverage.test.ts` | Include `public/banzuke/*.json` in the glyph set |
| `tsconfig.scripts.json` | Include the new pure `src/` modules |
| `.github/workflows/deploy.yml` | Archive step + commit path |
| `README.md`, `CLAUDE.md`, `package.json` | Docs, scripts `archive-banzuke`, `backfill-archive` |

**Part B — diff mode**

| Path | Responsibility |
|---|---|
| `src/utils/diff.ts` (+test) | `diffBanzuke`, `departures`, `describeMovement`, `movementLabel` |
| `src/hooks/useArchive.ts` (+test) | `useArchiveIndex`, `useArchivedBanzuke` (cached fetch, `useProfiles` pattern) |
| `src/i18n/strings.ts` | New strings, both languages |
| `src/components/MovementBadge/` | Arrow + previous rank, `sheet` and `row` variants |
| `src/components/ChangesToggle/` | The `aria-pressed` toggle |
| `src/components/Departed/` | Per-division departures section |
| `src/components/BanzukeSheet/BanzukeSheet.tsx` (+css,+test) | `movements` prop → badge band |
| `src/components/SideCell/SideCell.tsx` (+css,+test), `RankRow.tsx`, `BanzukeGrid.tsx` | `movements` prop threaded to the row badge |
| `src/App.tsx` (+test) | `?diff=1`, hooks, toggle, `Departed` |
| `README.md`, `CLAUDE.md` | Docs |

---

# Part A — the archive (branch `feat/banzuke-archive`)

### Task A0: Branch

- [ ] `git checkout main && git pull --ff-only && git checkout -b feat/banzuke-archive`
- [ ] Baseline: `npm run validate && npm run test:run && npm run build` — green (stop and report if not).
- [ ] Copy this plan to `docs/superpowers/plans/2026-09-06-time-backward-archive-and-diff.md` and commit it alone:
  ```
  docs: time-backward (archive, diff mode, departures) implementation plan

  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg
  ```

---

### Task A1: Basho id arithmetic

**Files:**
- Create: `src/data/bashoIds.ts`
- Test: `src/data/bashoIds.test.ts`

**Interfaces:**
- Produces: `bashoYearMonth(id: number): { year: number; month: number }`, `bashoIdFor(year: number, month: number): number | null` (null for even months), `sumoApiBashoId(id: number): string` (`'202607'`), `bashoIdFromSumoApi(yyyymm: string): number | null`.

- [ ] **Step 1: Failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { bashoIdFor, bashoIdFromSumoApi, bashoYearMonth, sumoApiBashoId } from './bashoIds'

describe('bashoIds', () => {
  // Every pair below is read off a real JSA snapshot in this repo's history.
  it.each([
    [632, 2025, 11],
    [633, 2026, 1],
    [634, 2026, 3],
    [637, 2026, 9],
  ])('maps id %i to %i-%i and back', (id, year, month) => {
    expect(bashoYearMonth(id)).toEqual({ year, month })
    expect(bashoIdFor(year, month)).toBe(id)
  })

  it('fills the gaps between known ids', () => {
    expect(bashoYearMonth(635)).toEqual({ year: 2026, month: 5 })
    expect(bashoYearMonth(636)).toEqual({ year: 2026, month: 7 })
    expect(bashoYearMonth(638)).toEqual({ year: 2026, month: 11 })
    expect(bashoYearMonth(639)).toEqual({ year: 2027, month: 1 })
  })

  it('has no tournament in even months', () => {
    expect(bashoIdFor(2026, 8)).toBeNull()
  })

  it('converts to and from the sumo-api YYYYMM form', () => {
    expect(sumoApiBashoId(636)).toBe('202607')
    expect(sumoApiBashoId(633)).toBe('202601')
    expect(bashoIdFromSumoApi('202607')).toBe(636)
    expect(bashoIdFromSumoApi('2026-07')).toBeNull()
    expect(bashoIdFromSumoApi('202608')).toBeNull()
  })
})
```

- [ ] **Step 2:** `npx vitest run src/data/bashoIds.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
/**
 * JSA basho ids are consecutive integers, one per tournament, six a year in
 * the odd months. The anchor below is read off the September 2026 snapshot;
 * the ids 632–637 in this repo's history all agree with it. Ids before 2025
 * have not been checked against the JSA (the cancelled May 2020 tournament
 * may or may not hold a number) — extend the archive backwards with care.
 */
const ANCHOR = { id: 637, year: 2026, month: 9 }

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1)
}

/** Calendar year and month (1–12) of a tournament. */
export function bashoYearMonth(id: number): { year: number; month: number } {
  const index = monthIndex(ANCHOR.year, ANCHOR.month) + (id - ANCHOR.id) * 2
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** The id of the tournament held in a given month, or null when none is (even months). */
export function bashoIdFor(year: number, month: number): number | null {
  if (month % 2 === 0) return null
  return ANCHOR.id + (monthIndex(year, month) - monthIndex(ANCHOR.year, ANCHOR.month)) / 2
}

/** sumo-api.com addresses tournaments as YYYYMM. */
export function sumoApiBashoId(id: number): string {
  const { year, month } = bashoYearMonth(id)
  return `${year}${String(month).padStart(2, '0')}`
}

export function bashoIdFromSumoApi(yyyymm: string): number | null {
  if (!/^\d{6}$/.test(yyyymm)) return null
  return bashoIdFor(Number(yyyymm.slice(0, 4)), Number(yyyymm.slice(4)))
}
```

- [ ] **Step 4:** `npx vitest run src/data/bashoIds.test.ts` → PASS (5 tests).
- [ ] **Step 5:** `npm run validate && npm run test:run`; commit `data: basho id arithmetic (id ↔ year/month ↔ sumo-api YYYYMM)`.

---

### Task A2: Archive format, validation, conversion

**Files:**
- Create: `src/data/archive.ts`
- Modify: `src/test/fixtures.ts` (append factories)
- Modify: `tsconfig.scripts.json` `include`
- Test: `src/data/archive.test.ts`

**Interfaces:**
- Consumes: `bashoYearMonth` (A1); `BanzukeSet`, `Rikishi`, `Localized`, `Division`, `Side` from `src/types/banzuke.ts`.
- Produces (all exported from `src/data/archive.ts`):
  - types `ArchivedRikishi`, `ArchivedBanzuke`, `ArchiveIndexEntry`, `ArchiveIndex`, `ArchiveSource = 'jsa' | 'sumo-api'`
  - `validateArchive(input: unknown): { ok: true; archive: ArchivedBanzuke } | { ok: false; error: string }`
  - `validateArchiveIndex(input: unknown): { ok: true; index: ArchiveIndex } | { ok: false; error: string }`
  - `archiveFromBanzukeSet(set: BanzukeSet): ArchivedBanzuke` (source `'jsa'`)
  - `archiveFileName(bashoId: number): string` → `'637.json'`
  - `indexEntry(archive: ArchivedBanzuke): ArchiveIndexEntry`
  - `buildIndex(archives: ArchivedBanzuke[], generatedAt: string): ArchiveIndex` (sorted ascending, duplicates by bashoId rejected with a thrown `Error`)
  - `previousEntry(index: ArchiveIndex, bashoId: number): ArchiveIndexEntry | null` (greatest id strictly less)
- Fixtures: `makeArchivedRikishi(overrides?)`, `makeArchivedBanzuke(overrides?)` (bashoId 636, July 2026, source `'sumo-api'`, four wrestlers: Hoshoryu Y1E, Onosato Y1W, Wakatakakage M3E, and a Juryo J1E `id: 3983` Dewanoryu), `makeArchiveIndex(overrides?)` (entries for 634, 636).

- [ ] **Step 1: Fixtures** — append to `src/test/fixtures.ts`:

```ts
import type {
  ArchivedBanzuke,
  ArchivedRikishi,
  ArchiveIndex,
} from '../data/archive'

export function makeArchivedRikishi(overrides: Partial<ArchivedRikishi> = {}): ArchivedRikishi {
  return {
    id: 3842,
    shikona: { en: 'Hoshoryu', jp: '豊昇龍' },
    division: 'makuuchi',
    rankCode: 100,
    rankNumber: 1,
    seat: 1,
    side: 'east',
    heya: { id: 1, en: 'Tatsunami', jp: '立浪' } as unknown as ArchivedRikishi['heya'],
    pref: { en: 'Mongolia', jp: 'モンゴル' },
    ...overrides,
  }
}

/** July 2026 as the archive would hold it: two Yokozuna, one Maegashira, one Juryo. */
export function makeArchivedBanzuke(overrides: Partial<ArchivedBanzuke> = {}): ArchivedBanzuke {
  return {
    version: 1,
    bashoId: 636,
    year: 2026,
    month: 7,
    startDate: '2026-07-12',
    endDate: '2026-07-26',
    source: 'sumo-api',
    divisions: ['makuuchi', 'juryo'],
    rikishi: [
      makeArchivedRikishi(),
      makeArchivedRikishi({
        id: 4227,
        side: 'west',
        shikona: { en: 'Onosato', jp: '大の里' },
        heya: { en: 'Nishonoseki', jp: '二所ノ関' },
        pref: { en: 'Ishikawa', jp: '石川県' },
      }),
      makeArchivedRikishi({
        id: 4055,
        rankCode: 500,
        rankNumber: 3,
        shikona: { en: 'Wakatakakage', jp: '若隆景' },
        heya: { en: 'Arashio', jp: '荒汐' },
        pref: { en: 'Fukushima', jp: '福島県' },
      }),
      makeArchivedRikishi({
        id: 3983,
        division: 'juryo',
        rankCode: 600,
        rankNumber: 1,
        shikona: { en: 'Dewanoryu', jp: '出羽ノ龍' },
        heya: { en: 'Dewanoumi', jp: '出羽海' },
        pref: { en: 'Tokyo', jp: '東京都' },
      }),
    ],
    ...overrides,
  }
}

export function makeArchiveIndex(overrides: Partial<ArchiveIndex> = {}): ArchiveIndex {
  return {
    version: 1,
    generatedAt: '2026-09-06T00:00:00.000Z',
    basho: [
      {
        bashoId: 634,
        year: 2026,
        month: 3,
        startDate: '2026-03-08',
        file: '634.json',
        source: 'sumo-api',
        divisions: ['makuuchi', 'juryo'],
      },
      {
        bashoId: 636,
        year: 2026,
        month: 7,
        startDate: '2026-07-12',
        file: '636.json',
        source: 'sumo-api',
        divisions: ['makuuchi', 'juryo'],
      },
    ],
    ...overrides,
  }
}
```
(Remove the `as unknown as` cast on `heya` — `heya` is `Localized | null`, so write `heya: { en: 'Tatsunami', jp: '立浪' }`. The cast is shown only to flag that `ArchivedRikishi.heya` has **no `id`**, unlike `Rikishi.heya`.)

- [ ] **Step 2: Failing tests** — `src/data/archive.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  archiveFileName,
  archiveFromBanzukeSet,
  buildIndex,
  previousEntry,
  validateArchive,
  validateArchiveIndex,
} from './archive'
import { makeArchivedBanzuke, makeArchiveIndex, makeBanzukeSet } from '../test/fixtures'

describe('archiveFromBanzukeSet', () => {
  it('flattens both divisions in banzuke order with ring names only', () => {
    const archive = archiveFromBanzukeSet(makeBanzukeSet())
    expect(archive.version).toBe(1)
    expect(archive.source).toBe('jsa')
    expect(archive.bashoId).toBe(637)
    expect(archive.year).toBe(2026)
    expect(archive.month).toBe(9)
    expect(archive.startDate).toBe('2026-09-13')
    expect(archive.divisions).toEqual(['makuuchi', 'juryo'])
    expect(archive.rikishi.map((r) => [r.id, r.division, r.rankCode, r.rankNumber, r.side])).toEqual(
      [
        [3842, 'makuuchi', 100, 1, 'east'],
        [4227, 'makuuchi', 100, 1, 'west'],
        [4055, 'makuuchi', 500, 1, 'east'],
        [3983, 'juryo', 600, 1, 'east'],
        [4232, 'juryo', 600, 1, 'west'],
      ]
    )
    expect(archive.rikishi[0].heya).toEqual({ en: 'Tatsunami', jp: '立浪' })
    expect(archive.rikishi[0].pref).toEqual({ en: 'Mongolia', jp: 'モンゴル' })
    expect(validateArchive(archive).ok).toBe(true)
  })

  it('records only the divisions the set carries', () => {
    const archive = archiveFromBanzukeSet(makeBanzukeSet({ juryo: null }))
    expect(archive.divisions).toEqual(['makuuchi'])
    expect(archive.rikishi.every((r) => r.division === 'makuuchi')).toBe(true)
  })
})

describe('validateArchive', () => {
  it('accepts the fixture', () => {
    expect(validateArchive(makeArchivedBanzuke())).toEqual({
      ok: true,
      archive: makeArchivedBanzuke(),
    })
  })

  it.each([
    ['not an object', 'nope'],
    ['wrong version', { ...makeArchivedBanzuke(), version: 2 }],
    ['non-numeric bashoId', { ...makeArchivedBanzuke(), bashoId: '636' }],
    ['bad startDate', { ...makeArchivedBanzuke(), startDate: '12/07/2026' }],
    ['unknown source', { ...makeArchivedBanzuke(), source: 'wiki' }],
    ['unknown division listed', { ...makeArchivedBanzuke(), divisions: ['makushita'] }],
    [
      'duplicate id',
      { ...makeArchivedBanzuke(), rikishi: [makeArchivedBanzuke().rikishi[0], makeArchivedBanzuke().rikishi[0]] },
    ],
    [
      'rankCode outside 100–600',
      { ...makeArchivedBanzuke(), rikishi: [{ ...makeArchivedBanzuke().rikishi[0], rankCode: 700 }] },
    ],
    [
      'wrestler in a division the file does not list',
      { ...makeArchivedBanzuke(), divisions: ['makuuchi'] },
    ],
  ])('rejects %s', (_label, input) => {
    expect(validateArchive(input).ok).toBe(false)
  })

  it('names the first problem', () => {
    const result = validateArchive({ ...makeArchivedBanzuke(), version: 2 })
    expect(result).toEqual({ ok: false, error: 'version must be 1' })
  })
})

describe('index', () => {
  it('builds an ascending index with one entry per archive', () => {
    const later = makeArchivedBanzuke()
    const earlier = makeArchivedBanzuke({ bashoId: 634, year: 2026, month: 3, startDate: '2026-03-08' })
    const index = buildIndex([later, earlier], '2026-09-06T00:00:00.000Z')
    expect(index.basho.map((b) => b.bashoId)).toEqual([634, 636])
    expect(index.basho[1]).toEqual({
      bashoId: 636,
      year: 2026,
      month: 7,
      startDate: '2026-07-12',
      file: '636.json',
      source: 'sumo-api',
      divisions: ['makuuchi', 'juryo'],
    })
    expect(validateArchiveIndex(index).ok).toBe(true)
  })

  it('refuses two archives for one tournament', () => {
    expect(() => buildIndex([makeArchivedBanzuke(), makeArchivedBanzuke()], 'x')).toThrow(/636/)
  })

  it('finds the tournament before a given one', () => {
    const index = makeArchiveIndex()
    expect(previousEntry(index, 637)?.bashoId).toBe(636)
    expect(previousEntry(index, 636)?.bashoId).toBe(634)
    expect(previousEntry(index, 634)).toBeNull()
    expect(previousEntry(index, 700)?.bashoId).toBe(636)
  })

  it('names archive files by id', () => {
    expect(archiveFileName(637)).toBe('637.json')
  })

  it('rejects a malformed index', () => {
    expect(validateArchiveIndex({ version: 1, basho: 'x' }).ok).toBe(false)
    expect(validateArchiveIndex({ ...makeArchiveIndex(), basho: [{ bashoId: 1 }] }).ok).toBe(false)
  })
})
```

- [ ] **Step 3:** `npx vitest run src/data/archive.test.ts` → FAIL.

- [ ] **Step 4: Implement** `src/data/archive.ts`:

```ts
/**
 * The banzuke archive: one small file per tournament under public/banzuke/,
 * plus an index. Written by scripts/archive-banzuke.ts (from the JSA
 * snapshot, every time the data changes) and scripts/backfill-archive.ts
 * (from sumo-api.com, once, for tournaments before this site kept copies).
 * Read by the app to say what changed since the previous banzuke.
 *
 * Free of DOM and React imports so the scripts can share it.
 */
import type { BanzukeSet, Division, Localized, Rikishi, Side } from '../types/banzuke'
import { DIVISIONS } from './schema'
import { bashoYearMonth } from './bashoIds'

export type ArchiveSource = 'jsa' | 'sumo-api'

export interface ArchivedRikishi {
  /** JSA rikishi id (sumo-api's `nskId`). */
  id: number
  /** Ring name only — the given name is stripped. */
  shikona: Localized
  division: Division
  rankCode: number
  rankNumber: number
  seat: number
  side: Side
  /** `jp` may be '' when the source carried no Japanese. */
  heya: Localized | null
  pref: Localized | null
}

export interface ArchivedBanzuke {
  version: 1
  bashoId: number
  year: number
  month: number
  /** YYYY-MM-DD, JST calendar dates. */
  startDate: string
  endDate: string
  source: ArchiveSource
  /** The divisions this file actually carries. */
  divisions: Division[]
  /** Banzuke order: Makuuchi then Juryo, East before West within a position. */
  rikishi: ArchivedRikishi[]
}

export interface ArchiveIndexEntry {
  bashoId: number
  year: number
  month: number
  startDate: string
  file: string
  source: ArchiveSource
  divisions: Division[]
}

export interface ArchiveIndex {
  version: 1
  generatedAt: string
  /** Ascending by bashoId. */
  basho: ArchiveIndexEntry[]
}

const SOURCES: readonly ArchiveSource[] = ['jsa', 'sumo-api']
const RANK_CODES = new Set([100, 200, 300, 400, 500, 600])
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLocalized(value: unknown): value is Localized {
  return isRecord(value) && typeof value.en === 'string' && typeof value.jp === 'string'
}

function isDivision(value: unknown): value is Division {
  return (DIVISIONS as readonly string[]).includes(value as string)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

/** The first problem with an archived wrestler, or null. */
function rikishiProblem(row: unknown, divisions: Division[]): string | null {
  if (!isRecord(row)) return 'rikishi entry is not an object'
  if (!isInteger(row.id) || row.id <= 0) return 'id must be a positive integer'
  if (!isLocalized(row.shikona) || row.shikona.en === '') return 'shikona must be localized'
  if (!isDivision(row.division)) return 'division is unknown'
  if (!divisions.includes(row.division)) return `division ${row.division} is not listed`
  if (!isInteger(row.rankCode) || !RANK_CODES.has(row.rankCode)) return 'rankCode is unknown'
  if (!isInteger(row.rankNumber) || row.rankNumber < 1) return 'rankNumber must be ≥ 1'
  if (!isInteger(row.seat) || row.seat < 1) return 'seat must be ≥ 1'
  if (row.side !== 'east' && row.side !== 'west') return 'side must be east or west'
  if (row.heya !== null && !isLocalized(row.heya)) return 'heya must be localized or null'
  if (row.pref !== null && !isLocalized(row.pref)) return 'pref must be localized or null'
  return null
}

export function validateArchive(
  input: unknown
): { ok: true; archive: ArchivedBanzuke } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'archive is not an object' }
  if (input.version !== 1) return { ok: false, error: 'version must be 1' }
  if (!isInteger(input.bashoId) || input.bashoId <= 0) return { ok: false, error: 'bashoId' }
  if (!isInteger(input.year) || !isInteger(input.month)) return { ok: false, error: 'year/month' }
  for (const key of ['startDate', 'endDate'] as const) {
    if (typeof input[key] !== 'string' || !ISO_DATE.test(input[key] as string)) {
      return { ok: false, error: `${key} must be YYYY-MM-DD` }
    }
  }
  if (!SOURCES.includes(input.source as ArchiveSource)) return { ok: false, error: 'source' }
  if (!Array.isArray(input.divisions) || !input.divisions.every(isDivision)) {
    return { ok: false, error: 'divisions must list known divisions' }
  }
  if (!Array.isArray(input.rikishi)) return { ok: false, error: 'rikishi must be an array' }
  const seen = new Set<number>()
  for (const [i, row] of input.rikishi.entries()) {
    const problem = rikishiProblem(row, input.divisions as Division[])
    if (problem) return { ok: false, error: `rikishi[${i}]: ${problem}` }
    const id = (row as ArchivedRikishi).id
    if (seen.has(id)) return { ok: false, error: `rikishi[${i}]: duplicate id ${id}` }
    seen.add(id)
  }
  return { ok: true, archive: input as unknown as ArchivedBanzuke }
}

function entryProblem(entry: unknown): string | null {
  if (!isRecord(entry)) return 'entry is not an object'
  if (!isInteger(entry.bashoId)) return 'bashoId'
  if (!isInteger(entry.year) || !isInteger(entry.month)) return 'year/month'
  if (typeof entry.startDate !== 'string' || !ISO_DATE.test(entry.startDate)) return 'startDate'
  if (typeof entry.file !== 'string' || !/^\d+\.json$/.test(entry.file)) return 'file'
  if (!SOURCES.includes(entry.source as ArchiveSource)) return 'source'
  if (!Array.isArray(entry.divisions) || !entry.divisions.every(isDivision)) return 'divisions'
  return null
}

export function validateArchiveIndex(
  input: unknown
): { ok: true; index: ArchiveIndex } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'index is not an object' }
  if (input.version !== 1) return { ok: false, error: 'version must be 1' }
  if (typeof input.generatedAt !== 'string') return { ok: false, error: 'generatedAt' }
  if (!Array.isArray(input.basho)) return { ok: false, error: 'basho must be an array' }
  let last = -Infinity
  for (const [i, entry] of input.basho.entries()) {
    const problem = entryProblem(entry)
    if (problem) return { ok: false, error: `basho[${i}]: ${problem}` }
    const id = (entry as ArchiveIndexEntry).bashoId
    if (id <= last) return { ok: false, error: `basho[${i}]: not ascending` }
    last = id
  }
  return { ok: true, index: input as unknown as ArchiveIndex }
}

function stripId(value: { id: number } & Localized): Localized {
  return { en: value.en, jp: value.jp }
}

function archiveRikishi(rikishi: Rikishi, division: Division): ArchivedRikishi {
  return {
    id: rikishi.id,
    shikona: { en: rikishi.shikona.en, jp: rikishi.shikona.jp },
    division,
    rankCode: rikishi.rankCode,
    rankNumber: rikishi.rankNumber,
    seat: rikishi.seat,
    side: rikishi.side,
    heya: rikishi.heya.en ? stripId(rikishi.heya) : null,
    pref: rikishi.pref.en ? stripId(rikishi.pref) : null,
  }
}

/** The archive entry for the tournament a normalized set describes. */
export function archiveFromBanzukeSet(set: BanzukeSet): ArchivedBanzuke {
  const { basho } = set.makuuchi
  const { year, month } = bashoYearMonth(basho.id)
  const divisions: Division[] = set.juryo ? ['makuuchi', 'juryo'] : ['makuuchi']
  const rikishi = [
    ...set.makuuchi.rikishi.map((r) => archiveRikishi(r, 'makuuchi')),
    ...(set.juryo?.rikishi ?? []).map((r) => archiveRikishi(r, 'juryo')),
  ]
  return {
    version: 1,
    bashoId: basho.id,
    year,
    month,
    startDate: basho.startDate,
    endDate: basho.endDate,
    source: 'jsa',
    divisions,
    rikishi,
  }
}

export function archiveFileName(bashoId: number): string {
  return `${bashoId}.json`
}

export function indexEntry(archive: ArchivedBanzuke): ArchiveIndexEntry {
  return {
    bashoId: archive.bashoId,
    year: archive.year,
    month: archive.month,
    startDate: archive.startDate,
    file: archiveFileName(archive.bashoId),
    source: archive.source,
    divisions: archive.divisions,
  }
}

/** One entry per archive, ascending; two archives for one tournament is a bug. */
export function buildIndex(archives: ArchivedBanzuke[], generatedAt: string): ArchiveIndex {
  const entries = archives.map(indexEntry).sort((a, b) => a.bashoId - b.bashoId)
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].bashoId === entries[i - 1].bashoId) {
      throw new Error(`two archives for basho ${entries[i].bashoId}`)
    }
  }
  return { version: 1, generatedAt, basho: entries }
}

/** The tournament immediately before `bashoId` in the index, or null. */
export function previousEntry(index: ArchiveIndex, bashoId: number): ArchiveIndexEntry | null {
  let found: ArchiveIndexEntry | null = null
  for (const entry of index.basho) {
    if (entry.bashoId < bashoId) found = entry
    else break
  }
  return found
}
```

Note: `archiveFromBanzukeSet` derives `year`/`month` from the id rather than the snapshot's `basho.year`/`month` so the archive and the index agree with `bashoIds.ts` — the test asserts `2026`/`9` for id 637, which both paths give.

- [ ] **Step 5:** `tsconfig.scripts.json` — set `"include"` to:
  `["scripts/**/*.ts", "src/data/schema.ts", "src/data/kanji.ts", "src/data/bashoIds.ts", "src/data/archive.ts", "src/data/normalize.ts", "src/constants/ranks.ts", "src/types/banzuke.ts"]`
  (`normalize.ts` and `ranks.ts` are needed by Task A4's script; adding them now keeps one edit.) Run `npx tsc --noEmit -p tsconfig.scripts.json` → clean. If `normalize.ts` trips on `import.meta.env` (it does not use it; `formatting.ts` does, and is not included) fix by not including the offending file and report.

- [ ] **Step 6:** `npx vitest run src/data/archive.test.ts` → PASS. Full gate; commit `data: banzuke archive format, validation and conversion`.

---

### Task A3: sumo-api parsing (pure)

**Files:**
- Create: `scripts/lib/sumo-api.ts`
- Create: `scripts/lib/__fixtures__/sumo-api-202609-makuuchi.json`, `…-juryo.json`, `…-rikishis.json` (captured, trimmed)
- Test: `scripts/lib/sumo-api.test.ts`

**Interfaces:**
- Consumes: `ArchivedBanzuke`, `ArchivedRikishi`, `validateArchive` (A2); `bashoIdFromSumoApi` (A1); `ringName` from `src/data/normalize.ts`.
- Produces:
  ```ts
  export interface SumoApiBanzukeEntry { side: 'East' | 'West'; rikishiID: number; shikonaEn: string; shikonaJp?: string; rankValue?: number; rank: string }
  export interface SumoApiBanzuke { bashoId: string; division: 'Makuuchi' | 'Juryo'; east: SumoApiBanzukeEntry[]; west: SumoApiBanzukeEntry[] }
  export interface SumoApiRikishi { id: number; nskId?: number; shikonaEn: string; shikonaJp?: string; heya?: string; shusshin?: string }
  export interface SumoApiBasho { date: string; startDate: string; endDate: string }
  export function parseRank(rank: string): { rankCode: number; rankNumber: number; seat: number; side: 'east' | 'west' } | null
  export function cleanShikonaJp(raw: string | undefined, fallback: string): string
  export function shusshinRegion(shusshin: string | undefined): string
  export function archiveFromSumoApi(input: { basho: SumoApiBasho; banzuke: SumoApiBanzuke[]; rikishi: Map<number, SumoApiRikishi> }): { archive: ArchivedBanzuke; problems: string[] }
  ```
  `problems` lists entries that could not be mapped (no `nskId`, unparseable rank); those entries are **omitted** from `archive.rikishi`. The CLI (A5) fails when `problems` is non-empty.

- [ ] **Step 1: Capture fixtures** (network reads; one time). In Git Bash:

```bash
B=https://www.sumo-api.com/api; D=scripts/lib/__fixtures__
curl -s "$B/basho/202609/banzuke/Makuuchi" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const strip=e=>({side:e.side,rikishiID:e.rikishiID,shikonaEn:e.shikonaEn,shikonaJp:e.shikonaJp,rankValue:e.rankValue,rank:e.rank});console.log(JSON.stringify({bashoId:j.bashoId,division:j.division,east:j.east.map(strip),west:j.west.map(strip)},null,1))})" > $D/sumo-api-202609-makuuchi.json
curl -s "$B/basho/202609/banzuke/Juryo" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const strip=e=>({side:e.side,rikishiID:e.rikishiID,shikonaEn:e.shikonaEn,shikonaJp:e.shikonaJp,rankValue:e.rankValue,rank:e.rank});console.log(JSON.stringify({bashoId:j.bashoId,division:j.division,east:j.east.map(strip),west:j.west.map(strip)},null,1))})" > $D/sumo-api-202609-juryo.json
curl -s "$B/rikishis?limit=1000" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(JSON.stringify(j.records.map(r=>({id:r.id,nskId:r.nskId,shikonaEn:r.shikonaEn,shikonaJp:r.shikonaJp,heya:r.heya,shusshin:r.shusshin})),null,1))})" > $D/sumo-api-202609-rikishis.json
ls -la $D/sumo-api-*
```
Expected: three files, roughly 8 KB, 8 KB and 100 KB. (The `record` arrays are dropped; they are the bulk.) If the API is unreachable, stop and report BLOCKED — the cross-check test in Step 2 depends on real data.

- [ ] **Step 2: Failing tests** — `scripts/lib/sumo-api.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  archiveFromSumoApi,
  cleanShikonaJp,
  parseRank,
  shusshinRegion,
  type SumoApiBanzuke,
  type SumoApiRikishi,
} from './sumo-api.ts'
import { validateArchive } from '../../src/data/archive.ts'
import { normalizeSnapshot } from '../../src/data/normalize.ts'
import { validateSnapshot } from '../../src/data/schema.ts'

const fixtures = resolve(__dirname, '__fixtures__')
const load = <T>(name: string): T => JSON.parse(readFileSync(resolve(fixtures, name), 'utf8')) as T

describe('parseRank', () => {
  it.each([
    ['Yokozuna 1 East', { rankCode: 100, rankNumber: 1, seat: 1, side: 'east' }],
    ['Ozeki 2 West', { rankCode: 200, rankNumber: 1, seat: 2, side: 'west' }],
    ['Sekiwake 1 East', { rankCode: 300, rankNumber: 1, seat: 1, side: 'east' }],
    ['Komusubi 1 West', { rankCode: 400, rankNumber: 1, seat: 1, side: 'west' }],
    ['Maegashira 16 East', { rankCode: 500, rankNumber: 16, seat: 1, side: 'east' }],
    ['Juryo 14 West', { rankCode: 600, rankNumber: 14, seat: 1, side: 'west' }],
  ])('parses %s', (rank, expected) => {
    expect(parseRank(rank)).toEqual(expected)
  })

  it('rejects anything else', () => {
    expect(parseRank('Makushita 1 East')).toBeNull()
    expect(parseRank('Maegashira East')).toBeNull()
    expect(parseRank('')).toBeNull()
  })
})

describe('cleanShikonaJp', () => {
  it('keeps the ring name and drops the given name and any reading', () => {
    expect(cleanShikonaJp('豊昇龍　智勝', 'Hoshoryu')).toBe('豊昇龍')
    expect(cleanShikonaJp('旭富士(あさひふじ)', 'Asahifuji')).toBe('旭富士')
    expect(cleanShikonaJp('安青錦　新大', 'Aonishiki')).toBe('安青錦')
  })

  it('falls back to the English name when there is no Japanese', () => {
    expect(cleanShikonaJp(undefined, 'Hoshoryu')).toBe('Hoshoryu')
    expect(cleanShikonaJp('', 'Hoshoryu')).toBe('Hoshoryu')
  })
})

describe('shusshinRegion', () => {
  it('reduces a birthplace to its prefecture or country', () => {
    expect(shusshinRegion('Ishikawa-ken, Kahoku-gun, Tsubata-machi')).toBe('Ishikawa')
    expect(shusshinRegion('Mongolia, Ulaanbaatar')).toBe('Mongolia')
    expect(shusshinRegion('Tokyo-to, Koto-ku')).toBe('Tokyo')
    expect(shusshinRegion('Osaka-fu, Sakai-shi')).toBe('Osaka')
    expect(shusshinRegion('Hokkaido, Sapporo-shi')).toBe('Hokkaido')
    expect(shusshinRegion(undefined)).toBe('')
  })
})

describe('archiveFromSumoApi', () => {
  const basho = { date: '202607', startDate: '2026-07-12T00:00:00Z', endDate: '2026-07-26T00:00:00Z' }
  const rikishi = new Map<number, SumoApiRikishi>([
    [19, { id: 19, nskId: 3842, shikonaEn: 'Hoshoryu', shikonaJp: '豊昇龍　智勝', heya: 'Tatsunami', shusshin: 'Mongolia, Ulaanbaatar' }],
    [8850, { id: 8850, nskId: 4227, shikonaEn: 'Onosato', shikonaJp: '大の里　泰輝', heya: 'Nishonoseki', shusshin: 'Ishikawa-ken, Kahoku-gun' }],
    [999, { id: 999, nskId: 0, shikonaEn: 'Nobody' }],
  ])
  const banzuke: SumoApiBanzuke[] = [
    {
      bashoId: '202607',
      division: 'Makuuchi',
      east: [{ side: 'East', rikishiID: 19, shikonaEn: 'Hoshoryu', shikonaJp: '豊昇龍　智勝', rank: 'Yokozuna 1 East' }],
      west: [{ side: 'West', rikishiID: 8850, shikonaEn: 'Onosato', shikonaJp: '大の里　泰輝', rank: 'Yokozuna 1 West' }],
    },
    {
      bashoId: '202607',
      division: 'Juryo',
      east: [{ side: 'East', rikishiID: 999, shikonaEn: 'Nobody', rank: 'Juryo 1 East' }],
      west: [],
    },
  ]

  it('builds a valid archive keyed by JSA id, in banzuke order', () => {
    const { archive, problems } = archiveFromSumoApi({ basho, banzuke, rikishi })
    expect(archive.bashoId).toBe(636)
    expect(archive.year).toBe(2026)
    expect(archive.month).toBe(7)
    expect(archive.startDate).toBe('2026-07-12')
    expect(archive.endDate).toBe('2026-07-26')
    expect(archive.source).toBe('sumo-api')
    expect(archive.divisions).toEqual(['makuuchi', 'juryo'])
    expect(archive.rikishi.map((r) => r.id)).toEqual([3842, 4227])
    expect(archive.rikishi[0]).toEqual({
      id: 3842,
      shikona: { en: 'Hoshoryu', jp: '豊昇龍' },
      division: 'makuuchi',
      rankCode: 100,
      rankNumber: 1,
      seat: 1,
      side: 'east',
      heya: { en: 'Tatsunami', jp: '' },
      pref: { en: 'Mongolia', jp: '' },
    })
    expect(problems).toEqual(['Juryo: Nobody (sumo-api 999) has no JSA id'])
    expect(validateArchive(archive).ok).toBe(true)
  })

  it('orders East before West within a position and positions by rank', () => {
    const swapped: SumoApiBanzuke[] = [{ ...banzuke[0], east: banzuke[0].west.map((e) => ({ ...e, side: 'East', rank: 'Ozeki 1 East' })), west: banzuke[0].east.map((e) => ({ ...e, side: 'West', rank: 'Yokozuna 1 West' })) }]
    const { archive } = archiveFromSumoApi({ basho, banzuke: swapped, rikishi })
    expect(archive.rikishi.map((r) => [r.id, r.rankCode, r.side])).toEqual([
      [3842, 100, 'west'],
      [4227, 200, 'east'],
    ])
  })
})

describe('against the JSA snapshot for the same tournament', () => {
  it('reproduces every id, rank, number, seat and side of basho 637 from sumo-api 202609', () => {
    const snapshot = validateSnapshot(
      JSON.parse(readFileSync(resolve(__dirname, '../../public/latest-banzuke.json'), 'utf8'))
    )
    if (!snapshot.ok) throw new Error(snapshot.errors.join('; '))
    const set = normalizeSnapshot(snapshot.snapshot, 'live')
    if (set.makuuchi.basho.id !== 637) return // the live file has moved on; this check is for 637 only

    const rikishi = new Map(
      load<SumoApiRikishi[]>('sumo-api-202609-rikishis.json').map((r) => [r.id, r])
    )
    const { archive, problems } = archiveFromSumoApi({
      basho: { date: '202609', startDate: '2026-09-13T00:00:00Z', endDate: '2026-09-27T00:00:00Z' },
      banzuke: [
        load<SumoApiBanzuke>('sumo-api-202609-makuuchi.json'),
        load<SumoApiBanzuke>('sumo-api-202609-juryo.json'),
      ],
      rikishi,
    })
    expect(problems).toEqual([])

    const key = (r: { id: number; rankCode: number; rankNumber: number; seat: number; side: string }) =>
      `${r.id}:${r.rankCode}:${r.rankNumber}:${r.seat}:${r.side}`
    const fromJsa = [...set.makuuchi.rikishi, ...(set.juryo?.rikishi ?? [])].map(key)
    const fromApi = archive.rikishi.map(key)
    expect(fromApi).toEqual(fromJsa)

    const jsaNames = new Map(
      [...set.makuuchi.rikishi, ...(set.juryo?.rikishi ?? [])].map((r) => [r.id, r.shikona.jp])
    )
    for (const r of archive.rikishi) expect(r.shikona.jp, r.shikona.en).toBe(jsaNames.get(r.id))
  })
})
```

- [ ] **Step 3:** `npx vitest run scripts/lib/sumo-api.test.ts` → FAIL.

- [ ] **Step 4: Implement** `scripts/lib/sumo-api.ts`:

```ts
/**
 * sumo-api.com shapes → the archive format. Pure: the CLI in
 * scripts/backfill-archive.ts does the fetching.
 *
 * The join to the JSA is `nskId` on sumo-api's rikishi records, which is the
 * JSA `rikishi_id`; entries without one are reported and left out rather
 * than guessed at by name.
 */
import type { ArchivedBanzuke, ArchivedRikishi } from '../../src/data/archive.ts'
import type { Division } from '../../src/data/schema.ts'
import { bashoIdFromSumoApi, bashoYearMonth } from '../../src/data/bashoIds.ts'
import { ringName } from '../../src/data/normalize.ts'

export interface SumoApiBanzukeEntry {
  side: 'East' | 'West'
  rikishiID: number
  shikonaEn: string
  shikonaJp?: string
  rankValue?: number
  /** "Maegashira 16 East", "Sekiwake 2 West" — sanyaku are numbered per side. */
  rank: string
}

export interface SumoApiBanzuke {
  bashoId: string
  division: 'Makuuchi' | 'Juryo'
  east: SumoApiBanzukeEntry[]
  west: SumoApiBanzukeEntry[]
}

export interface SumoApiRikishi {
  id: number
  /** JSA rikishi id; 0 or absent when sumo-api does not know it. */
  nskId?: number
  shikonaEn: string
  shikonaJp?: string
  heya?: string
  shusshin?: string
}

export interface SumoApiBasho {
  date: string
  startDate: string
  endDate: string
}

const TIERS: Record<string, number> = {
  Yokozuna: 100,
  Ozeki: 200,
  Sekiwake: 300,
  Komusubi: 400,
  Maegashira: 500,
  Juryo: 600,
}

const DIVISION_OF: Record<SumoApiBanzuke['division'], Division> = {
  Makuuchi: 'makuuchi',
  Juryo: 'juryo',
}

export function parseRank(
  rank: string
): { rankCode: number; rankNumber: number; seat: number; side: 'east' | 'west' } | null {
  const match = /^(Yokozuna|Ozeki|Sekiwake|Komusubi|Maegashira|Juryo) (\d+) (East|West)$/.exec(rank)
  if (!match) return null
  const rankCode = TIERS[match[1]]
  const n = Number(match[2])
  const side = match[3] === 'East' ? 'east' : 'west'
  // Sanyaku: the number is the pair (JSA seat); numbered ranks: it is the position.
  return rankCode < 500
    ? { rankCode, rankNumber: 1, seat: n, side }
    : { rankCode, rankNumber: n, seat: 1, side }
}

/** Ring name only: "豊昇龍　智勝" → 豊昇龍, "旭富士(あさひふじ)" → 旭富士. */
export function cleanShikonaJp(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback
  const withoutReading = raw.replace(/[（(][^）)]*[）)]/g, '')
  return ringName(withoutReading) || fallback
}

/** "Ishikawa-ken, Kahoku-gun" → Ishikawa; "Mongolia, Ulaanbaatar" → Mongolia. */
export function shusshinRegion(shusshin: string | undefined): string {
  if (!shusshin) return ''
  const first = shusshin.split(',')[0].trim()
  return first.replace(/-(ken|to|fu)$/, '')
}

function sortKey(r: ArchivedRikishi): number {
  // Makuuchi before Juryo is already implied by rankCode; East before West.
  return r.rankCode * 1_000_000 + r.rankNumber * 1000 + r.seat * 10 + (r.side === 'east' ? 0 : 1)
}

export function archiveFromSumoApi(input: {
  basho: SumoApiBasho
  banzuke: SumoApiBanzuke[]
  rikishi: Map<number, SumoApiRikishi>
}): { archive: ArchivedBanzuke; problems: string[] } {
  const bashoId = bashoIdFromSumoApi(input.basho.date)
  if (bashoId === null) throw new Error(`not a tournament month: ${input.basho.date}`)
  const { year, month } = bashoYearMonth(bashoId)
  const problems: string[] = []
  const rows: ArchivedRikishi[] = []
  const divisions: Division[] = []

  for (const table of input.banzuke) {
    const division = DIVISION_OF[table.division]
    divisions.push(division)
    for (const entry of [...table.east, ...table.west]) {
      const label = `${table.division}: ${entry.shikonaEn} (sumo-api ${entry.rikishiID})`
      const person = input.rikishi.get(entry.rikishiID)
      if (!person?.nskId) {
        problems.push(`${label} has no JSA id`)
        continue
      }
      const rank = parseRank(entry.rank)
      if (!rank) {
        problems.push(`${label} has an unreadable rank "${entry.rank}"`)
        continue
      }
      const region = shusshinRegion(person.shusshin)
      rows.push({
        id: person.nskId,
        shikona: {
          en: entry.shikonaEn,
          jp: cleanShikonaJp(entry.shikonaJp ?? person.shikonaJp, entry.shikonaEn),
        },
        division,
        ...rank,
        heya: person.heya ? { en: person.heya, jp: '' } : null,
        pref: region ? { en: region, jp: '' } : null,
      })
    }
  }
  rows.sort((a, b) => sortKey(a) - sortKey(b))

  return {
    archive: {
      version: 1,
      bashoId,
      year,
      month,
      startDate: input.basho.startDate.slice(0, 10),
      endDate: input.basho.endDate.slice(0, 10),
      source: 'sumo-api',
      divisions,
      rikishi: rows,
    },
    problems,
  }
}
```

- [ ] **Step 5:** `npx vitest run scripts/lib/sumo-api.test.ts` → PASS, **including the 637 cross-check**. If the cross-check fails on a specific wrestler, that is real information: report the diff (ids/ranks) in the task report and stop — do not loosen the assertion. If it fails only on `shikona.jp` for one or two names, report which; that would mean sumo-api's kanji differs from the JSA's for that wrestler and the plan's assumption needs a ruling.
- [ ] **Step 6:** Gate; commit `scripts: parse sumo-api banzuke and rikishi into the archive format`.

---

### Task A4: Archive I/O and the `archive-banzuke` CLI

**Files:**
- Create: `scripts/lib/archive-io.ts`
- Create: `scripts/archive-banzuke.ts`
- Modify: `package.json` (script `archive-banzuke`)
- Test: `scripts/lib/archive-io.test.ts`

**Interfaces:**
- Consumes: A2's `validateArchive`, `buildIndex`, `archiveFileName`, `archiveFromBanzukeSet`; `validateSnapshot`, `normalizeSnapshot`.
- Produces (`scripts/lib/archive-io.ts`):
  - `readArchives(dir: string): Promise<ArchivedBanzuke[]>` — every `*.json` except `index.json`, validated; throws naming the first bad file.
  - `writeArchive(dir: string, archive: ArchivedBanzuke): Promise<string>` — returns the path written.
  - `writeIndex(dir: string, archives: ArchivedBanzuke[], now?: Date): Promise<string>`.
  - `refreshIndex(dir: string): Promise<ArchiveIndex>` — `readArchives` → `writeIndex`.

- [ ] **Step 1: Failing tests** — `scripts/lib/archive-io.test.ts` (uses a temp dir under `os.tmpdir()`):

```ts
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readArchives, refreshIndex, writeArchive } from './archive-io.ts'
import { makeArchivedBanzuke } from '../../src/test/fixtures'

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'banzuke-archive-'))
})
afterEach(() => rm(dir, { recursive: true, force: true }))

describe('archive-io', () => {
  it('writes an archive by id and reads it back', async () => {
    const path = await writeArchive(dir, makeArchivedBanzuke())
    expect(path.endsWith('636.json')).toBe(true)
    expect(await readArchives(dir)).toEqual([makeArchivedBanzuke()])
  })

  it('rebuilds the index from the files present, ascending, ignoring index.json itself', async () => {
    await writeArchive(dir, makeArchivedBanzuke())
    await writeArchive(dir, makeArchivedBanzuke({ bashoId: 634, year: 2026, month: 3, startDate: '2026-03-08' }))
    const index = await refreshIndex(dir)
    expect(index.basho.map((b) => b.bashoId)).toEqual([634, 636])
    const onDisk = JSON.parse(await readFile(join(dir, 'index.json'), 'utf8')) as typeof index
    expect(onDisk.basho).toEqual(index.basho)
    // A second refresh must not try to read index.json as an archive.
    expect((await refreshIndex(dir)).basho).toHaveLength(2)
  })

  it('refuses a directory holding an invalid archive', async () => {
    await writeFile(join(dir, '999.json'), '{"version":2}', 'utf8')
    await expect(readArchives(dir)).rejects.toThrow(/999\.json/)
  })
})
```

- [ ] **Step 2:** run → FAIL.

- [ ] **Step 3: Implement** `scripts/lib/archive-io.ts`:

```ts
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  archiveFileName,
  buildIndex,
  validateArchive,
  type ArchivedBanzuke,
  type ArchiveIndex,
} from '../../src/data/archive.ts'

const INDEX = 'index.json'

/** Every archive in `dir`, validated. Throws naming the first file that is not one. */
export async function readArchives(dir: string): Promise<ArchivedBanzuke[]> {
  let names: string[]
  try {
    names = await readdir(dir)
  } catch {
    return []
  }
  const archives: ArchivedBanzuke[] = []
  for (const name of names.filter((n) => n.endsWith('.json') && n !== INDEX).sort()) {
    const parsed: unknown = JSON.parse(await readFile(join(dir, name), 'utf8'))
    const result = validateArchive(parsed)
    if (!result.ok) throw new Error(`${join(dir, name)}: ${result.error}`)
    archives.push(result.archive)
  }
  return archives
}

export async function writeArchive(dir: string, archive: ArchivedBanzuke): Promise<string> {
  await mkdir(dir, { recursive: true })
  const path = join(dir, archiveFileName(archive.bashoId))
  await writeFile(path, `${JSON.stringify(archive, null, 1)}\n`, 'utf8')
  return path
}

export async function writeIndex(
  dir: string,
  archives: ArchivedBanzuke[],
  now = new Date()
): Promise<string> {
  const index = buildIndex(archives, now.toISOString())
  const path = join(dir, INDEX)
  await writeFile(path, `${JSON.stringify(index, null, 1)}\n`, 'utf8')
  return path
}

/** Rebuilds index.json from the archive files actually present. */
export async function refreshIndex(dir: string): Promise<ArchiveIndex> {
  const archives = await readArchives(dir)
  await writeIndex(dir, archives)
  return buildIndex(archives, new Date().toISOString())
}
```
(`JSON.stringify(…, null, 1)` — one-space indent keeps the files diffable without doubling their size.)

- [ ] **Step 4:** run → PASS.

- [ ] **Step 5: The CLI** — `scripts/archive-banzuke.ts`:

```ts
/**
 * Adds the tournament in a JSA snapshot to the banzuke archive.
 *
 * Usage:
 *   tsx scripts/archive-banzuke.ts [--snapshot <path>] [--out-dir <dir>]
 *
 * Writes <out-dir>/<bashoId>.json (overwriting a previous copy of the same
 * tournament — the JSA occasionally corrects a banzuke) and rebuilds
 * <out-dir>/index.json from every archive present.
 *
 * Exit codes: 0 success, 2 the snapshot did not validate.
 */
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { archiveFromBanzukeSet } from '../src/data/archive.ts'
import { normalizeSnapshot } from '../src/data/normalize.ts'
import { validateSnapshot } from '../src/data/schema.ts'
import { refreshIndex, writeArchive } from './lib/archive-io.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
  },
})

async function main(): Promise<number> {
  const snapshotPath = resolve(args.snapshot as string)
  const outDir = resolve(args['out-dir'] as string)

  const parsed: unknown = JSON.parse(await readFile(snapshotPath, 'utf8'))
  const result = validateSnapshot(parsed)
  if (!result.ok) {
    console.error(`${snapshotPath} is invalid:`)
    for (const error of result.errors) console.error(`  - ${error}`)
    return 2
  }

  const archive = archiveFromBanzukeSet(normalizeSnapshot(result.snapshot, 'live'))
  const path = await writeArchive(outDir, archive)
  console.log(
    `Archived basho ${archive.bashoId} (${archive.year}-${String(archive.month).padStart(2, '0')}): ${archive.rikishi.length} wrestlers, ${archive.divisions.join('+')} → ${path}`
  )
  const index = await refreshIndex(outDir)
  console.log(`Index: ${index.basho.length} tournaments (${index.basho[0]?.bashoId}…${index.basho.at(-1)?.bashoId})`)
  return 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
```
`package.json` scripts, after `make-sample`: `"archive-banzuke": "tsx scripts/archive-banzuke.ts",`

- [ ] **Step 6: Run it** — `npm run archive-banzuke` → expect `Archived basho 637 (2026-09): 70 wrestlers, makuuchi+juryo → …/public/banzuke/637.json` and `Index: 1 tournaments (637…637)`. (Wrestler count = 42 Makuuchi + 28 Juryo; report the actual number.) `ls public/banzuke/` → `637.json`, `index.json`. **Do not commit these two files yet** — Task A5 produces the rest and Task A7 commits the data with its test.
- [ ] **Step 7:** Gate (the new files under `public/` do not affect it); commit `scripts: archive-banzuke writes a tournament into public/banzuke and rebuilds the index` with `scripts/lib/archive-io.ts`, its test, `scripts/archive-banzuke.ts`, `package.json` — **not** `public/banzuke/`.

---

### Task A5: The `backfill-archive` CLI and the backfilled data

**Files:**
- Create: `scripts/backfill-archive.ts`
- Modify: `package.json` (script `backfill-archive`)
- Create (generated): `public/banzuke/632.json` … `636.json`

**Interfaces:**
- Consumes: A3 `archiveFromSumoApi` and types; A4 `writeArchive`, `refreshIndex`; `fetchJson` from `scripts/lib/http.ts` (existing: `fetchJson<T>(url, { timeoutMs?, attempts? })`); `sumoApiBashoId`/`bashoIdFromSumoApi` (A1).
- CLI: `tsx scripts/backfill-archive.ts <YYYYMM>... [--out-dir <dir>] [--delay <ms>]`. Exit 0 success, 1 fetch failure, 2 an archive had unmapped entries (nothing written for that tournament).

- [ ] **Step 1: Implement** `scripts/backfill-archive.ts`:

```ts
/**
 * Fills the archive for tournaments before this site kept its own copies,
 * from sumo-api.com (https://www.sumo-api.com — free, "please use it
 * responsibly"). Each entry is joined to the JSA by sumo-api's `nskId`; a
 * tournament with any unmapped wrestler is reported and not written.
 *
 * Usage:
 *   tsx scripts/backfill-archive.ts 202511 202601 202603 202605 202607 [--out-dir <dir>] [--delay <ms>]
 *
 * Exit codes: 0 success, 1 a request failed, 2 a tournament could not be mapped.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { bashoIdFromSumoApi } from '../src/data/bashoIds.ts'
import { fetchJson } from './lib/http.ts'
import { refreshIndex, writeArchive } from './lib/archive-io.ts'
import {
  archiveFromSumoApi,
  type SumoApiBanzuke,
  type SumoApiBasho,
  type SumoApiRikishi,
} from './lib/sumo-api.ts'

const API = 'https://www.sumo-api.com/api'
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
    delay: { type: 'string', default: '500' },
  },
})

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

interface RikishiPage {
  records: SumoApiRikishi[]
  total: number
}

/** Every active wrestler in one call; retired ones are fetched singly as needed. */
async function loadRikishi(ids: Set<number>, delayMs: number): Promise<Map<number, SumoApiRikishi>> {
  const page = await fetchJson<RikishiPage>(`${API}/rikishis?limit=1000`, { timeoutMs: 60_000 })
  const map = new Map(page.records.map((r) => [r.id, r]))
  for (const id of ids) {
    if (map.has(id)) continue
    await sleep(delayMs)
    map.set(id, await fetchJson<SumoApiRikishi>(`${API}/rikishi/${id}`))
  }
  return map
}

async function backfill(yyyymm: string, outDir: string, delayMs: number): Promise<number> {
  const bashoId = bashoIdFromSumoApi(yyyymm)
  if (bashoId === null) {
    console.error(`${yyyymm}: not a tournament month`)
    return 2
  }
  console.log(`Fetching ${yyyymm} (basho ${bashoId})`)
  const basho = await fetchJson<SumoApiBasho>(`${API}/basho/${yyyymm}`)
  await sleep(delayMs)
  const makuuchi = await fetchJson<SumoApiBanzuke>(`${API}/basho/${yyyymm}/banzuke/Makuuchi`)
  await sleep(delayMs)
  const juryo = await fetchJson<SumoApiBanzuke>(`${API}/basho/${yyyymm}/banzuke/Juryo`)

  const ids = new Set([...makuuchi.east, ...makuuchi.west, ...juryo.east, ...juryo.west].map((e) => e.rikishiID))
  const rikishi = await loadRikishi(ids, delayMs)

  const { archive, problems } = archiveFromSumoApi({ basho, banzuke: [makuuchi, juryo], rikishi })
  if (problems.length > 0) {
    console.error(`${yyyymm}: ${problems.length} wrestler(s) could not be mapped; nothing written:`)
    for (const problem of problems) console.error(`  - ${problem}`)
    return 2
  }
  const path = await writeArchive(outDir, archive)
  console.log(`  ${archive.rikishi.length} wrestlers → ${path}`)
  return 0
}

async function main(): Promise<number> {
  if (positionals.length === 0) {
    console.error('Usage: tsx scripts/backfill-archive.ts <YYYYMM>... [--out-dir <dir>] [--delay <ms>]')
    return 2
  }
  const outDir = resolve(args['out-dir'] as string)
  const delayMs = Number(args.delay)
  let worst = 0
  for (const yyyymm of positionals) {
    try {
      worst = Math.max(worst, await backfill(yyyymm, outDir, delayMs))
    } catch (error) {
      console.error(`${yyyymm}: ${error instanceof Error ? error.message : error}`)
      worst = Math.max(worst, 1)
    }
    await sleep(delayMs)
  }
  const index = await refreshIndex(outDir)
  console.log(`Index: ${index.basho.length} tournaments`)
  return worst
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
```
`package.json`: `"backfill-archive": "tsx scripts/backfill-archive.ts",`

- [ ] **Step 2: Run the backfill** — `npm run backfill-archive -- 202511 202601 202603 202605 202607`. Expected: five `N wrestlers → …/63x.json` lines and `Index: 6 tournaments`. If any tournament reports unmapped wrestlers (likely a retired wrestler whose sumo-api record has `nskId: 0`), **report the names and stop** — the ruling on how to handle an id-less wrestler (skip with a note vs. synthetic negative id) is the controller's, not the implementer's.

- [ ] **Step 3: Sanity-check the data** —
```bash
node -e "for (const id of [632,633,634,635,636,637]) { const a=require('./public/banzuke/'+id+'.json'); console.log(id, a.year+'-'+a.month, a.source, a.divisions.join('+'), a.rikishi.length, 'M:', a.rikishi.filter(r=>r.division==='makuuchi').length) }"
node -e "const a=require('./public/banzuke/636.json'); console.log(a.rikishi.slice(0,4).map(r=>r.shikona.jp+' '+r.rankCode+r.side[0]).join(' | '))"
```
Expect 42–44 Makuuchi and ~28 Juryo per tournament; 636's first four to be the July 2026 Yokozuna/Ozeki (Hoshoryu 100e, Onosato 100w, Kirishima 200e, Kotozakura 200w per the probe). Put the output in the report.

- [ ] **Step 4:** Gate; commit `scripts: backfill the archive from sumo-api by JSA id` with `scripts/backfill-archive.ts` and `package.json` only. Data is committed in A7.

---

### Task A6: The mincho subset covers archived names

**Files:**
- Modify: `scripts/subset-fonts.ts` (`gatherTexts`, new `--archive-dir` flag)
- Modify: `scripts/lib/font-coverage.test.ts` (new test)
- Regenerate: `public/assets/fonts/NotoSerifJP-subset.json` (+ woff2 if it changes)

Why: Part B renders departed wrestlers' Japanese ring names in the serif; those names are no longer in the live snapshot.

- [ ] **Step 1: Failing test** — append to `scripts/lib/font-coverage.test.ts` inside the describe:

```ts
  it('covers every Japanese character in the banzuke archive', () => {
    const dir = resolve(root, 'public/banzuke')
    const texts = readdirSync(dir)
      .filter((name) => name.endsWith('.json'))
      .map((name) => readFileSync(join(dir, name), 'utf8'))
    expect(texts.length).toBeGreaterThan(0)
    expect(missingGlyphs(manifest.glyphs, texts)).toEqual([])
  })
```

- [ ] **Step 2:** `npx vitest run scripts/lib/font-coverage.test.ts` → the new case FAILS listing missing kanji (departed/older wrestlers), or passes if every archived name happens to be covered — either way continue.

- [ ] **Step 3: Implement** — in `scripts/subset-fonts.ts` add to `parseArgs` options:
  `'archive-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },`
  and in `gatherTexts(snapshotPath: string, archiveDir: string)` after the sample:
  ```ts
  // Archived tournaments: departed wrestlers' names render in the serif too.
  try {
    for (const name of await readdir(archiveDir)) {
      if (name.endsWith('.json')) texts.push(await readFile(join(archiveDir, name), 'utf8'))
    }
  } catch {
    // No archive yet: nothing to add.
  }
  ```
  Update the call site to pass `resolve(args['archive-dir'] as string)` and the usage comment to list `--archive-dir`.

- [ ] **Step 4:** `npm run subset-fonts` (uses the cached TTF; no download). Then the coverage test → PASS (5 tests). Note the new glyph count and woff2 size in the report.
- [ ] **Step 5:** Gate; commit `fonts: the subset covers the banzuke archive` with the script, test, manifest and (if changed) woff2.

---

### Task A7: Archive data test, commit the data, deploy step

**Files:**
- Create: `src/data/archive-files.test.ts`
- Commit: `public/banzuke/632.json … 637.json`, `public/banzuke/index.json`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Failing test** — `src/data/archive-files.test.ts`:

```ts
/**
 * The committed archive must be internally consistent: every file validates,
 * the index lists exactly the files present, and the newest entry is the
 * tournament the live snapshot shows (so "changes since last basho" always
 * has a previous to compare against once the next banzuke lands).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { archiveFileName, validateArchive, validateArchiveIndex } from './archive'
import { validateSnapshot } from './schema'

const dir = resolve(__dirname, '../../public/banzuke')
const read = (name: string): unknown => JSON.parse(readFileSync(resolve(dir, name), 'utf8'))

describe('public/banzuke', () => {
  const index = validateArchiveIndex(read('index.json'))
  const files = readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'index.json')

  it('has a valid index', () => {
    expect(index.ok).toBe(true)
  })

  it('lists exactly the archive files present', () => {
    if (!index.ok) throw new Error(index.error)
    expect(index.index.basho.map((b) => b.file).sort()).toEqual([...files].sort())
  })

  it('has valid archives whose ids match their file names and index entries', () => {
    if (!index.ok) throw new Error(index.error)
    for (const entry of index.index.basho) {
      const result = validateArchive(read(entry.file))
      if (!result.ok) throw new Error(`${entry.file}: ${result.error}`)
      expect(archiveFileName(result.archive.bashoId)).toBe(entry.file)
      expect(result.archive.divisions).toEqual(entry.divisions)
      expect(result.archive.startDate).toBe(entry.startDate)
      expect(result.archive.rikishi.length).toBeGreaterThanOrEqual(40)
    }
  })

  it('covers the live tournament', () => {
    if (!index.ok) throw new Error(index.error)
    const live = validateSnapshot(read('../latest-banzuke.json'))
    if (!live.ok) throw new Error(live.errors.join('; '))
    const liveId = Number(live.snapshot.divisions.makuuchi.payloads.en.basho_id)
    expect(index.index.basho.at(-1)?.bashoId).toBe(liveId)
  })

  it('is contiguous — no tournament missing between first and last', () => {
    if (!index.ok) throw new Error(index.error)
    const ids = index.index.basho.map((b) => b.bashoId)
    expect(ids).toEqual(ids.map((_, i) => ids[0] + i))
  })
})
```

- [ ] **Step 2:** `npx vitest run src/data/archive-files.test.ts` → PASS immediately if A4/A5 left `public/banzuke/` complete (632–637 + index); otherwise it names what is missing — fix by re-running `npm run archive-banzuke` / the backfill.

- [ ] **Step 3: deploy.yml** — in the `data` job, insert **before** `Regenerate the mincho subset`:

```yaml
      # Every tournament the site has shown stays available under
      # public/banzuke/, which is what "changes since last basho" reads.
      - name: Archive the banzuke
        if: steps.fetch.outputs.changed == 'true'
        run: |
          mkdir -p .data/banzuke
          cp public/banzuke/*.json .data/banzuke/
          npx tsx scripts/archive-banzuke.ts \
            --snapshot .data/latest-banzuke.json \
            --out-dir .data/banzuke
```
Then change the mincho step's command to add `--archive-dir .data/banzuke \` (keep the existing flags). In `Commit refreshed data to main`, after the fonts copy line add:
```
          if [ -d .data/banzuke ]; then cp .data/banzuke/*.json public/banzuke/; fi
```
and change the `git add` line to `git add public/latest-banzuke.json public/assets/fonts public/banzuke`.

Sanity: `grep -n "Archive the banzuke\|--archive-dir\|public/banzuke" .github/workflows/deploy.yml` → four hits in the expected order (archive step, font flag, cp, git add).

- [ ] **Step 4:** Gate; commit `data: the banzuke archive, 2025-11 → 2026-09, and its deploy step` with `public/banzuke/*.json`, the test, and `deploy.yml`.

---

### Task A8: Docs and PR A

**Files:** `README.md`, `CLAUDE.md`

- [ ] README "Project structure": under `public/` add
  ```
    banzuke/                   # One file per tournament + index.json (npm run archive-banzuke)
  ```
  under `scripts/` add
  ```
    archive-banzuke.ts           # Adds the snapshot's tournament to public/banzuke/
    backfill-archive.ts          # One-off: earlier tournaments from sumo-api.com, joined by JSA id
    lib/sumo-api.ts              # sumo-api shapes → archive format
    lib/archive-io.ts            # Read/write the archive directory
  ```
  "Data refresh and deployment" item 2 becomes: "When the tournament data changed, archives it under `public/banzuke/` and regenerates the mincho subset (new wrestlers can bring new kanji). Wrestler profiles are checked on every run and re-scraped only for wrestlers whose stored profile predates the current tournament." Add a "### Archive" subsection under "Data sources":
  ```markdown
  ### Archive

  `public/banzuke/{bashoId}.json` holds every tournament the site has shown (ring names, ranks,
  sides, stable and region for Makuuchi and Juryo), written by `npm run archive-banzuke` from the
  JSA snapshot. Tournaments before this site kept copies (2025-11 → 2026-07) were filled once from
  [sumo-api.com](https://www.sumo-api.com/), whose rikishi records carry the JSA id (`nskId`), by
  `npm run backfill-archive -- 202511 202601 202603 202605 202607`. `index.json` lists them all.
  ```
  "Manual (local)" gains `npm run archive-banzuke   # add the current snapshot's tournament to public/banzuke/`.
- [ ] CLAUDE.md Commands: add `npm run archive-banzuke # write public/banzuke/{id}.json + index from the snapshot`. Data flow paragraph: "When the tournament data changed it also archives the banzuke under `public/banzuke/`, regenerates the mincho subset; …". "Things that look odd" new bullet:
  ```markdown
  - `public/banzuke/` is the **archive**: one small validated file per tournament (`src/data/archive.ts`),
    keyed by JSA rikishi id, plus `index.json`. JSA-sourced files come from `scripts/archive-banzuke.ts`;
    2025-11 → 2026-07 came from sumo-api.com via `nskId` (its `heya`/`pref` have `jp: ''`).
    `src/data/archive-files.test.ts` insists the index matches the files, is contiguous, and ends at
    the live tournament; the font subset includes these files because departed names render in mincho.
  ```
- [ ] Gate; commit `docs: the banzuke archive`.
- [ ] `git push -u origin feat/banzuke-archive`; `gh pr create` titled "Banzuke archive: one file per tournament, backfilled from 2025-11" with a body summarising Tasks A1–A7 and ending with the standard footer; `gh pr checks --watch`.
- [ ] **After merge (user's call):** watch `Build & Deploy`; the run should be `changed=false` and skip the archive step. Confirm `https://jonath0n.github.io/banzuke-app/banzuke/index.json` serves and lists six entries. Then start Part B.

---

# Part B — Diff mode and departures (branch `feat/diff-mode`)

### Task B0: Branch
- [ ] `git checkout main && git pull --ff-only && git checkout -b feat/diff-mode`; baseline gate green.

---

### Task B1: The diff (`src/utils/diff.ts`)

**Files:**
- Create: `src/utils/diff.ts`
- Test: `src/utils/diff.test.ts`

**Interfaces:**
- Consumes: `Rikishi`, `Division`, `Side` types; `ArchivedBanzuke`, `ArchivedRikishi` (A2); `getRankLabel` from `src/constants/ranks.ts`; `jpRankShort`, `RANK_KANJI`? — use `jpRankShort(rankCode, rankNumber)` and fall back to `RANK_LEVEL_KANJI[getRankLevelFromCode(code)]`.
- Produces:
  ```ts
  export type MovementKind = 'up' | 'down' | 'same' | 'new'
  export interface PreviousRank { division: Division; rankCode: number; rankNumber: number; seat: number; side: Side }
  export interface Movement { kind: MovementKind; previous: PreviousRank | null; sideChanged: boolean }
  export interface Departure { was: ArchivedRikishi; now: Rikishi | null }   // now = present in the other division
  export interface Departures { moved: Departure[]; gone: Departure[] }
  export interface BanzukeDiff { previousBashoId: number; movements: Map<number, Movement>; byDivision: Record<Division, Departures> }
  export function rankPosition(r: { rankCode: number; rankNumber: number }): number   // smaller = higher on the sheet
  export function compareMovement(current, previous): MovementKind   // 'up' | 'down' | 'same'
  export function diffBanzuke(current: Rikishi[], currentDivisionOf: (r: Rikishi) => Division, previous: ArchivedBanzuke): BanzukeDiff
  export function previousRankLabel(previous: PreviousRank, language: Language): string   // 'M5' | '前頭五' …
  export function describeMovement(m: Movement, language: Language): string   // full sentence for aria/list
  ```
  Simplify `diffBanzuke`'s signature: take `current: Array<{ rikishi: Rikishi; division: Division }>` — App builds it from the set.

- [ ] **Step 1: Failing tests** — `src/utils/diff.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { compareMovement, describeMovement, diffBanzuke, previousRankLabel, rankPosition } from './diff'
import { makeArchivedBanzuke, makeArchivedRikishi, makeRikishi } from '../test/fixtures'
import type { Division } from '../types/banzuke'

const M = (id: number, n: number, side: 'east' | 'west' = 'east') =>
  makeRikishi({ id, rankCode: 500, rankLevel: 'maegashira', rankNumber: n, side })
const J = (id: number, n: number, side: 'east' | 'west' = 'east') =>
  makeRikishi({ id, rankCode: 600, rankLevel: 'juryo', rankNumber: n, side })
const withDivision = (rows: ReturnType<typeof makeRikishi>[], division: Division) =>
  rows.map((rikishi) => ({ rikishi, division }))

describe('rankPosition', () => {
  it('orders the ladder Y < O < S < K < M1 < M17 < J1 and ignores sanyaku seats', () => {
    const p = (rankCode: number, rankNumber = 1) => rankPosition({ rankCode, rankNumber })
    expect(p(100)).toBeLessThan(p(200))
    expect(p(200)).toBeLessThan(p(300))
    expect(p(300)).toBeLessThan(p(400))
    expect(p(400)).toBeLessThan(p(500, 1))
    expect(p(500, 1)).toBeLessThan(p(500, 17))
    expect(p(500, 17)).toBeLessThan(p(600, 1))
    expect(p(600, 1)).toBeLessThan(p(600, 14))
  })
})

describe('compareMovement', () => {
  it('reads direction from position only', () => {
    expect(compareMovement({ rankCode: 500, rankNumber: 2 }, { rankCode: 500, rankNumber: 5 })).toBe('up')
    expect(compareMovement({ rankCode: 500, rankNumber: 5 }, { rankCode: 500, rankNumber: 2 })).toBe('down')
    expect(compareMovement({ rankCode: 400, rankNumber: 1 }, { rankCode: 500, rankNumber: 1 })).toBe('up')
    expect(compareMovement({ rankCode: 600, rankNumber: 1 }, { rankCode: 500, rankNumber: 17 })).toBe('down')
    expect(compareMovement({ rankCode: 200, rankNumber: 1 }, { rankCode: 200, rankNumber: 1 })).toBe('same')
  })
})

describe('diffBanzuke', () => {
  const previous = makeArchivedBanzuke({
    rikishi: [
      makeArchivedRikishi({ id: 1, rankCode: 100, side: 'west' }), // Y west
      makeArchivedRikishi({ id: 2, rankCode: 500, rankNumber: 5 }), // M5
      makeArchivedRikishi({ id: 3, rankCode: 500, rankNumber: 1 }), // M1
      makeArchivedRikishi({ id: 4, rankCode: 500, rankNumber: 16 }), // M16 → will be J
      makeArchivedRikishi({ id: 5, rankCode: 500, rankNumber: 17 }), // M17 → gone
      makeArchivedRikishi({ id: 6, division: 'juryo', rankCode: 600, rankNumber: 2 }), // J2 → M
      makeArchivedRikishi({ id: 7, division: 'juryo', rankCode: 600, rankNumber: 14 }), // J14 → gone
    ],
  })
  const current = [
    ...withDivision([makeRikishi({ id: 1, side: 'east' }), M(2, 2), M(3, 4, 'west'), M(6, 16), M(8, 17)], 'makuuchi'),
    ...withDivision([J(4, 1), J(9, 14)], 'juryo'),
  ]
  const diff = diffBanzuke(current, previous)

  it('names the previous tournament', () => {
    expect(diff.previousBashoId).toBe(636)
  })

  it('classifies every current wrestler', () => {
    const m = (id: number) => diff.movements.get(id)
    expect(m(1)).toEqual({
      kind: 'same',
      sideChanged: true,
      previous: { division: 'makuuchi', rankCode: 100, rankNumber: 1, seat: 1, side: 'west' },
    })
    expect(m(2)?.kind).toBe('up')
    expect(m(2)?.previous?.rankNumber).toBe(5)
    expect(m(3)?.kind).toBe('down')
    expect(m(6)?.kind).toBe('up')
    expect(m(6)?.previous?.division).toBe('juryo')
    expect(m(4)?.kind).toBe('down')
    expect(m(4)?.previous?.rankNumber).toBe(16)
    expect(m(8)).toEqual({ kind: 'new', previous: null, sideChanged: false })
    expect(m(9)?.kind).toBe('new')
    expect(diff.movements.size).toBe(7)
  })

  it('lists departures per division, split by whether they are still on the sheet', () => {
    expect(diff.byDivision.makuuchi.moved.map((d) => [d.was.id, d.now?.id])).toEqual([[4, 4]])
    expect(diff.byDivision.makuuchi.gone.map((d) => d.was.id)).toEqual([5])
    expect(diff.byDivision.juryo.moved.map((d) => [d.was.id, d.now?.id])).toEqual([[6, 6]])
    expect(diff.byDivision.juryo.gone.map((d) => d.was.id)).toEqual([7])
  })

  it('keeps departures in the previous banzuke order', () => {
    const prev = makeArchivedBanzuke({
      rikishi: [
        makeArchivedRikishi({ id: 21, rankCode: 500, rankNumber: 3 }),
        makeArchivedRikishi({ id: 22, rankCode: 500, rankNumber: 9 }),
      ],
    })
    const d = diffBanzuke([], prev)
    expect(d.byDivision.makuuchi.gone.map((x) => x.was.id)).toEqual([21, 22])
  })
})

describe('labels', () => {
  const prev = { division: 'makuuchi' as const, rankCode: 500, rankNumber: 5, seat: 1, side: 'east' as const }
  it('names the previous rank briefly in each language', () => {
    expect(previousRankLabel(prev, 'en')).toBe('M5')
    expect(previousRankLabel({ ...prev, rankCode: 400, rankNumber: 1 }, 'en')).toBe('K')
    expect(previousRankLabel({ ...prev, division: 'juryo', rankCode: 600, rankNumber: 2 }, 'en')).toBe('J2')
    expect(previousRankLabel(prev, 'jp')).toMatch(/^前頭/)
    expect(previousRankLabel({ ...prev, rankCode: 100, rankNumber: 1 }, 'jp')).toBe('横綱')
  })

  it('describes a movement as a sentence', () => {
    expect(describeMovement({ kind: 'up', previous: prev, sideChanged: false }, 'en')).toBe('Up from M5')
    expect(describeMovement({ kind: 'down', previous: { ...prev, rankCode: 400 }, sideChanged: false }, 'en')).toBe('Down from K')
    expect(describeMovement({ kind: 'same', previous: prev, sideChanged: false }, 'en')).toBe('Unchanged')
    expect(describeMovement({ kind: 'same', previous: { ...prev, side: 'west' }, sideChanged: true }, 'en')).toBe('Unchanged, West to East')
    expect(describeMovement({ kind: 'new', previous: null, sideChanged: false }, 'en')).toBe('New to the sheet')
    expect(describeMovement({ kind: 'up', previous: prev, sideChanged: false }, 'jp')).toMatch(/^前頭.*から$/)
    expect(describeMovement({ kind: 'new', previous: null, sideChanged: false }, 'jp')).toBe('番付外から')
  })
})
```

- [ ] **Step 2:** run → FAIL.

- [ ] **Step 3: Implement** `src/utils/diff.ts`:

```ts
/**
 * What changed since the previous banzuke. Pure functions over the current
 * normalized rows and an archived tournament; the UI only renders the result.
 *
 * Movement is expressed as the rank a wrestler came from, never as a step
 * count: steps are well defined inside Maegashira, fuzzy across sanyaku and
 * undefined across the Juryo line, and fans say 「前頭五枚目から」, not "+3".
 */
import type { Division, Language, Rikishi, Side } from '../types/banzuke'
import type { ArchivedBanzuke, ArchivedRikishi } from '../data/archive'
import { getRankLabel, getRankLevelFromCode, RANK_LEVEL_KANJI } from '../constants/ranks'
import { jpRankShort } from '../data/kanji'

export type MovementKind = 'up' | 'down' | 'same' | 'new'

export interface PreviousRank {
  division: Division
  rankCode: number
  rankNumber: number
  seat: number
  side: Side
}

export interface Movement {
  kind: MovementKind
  /** Null only for 'new'. */
  previous: PreviousRank | null
  /** East ↔ West at an otherwise identical rank. */
  sideChanged: boolean
}

export interface Departure {
  was: ArchivedRikishi
  /** The current row when the wrestler is still on the sheet in the other division. */
  now: Rikishi | null
}

export interface Departures {
  /** Left this division for the other one. */
  moved: Departure[]
  /** On neither division now: retired, injured, or below Juryo. */
  gone: Departure[]
}

export interface BanzukeDiff {
  previousBashoId: number
  movements: Map<number, Movement>
  byDivision: Record<Division, Departures>
}

export interface CurrentRow {
  rikishi: Rikishi
  division: Division
}

/**
 * A single number that orders the whole ladder: tier first, then position.
 * Sanyaku seats are the same rank (two Ozeki are both Ozeki), so they do not
 * enter into it.
 */
export function rankPosition(r: { rankCode: number; rankNumber: number }): number {
  return r.rankCode * 100 + (r.rankCode >= 500 ? r.rankNumber : 0)
}

export function compareMovement(
  current: { rankCode: number; rankNumber: number },
  previous: { rankCode: number; rankNumber: number }
): Exclude<MovementKind, 'new'> {
  const now = rankPosition(current)
  const then = rankPosition(previous)
  if (now < then) return 'up'
  if (now > then) return 'down'
  return 'same'
}

function previousRank(entry: ArchivedRikishi): PreviousRank {
  const { division, rankCode, rankNumber, seat, side } = entry
  return { division, rankCode, rankNumber, seat, side }
}

export function diffBanzuke(current: CurrentRow[], previous: ArchivedBanzuke): BanzukeDiff {
  const previousById = new Map(previous.rikishi.map((r) => [r.id, r]))
  const currentById = new Map(current.map((row) => [row.rikishi.id, row]))

  const movements = new Map<number, Movement>()
  for (const { rikishi } of current) {
    const before = previousById.get(rikishi.id)
    if (!before) {
      movements.set(rikishi.id, { kind: 'new', previous: null, sideChanged: false })
      continue
    }
    const kind = compareMovement(rikishi, before)
    movements.set(rikishi.id, {
      kind,
      previous: previousRank(before),
      sideChanged: kind === 'same' && before.side !== rikishi.side,
    })
  }

  const byDivision: Record<Division, Departures> = {
    makuuchi: { moved: [], gone: [] },
    juryo: { moved: [], gone: [] },
  }
  for (const was of previous.rikishi) {
    const now = currentById.get(was.id)
    if (now && now.division === was.division) continue
    const bucket = byDivision[was.division]
    if (now) bucket.moved.push({ was, now: now.rikishi })
    else bucket.gone.push({ was, now: null })
  }

  return { previousBashoId: previous.bashoId, movements, byDivision }
}

/** 'M5' / 'K' / 'J2' in English; 前頭五 / 小結 / 十両二 in Japanese. */
export function previousRankLabel(previous: PreviousRank, language: Language): string {
  if (language === 'jp') {
    return (
      jpRankShort(previous.rankCode, previous.rankNumber) ||
      RANK_LEVEL_KANJI[getRankLevelFromCode(previous.rankCode)]
    )
  }
  return getRankLabel(previous.rankCode, previous.rankNumber)
}

const SIDE_EN: Record<Side, string> = { east: 'East', west: 'West' }
const SIDE_JA: Record<Side, string> = { east: '東', west: '西' }

/** A sentence for accessible names and the list view. */
export function describeMovement(movement: Movement, language: Language): string {
  const { kind, previous, sideChanged } = movement
  if (language === 'jp') {
    if (kind === 'new' || !previous) return '番付外から'
    const from = previousRankLabel(previous, 'jp')
    if (kind === 'same') {
      return sideChanged ? `${SIDE_JA[previous.side]}から${SIDE_JA[previous.side === 'east' ? 'west' : 'east']}へ` : '変動なし'
    }
    return `${from}から`
  }
  if (kind === 'new' || !previous) return 'New to the sheet'
  const from = previousRankLabel(previous, 'en')
  if (kind === 'same') {
    if (!sideChanged) return 'Unchanged'
    const to = previous.side === 'east' ? 'west' : 'east'
    return `Unchanged, ${SIDE_EN[previous.side]} to ${SIDE_EN[to]}`
  }
  return `${kind === 'up' ? 'Up' : 'Down'} from ${from}`
}
```
Check `jpRankShort`'s actual output for Maegashira (`src/data/kanji.ts:49`) before asserting; the tests above only assert a `前頭` prefix for that reason. If it returns `''` for sanyaku, the fallback covers it (the test asserts 横綱).

- [ ] **Step 4:** run → PASS. Gate; commit `utils: diff a banzuke against the archived previous one`.

---

### Task B2: Archive hooks

**Files:**
- Create: `src/hooks/useArchive.ts`
- Test: `src/hooks/useArchive.test.tsx`

**Interfaces:**
- Consumes: `validateArchiveIndex`, `validateArchive`, `ArchiveIndex`, `ArchiveIndexEntry`, `ArchivedBanzuke` (A2).
- Produces:
  - `loadArchiveIndex(): Promise<ArchiveIndex | null>` (cached; null on any failure, with `console.warn`)
  - `loadArchive(file: string): Promise<ArchivedBanzuke | null>` (cached per file)
  - `resetArchiveCache(): void` (tests)
  - `useArchiveIndex(): ArchiveIndex | null`
  - `useArchivedBanzuke(entry: ArchiveIndexEntry | null): { status: 'idle' | 'loading' | 'ready' | 'unavailable'; archive: ArchivedBanzuke | null }`
  - URLs: `${import.meta.env.BASE_URL}banzuke/index.json`, `${import.meta.env.BASE_URL}banzuke/${entry.file}`.

- [ ] **Step 1: Failing tests** — `src/hooks/useArchive.test.tsx`:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetArchiveCache, useArchivedBanzuke, useArchiveIndex } from './useArchive'
import { makeArchivedBanzuke, makeArchiveIndex } from '../test/fixtures'

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: vi.fn().mockResolvedValue(body) } as unknown as Response
}
const notFound = { ok: false, status: 404, statusText: 'Not Found' } as Response

describe('useArchive', () => {
  beforeEach(() => resetArchiveCache())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('loads and validates the index once, sharing it between callers', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(makeArchiveIndex()))
    vi.stubGlobal('fetch', fetchSpy)
    const a = renderHook(() => useArchiveIndex())
    const b = renderHook(() => useArchiveIndex())
    await waitFor(() => expect(a.result.current?.basho).toHaveLength(2))
    await waitFor(() => expect(b.result.current?.basho).toHaveLength(2))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/banzuke\/index\.json$/)
  })

  it('treats a missing or invalid index as no archive', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound))
    const { result } = renderHook(() => useArchiveIndex())
    await waitFor(() => expect(console.warn).toHaveBeenCalled())
    expect(result.current).toBeNull()
  })

  it('does nothing without an entry, then loads the named file', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse(makeArchivedBanzuke()))
    vi.stubGlobal('fetch', fetchSpy)
    const entry = makeArchiveIndex().basho[1]
    const { result, rerender } = renderHook(({ e }) => useArchivedBanzuke(e), {
      initialProps: { e: null as typeof entry | null },
    })
    expect(result.current).toEqual({ status: 'idle', archive: null })
    expect(fetchSpy).not.toHaveBeenCalled()
    rerender({ e: entry })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.archive?.bashoId).toBe(636)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/banzuke\/636\.json$/)
  })

  it('reports an archive that fails validation as unavailable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ version: 9 })))
    const { result } = renderHook(() => useArchivedBanzuke(makeArchiveIndex().basho[1]))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
  })
})
```

- [ ] **Step 2:** run → FAIL.

- [ ] **Step 3: Implement** `src/hooks/useArchive.ts`:

```ts
import { useEffect, useState } from 'react'
import {
  validateArchive,
  validateArchiveIndex,
  type ArchivedBanzuke,
  type ArchiveIndex,
  type ArchiveIndexEntry,
} from '../data/archive'

const ARCHIVE_BASE = `${import.meta.env.BASE_URL}banzuke/`

let indexPending: Promise<ArchiveIndex | null> | null = null
const archivePending = new Map<string, Promise<ArchivedBanzuke | null>>()

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<unknown>
}

/** The archive index, once per page; null when there is no archive. */
export function loadArchiveIndex(): Promise<ArchiveIndex | null> {
  if (!indexPending) {
    indexPending = fetchJson(`${ARCHIVE_BASE}index.json`)
      .then((parsed) => {
        const result = validateArchiveIndex(parsed)
        if (!result.ok) throw new Error(result.error)
        return result.index
      })
      .catch((error: unknown) => {
        console.warn('Banzuke archive unavailable:', error instanceof Error ? error.message : error)
        return null
      })
  }
  return indexPending
}

/** One archived tournament, once per file. */
export function loadArchive(file: string): Promise<ArchivedBanzuke | null> {
  let pending = archivePending.get(file)
  if (!pending) {
    pending = fetchJson(`${ARCHIVE_BASE}${file}`)
      .then((parsed) => {
        const result = validateArchive(parsed)
        if (!result.ok) throw new Error(result.error)
        return result.archive
      })
      .catch((error: unknown) => {
        console.warn(`Archived banzuke ${file} unavailable:`, error instanceof Error ? error.message : error)
        return null
      })
    archivePending.set(file, pending)
  }
  return pending
}

/** Forgets everything loaded so the next call fetches again (tests). */
export function resetArchiveCache(): void {
  indexPending = null
  archivePending.clear()
}

export function useArchiveIndex(): ArchiveIndex | null {
  const [index, setIndex] = useState<ArchiveIndex | null>(null)
  useEffect(() => {
    let cancelled = false
    loadArchiveIndex().then((loaded) => {
      if (!cancelled) setIndex(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return index
}

export interface ArchivedBanzukeState {
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  archive: ArchivedBanzuke | null
}

/** The archive an index entry points at; idle until given an entry. */
export function useArchivedBanzuke(entry: ArchiveIndexEntry | null): ArchivedBanzukeState {
  const file = entry?.file ?? null
  const [state, setState] = useState<ArchivedBanzukeState & { file: string | null }>({
    status: 'idle',
    archive: null,
    file: null,
  })

  useEffect(() => {
    if (!file) return
    let cancelled = false
    loadArchive(file).then((archive) => {
      if (cancelled) return
      setState({ status: archive ? 'ready' : 'unavailable', archive, file })
    })
    return () => {
      cancelled = true
    }
  }, [file])

  if (!file) return { status: 'idle', archive: null }
  if (state.file !== file) return { status: 'loading', archive: null }
  return { status: state.status, archive: state.archive }
}
```

- [ ] **Step 4:** run → PASS. Gate; commit `hooks: load the banzuke archive index and one archived tournament`.

---

### Task B3: Strings

**Files:** `src/i18n/strings.ts` (both tables; `strings.test.ts` enforces parity)

- [ ] Add to `en` after the `// View` block:
```ts
  // Changes since the previous banzuke
  changes: 'Changes',
  changesSince: (basho: string) => `Changes since ${basho}`,
  changesUnavailable: 'The previous banzuke could not be loaded.',
  movementNew: 'New',
  departedHeading: (division: string, basho: string) => `Left ${division} since ${basho}`,
  departedMovedTo: (division: string) => `Now in ${division}`,
  departedGone: 'No longer on the sheet',
  departedWas: (rank: string) => `was ${rank}`,
  departedNow: (rank: string) => `now ${rank}`,
  departedNone: 'Nobody left.',
```
and to `jp`:
```ts
  changes: '変動',
  changesSince: (basho: string) => `${basho}からの変動`,
  changesUnavailable: '前回の番付を読み込めませんでした。',
  movementNew: '新',
  departedHeading: (division: string, basho: string) => `${basho}から${division}を離れた力士`,
  departedMovedTo: (division: string) => `${division}へ`,
  departedGone: '番付外へ',
  departedWas: (rank: string) => `前 ${rank}`,
  departedNow: (rank: string) => `現 ${rank}`,
  departedNone: '該当なし',
```
- [ ] `npx vitest run src/i18n` → PASS. Commit `i18n: strings for changes and departures`.

---

### Task B4: `MovementBadge`

**Files:**
- Create: `src/components/MovementBadge/MovementBadge.tsx`, `MovementBadge.module.css`
- Test: `src/components/MovementBadge/MovementBadge.test.tsx`

**Interfaces:**
- Consumes: `Movement`, `previousRankLabel`, `describeMovement` (B1); strings (B3).
- Produces: `MovementBadge({ movement, variant }: { movement: Movement; variant: 'sheet' | 'row' })` — renders `null` for `same` without a side change on the sheet; renders arrow + label otherwise; **`aria-hidden`** (the parent button carries `describeMovement` in its accessible name); `data-kind` attribute for styling.

- [ ] **Step 1: Failing tests**

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MovementBadge } from './MovementBadge'
import { LanguageProvider } from '../../contexts/LanguageContext'
import type { Movement } from '../../utils/diff'

const prev = { division: 'makuuchi' as const, rankCode: 500, rankNumber: 5, seat: 1, side: 'east' as const }
const wrap = (m: Movement, variant: 'sheet' | 'row' = 'sheet') =>
  render(
    <LanguageProvider>
      <MovementBadge movement={m} variant={variant} />
    </LanguageProvider>
  ).container

describe('MovementBadge', () => {
  it('shows an up arrow and the previous rank', () => {
    const el = wrap({ kind: 'up', previous: prev, sideChanged: false }).firstElementChild!
    expect(el).toHaveTextContent('▲')
    expect(el).toHaveTextContent('M5')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveAttribute('data-kind', 'up')
  })

  it('shows a down arrow', () => {
    expect(wrap({ kind: 'down', previous: { ...prev, rankCode: 400 }, sideChanged: false })).toHaveTextContent('▼K')
  })

  it('marks a newcomer', () => {
    const el = wrap({ kind: 'new', previous: null, sideChanged: false }).firstElementChild!
    expect(el).toHaveTextContent('New')
    expect(el).toHaveAttribute('data-kind', 'new')
  })

  it('renders nothing on the sheet for an unchanged rank, but a side swap on a row', () => {
    expect(wrap({ kind: 'same', previous: prev, sideChanged: false }).firstElementChild).toBeNull()
    expect(wrap({ kind: 'same', previous: prev, sideChanged: false }, 'row').firstElementChild).toBeNull()
    expect(wrap({ kind: 'same', previous: { ...prev, side: 'west' }, sideChanged: true }, 'row')).toHaveTextContent('W→E')
    expect(wrap({ kind: 'same', previous: { ...prev, side: 'west' }, sideChanged: true }, 'sheet').firstElementChild).toBeNull()
  })
})
```

- [ ] **Step 2:** run → FAIL.

- [ ] **Step 3: Implement**

```tsx
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { previousRankLabel, type Movement } from '../../utils/diff'
import styles from './MovementBadge.module.css'

interface MovementBadgeProps {
  movement: Movement
  /** On the sheet the badge stands under the name; on a row it sits beside it. */
  variant: 'sheet' | 'row'
}

const ARROW = { up: '▲', down: '▼' } as const

/**
 * The rank a wrestler came from, with an arrow for direction. Decorative:
 * the button that contains it says the same thing in words
 * (`describeMovement`), because an arrow glyph is not a sentence.
 */
export function MovementBadge({ movement, variant }: MovementBadgeProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const { kind, previous, sideChanged } = movement

  if (kind === 'same' && (!sideChanged || variant === 'sheet')) return null

  let text: string
  if (kind === 'new' || !previous) {
    text = strings.movementNew
  } else if (kind === 'same') {
    text = previous.side === 'west' ? 'W→E' : 'E→W'
  } else {
    text = `${ARROW[kind]}${previousRankLabel(previous, language)}`
  }

  return (
    <span
      className={`${styles.badge} ${styles[variant]}`}
      data-kind={kind}
      lang={kind === 'same' ? 'en' : langAttr(language)}
      aria-hidden="true"
    >
      {text}
    </span>
  )
}
```
`MovementBadge.module.css`:
```css
/* The rank a wrestler came from. Direction is the arrow, never a hue: the
   palette stays six values plus gold. "New" borrows the promotion pill's
   vermilion — the same meaning the sheet already gives that colour. */
.badge {
  font-family: var(--font-names);
  font-weight: 700;
  font-size: var(--text-xs);
  letter-spacing: 0.04em;
  line-height: 1.1;
  color: var(--text);
  white-space: nowrap;
}

.badge:lang(ja) {
  font-family: var(--font-jp-serif);
  letter-spacing: 0.05em;
}

.badge[data-kind='down'] {
  color: var(--muted);
}

.badge[data-kind='new'] {
  color: var(--accent);
}

/* Under the name on the sheet: read down like the numeral band */
.sheet {
  display: block;
  margin-top: var(--space-1);
  font-size: 0.6rem;
  text-align: center;
}

.sheet:lang(ja) {
  writing-mode: vertical-rl;
  text-orientation: upright;
  margin-inline: auto;
}

/* Beside the name on a row */
.row {
  flex-shrink: 0;
  margin-inline-start: var(--space-2);
}
```

- [ ] **Step 4:** run → PASS. `npm run check:css` → clean (every class referenced). Gate; commit `components: MovementBadge`.

---

### Task B5: `ChangesToggle`

**Files:**
- Create: `src/components/ChangesToggle/ChangesToggle.tsx`, `.module.css`
- Test: `src/components/ChangesToggle/ChangesToggle.test.tsx`

**Interfaces:**
- Produces: `ChangesToggle({ on, onChange, sinceLabel }: { on: boolean; onChange: (on: boolean) => void; sinceLabel: string })` — one `<button type="button" aria-pressed={on} title={strings.changesSince(sinceLabel)}>` labelled `strings.changes` with a visually-hidden `strings.changesSince(sinceLabel)` suffix; `data-print="hide"`.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChangesToggle } from './ChangesToggle'
import { LanguageProvider } from '../../contexts/LanguageContext'

describe('ChangesToggle', () => {
  it('is a pressed button that names the previous tournament', async () => {
    const onChange = vi.fn()
    render(
      <LanguageProvider>
        <ChangesToggle on={false} onChange={onChange} sinceLabel="July 2026" />
      </LanguageProvider>
    )
    const button = screen.getByRole('button', { name: /Changes since July 2026/ })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('reflects the on state', () => {
    render(
      <LanguageProvider>
        <ChangesToggle on onChange={() => undefined} sinceLabel="July 2026" />
      </LanguageProvider>
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
```

- [ ] **Step 2:** FAIL. **Step 3: Implement**

```tsx
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import styles from './ChangesToggle.module.css'

interface ChangesToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  /** The previous tournament, e.g. "July 2026" / 「七月場所」. */
  sinceLabel: string
}

/**
 * Switches the movement overlay on and off. A single pressed button rather
 * than another two-cell seal: this annotates the sheet, it does not choose
 * between two renderings of it.
 */
export function ChangesToggle({ on, onChange, sinceLabel }: ChangesToggleProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const since = strings.changesSince(sinceLabel)
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.on : ''}`}
      aria-pressed={on}
      title={since}
      onClick={() => onChange(!on)}
      lang={langAttr(language)}
      data-print="hide"
    >
      <span className={styles.mark} aria-hidden="true">
        ▲▼
      </span>
      {strings.changes}
      <span className="visually-hidden"> — {since}</span>
    </button>
  )
}
```
CSS, matching `ViewToggle.module.css`'s option styling (same font, size, tracking, radius, border):
```css
.toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  align-self: flex-end;
  min-height: 32px;
  padding: 0.3rem 0.7rem;
  font-family: var(--font-names);
  font-weight: 700;
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur-base) ease, background var(--dur-base) ease;
}

.toggle:hover {
  color: var(--text);
}

.toggle.on {
  color: var(--on-accent);
  background: var(--accent);
  border-color: var(--accent);
}

.toggle:lang(ja) {
  font-family: var(--font-jp-serif);
  font-size: var(--text-sm);
  text-transform: none;
  letter-spacing: 0.1em;
}

.mark {
  font-size: 0.55em;
  letter-spacing: -0.1em;
}
```
- [ ] **Step 4:** PASS; `check:css` clean; commit `components: ChangesToggle`.

---

### Task B6: `Departed`

**Files:**
- Create: `src/components/Departed/Departed.tsx`, `.module.css`
- Test: `src/components/Departed/Departed.test.tsx`

**Interfaces:**
- Consumes: `Departures`, `Departure` (B1); `previousRankLabel`; `profileUrl` (`src/utils/formatting.ts`); strings (B3); `DIVISION_KANJI` (`src/data/kanji.ts`); `getRankLabel`/`jpRankShort` for the *current* rank of a moved wrestler — reuse `previousRankLabel` by passing `{ division, rankCode, rankNumber, seat, side }` built from the current row.
- Produces: `Departed({ division, departures, sinceLabel, onSelectRikishi }: { division: Division; departures: Departures; sinceLabel: string; onSelectRikishi?: (r: Rikishi) => void })` — a `<section aria-labelledby>` with heading `strings.departedHeading(divisionName, sinceLabel)`; two sub-lists (`moved`: buttons opening the modal, showing `departedNow(rank)`; `gone`: links to the official profile, showing `departedWas(rank)`); `strings.departedNone` when both empty.

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Departed } from './Departed'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeArchivedRikishi, makeRikishi } from '../../test/fixtures'

const moved = {
  was: makeArchivedRikishi({ id: 4, shikona: { en: 'Tobizaru', jp: '翔猿' }, rankCode: 500, rankNumber: 16 }),
  now: makeRikishi({ id: 4, shikona: { en: 'Tobizaru', jp: '翔猿' }, rankCode: 600, rankLevel: 'juryo', rankNumber: 1 }),
}
const gone = {
  was: makeArchivedRikishi({ id: 5, shikona: { en: 'Endo', jp: '遠藤' }, rankCode: 500, rankNumber: 17 }),
  now: null,
}

describe('Departed', () => {
  it('lists who moved down and who is gone, with their ranks', async () => {
    const onSelect = vi.fn()
    render(
      <LanguageProvider>
        <Departed division="makuuchi" departures={{ moved: [moved], gone: [gone] }} sinceLabel="July 2026" onSelectRikishi={onSelect} />
      </LanguageProvider>
    )
    expect(screen.getByRole('region', { name: 'Left Makuuchi since July 2026' })).toBeInTheDocument()
    const tobizaru = screen.getByRole('button', { name: /Tobizaru/ })
    expect(tobizaru).toHaveTextContent('now J1')
    await userEvent.click(tobizaru)
    expect(onSelect).toHaveBeenCalledWith(moved.now)
    const endo = screen.getByRole('link', { name: /Endo/ })
    expect(endo).toHaveAttribute('href', expect.stringContaining('/profile/5/'))
    expect(endo).toHaveTextContent('was M17')
  })

  it('says so when nobody left', () => {
    render(
      <LanguageProvider>
        <Departed division="juryo" departures={{ moved: [], gone: [] }} sinceLabel="July 2026" />
      </LanguageProvider>
    )
    expect(screen.getByText('Nobody left.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2:** FAIL. **Step 3: Implement**

```tsx
import { useId } from 'react'
import type { Division, Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { DIVISION_KANJI } from '../../data/kanji'
import { profileUrl } from '../../utils/formatting'
import { previousRankLabel, type Departure, type Departures } from '../../utils/diff'
import styles from './Departed.module.css'

interface DepartedProps {
  division: Division
  departures: Departures
  sinceLabel: string
  onSelectRikishi?: (rikishi: Rikishi) => void
}

/**
 * The names that left this division since the previous banzuke, in a smaller
 * hand below the paper: first those still on the sheet in the other
 * division, then those on neither — retired, injured, or below Juryo.
 */
export function Departed({ division, departures, sinceLabel, onSelectRikishi }: DepartedProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const lang = langAttr(language)
  const divisionName = language === 'jp' ? DIVISION_KANJI[division] : strings.division[division]
  const otherDivision: Division = division === 'makuuchi' ? 'juryo' : 'makuuchi'
  const otherName = language === 'jp' ? DIVISION_KANJI[otherDivision] : strings.division[otherDivision]

  const name = (d: Departure) => d.was.shikona[language] || d.was.shikona.en
  const wasRank = (d: Departure) => previousRankLabel(d.was, language)
  const nowRank = (d: Departure) =>
    d.now
      ? previousRankLabel(
          { division: otherDivision, rankCode: d.now.rankCode, rankNumber: d.now.rankNumber, seat: d.now.seat, side: d.now.side },
          language
        )
      : ''

  const empty = departures.moved.length === 0 && departures.gone.length === 0

  return (
    <section className={styles.departed} aria-labelledby={headingId} lang={lang}>
      <h2 id={headingId} className={styles.heading}>
        {strings.departedHeading(divisionName, sinceLabel)}
      </h2>
      {empty && <p className={styles.none}>{strings.departedNone}</p>}
      {departures.moved.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.subheading}>{strings.departedMovedTo(otherName)}</h3>
          <ul className={styles.list}>
            {departures.moved.map((d) => (
              <li key={d.was.id}>
                <button
                  type="button"
                  className={styles.name}
                  onClick={() => d.now && onSelectRikishi?.(d.now)}
                >
                  <span className={styles.shikona}>{name(d)}</span>
                  <span className={styles.rank}>{strings.departedNow(nowRank(d))}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {departures.gone.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.subheading}>{strings.departedGone}</h3>
          <ul className={styles.list}>
            {departures.gone.map((d) => (
              <li key={d.was.id}>
                <a
                  className={styles.name}
                  href={profileUrl(d.was.id, language)}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span className={styles.shikona}>{name(d)}</span>
                  <span className={styles.rank}>{strings.departedWas(wasRank(d))}</span>
                  <span className={styles.external} aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
```
CSS (`Departed.module.css`) — small hand under the paper, hairline rule above, names in `--font-names`/mincho by `:lang`, ranks muted; a flex-wrap `ul` with `gap: var(--space-2) var(--space-4)`; `.name` resets button styles (`font: inherit; background: none; border: 0; color: inherit; cursor: pointer`), `.shikona:lang(ja) { font-family: var(--font-jp-serif); font-weight: 700 }`, `.rank { color: var(--muted); margin-inline-start: var(--space-1); font-size: var(--text-sm) }`, `.heading { font-size: var(--text-base); font-weight: var(--label-weight); letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--muted); margin: var(--space-5) 0 var(--space-2) }`, `.heading:lang(ja) { text-transform: none; letter-spacing: 0.1em }`, `.subheading { font-size: var(--text-sm); color: var(--muted); font-weight: var(--label-weight); margin: var(--space-3) 0 var(--space-1) }`, `.none { color: var(--muted); font-size: var(--text-sm) }`, `.external { margin-inline-start: 0.2em; color: var(--muted) }`, `.departed { border-top: 1px solid var(--rule); padding-top: var(--space-2) }`, `.group`, `.list { list-style: none; display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4) }`.

- [ ] **Step 4:** PASS; `check:css` clean; commit `components: Departed`.

---

### Task B7: Sheet and List carry the movements

**Files:**
- Modify: `src/components/BanzukeSheet/BanzukeSheet.tsx`, `.module.css`, `.test.tsx`
- Modify: `src/components/SideCell/SideCell.tsx`, `.module.css`, `.test.tsx`
- Modify: `src/components/RankRow/RankRow.tsx`, `src/components/BanzukeGrid/BanzukeGrid.tsx`

**Interfaces:**
- New optional prop on `BanzukeSheet`, `BanzukeGrid`, `RankRow`: `movements?: Map<number, Movement> | null`; on `SideCell`: `movement?: Movement | null`.
- Consumes: `MovementBadge` (B4), `describeMovement` (B1).

- [ ] **Step 1: Failing tests** — append to `BanzukeSheet.test.tsx`:

```tsx
  it('carries each wrestler\'s movement in the badge and the accessible name when given', () => {
    const movements = new Map([
      [3, { kind: 'up' as const, previous: { division: 'makuuchi' as const, rankCode: 500, rankNumber: 5, seat: 1, side: 'east' as const }, sideChanged: false }],
      [5, { kind: 'new' as const, previous: null, sideChanged: false }],
    ])
    renderSheet({ onSelectRikishi: vi.fn(), movements })
    const atamifuji = screen.getByRole('button', { name: /Atamifuji/ })
    expect(atamifuji).toHaveAccessibleName(/Up from M5/)
    expect(atamifuji).toHaveTextContent('▲M5')
    expect(screen.getByRole('button', { name: /Abi/ })).toHaveAccessibleName(/New to the sheet/)
    // No movement given for Onosato: nothing added.
    expect(screen.getByRole('button', { name: /Onosato/ })).not.toHaveAccessibleName(/from|New|Unchanged/)
  })
```
and to `SideCell.test.tsx` (read the file first for its render helper; add):
```tsx
  it('shows the movement badge beside the name and describes it', () => {
    render(
      <LanguageProvider>
        <SideCell rikishi={makeRikishi()} side="east" rankLevel="yokozuna" onSelect={vi.fn()}
          movement={{ kind: 'down', previous: { division: 'makuuchi', rankCode: 100, rankNumber: 1, seat: 1, side: 'east' }, sideChanged: false }} />
      </LanguageProvider>
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName(/Down from Y/)
    expect(button).toHaveTextContent('▼Y')
  })
```

- [ ] **Step 2:** FAIL (unknown prop / missing text).

- [ ] **Step 3: Sheet** — in `BanzukeSheet.tsx`: add `movements?: Map<number, Movement> | null` to props and to `Column` (`movement: Movement | null`). In `Column`, after the label line:
  ```ts
  const movementText = movement ? describeMovement(movement, language) : ''
  const label = `${name}, ${strings.side[rikishi.side]}. ${rikishi.rankName[language]}.${movementText ? ` ${movementText}.` : ''} ${strings.viewDetails}`
  ```
  and append inside `content` after the name span: `{movement && <MovementBadge movement={movement} variant="sheet" />}`. Pass `movement={movements?.get(rikishi.id) ?? null}` from `half()`. Add `data-diff={movements ? '' : undefined}` on `.sheet`. CSS: `.column { grid-template-rows: var(--rank-band) var(--origin-band) auto; }` already ends in `auto`; the badge is inside the name cell's flow — make the third row a flex column: add
  ```css
  /* Name then, in diff mode, the rank it came from */
  .column > :nth-child(3) { display: flex; flex-direction: column; align-items: center; }
  ```
  Hmm — the third child is `.name`; wrap `.name` and the badge in a `<span className={styles.nameBand}>` instead and style `.nameBand { display: flex; flex-direction: column; align-items: center }`. Keep `.name` untouched otherwise.
- [ ] **Step 4: List** — `SideCell`: new prop `movement?: Movement | null`; append `describeMovement` to the `aria-label` the same way; render `{movement && <MovementBadge movement={movement} variant="row" />}` after `{badge}`. `RankRow`: accept `movements` and pass `movement={movements?.get(group.east.id) ?? null}` (guarding null east/west). `BanzukeGrid`: accept `movements` and pass through to every `RankRow`.
- [ ] **Step 5:** tests PASS; full gate; `check:css`; commit `sheet, list: show each wrestler's movement since the previous banzuke`.

---

### Task B8: App wiring — `?diff=1`, toggle, departures

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`

- [ ] **Step 1: Failing tests** — extend `App.test.tsx`'s fetch stub so `banzuke/index.json` returns `makeArchiveIndex()` and `banzuke/636.json` returns `makeArchivedBanzuke()` (imports from fixtures), otherwise as now. Add:

```tsx
  it('offers Changes when the archive has a previous tournament, and annotates the sheet with ?diff=1', async () => {
    const user = userEvent.setup()
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /Changes since July 2026/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(window.location.search).toBe('?diff=1')
    // Hoshoryu (id 1000 in the raw fixture) is not in the archive fixture → new.
    expect(await screen.findByRole('button', { name: /Hoshoryu, East.*New to the sheet/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /Left Makuuchi since July 2026/ })).toBeInTheDocument()
  })

  it('hides the toggle when there is no archive', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: RequestInfo | URL) =>
        Promise.resolve(
          String(url).includes('banzuke/')
            ? ({ ok: false, status: 404 } as Response)
            : String(url).includes('rikishi-profiles')
              ? jsonResponse({ version: 1, fetchedAt: '2026-09-04T00:00:00Z', profiles: {} })
              : jsonResponse(makeRawSnapshot())
        )
      )
    )
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    expect(screen.queryByRole('button', { name: /Changes/ })).toBeNull()
  })
```
(The raw fixture's basho is 637 and its ids are 1000+; the archive fixture's are the real ids, so every current wrestler is "new" and every archived one is "gone" — exactly what the test needs, and a reminder in the report that fixtures do not share ids.)

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Implement** in `App.tsx`:
  - imports: `useArchiveIndex`, `useArchivedBanzuke` (B2); `previousEntry` (A2); `diffBanzuke`, type `CurrentRow` (B1); `ChangesToggle`, `Departed`; `formatYearMonth` from `./utils/profile` (existing, `(yyyyMm: string, language, 'short' | 'long')` — check its signature and use the long form; for Japanese the label should be `jpBashoName(month)` from `data/kanji`, e.g. 七月場所 — build `sinceLabel` as `language === 'jp' ? jpBashoName(entry.month) : formatYearMonth(`${entry.year}-${String(entry.month).padStart(2, '0')}`, 'en', 'long')`).
  - state: `const [diffParam, setDiffParam] = useUrlParam('diff')`; `const index = useArchiveIndex()`; `const prevEntry = banzuke && index ? previousEntry(index, banzuke.basho.id) : null`; `const diffWanted = diffParam === '1' && prevEntry != null`; `const previous = useArchivedBanzuke(diffWanted ? prevEntry : null)`.
  - `const currentRows: CurrentRow[] = useMemo(() => data ? [...data.makuuchi.rikishi.map((rikishi) => ({ rikishi, division: 'makuuchi' as const })), ...(data.juryo?.rikishi ?? []).map((rikishi) => ({ rikishi, division: 'juryo' as const }))] : [], [data])`
  - `const diff = useMemo(() => (previous.archive ? diffBanzuke(currentRows, previous.archive) : null), [currentRows, previous.archive])`
  - `const movements = diffWanted && diff ? diff.movements : null`
  - controls: after `<ViewToggle …/>` render `{prevEntry && <ChangesToggle on={diffParam === '1'} onChange={(on) => setDiffParam(on ? '1' : null)} sinceLabel={sinceLabel} />}`.
  - pass `movements={movements}` to both `BanzukeSheet` and `BanzukeGrid`.
  - after the panel `</div>` (inside the ErrorBoundary) render: `{diffWanted && previous.status === 'unavailable' && <div role="status" className={`${styles.status} ${styles.warning}`}>{strings.changesUnavailable}</div>}` and `{diffWanted && diff && <Departed division={division} departures={diff.byDivision[division]} sinceLabel={sinceLabel} onSelectRikishi={handleSelectRikishi} />}`.
  - `handleEscape`: unchanged (Escape clears search, not the diff).
- [ ] **Step 4:** PASS; full gate; commit `app: Changes — the sheet annotated with movement since the previous banzuke`.

---

### Task B9: Docs, visual check, PR B

- [ ] README: in the intro sentence after "**List**, a searchable row per rank." add "Either can be switched to **Changes**, which marks each name with the rank it held at the previous tournament and lists who left each division." CLAUDE.md "Things that look odd": add
  ```markdown
  - **Changes** (`?diff=1`) is an overlay, not a third view: `src/utils/diff.ts` compares the current
    rows with the previous archived tournament by JSA id and yields a `Movement` per wrestler plus
    per-division departures. Badges show the **rank a wrestler came from** (`▲M5`), never a step
    count — steps are undefined across sanyaku and the Juryo line. Arrows are ink/muted; "new" borrows
    the promotion pill's vermilion. Movement is also spoken in each button's accessible name.
  ```
- [ ] Gate; commit `docs: Changes overlay`.
- [ ] **Visual check** (`npm run dev`, or in production after merge): open `?diff=1`. On the Sheet, Maegashira columns should show a small `▲M5`-style band under the name without widening the column beyond its band; Japanese shows `▲前頭五` vertically. Toggle language, toggle Sheet/List, search "new" — dimming still applies. Under the paper the departures section appears with the July names (Makuuchi tab: wrestlers now in Juryo first, then gone). Spot-check two real moves against sumo-api: Onosato 202607 `Yokozuna 1 West` → 202609 `Yokozuna 1 East` must read "Unchanged, West to East" in the List and show no sheet badge.
- [ ] Push, `gh pr create` "Changes: what moved since the previous banzuke", watch CI. After merge, verify on production.

---

## Verification (end to end)

1. **Archive pipeline**: after PR A merges, `gh run watch` — `changed=false`, archive step skipped, deploy green; `curl -s https://jonath0n.github.io/banzuke-app/banzuke/index.json | node -e "…"` → 6 entries ending 637. When the Kyushu banzuke drops (~2026-10-26), the run should log `Archived basho 638 …`, `Index: 7 tournaments`, and the bot commit should include `public/banzuke/638.json` and `index.json`; the site then diffs 638 against 637 automatically.
2. **Tests**: `npm run test:run -- --coverage` stays above 80/80/70/80 (new modules are fully tested).
3. **Data honesty**: `scripts/lib/sumo-api.test.ts`'s cross-check proves the sumo-api → JSA id join and rank parsing on the one tournament both sources describe.
4. **Diff mode**: the App test proves the URL round-trip and accessible names; the visual check proves the band fits the Sheet.

## Self-review

- **Coverage of the ask**: A2 → Tasks A1–A8; A1 → B1, B2, B4, B5, B7, B8; A5 (per-division, per the user's choice) → B1 `byDivision`, B6, B8. A3/A4 deliberately out of scope and said so.
- **Placeholders**: none; every code step carries the code. Two places tell the implementer to read an existing function's real output before asserting (`jpRankShort`, `formatYearMonth`) — that is instruction, not a gap.
- **Type consistency**: `ArchivedRikishi.heya: Localized | null` (no id) — the A2 fixture text notes it; `diffBanzuke(current: CurrentRow[], previous)` is the signature used in B1's tests and B8; `Movement`/`PreviousRank` shapes match across B1, B4, B7, B8; `previousEntry(index, bashoId)` (A2) is what B8 calls; `useArchivedBanzuke(entry | null)` returns `{status, archive}` as B8 reads it; hook URL prefix `banzuke/` matches the deploy path `public/banzuke/`.
- **Rulings a controller may need**: (1) a backfilled tournament with an id-less retired wrestler — skip-and-note vs synthetic id (the script stops and asks); (2) if the 637 cross-check shows a kanji mismatch between sumo-api and the JSA for a name, prefer the JSA and record the exception.
