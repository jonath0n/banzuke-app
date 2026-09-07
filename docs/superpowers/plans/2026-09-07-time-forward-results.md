# Time Forward for Aki — Results Pipeline, Hoshitori Overlay, Day's Bouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> On approval this file is copied to `docs/superpowers/plans/2026-09-07-time-forward-results.md` and committed on the working branch (plan mode only permits writing here).

**Goal:** During a tournament the banzuke says how everyone is doing: each name carries its win–loss record, the List shows the traditional ○● hoshitori and who has reached kachi-koshi, and the day's bouts (with winners and kimarite once fought) are listed beneath the paper — refreshed twice a day from sumo-api.com, on by default from day 1, with the Sheet otherwise untouched.

**Architecture:** Part A adds a build-time results pipeline: `scripts/fetch-results.ts` reads the tournament from the JSA snapshot, and when the basho is live (or a day either side) pulls per-wrestler records, per-day torikumi and the yusho from sumo-api.com, joins everything to JSA ids via `nskId`, and writes one validated file `public/results/{bashoId}.json` (format in `src/data/results.ts`). The deploy workflow gains an evening cron and commits the file when it changed. Part B renders that file as a second overlay next to Changes: `?results=0` hides it (on by default), `Hoshitori` badges on Sheet columns and List rows, a `Bouts` section under the paper with a day stepper and leaders line, and the full bout list in the wrestler dialog. No new colours, no new keyframes, no runtime dependencies.

**Tech Stack:** React 19 + TypeScript, Vite 7, CSS Modules, Vitest + Testing Library; Node 22 scripts via `tsx`; GitHub Actions. Read-only external source: `https://www.sumo-api.com/api` (free; "please use it responsibly").

**Spec:** The "Context" and "Design" sections below (agreed in chat 2026-09-07: Day 3 theme = time forward for Aki; results as an overlay, on by default while live). No separate spec file.

## Global Constraints

- Prettier: no semicolons, single quotes, 100 columns (also `.css`). ESLint zero warnings. `npm run validate && npm run test:run && npm run build` green before every commit.
- No runtime dependencies beyond React. Scripts use Node built-ins only; no new devDependencies.
- Palette is six values plus `--gold`; **this plan adds no colour.** `--gold` stays Yokozuna-only: the yusho mark is ink in a hairline seal, not gold. Kachi-koshi is weight/ink, make-koshi is `--muted`.
- Motion budget of four keyframes; **this plan adds no keyframes.** Toggling the overlay or stepping a day settles in place.
- Data flow: components consume validated models only. `validateResults` in `src/data/results.ts` is the boundary; nothing in components parses upstream fields.
- The browser never calls sumo-api.com. All fetching is build-time in `scripts/`.
- Tests use `src/test/fixtures.ts`; add factories there.
- Accessibility: real buttons, `aria-pressed` on the toggle, `lang` on Japanese runs, records spoken in accessible names (`describeRecord`) — a screen reader cannot see ○●.
- The Sheet never scrolls sideways; the record badge lives inside the existing `.nameBand` (an `auto` row) like `MovementBadge`.
- Never type CJK compatibility ideographs (U+F900–FAFF) as literals; use `\u{…}` escapes.
- New Japanese literals in `src/` (休, kimarite kanji, 勝ち越し …) trip `scripts/lib/font-coverage.test.ts`; the task that adds them runs `npm run subset-fonts` and commits the manifest + woff2.
- Commits end with:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg
  ```
- Two branches / two PRs: `feat/results-pipeline` (Tasks A0–A6) merged and one real deploy observed before `feat/results-overlay` (Tasks B0–B10) starts.

---

## Context — the Day 3 review

Three codebase surveys (UI surface, data layer, visual system) were run against `main` at 296dba4 on 2026-09-07, and sumo-api.com was probed for results shapes. Verdicts on the idea map:

**Done (yesterday):** A1 Diff mode, A2 archive, A5 departures, F1 self-hosted mincho, G1 refresh pipeline, G2 archive layout, H2 sample fixture, G3 partially (sumo-api as backfill source).

**Still worth doing, ranked:**
- **B1 Hoshitori, B2 Today's torikumi, B3 Kachi-koshi, B4 (yusho race, the honest part: leaders + yusho)** — Aki starts 2026-09-13. sumo-api serves per-wrestler `record[]` (`win | loss | fusen win | fusen loss | absent`, opponent, kimarite), per-day `torikumi` with `winnerId`, and `yusho`/`specialPrizes` on the basho. **This plan.**
- E9 How to read a banzuke (numbered marks on the real sheet — form agreed), D5 shikona kanji glossary (107 distinct kanji + の/ノ on the current sheet), E2/E3 arrow keys + modal next/prev, E1 pair affinity — **Day 4.**
- A4 career rank line — now cheap: `GET /api/ranks?rikishiId=` returns a wrestler's whole career of ranks in one call (21 rows for Onosato). Day 4 or 5.
- C2 sheet furniture (the largest fidelity gap: one 東/西 mark, no 蒙御免, no foot; the era masthead lives in the Hero and vanishes under 600px), C4-lite print (`@page`, hide the Footer, `break-inside` on list rows), H4 — **Day 5.**
- E6 `navigator.language` (XS), E5 theme override (S; `tokens.test.ts` splits on the media query and needs updating), E7 service worker (S), E8 favourites (S), D2 stable grouping (`heya.id` is on every row and rendered nowhere), D4 physique (profiles 100% populated).

**New items found by the review (rot):**
- N1 CLAUDE.md says Sheet columns are `flex: 1 1 auto` + max-width; the CSS ships `flex: 0 0 auto` + `min-width` (`BanzukeSheet.module.css:95`). One of the two is wrong.
- N2 Untranslated UI: Hero `<h1 lang="en">Grand Sumo Banzuke</h1>` in JP mode; ScrollToTop `aria-label="Scroll to top"`; `statusSenshuraku` hardcodes "Day 15"; the JP `sinceLabel` has no year (十一月場所 when diffing January against November).
- N3 `manifest.webmanifest` `theme_color` (#b3301f) disagrees with both `theme-color` metas; `lang: en` is fixed.
- N4 `fadeIn` keyframe is defined twice (Hero, BanzukeGrid) — five blocks for four effects.
- N5 The modal renders nothing for the profile half until the file lands: no reservation, visible jump.
- N6 `og-image.html` hand-copies the palette; a token change desynchronises it silently.
- N7 `numberKanji`, `sortKey`, `venueId`, `heya.id`, `pref.id` are normalized and never rendered.
- N8 Backfilled archive files (632–636) have `jp: ''` for stable and origin.
- N9 `SideCell`/`WrestlerModal` request mincho weight 600; only 700 ships.
- N10 Coverage `include` omits the `scripts/*.ts` CLIs.
- **N11 (fixed in this plan)** the data job now pushes over the deploy key, and deploy-key pushes *do* trigger `push` workflows — every bot commit starts a redundant second run. With results committed twice daily that is four runs a day. The bot commit gets `[skip ci]`.

**Remove / retire from the map:** B5 next-banzuke projection (fake precision), C5 sumo-moji (no free face), E10 per-wrestler share cards (needs Playwright in CI), F2 six papers and F4 grain-per-basho (violate the palette's spirit for marginal gain), D3 origins map (a colour ramp the palette rule forbids), H1 (Changes shipped as an overlay, so the List toggle keeps its plain meaning — leave it), H3/H5 (ScrollToTop and the shortcuts panel are harmless; not worth a task), G4 visual regression (would be the first heavyweight devDependency; revisit only if C2/C3 land), G5 routing (six params, still fine).

---

## Design

### What sumo-api serves (probed 2026-09-07)

- `GET /api/basho/202607` → `{ date, startDate, endDate, yusho: [{type:'Makuuchi'|'Juryo'|…, rikishiId, shikonaEn, shikonaJp}], specialPrizes: [...] }`. For a future basho (202609) only `{date, startDate, endDate}`.
- `GET /api/basho/202607/banzuke/Makuuchi|Juryo` → `{ bashoId, division, east: Entry[], west: Entry[] }`, `Entry { side, rikishiID, shikonaEn, shikonaJp, rankValue, rank, record: Bout[], wins, losses, absences }`, `Bout { result: 'win'|'loss'|'fusen win'|'fusen loss'|'absent', opponentShikonaEn, opponentShikonaJp, opponentID, kimarite }` (`kimarite: 'fusen'` on fusen bouts, `''` on absences; `opponentID` is present even for absences and must be ignored then). Finished tournaments have exactly 15 entries; a live one may have fewer or trailing entries with an unknown result — the parser keeps only bouts whose `result` is one of the five values.
- `GET /api/basho/202607/torikumi/Makuuchi/15` → `{ …basho, torikumi: Match[] }`, `Match { bashoId, division, day, matchNo, eastId, eastShikona, eastRank, westId, westShikona, westRank, kimarite, winnerId, winnerEn, winnerJp }`; Makuuchi has ~20–21 matches a day, Juryo ~13. **Verified on all 15 days of July 2026:** a Juryo–Makuuchi cross bout appears on the **Makuuchi card only** (as match 1 or 2), never on both, so `Match.division` records the card of origin and a division's bouts must be selected by fighter-id membership in that division's rows, not by the label. Before the tournament the `torikumi` key is absent — treat missing/empty as "not published".
- `GET /api/rikishis?limit=1000` → `{ records: [{ id, nskId, … }] }` — `nskId` is the JSA id; 42 Juryo bouts in 202607 were against wrestlers outside Juryo, so opponents are joined through the same map and may be unknown (`id: null`) when the opponent is a Makushita visitor sumo-api has no `nskId` for.
- Kimarite arrive as romaji (`yorikiri`, `oshidashi`, `fusen`, `hansoku`, `isamiashi`, …); `src/data/kimarite.ts` supplies the kanji.

### Results file (`src/data/results.ts`, `public/results/{bashoId}.json`)

```ts
type BoutOutcome = 'win' | 'loss' | 'fusen-win' | 'fusen-loss' | 'absent'
interface Fighter { id: number | null; shikona: Localized }        // id = JSA id when known
interface Bout { day: number; outcome: BoutOutcome; opponent: Fighter | null; kimarite: string }
interface RikishiRecord { wins: number; losses: number; absences: number; bouts: Bout[] }
interface Match { division: Division; matchNo: number; east: Fighter; west: Fighter; winnerId: number | null; kimarite: string }
interface ResultsFile {
  version: 1; bashoId: number; fetchedAt: string
  day: number                              // latest day with a decided bout; 0 before day 1
  divisions: Division[]
  records: Record<string, RikishiRecord>   // keyed by JSA id
  torikumi: Record<string, Match[]>        // keyed by day '1'..'15', in matchNo order
  yusho: Partial<Record<Division, number>> // JSA id of the champion, once decided
}
```
~150 KB pretty-printed for a finished basho; loaded once, lazily, only while a tournament is live or just finished. The app checks `results.bashoId === banzuke.basho.id` before using a file.

### Pure helpers (`src/data/results.ts`)

- `kachikoshiState(r)`: `'kachikoshi'` when `wins ≥ 8`; `'makekoshi'` when `losses + absences ≥ 8` (an absence is a loss on the sheet); else `'pending'`.
- `scoreLabel(r, language)`: EN `8–3` (`8–3–1` when absences > 0); JP `8勝3敗` (`8勝3敗1休`).
- `describeRecord(r, language)`: EN `8 wins, 3 losses, 1 absence. Kachi-koshi.`; JP `8勝3敗1休、勝ち越し`.
- `boutMark(outcome)`: `○` for win/fusen-win, `●` for loss/fusen-loss, `休` for absent.
- `leaders(records, rows)`: wrestlers on the division's rows grouped by wins descending: `[{ wins, rikishi[] }, …]` for the top two win counts only, ties kept in banzuke order.

### UI

- `ResultsToggle` (`○● Results` / 「○● 星取」), `aria-pressed`, beside `ChangesToggle`. Rendered only when the results file has loaded and matches the basho. **On by default**; `?results=0` switches it off (the URL carries the exception, not the default).
- Sheet `Column`: `Hoshitori variant="sheet"` under the name: `8–3` horizontal, tiny; `data-state` → kachikoshi bold ink, makekoshi muted, pending normal; a `優` seal (hairline border, ink) after the score once `yusho` names this wrestler.
- List `SideCell`: `Hoshitori variant="row"`: the 15-cell ○●休 strip (future days as faint `·`), then the score, then a small state label (`Kachi-koshi` / `勝ち越し`, `Make-koshi` / `負け越し`) — under the name, so the row grows one line.
- `Bouts` section under the paper (both views, hidden while a search filters): heading `Day N` / 「N日目」 with ‹ › day stepper (days 1…results.day+1 that have a torikumi), a leaders line (`Leaders after Day N: Onosato 8–0 · Hoshoryu 7–1 …`), then one line per bout: East name (rank) — West name (rank), the winner in bold with the kimarite after; undecided bouts show `—`. Names that are on the sheet are buttons opening the modal.
- `WrestlerModal`: a `Record` section (`8–3` + full list: day, ○●, opponent, kimarite) when a record exists.

### Pipeline

`scripts/fetch-results.ts` runs in the `data` job on every run (morning 07:00 JST and a new evening 19:00 JST cron), decides from the snapshot's dates whether the tournament is in season (`live`, `upcoming` with `daysUntil ≤ 1`, or `finished` with `daysSince ≤ 3`), fetches, and writes `.data/results/{bashoId}.json` only when the content changed (ignoring `fetchedAt`). The commit step adds `public/results` and its message ends with `[skip ci]`.

### Out of scope (deliberately)

Kadoban/ozeki-run narratives, special prizes display (fetched? no — only `yusho` is kept), Makushita and below, head-to-head, a results archive UI for past tournaments (the files accumulate under `public/results/`; only the current one is read), any motion.

---

## File structure

**Part A — pipeline**

| Path | Responsibility |
|---|---|
| `src/data/results.ts` (+test) | Results types, `validateResults`, pure helpers |
| `src/test/fixtures.ts` | `makeBout`, `makeRecord`, `makeResultsFile` |
| `tsconfig.scripts.json` | include `src/data/results.ts`, `src/utils/dates.ts` |
| `scripts/lib/sumo-api.ts` (+test, +fixtures) | results shapes; `resultsFromSumoApi` (pure) |
| `scripts/lib/__fixtures__/sumo-api-202607-{makuuchi,juryo}-results.json`, `…-torikumi-1.json`, `…-torikumi-15.json`, `…-basho.json` | captured, trimmed |
| `scripts/fetch-results.ts` | CLI |
| `public/results/636.json` | July 2026, generated — a real fixture and the first archive entry |
| `src/data/results-files.test.ts` | committed results files validate and match their names |
| `.github/workflows/deploy.yml` | evening cron, results step, commit path, `[skip ci]` |
| `README.md`, `CLAUDE.md`, `package.json` | docs, `fetch-results` script |

**Part B — overlay**

| Path | Responsibility |
|---|---|
| `src/data/kimarite.ts` (+test) | romaji → kanji + English gloss |
| `src/hooks/useResults.ts` (+test) | lazy cached fetch of `results/{id}.json` |
| `src/i18n/strings.ts` | strings |
| `src/components/Hoshitori/` | sheet and row variants |
| `src/components/ResultsToggle/` | the toggle |
| `src/components/Bouts/` | day's bouts + leaders |
| `BanzukeSheet`, `SideCell`, `RankRow`, `BanzukeGrid`, `WrestlerModal` | `records` / `record` props |
| `src/App.tsx` (+test) | `?results`, wiring |
| fonts manifest + woff2 | regenerated for the new kanji |

---

# Part A — results pipeline (branch `feat/results-pipeline`)

### Task A0: Branch

- [ ] `git checkout main && git pull --ff-only && git checkout -b feat/results-pipeline`
- [ ] Baseline: `npm run validate && npm run test:run && npm run build` green (stop and report if not).
- [ ] Copy this plan to `docs/superpowers/plans/2026-09-07-time-forward-results.md`; commit it alone: `docs: time-forward (results pipeline, hoshitori overlay, bouts) implementation plan`.

---

### Task A1: Results format, validation, helpers

**Files:**
- Create: `src/data/results.ts`
- Modify: `src/test/fixtures.ts` (append), `tsconfig.scripts.json` (include)
- Test: `src/data/results.test.ts`

**Interfaces — Produces** (all exported from `src/data/results.ts`): the types in the Design section plus
`validateResults(input: unknown): { ok: true; results: ResultsFile } | { ok: false; error: string }`,
`resultsFileName(bashoId: number): string` → `'637.json'`,
`resultsEqualIgnoringFetchedAt(a: ResultsFile, b: ResultsFile): boolean`,
`kachikoshiState(r: Pick<RikishiRecord,'wins'|'losses'|'absences'>): 'kachikoshi' | 'makekoshi' | 'pending'`,
`scoreLabel(r, language: Language): string`, `describeRecord(r, language): string`,
`boutMark(outcome: BoutOutcome): '○' | '●' | '休'`,
`leaders(records: Record<string, RikishiRecord>, rows: Rikishi[]): Array<{ wins: number; rikishi: Rikishi[] }>`,
`BOUT_OUTCOMES: readonly BoutOutcome[]`, `MAX_DAYS = 15`.
Fixtures: `makeBout(overrides?)`, `makeRecord(overrides?)` (8–3 with 4 absences? no — 8 wins 3 losses 1 absence, 12 bouts), `makeResultsFile(overrides?)` (bashoId 637, day 12, records for 3842 (8–3–1), 4227 (10–2), 4055 (3–9), 3983 juryo (7–5), torikumi day 12 with one Makuuchi match 3842 vs 4227 won by 4227 by `yorikiri` and one undecided 4055 vs unknown `{id:null, shikona:{en:'Visitor', jp:'来客'}}`; `yusho: {}`).

- [ ] **Step 1: Fixtures** — append to `src/test/fixtures.ts` (add `Bout, RikishiRecord, ResultsFile` to the imports from `'../data/results'`):

```ts
export function makeBout(overrides: Partial<Bout> = {}): Bout {
  return {
    day: 1,
    outcome: 'win',
    opponent: { id: 4055, shikona: { en: 'Wakatakakage', jp: '若隆景' } },
    kimarite: 'yorikiri',
    ...overrides,
  }
}

/** 8–3 with one absence over twelve days: kachi-koshi already. */
export function makeRecord(overrides: Partial<RikishiRecord> = {}): RikishiRecord {
  const outcomes: Bout['outcome'][] = [
    'win', 'win', 'loss', 'win', 'win', 'loss', 'win', 'absent', 'win', 'win', 'loss', 'win',
  ]
  return {
    wins: 8,
    losses: 3,
    absences: 1,
    bouts: outcomes.map((outcome, i) =>
      makeBout({ day: i + 1, outcome, opponent: outcome === 'absent' ? null : makeBout().opponent, kimarite: outcome === 'absent' ? '' : 'yorikiri' })
    ),
    ...overrides,
  }
}

function recordOf(wins: number, losses: number): RikishiRecord {
  const bouts: Bout[] = []
  for (let i = 0; i < wins + losses; i++) {
    bouts.push(makeBout({ day: i + 1, outcome: i < wins ? 'win' : 'loss' }))
  }
  return { wins, losses, absences: 0, bouts }
}

/** Day 12 of September 2026: two Yokozuna, a struggling Maegashira, one Juryo. */
export function makeResultsFile(overrides: Partial<ResultsFile> = {}): ResultsFile {
  return {
    version: 1,
    bashoId: 637,
    fetchedAt: '2026-09-24T10:00:00.000Z',
    day: 12,
    divisions: ['makuuchi', 'juryo'],
    records: {
      '3842': makeRecord(),
      '4227': recordOf(10, 2),
      '4055': recordOf(3, 9),
      '3983': recordOf(7, 5),
    },
    torikumi: {
      '12': [
        {
          division: 'makuuchi',
          matchNo: 1,
          east: { id: 4055, shikona: { en: 'Wakatakakage', jp: '若隆景' } },
          west: { id: null, shikona: { en: 'Visitor', jp: '来客' } },
          winnerId: null,
          kimarite: '',
        },
        {
          division: 'makuuchi',
          matchNo: 2,
          east: { id: 3842, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } },
          west: { id: 4227, shikona: { en: 'Onosato', jp: '大の里' } },
          winnerId: 4227,
          kimarite: 'yorikiri',
        },
      ],
    },
    yusho: {},
    ...overrides,
  }
}
```
(Prettier will reflow the long `outcomes` line; let it.)

- [ ] **Step 2: Failing tests** — `src/data/results.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  boutMark,
  describeRecord,
  kachikoshiState,
  leaders,
  resultsEqualIgnoringFetchedAt,
  resultsFileName,
  scoreLabel,
  validateResults,
} from './results'
import { makeBanzuke, makeRecord, makeResultsFile, makeRikishi } from '../test/fixtures'

describe('validateResults', () => {
  it('accepts the fixture', () => {
    expect(validateResults(makeResultsFile())).toEqual({ ok: true, results: makeResultsFile() })
  })

  it.each([
    ['not an object', 42],
    ['wrong version', { ...makeResultsFile(), version: 2 }],
    ['non-integer day', { ...makeResultsFile(), day: 1.5 }],
    ['day above 15', { ...makeResultsFile(), day: 16 }],
    ['unknown division', { ...makeResultsFile(), divisions: ['makushita'] }],
    ['record key not numeric', { ...makeResultsFile(), records: { abc: makeRecord() } }],
    ['unknown outcome', { ...makeResultsFile(), records: { '1': { ...makeRecord(), bouts: [{ day: 1, outcome: 'draw', opponent: null, kimarite: '' }] } } }],
    ['bout day out of range', { ...makeResultsFile(), records: { '1': { ...makeRecord(), bouts: [{ day: 0, outcome: 'win', opponent: null, kimarite: '' }] } } }],
    ['torikumi key not a day', { ...makeResultsFile(), torikumi: { x: [] } }],
    ['match without fighters', { ...makeResultsFile(), torikumi: { '1': [{ division: 'makuuchi', matchNo: 1 }] } }],
    ['yusho for unknown division', { ...makeResultsFile(), yusho: { makushita: 1 } }],
  ])('rejects %s', (_label, input) => {
    expect(validateResults(input).ok).toBe(false)
  })

  it('names the first problem', () => {
    expect(validateResults({ ...makeResultsFile(), version: 2 })).toEqual({
      ok: false,
      error: 'version must be 1',
    })
  })
})

describe('helpers', () => {
  it('names files by basho id', () => {
    expect(resultsFileName(637)).toBe('637.json')
  })

  it('compares files ignoring fetchedAt', () => {
    const a = makeResultsFile()
    expect(resultsEqualIgnoringFetchedAt(a, { ...a, fetchedAt: 'later' })).toBe(true)
    expect(resultsEqualIgnoringFetchedAt(a, { ...a, day: 13 })).toBe(false)
  })

  it('reads kachi-koshi and make-koshi off the record, counting absences as losses', () => {
    expect(kachikoshiState({ wins: 8, losses: 3, absences: 0 })).toBe('kachikoshi')
    expect(kachikoshiState({ wins: 7, losses: 8, absences: 0 })).toBe('makekoshi')
    expect(kachikoshiState({ wins: 0, losses: 1, absences: 7 })).toBe('makekoshi')
    expect(kachikoshiState({ wins: 7, losses: 7, absences: 0 })).toBe('pending')
    expect(kachikoshiState({ wins: 0, losses: 0, absences: 0 })).toBe('pending')
  })

  it('writes the score in each language', () => {
    expect(scoreLabel({ wins: 8, losses: 3, absences: 0 }, 'en')).toBe('8–3')
    expect(scoreLabel({ wins: 8, losses: 3, absences: 1 }, 'en')).toBe('8–3–1')
    expect(scoreLabel({ wins: 8, losses: 3, absences: 0 }, 'jp')).toBe('8勝3敗')
    expect(scoreLabel({ wins: 8, losses: 3, absences: 1 }, 'jp')).toBe('8勝3敗1休')
  })

  it('describes the record as a sentence', () => {
    expect(describeRecord({ wins: 8, losses: 3, absences: 1 }, 'en')).toBe(
      '8 wins, 3 losses, 1 absence. Kachi-koshi.'
    )
    expect(describeRecord({ wins: 1, losses: 8, absences: 0 }, 'en')).toBe(
      '1 win, 8 losses. Make-koshi.'
    )
    expect(describeRecord({ wins: 7, losses: 7, absences: 0 }, 'en')).toBe('7 wins, 7 losses.')
    expect(describeRecord({ wins: 8, losses: 3, absences: 1 }, 'jp')).toBe('8勝3敗1休、勝ち越し')
    expect(describeRecord({ wins: 7, losses: 7, absences: 0 }, 'jp')).toBe('7勝7敗')
  })

  it('marks bouts the way a hoshitori does', () => {
    expect(boutMark('win')).toBe('○')
    expect(boutMark('fusen-win')).toBe('○')
    expect(boutMark('loss')).toBe('●')
    expect(boutMark('fusen-loss')).toBe('●')
    expect(boutMark('absent')).toBe('休')
  })

  it('lists the leaders in two tiers, ties in banzuke order, ignoring wrestlers without a record', () => {
    const rows = [
      ...makeBanzuke().rikishi, // 3842 (8 wins), 4227 (10), 4055 (3)
      makeRikishi({ id: 9999, shikona: { en: 'Nobody', jp: '無' } }),
    ]
    const result = leaders(makeResultsFile().records, rows)
    expect(result.map((tier) => [tier.wins, tier.rikishi.map((r) => r.id)])).toEqual([
      [10, [4227]],
      [8, [3842]],
    ])
    expect(leaders({}, rows)).toEqual([])
  })
})
```

- [ ] **Step 3:** `npx vitest run src/data/results.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement** `src/data/results.ts`:

```ts
/**
 * Tournament results: one file per basho under public/results/, written by
 * scripts/fetch-results.ts from sumo-api.com during the tournament and read
 * by the app to lay the hoshitori over the banzuke. Free of DOM and React
 * imports so the scripts can share it.
 */
import type { Division, Language, Localized, Rikishi } from '../types/banzuke'
import { DIVISIONS } from './schema'

export type BoutOutcome = 'win' | 'loss' | 'fusen-win' | 'fusen-loss' | 'absent'
export const BOUT_OUTCOMES: readonly BoutOutcome[] = ['win', 'loss', 'fusen-win', 'fusen-loss', 'absent']
export const MAX_DAYS = 15

export interface Fighter {
  /** JSA id when the wrestler is one we know; null for a visitor from below Juryo. */
  id: number | null
  shikona: Localized
}

export interface Bout {
  day: number
  outcome: BoutOutcome
  /** Null on an absence. */
  opponent: Fighter | null
  /** Romaji as sumo-api spells it ('yorikiri', 'fusen'); '' when none. */
  kimarite: string
}

export interface RikishiRecord {
  wins: number
  losses: number
  absences: number
  /** Decided bouts only, in day order. */
  bouts: Bout[]
}

export interface Match {
  division: Division
  matchNo: number
  east: Fighter
  west: Fighter
  /** Null until fought. */
  winnerId: number | null
  kimarite: string
}

export interface ResultsFile {
  version: 1
  bashoId: number
  fetchedAt: string
  /** The latest day with a decided bout; 0 before day 1. */
  day: number
  divisions: Division[]
  /** Keyed by JSA id. */
  records: Record<string, RikishiRecord>
  /** Keyed by day ('1'…'15'), in matchNo order. */
  torikumi: Record<string, Match[]>
  /** JSA id of the champion, once decided. */
  yusho: Partial<Record<Division, number>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isLocalized(value: unknown): value is Localized {
  return isRecord(value) && typeof value.en === 'string' && typeof value.jp === 'string'
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isDay(value: unknown): value is number {
  return isInteger(value) && value >= 1 && value <= MAX_DAYS
}

function isDivision(value: unknown): value is Division {
  return (DIVISIONS as readonly string[]).includes(value as string)
}

function isFighter(value: unknown): value is Fighter {
  return (
    isRecord(value) &&
    (value.id === null || (isInteger(value.id) && value.id > 0)) &&
    isLocalized(value.shikona)
  )
}

function boutProblem(bout: unknown): string | null {
  if (!isRecord(bout)) return 'bout is not an object'
  if (!isDay(bout.day)) return 'bout day out of range'
  if (!BOUT_OUTCOMES.includes(bout.outcome as BoutOutcome)) return 'unknown outcome'
  if (bout.opponent !== null && !isFighter(bout.opponent)) return 'opponent malformed'
  if (typeof bout.kimarite !== 'string') return 'kimarite must be a string'
  return null
}

function recordProblem(record: unknown): string | null {
  if (!isRecord(record)) return 'record is not an object'
  for (const key of ['wins', 'losses', 'absences'] as const) {
    if (!isInteger(record[key]) || (record[key] as number) < 0) return `${key} must be ≥ 0`
  }
  if (!Array.isArray(record.bouts)) return 'bouts must be an array'
  for (const [i, bout] of record.bouts.entries()) {
    const problem = boutProblem(bout)
    if (problem) return `bouts[${i}]: ${problem}`
  }
  return null
}

function matchProblem(match: unknown): string | null {
  if (!isRecord(match)) return 'match is not an object'
  if (!isDivision(match.division)) return 'division is unknown'
  if (!isInteger(match.matchNo) || match.matchNo < 1) return 'matchNo must be ≥ 1'
  if (!isFighter(match.east) || !isFighter(match.west)) return 'fighters malformed'
  if (match.winnerId !== null && !isInteger(match.winnerId)) return 'winnerId malformed'
  if (typeof match.kimarite !== 'string') return 'kimarite must be a string'
  return null
}

export function validateResults(
  input: unknown
): { ok: true; results: ResultsFile } | { ok: false; error: string } {
  if (!isRecord(input)) return { ok: false, error: 'results file is not an object' }
  if (input.version !== 1) return { ok: false, error: 'version must be 1' }
  if (!isInteger(input.bashoId) || input.bashoId <= 0) return { ok: false, error: 'bashoId' }
  if (typeof input.fetchedAt !== 'string') return { ok: false, error: 'fetchedAt' }
  if (!isInteger(input.day) || input.day < 0 || input.day > MAX_DAYS) {
    return { ok: false, error: 'day must be 0…15' }
  }
  if (!Array.isArray(input.divisions) || !input.divisions.every(isDivision)) {
    return { ok: false, error: 'divisions must list known divisions' }
  }
  if (!isRecord(input.records)) return { ok: false, error: 'records must be an object' }
  for (const [key, record] of Object.entries(input.records)) {
    if (!/^\d+$/.test(key)) return { ok: false, error: `records: key ${key} is not an id` }
    const problem = recordProblem(record)
    if (problem) return { ok: false, error: `records[${key}]: ${problem}` }
  }
  if (!isRecord(input.torikumi)) return { ok: false, error: 'torikumi must be an object' }
  for (const [key, matches] of Object.entries(input.torikumi)) {
    if (!isDay(Number(key))) return { ok: false, error: `torikumi: key ${key} is not a day` }
    if (!Array.isArray(matches)) return { ok: false, error: `torikumi[${key}] must be an array` }
    for (const [i, match] of matches.entries()) {
      const problem = matchProblem(match)
      if (problem) return { ok: false, error: `torikumi[${key}][${i}]: ${problem}` }
    }
  }
  if (!isRecord(input.yusho)) return { ok: false, error: 'yusho must be an object' }
  for (const [division, id] of Object.entries(input.yusho)) {
    if (!isDivision(division)) return { ok: false, error: `yusho: unknown division ${division}` }
    if (!isInteger(id)) return { ok: false, error: `yusho[${division}] must be an id` }
  }
  return { ok: true, results: input as unknown as ResultsFile }
}

export function resultsFileName(bashoId: number): string {
  return `${bashoId}.json`
}

export function resultsEqualIgnoringFetchedAt(a: ResultsFile, b: ResultsFile): boolean {
  const strip = ({ fetchedAt: _ignored, ...rest }: ResultsFile) => rest
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
}

export type KachikoshiState = 'kachikoshi' | 'makekoshi' | 'pending'

/** Eight wins is kachi-koshi; eight losses (an absence counts as one) is make-koshi. */
export function kachikoshiState(r: Pick<RikishiRecord, 'wins' | 'losses' | 'absences'>): KachikoshiState {
  if (r.wins >= 8) return 'kachikoshi'
  if (r.losses + r.absences >= 8) return 'makekoshi'
  return 'pending'
}

/** '8–3' / '8–3–1' in English; 8勝3敗 / 8勝3敗1休 in Japanese. */
export function scoreLabel(
  r: Pick<RikishiRecord, 'wins' | 'losses' | 'absences'>,
  language: Language
): string {
  if (language === 'jp') {
    return `${r.wins}勝${r.losses}敗${r.absences > 0 ? `${r.absences}休` : ''}`
  }
  return `${r.wins}–${r.losses}${r.absences > 0 ? `–${r.absences}` : ''}`
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** A sentence for accessible names and the dialog. */
export function describeRecord(
  r: Pick<RikishiRecord, 'wins' | 'losses' | 'absences'>,
  language: Language
): string {
  const state = kachikoshiState(r)
  if (language === 'jp') {
    const tail = state === 'kachikoshi' ? '、勝ち越し' : state === 'makekoshi' ? '、負け越し' : ''
    return `${scoreLabel(r, 'jp')}${tail}`
  }
  const parts = [plural(r.wins, 'win', 'wins'), plural(r.losses, 'loss', 'losses')]
  if (r.absences > 0) parts.push(plural(r.absences, 'absence', 'absences'))
  const tail = state === 'kachikoshi' ? ' Kachi-koshi.' : state === 'makekoshi' ? ' Make-koshi.' : ''
  return `${parts.join(', ')}.${tail}`
}

export function boutMark(outcome: BoutOutcome): '○' | '●' | '休' {
  if (outcome === 'absent') return '休'
  return outcome === 'win' || outcome === 'fusen-win' ? '○' : '●'
}

/** The top two win counts among `rows`, ties in banzuke order. */
export function leaders(
  records: Record<string, RikishiRecord>,
  rows: Rikishi[]
): Array<{ wins: number; rikishi: Rikishi[] }> {
  const byWins = new Map<number, Rikishi[]>()
  for (const rikishi of rows) {
    const record = records[String(rikishi.id)]
    if (!record) continue
    const list = byWins.get(record.wins) ?? []
    list.push(rikishi)
    byWins.set(record.wins, list)
  }
  return [...byWins.keys()]
    .sort((a, b) => b - a)
    .slice(0, 2)
    .map((wins) => ({ wins, rikishi: byWins.get(wins)! }))
}
```

- [ ] **Step 5:** `tsconfig.scripts.json` include: add `"src/data/results.ts"` and `"src/utils/dates.ts"` (the CLI uses `getTournamentStatus`; `dates.ts` only imports a type and uses `Intl`, which is in `lib: ES2022`). `npx tsc --noEmit -p tsconfig.scripts.json` → clean.
- [ ] **Step 6:** `npx vitest run src/data/results.test.ts` → PASS. Full gate; commit `data: tournament results format, validation and hoshitori helpers`.

---

### Task A2: sumo-api results parsing (pure) + fixtures

**Files:**
- Modify: `scripts/lib/sumo-api.ts` (extend types; add `resultsFromSumoApi`)
- Create fixtures: `scripts/lib/__fixtures__/sumo-api-202607-makuuchi-results.json`, `…-juryo-results.json`, `…-torikumi-makuuchi-1.json`, `…-torikumi-juryo-1.json`, `…-torikumi-makuuchi-15.json`, `…-basho.json`
- Test: `scripts/lib/sumo-api.test.ts` (append)

**Interfaces — Produces:**
```ts
export interface SumoApiBoutRecord { result: string; opponentShikonaEn: string; opponentShikonaJp: string; opponentID: number; kimarite: string }
// SumoApiBanzukeEntry gains: record?: SumoApiBoutRecord[]; wins?: number; losses?: number; absences?: number
export interface SumoApiMatch { division: string; day: number; matchNo: number; eastId: number; eastShikona: string; eastRank: string; westId: number; westShikona: string; westRank: string; kimarite: string; winnerId: number; winnerEn: string; winnerJp: string }
export interface SumoApiTorikumi { date: string; torikumi?: SumoApiMatch[] }
export interface SumoApiYusho { type: string; rikishiId: number; shikonaEn: string; shikonaJp: string }
// SumoApiBasho gains: yusho?: SumoApiYusho[]
export function parseOutcome(result: string): BoutOutcome | null   // 'fusen win' → 'fusen-win'; unknown → null
export function resultsFromSumoApi(input: {
  bashoId: number; fetchedAt: string; basho: SumoApiBasho
  banzuke: SumoApiBanzuke[]; torikumi: Map<number, SumoApiTorikumi>
  rikishi: Map<number, SumoApiRikishi>
}): { results: ResultsFile; problems: string[] }
```
Rules: a banzuke entry without an `nskId` is a problem (reported, skipped). Bouts keep only parseable outcomes; `day` is the 1-based index in `record`. `wins/losses/absences` come from the entry when present, else counted from the kept bouts. A bout's opponent: `null` for `absent`; otherwise `{ id: nskId of opponentID or null, shikona: { en: opponentShikonaEn, jp: cleanShikonaJp(opponentShikonaJp, opponentShikonaEn) } }`. Matches: `winnerId` → JSA id or null when `winnerId` is 0/absent or unmapped (unmapped decided winner → problem). `results.day` = max day with any decided match or any bout. `yusho[division]` set when `basho.yusho` names a Makuuchi/Juryo champion with a known `nskId`. Divisions come from the banzuke tables given.

- [ ] **Step 1: Capture fixtures** (network, once). Git Bash:

```bash
B=https://www.sumo-api.com/api; D=scripts/lib/__fixtures__
strip='const s=e=>({side:e.side,rikishiID:e.rikishiID,shikonaEn:e.shikonaEn,shikonaJp:e.shikonaJp,rank:e.rank,record:e.record.map(r=>({result:r.result,opponentShikonaEn:r.opponentShikonaEn,opponentShikonaJp:r.opponentShikonaJp,opponentID:r.opponentID,kimarite:r.kimarite})),wins:e.wins,losses:e.losses,absences:e.absences})'
for div in Makuuchi Juryo; do
  curl -s "$B/basho/202607/banzuke/$div" | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>{const j=JSON.parse(t);$strip;console.log(JSON.stringify({bashoId:j.bashoId,division:j.division,east:j.east.map(s),west:j.west.map(s)},null,1))})" > $D/sumo-api-202607-$(echo $div | tr A-Z a-z)-results.json
done
tk='const s=m=>({division:m.division,day:m.day,matchNo:m.matchNo,eastId:m.eastId,eastShikona:m.eastShikona,eastRank:m.eastRank,westId:m.westId,westShikona:m.westShikona,westRank:m.westRank,kimarite:m.kimarite,winnerId:m.winnerId,winnerEn:m.winnerEn,winnerJp:m.winnerJp})'
curl -s "$B/basho/202607/torikumi/Makuuchi/1"  | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>{const j=JSON.parse(t);$tk;console.log(JSON.stringify({date:j.date,torikumi:j.torikumi.map(s)},null,1))})" > $D/sumo-api-202607-torikumi-makuuchi-1.json
curl -s "$B/basho/202607/torikumi/Juryo/1"     | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>{const j=JSON.parse(t);$tk;console.log(JSON.stringify({date:j.date,torikumi:j.torikumi.map(s)},null,1))})" > $D/sumo-api-202607-torikumi-juryo-1.json
curl -s "$B/basho/202607/torikumi/Makuuchi/15" | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>{const j=JSON.parse(t);$tk;console.log(JSON.stringify({date:j.date,torikumi:j.torikumi.map(s)},null,1))})" > $D/sumo-api-202607-torikumi-makuuchi-15.json
curl -s "$B/basho/202607" | node -e "let t='';process.stdin.on('data',d=>t+=d).on('end',()=>{const j=JSON.parse(t);console.log(JSON.stringify({date:j.date,startDate:j.startDate,endDate:j.endDate,yusho:j.yusho.map(y=>({type:y.type,rikishiId:y.rikishiId,shikonaEn:y.shikonaEn,shikonaJp:y.shikonaJp}))},null,1))})" > $D/sumo-api-202607-basho.json
ls -la $D/sumo-api-202607-*
```
Expected: six files; the two results files ~60–70 KB each, the torikumi files ~5 KB, basho <1 KB. The existing `sumo-api-202609-rikishis.json` (sumo-api id → `nskId` for every active wrestler) is reused for the join. If the API is unreachable, stop and report BLOCKED.

- [ ] **Step 2: Failing tests** — append to `scripts/lib/sumo-api.test.ts` (extend the import list with `parseOutcome, resultsFromSumoApi, type SumoApiBasho, type SumoApiTorikumi`; import `validateResults` from `'../../src/data/results.ts'` and `validateArchive` is already imported):

```ts
describe('parseOutcome', () => {
  it.each([
    ['win', 'win'],
    ['loss', 'loss'],
    ['fusen win', 'fusen-win'],
    ['fusen loss', 'fusen-loss'],
    ['absent', 'absent'],
  ])('maps %s', (raw, outcome) => {
    expect(parseOutcome(raw)).toBe(outcome)
  })
  it('rejects anything else, including the empty result of an unfought day', () => {
    expect(parseOutcome('')).toBeNull()
    expect(parseOutcome('draw')).toBeNull()
  })
})

describe('resultsFromSumoApi (July 2026)', () => {
  const rikishi = new Map(
    load<SumoApiRikishi[]>('sumo-api-202609-rikishis.json').map((r) => [r.id, r])
  )
  const banzuke = [
    load<SumoApiBanzuke>('sumo-api-202607-makuuchi-results.json'),
    load<SumoApiBanzuke>('sumo-api-202607-juryo-results.json'),
  ]
  const torikumi = new Map<number, SumoApiTorikumi>([
    [1, load<SumoApiTorikumi>('sumo-api-202607-torikumi-makuuchi-1.json')],
    [15, load<SumoApiTorikumi>('sumo-api-202607-torikumi-makuuchi-15.json')],
  ])
  const basho = load<SumoApiBasho>('sumo-api-202607-basho.json')
  const { results, problems } = resultsFromSumoApi({
    bashoId: 636,
    fetchedAt: '2026-09-07T00:00:00.000Z',
    basho,
    banzuke,
    torikumi,
    rikishi,
  })

  it('maps every wrestler to a JSA id and validates', () => {
    expect(problems).toEqual([])
    expect(validateResults(results).ok).toBe(true)
    expect(results.bashoId).toBe(636)
    expect(results.divisions).toEqual(['makuuchi', 'juryo'])
    expect(Object.keys(results.records)).toHaveLength(banzuke[0].east.length + banzuke[0].west.length + banzuke[1].east.length + banzuke[1].west.length)
  })

  it('agrees with the archived July banzuke on who was there', () => {
    const archive = validateArchive(
      JSON.parse(readFileSync(resolve(__dirname, '../../public/banzuke/636.json'), 'utf8'))
    )
    if (!archive.ok) throw new Error(archive.error)
    const archivedIds = archive.archive.rikishi.map((r) => String(r.id)).sort()
    expect(Object.keys(results.records).sort()).toEqual(archivedIds)
  })

  it('keeps fifteen decided bouts per wrestler that add up to the totals', () => {
    for (const [id, record] of Object.entries(results.records)) {
      expect(record.bouts, id).toHaveLength(15)
      expect(record.wins + record.losses + record.absences, id).toBe(15)
      expect(record.bouts.filter((b) => b.outcome === 'absent').length, id).toBe(record.absences)
      expect(record.bouts.every((b, i) => b.day === i + 1), id).toBe(true)
      expect(record.bouts.every((b) => (b.outcome === 'absent') === (b.opponent === null)), id).toBe(true)
    }
  })

  it('reads Onosato as 12 wins and Hoshoryu with one fusen loss and one absence', () => {
    // JSA ids: Onosato 4227, Hoshoryu 3842 — the probe on 2026-09-07 showed 7-7-1 for Hoshoryu.
    const hoshoryu = results.records['3842']
    expect(hoshoryu.absences).toBe(1)
    expect(hoshoryu.bouts.some((b) => b.outcome === 'fusen-loss' && b.kimarite === 'fusen')).toBe(true)
    expect(results.records['4227'].wins + results.records['4227'].losses).toBe(15)
  })

  it('maps the day 15 torikumi to JSA ids with the winner among the two fighters', () => {
    const day15 = results.torikumi['15']
    expect(day15.length).toBeGreaterThan(15)
    for (const match of day15) {
      expect(match.division).toBe('makuuchi')
      expect(match.winnerId).not.toBeNull()
      expect([match.east.id, match.west.id]).toContain(match.winnerId)
      expect(match.kimarite).not.toBe('')
    }
    expect(day15.map((m) => m.matchNo)).toEqual(day15.map((_, i) => i + 1))
    expect(results.torikumi['1']).toBeDefined()
    expect(results.torikumi['2']).toBeUndefined()
    expect(results.day).toBe(15)
  })

  it('names the Makuuchi and Juryo champions by JSA id and ignores lower divisions', () => {
    expect(Object.keys(results.yusho).sort()).toEqual(['juryo', 'makuuchi'])
    expect(results.records[String(results.yusho.makuuchi)].wins).toBeGreaterThanOrEqual(12)
  })

  it('tolerates an unpublished torikumi and a partial record', () => {
    const partial: SumoApiBanzuke = {
      ...banzuke[0],
      east: [{ ...banzuke[0].east[0], record: banzuke[0].east[0].record!.slice(0, 3).concat([{ result: '', opponentShikonaEn: '', opponentShikonaJp: '', opponentID: 0, kimarite: '' }]), wins: undefined, losses: undefined, absences: undefined }],
      west: [],
    }
    const out = resultsFromSumoApi({
      bashoId: 636,
      fetchedAt: 'x',
      basho: { date: '202607', startDate: '', endDate: '' },
      banzuke: [partial],
      torikumi: new Map([[4, { date: '202607' }]]),
      rikishi,
    })
    const only = Object.values(out.results.records)[0]
    expect(only.bouts).toHaveLength(3)
    expect(only.wins + only.losses + only.absences).toBe(3)
    expect(out.results.day).toBe(3)
    expect(out.results.torikumi).toEqual({})
    expect(out.results.yusho).toEqual({})
  })

  it('reports a wrestler without a JSA id instead of guessing', () => {
    const stranger: SumoApiBanzuke = {
      bashoId: '202607',
      division: 'Juryo',
      east: [{ side: 'East', rikishiID: 999999, shikonaEn: 'Nobody', rank: 'Juryo 1 East', record: [], wins: 0, losses: 0, absences: 0 }],
      west: [],
    }
    const out = resultsFromSumoApi({ bashoId: 636, fetchedAt: 'x', basho, banzuke: [stranger], torikumi: new Map(), rikishi })
    expect(out.problems).toEqual(['Juryo: Nobody (sumo-api 999999) has no JSA id'])
    expect(out.results.records).toEqual({})
  })
})
```

- [ ] **Step 3:** `npx vitest run scripts/lib/sumo-api.test.ts` → FAIL.

- [ ] **Step 4: Implement** — in `scripts/lib/sumo-api.ts` add the imports `import type { BoutOutcome, Bout, Fighter, Match, ResultsFile, RikishiRecord } from '../../src/data/results.ts'`, extend `SumoApiBanzukeEntry` with `record?: SumoApiBoutRecord[]; wins?: number; losses?: number; absences?: number`, extend `SumoApiBasho` with `yusho?: SumoApiYusho[]`, and append:

```ts
export interface SumoApiBoutRecord {
  result: string
  opponentShikonaEn: string
  opponentShikonaJp: string
  opponentID: number
  kimarite: string
}

export interface SumoApiMatch {
  division: string
  day: number
  matchNo: number
  eastId: number
  eastShikona: string
  eastRank: string
  westId: number
  westShikona: string
  westRank: string
  kimarite: string
  winnerId: number
  winnerEn: string
  winnerJp: string
}

export interface SumoApiTorikumi {
  date: string
  /** Absent until the JSA publishes the day's card. */
  torikumi?: SumoApiMatch[]
}

export interface SumoApiYusho {
  type: string
  rikishiId: number
  shikonaEn: string
  shikonaJp: string
}

const OUTCOMES: Record<string, BoutOutcome> = {
  win: 'win',
  loss: 'loss',
  'fusen win': 'fusen-win',
  'fusen loss': 'fusen-loss',
  absent: 'absent',
}

export function parseOutcome(result: string): BoutOutcome | null {
  return OUTCOMES[result] ?? null
}

/** A fighter by sumo-api id: the JSA id when known, otherwise just the name. */
function fighter(
  sumoApiId: number,
  shikonaEn: string,
  shikonaJp: string | undefined,
  rikishi: Map<number, SumoApiRikishi>
): Fighter {
  const person = rikishi.get(sumoApiId)
  return {
    id: person?.nskId || null,
    shikona: { en: shikonaEn, jp: cleanShikonaJp(shikonaJp ?? person?.shikonaJp, shikonaEn) },
  }
}

function recordFromEntry(
  entry: SumoApiBanzukeEntry,
  rikishi: Map<number, SumoApiRikishi>
): RikishiRecord {
  const bouts: Bout[] = []
  for (const [i, raw] of (entry.record ?? []).entries()) {
    const outcome = parseOutcome(raw.result)
    if (!outcome) continue
    bouts.push({
      day: i + 1,
      outcome,
      opponent:
        outcome === 'absent'
          ? null
          : fighter(raw.opponentID, raw.opponentShikonaEn, raw.opponentShikonaJp, rikishi),
      kimarite: raw.kimarite ?? '',
    })
  }
  const count = (test: (b: Bout) => boolean) => bouts.filter(test).length
  return {
    wins: entry.wins ?? count((b) => b.outcome === 'win' || b.outcome === 'fusen-win'),
    losses: entry.losses ?? count((b) => b.outcome === 'loss' || b.outcome === 'fusen-loss'),
    absences: entry.absences ?? count((b) => b.outcome === 'absent'),
    bouts,
  }
}

export function resultsFromSumoApi(input: {
  bashoId: number
  fetchedAt: string
  basho: SumoApiBasho
  banzuke: SumoApiBanzuke[]
  torikumi: Map<number, SumoApiTorikumi>
  rikishi: Map<number, SumoApiRikishi>
}): { results: ResultsFile; problems: string[] } {
  const problems: string[] = []
  const records: ResultsFile['records'] = {}
  let day = 0

  for (const table of input.banzuke) {
    for (const entry of [...table.east, ...table.west]) {
      const person = input.rikishi.get(entry.rikishiID)
      if (!person?.nskId) {
        problems.push(`${table.division}: ${entry.shikonaEn} (sumo-api ${entry.rikishiID}) has no JSA id`)
        continue
      }
      const record = recordFromEntry(entry, input.rikishi)
      records[String(person.nskId)] = record
      day = Math.max(day, record.bouts.at(-1)?.day ?? 0)
    }
  }

  const torikumi: ResultsFile['torikumi'] = {}
  for (const [dayNumber, card] of [...input.torikumi.entries()].sort((a, b) => a[0] - b[0])) {
    const matches = card.torikumi ?? []
    if (matches.length === 0) continue
    const mapped: Match[] = [...matches]
      .sort((a, b) => a.matchNo - b.matchNo)
      .map((m) => {
        const east = fighter(m.eastId, m.eastShikona, undefined, input.rikishi)
        const west = fighter(m.westId, m.westShikona, undefined, input.rikishi)
        let winnerId: number | null = null
        if (m.winnerId) {
          winnerId = m.winnerId === m.eastId ? east.id : m.winnerId === m.westId ? west.id : null
          if (winnerId === null) {
            problems.push(`day ${dayNumber} match ${m.matchNo}: winner ${m.winnerEn} (sumo-api ${m.winnerId}) has no JSA id`)
          } else {
            day = Math.max(day, dayNumber)
          }
        }
        return {
          division: DIVISION_OF[m.division as SumoApiBanzuke['division']] ?? 'makuuchi',
          matchNo: m.matchNo,
          east,
          west,
          winnerId,
          kimarite: m.kimarite ?? '',
        }
      })
    torikumi[String(dayNumber)] = mapped
  }

  const yusho: ResultsFile['yusho'] = {}
  for (const champion of input.basho.yusho ?? []) {
    const division = DIVISION_OF[champion.type as SumoApiBanzuke['division']]
    const id = input.rikishi.get(champion.rikishiId)?.nskId
    if (division && id) yusho[division] = id
  }

  const divisions = input.banzuke.map((table) => DIVISION_OF[table.division])
  return {
    results: {
      version: 1,
      bashoId: input.bashoId,
      fetchedAt: input.fetchedAt,
      day,
      divisions,
      records,
      torikumi,
      yusho,
    },
    problems,
  }
}
```
Note on the "unpublished torikumi" test: a card with `torikumi: undefined` yields no key, and `day` stays what the records say.

- [ ] **Step 5:** run → PASS including the 636 cross-check. If the archive cross-check fails on specific ids, report them and stop (do not loosen).
- [ ] **Step 6:** Gate; commit `scripts: parse sumo-api records, torikumi and yusho into the results format`.

---

### Task A3: The `fetch-results` CLI and the July 2026 file

**Files:**
- Create: `scripts/fetch-results.ts`
- Modify: `package.json` (script `fetch-results`)
- Create (generated): `public/results/636.json`
- Create: `src/data/results-files.test.ts`

**Interfaces — Consumes:** `fetchJson` (`scripts/lib/http.ts`), `resultsFromSumoApi` + types (A2), `validateResults`, `resultsFileName`, `resultsEqualIgnoringFetchedAt` (A1), `validateSnapshot`, `snapshotBashoId` (`src/data/schema.ts`), `sumoApiBashoId`, `bashoIdFromSumoApi` (`src/data/bashoIds.ts`), `getTournamentStatus` (`src/utils/dates.ts`).

CLI: `tsx scripts/fetch-results.ts [--snapshot <path>] [--out-dir <dir>] [--previous-dir <dir>] [--basho <YYYYMM>] [--delay <ms>] [--force]`. Without `--basho` the tournament is the snapshot's; the window check (live, or ≤ 1 day before, or ≤ 3 days after) uses the snapshot's `start_date`/`end_date`; `--basho` implies `--force` (dates then come from sumo-api's basho record). Writes `<out-dir>/<bashoId>.json` when it differs from `<previous-dir>/<bashoId>.json` (default previous = out). Prints `changed=true|false` and appends to `$GITHUB_OUTPUT`. Exit 0 success/out-of-season/unchanged, 1 fetch failure, 2 unmapped wrestlers (nothing written).

- [ ] **Step 1: Implement** `scripts/fetch-results.ts`:

```ts
/**
 * Fetches the current tournament's results — every wrestler's record, each
 * day's torikumi and the yusho — from sumo-api.com and writes one file per
 * basho for the app's hoshitori overlay.
 *
 * Runs on every deploy but only fetches in season: from the day before the
 * first day to three days after senshuraku (late corrections), as read from
 * the snapshot's dates. Out of season it prints `changed=false` and exits 0.
 *
 * Usage:
 *   tsx scripts/fetch-results.ts [--snapshot <path>] [--out-dir <dir>] [--previous-dir <dir>]
 *                                [--basho <YYYYMM>] [--delay <ms>] [--force]
 *
 * --basho   Fetch a specific tournament (implies --force); used to seed the
 *           archive and to test against a finished basho.
 *
 * Exit codes: 0 success / unchanged / out of season, 1 fetch failure,
 * 2 a wrestler could not be mapped to a JSA id (nothing written).
 */
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { fetchJson } from './lib/http.ts'
import {
  resultsFromSumoApi,
  type SumoApiBanzuke,
  type SumoApiBasho,
  type SumoApiRikishi,
  type SumoApiTorikumi,
} from './lib/sumo-api.ts'
import { bashoIdFromSumoApi, sumoApiBashoId } from '../src/data/bashoIds.ts'
import {
  MAX_DAYS,
  resultsEqualIgnoringFetchedAt,
  resultsFileName,
  validateResults,
  type ResultsFile,
} from '../src/data/results.ts'
import { snapshotBashoId, validateSnapshot } from '../src/data/schema.ts'
import { getTournamentStatus } from '../src/utils/dates.ts'

const API = 'https://www.sumo-api.com/api'
const DIVISIONS_API = ['Makuuchi', 'Juryo'] as const
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/results') },
    'previous-dir': { type: 'string' },
    basho: { type: 'string' },
    delay: { type: 'string', default: '300' },
    force: { type: 'boolean', default: false },
  },
})

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

async function setOutput(name: string, value: string): Promise<void> {
  console.log(`${name}=${value}`)
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
  }
}

async function readResults(path: string): Promise<ResultsFile | null> {
  try {
    const result = validateResults(JSON.parse(await readFile(path, 'utf8')))
    return result.ok ? result.results : null
  } catch {
    return null
  }
}

/** Which tournament, and whether we are in season for it. */
async function target(): Promise<{ bashoId: number; yyyymm: string; inSeason: boolean } | null> {
  if (args.basho) {
    const bashoId = bashoIdFromSumoApi(args.basho)
    if (bashoId === null) {
      console.error(`${args.basho}: not a tournament month`)
      return null
    }
    return { bashoId, yyyymm: args.basho, inSeason: true }
  }
  const validation = validateSnapshot(JSON.parse(await readFile(resolve(args.snapshot as string), 'utf8')))
  if (!validation.ok) {
    console.error(`Cannot read snapshot: ${validation.errors[0]}`)
    return null
  }
  const bashoId = snapshotBashoId(validation.snapshot)
  const info = validation.snapshot.divisions.makuuchi.payloads.en.BashoInfo
  const status = getTournamentStatus({ startDate: info.start_date, endDate: info.end_date })
  const inSeason =
    status.kind === 'live' ||
    (status.kind === 'upcoming' && status.daysUntil <= 1) ||
    (status.kind === 'finished' && status.daysSince <= 3)
  console.log(`Basho ${bashoId}: ${status.kind}${inSeason ? '' : ' — out of season'}`)
  return { bashoId, yyyymm: sumoApiBashoId(bashoId), inSeason }
}

/** Days whose card is already complete in the previous file need no refetch. */
function daysToFetch(previous: ResultsFile | null, upTo: number): number[] {
  const days: number[] = []
  for (let day = 1; day <= upTo; day++) {
    const card = previous?.torikumi[String(day)]
    const complete = card && card.length > 0 && card.every((m) => m.winnerId !== null)
    if (!complete) days.push(day)
  }
  return days
}

async function main(): Promise<number> {
  const outDir = resolve(args['out-dir'] as string)
  const previousDir = args['previous-dir'] ? resolve(args['previous-dir']) : outDir
  const delayMs = Math.max(0, Number(args.delay) || 0)

  const which = await target()
  if (!which) return 2
  if (!which.inSeason && !args.force) {
    await setOutput('changed', 'false')
    return 0
  }
  const { bashoId, yyyymm } = which
  const previous = await readResults(join(previousDir, resultsFileName(bashoId)))

  const basho = await fetchJson<SumoApiBasho>(`${API}/basho/${yyyymm}`)
  await sleep(delayMs)
  const banzuke: SumoApiBanzuke[] = []
  for (const division of DIVISIONS_API) {
    banzuke.push(await fetchJson<SumoApiBanzuke>(`${API}/basho/${yyyymm}/banzuke/${division}`))
    await sleep(delayMs)
  }
  const page = await fetchJson<{ records: SumoApiRikishi[] }>(`${API}/rikishis?limit=1000`, {
    timeoutMs: 60_000,
  })
  const rikishi = new Map(page.records.map((r) => [r.id, r]))

  // The latest fought day, from the records; the next day's card may already be out.
  const fought = Math.max(
    0,
    ...banzuke.flatMap((t) => [...t.east, ...t.west]).map((e) => (e.record ?? []).filter((r) => r.result).length)
  )
  const upTo = Math.min(MAX_DAYS, fought + 1)
  const torikumi = new Map<number, SumoApiTorikumi>(
    Object.entries(previous?.torikumi ?? {}).map(([day, matches]) => [
      Number(day),
      {
        date: yyyymm,
        torikumi: matches.map((m) => ({
          division: m.division === 'juryo' ? 'Juryo' : 'Makuuchi',
          day: Number(day),
          matchNo: m.matchNo,
          eastId: 0,
          eastShikona: m.east.shikona.en,
          eastRank: '',
          westId: 0,
          westShikona: m.west.shikona.en,
          westRank: '',
          kimarite: m.kimarite,
          winnerId: 0,
          winnerEn: '',
          winnerJp: '',
        })),
      },
    ])
  )
  // Carrying complete days over as sumo-api shapes would lose the JSA ids, so
  // complete days are copied straight from `previous` after conversion instead.
  torikumi.clear()
  const keep = new Map<string, ResultsFile['torikumi'][string]>()
  for (const [day, matches] of Object.entries(previous?.torikumi ?? {})) {
    if (matches.length > 0 && matches.every((m) => m.winnerId !== null)) keep.set(day, matches)
  }
  for (const day of daysToFetch(previous, upTo)) {
    for (const division of DIVISIONS_API) {
      await sleep(delayMs)
      const card = await fetchJson<SumoApiTorikumi>(`${API}/basho/${yyyymm}/torikumi/${division}/${day}`)
      const existing = torikumi.get(day)
      torikumi.set(day, {
        date: card.date,
        torikumi: [...(existing?.torikumi ?? []), ...(card.torikumi ?? [])],
      })
    }
  }

  const { results, problems } = resultsFromSumoApi({
    bashoId,
    fetchedAt: new Date().toISOString(),
    basho,
    banzuke,
    torikumi,
    rikishi,
  })
  for (const [day, matches] of keep) results.torikumi[day] = matches
  results.torikumi = Object.fromEntries(
    Object.entries(results.torikumi).sort((a, b) => Number(a[0]) - Number(b[0]))
  )
  if (problems.length > 0) {
    console.error(`${problems.length} problem(s); nothing written:`)
    for (const problem of problems) console.error(`  - ${problem}`)
    return 2
  }
  console.log(
    `Basho ${bashoId}: day ${results.day}, ${Object.keys(results.records).length} records, cards for days ${Object.keys(results.torikumi).join(', ') || 'none'}`
  )

  if (previous && resultsEqualIgnoringFetchedAt(previous, results)) {
    console.log('No changes.')
    await setOutput('changed', 'false')
    return 0
  }
  await mkdir(outDir, { recursive: true })
  const path = join(outDir, resultsFileName(bashoId))
  await writeFile(path, `${JSON.stringify(results, null, 1)}\n`, 'utf8')
  console.log(`Saved ${path}`)
  await setOutput('changed', 'true')
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
**Simplify before committing:** the block that builds `torikumi` from `previous` and then calls `torikumi.clear()` is dead — delete it, keep only `const torikumi = new Map<number, SumoApiTorikumi>()` followed by the `keep` map and the fetch loop. (It is left in the plan text to make the intent explicit: complete days are carried over already-converted via `keep`, never re-fetched.) Note on cross-division bouts: they are published on the Makuuchi card only (verified on July 2026), so `Match.division` is the card of origin; the UI selects a division's bouts by whether either fighter's id is on that division's rows.

`package.json` scripts, after `backfill-archive`: `"fetch-results": "tsx scripts/fetch-results.ts",`

- [ ] **Step 2: Seed the archive** — `npm run fetch-results -- --basho 202607`. Expected log: `Basho 636: day 15, 70 records, cards for days 1, 2, …, 15`, `Saved …/public/results/636.json`, `changed=true`. Note the file size (expect 150–250 KB). Run it a second time → `No changes.` / `changed=false` (idempotence proves the compare).
- [ ] **Step 3: Out-of-season path** — `npm run fetch-results` (no `--basho`) → `Basho 637: upcoming — out of season`, `changed=false`, exit 0, no file written.

- [ ] **Step 4: Failing test** — `src/data/results-files.test.ts`:

```ts
/**
 * Every committed results file validates and is named by its basho id, and
 * the July 2026 file — the seed and the fixture for the parser — is complete.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resultsFileName, validateResults } from './results'

const dir = resolve(__dirname, '../../public/results')

describe('public/results', () => {
  const files = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')) : []

  it('holds at least the July 2026 seed', () => {
    expect(files).toContain('636.json')
  })

  it.each(files)('%s validates and is named by its basho id', (file) => {
    const result = validateResults(JSON.parse(readFileSync(resolve(dir, file), 'utf8')))
    if (!result.ok) throw new Error(`${file}: ${result.error}`)
    expect(resultsFileName(result.results.bashoId)).toBe(file)
    expect(result.results.divisions).toEqual(['makuuchi', 'juryo'])
  })

  it('has fifteen complete days for July 2026', () => {
    const result = validateResults(JSON.parse(readFileSync(resolve(dir, '636.json'), 'utf8')))
    if (!result.ok) throw new Error(result.error)
    expect(result.results.day).toBe(15)
    expect(Object.keys(result.results.torikumi)).toHaveLength(15)
    expect(Object.keys(result.results.records)).toHaveLength(70)
    expect(result.results.yusho.makuuchi).toBeDefined()
  })
})
```
Run → PASS (the file exists from Step 2). Also run `npx vitest run scripts/lib/font-coverage.test.ts` — `public/results/` is **not** in its file set, and must not be: kimarite arrive as romaji and opponent kanji are names already on the archive; if a Makushita visitor's name brings a new glyph it renders in the fallback face, which is acceptable for a name that appears once in a bout line. Record this decision in the report.
- [ ] **Step 5:** Gate; commit `scripts: fetch-results pulls a tournament's records, cards and yusho; seed July 2026` with the script, `package.json`, `public/results/636.json`, the test.

---

### Task A4: Deploy — evening cron, results step, `[skip ci]`

**Files:** `.github/workflows/deploy.yml`

- [ ] `schedule`: add `- cron: '0 10 * * *'` with the comment `# 10:00 UTC = 19:00 JST, after the day's last bout` and update the header comment to say the pipeline runs twice a day during a tournament.
- [ ] After `Refresh wrestler profiles`, add:
```yaml
      # During a tournament, every wrestler's record and each day's card; out
      # of season the script exits without fetching. A failure keeps the
      # previous file and never blocks the deploy.
      - name: Fetch tournament results
        id: results
        continue-on-error: true
        run: |
          mkdir -p .data/results
          if [ -d public/results ]; then cp public/results/*.json .data/results/ 2>/dev/null || true; fi
          npx tsx scripts/fetch-results.ts \
            --snapshot .data/latest-banzuke.json \
            --out-dir .data/results \
            --previous-dir public/results
```
- [ ] Commit step: condition becomes `if: steps.fetch.outputs.changed == 'true' || steps.profiles.outputs.changed == 'true' || steps.results.outputs.changed == 'true'`; after the banzuke cp line add `if [ -d .data/results ]; then mkdir -p public/results && cp .data/results/*.json public/results/; fi`; `git add public/latest-banzuke.json public/assets/fonts public/banzuke public/results`; commit message becomes:
```
          git commit -m "data: banzuke ${{ steps.fetch.outputs.basho_id }} (${{ steps.fetch.outputs.start_date }}) [skip ci]"
```
with a comment above: `# [skip ci]: this push goes over the deploy key, which (unlike GITHUB_TOKEN) triggers the push workflow — without it every data commit would start a redundant second run.` Note `start_date` is only set when the fetch ran; that is pre-existing behaviour.
- [ ] `grep -n "results\|skip ci\|0 10" .github/workflows/deploy.yml` → cron, step, cp, git add, commit message present. `npm run validate` (YAML is not linted, but Prettier ignores it; nothing else changes).
- [ ] Commit `ci: fetch tournament results twice a day; skip the redundant run after a bot push`.

---

### Task A5: Docs and PR A

- [ ] README "Project structure": `public/results/  # One file per tournament of records, cards and yusho (npm run fetch-results)` and `scripts/fetch-results.ts  # Tournament results from sumo-api.com, joined by JSA id`. "Data refresh and deployment": "once a day at 07:00 JST and again at 19:00 JST"; new item: "During a tournament, fetches every wrestler's record, each day's bouts and the yusho from sumo-api.com into `public/results/`." Manual: `npm run fetch-results    # in season: refresh public/results/{bashoId}.json (--basho 202607 for a past one)`. New "### Results" subsection under Data sources describing the file, the season window, and that the browser never calls sumo-api.
- [ ] CLAUDE.md: Commands add `npm run fetch-results  # in season, write public/results/{id}.json from sumo-api`; data-flow paragraph: "twice daily (07:00 and 19:00 JST)"; "Things that look odd" bullet:
  ```markdown
  - `public/results/` holds **tournament results** (`src/data/results.ts`): one file per basho of
    per-wrestler records, per-day cards and the yusho, from sumo-api.com joined by `nskId`. The script
    fetches only in season (a day before day 1 to three days after senshuraku) and the bot commit ends
    with `[skip ci]` because deploy-key pushes trigger the push workflow. Results are **not** in the font
    subset's file set: kimarite are romaji and a visiting Makushita name may fall back.
  ```
- [ ] Gate; commit `docs: tournament results pipeline`. `git push -u origin feat/results-pipeline`; `gh pr create` "Results pipeline: records, cards and yusho from sumo-api, twice daily in season"; `gh pr checks --watch`.
- [ ] **After merge (user's call):** the push deploy should log `Basho 637: upcoming — out of season` and `changed=false`; `curl -sI https://jonath0n.github.io/banzuke-app/results/636.json` → 200. On 2026-09-12 (evening run) the first real file `637.json` should land with day 0 or 1 cards.

---

# Part B — the overlay (branch `feat/results-overlay`)

### Task B0: Branch
- [ ] `git checkout main && git pull --ff-only && git checkout -b feat/results-overlay`; baseline gate green.

---

### Task B1: Kimarite table

**Files:** Create `src/data/kimarite.ts`, `src/data/kimarite.test.ts`. Regenerate the font subset.

**Produces:** `KIMARITE: Record<string, { jp: string; en: string }>` keyed by sumo-api romaji; `kimariteLabel(key: string, language: Language): string` — JP → kanji (or the romaji when unknown), EN → the romaji; `kimariteGloss(key): string | null` — the English description for a `title`.

- [ ] **Step 1: Failing test**
```ts
import { describe, expect, it } from 'vitest'
import { KIMARITE, kimariteGloss, kimariteLabel } from './kimarite'

describe('kimarite', () => {
  it('covers the eighty-two official techniques and the five non-techniques', () => {
    expect(Object.keys(KIMARITE)).toHaveLength(87 + 2) // + hansoku, fusen
  })
  it('labels in each language and falls back to the romaji', () => {
    expect(kimariteLabel('yorikiri', 'jp')).toBe('寄り切り')
    expect(kimariteLabel('yorikiri', 'en')).toBe('yorikiri')
    expect(kimariteLabel('oshidashi', 'jp')).toBe('押し出し')
    expect(kimariteLabel('fusen', 'jp')).toBe('不戦')
    expect(kimariteLabel('mystery', 'jp')).toBe('mystery')
    expect(kimariteLabel('', 'jp')).toBe('')
  })
  it('glosses known techniques', () => {
    expect(kimariteGloss('hatakikomi')).toBe('slap down')
    expect(kimariteGloss('mystery')).toBeNull()
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement** `src/data/kimarite.ts` — the 82 kimarite in the JSA's six groups plus the five non-techniques, `hansoku` and `fusen`, keyed exactly as sumo-api spells them (verified against `GET /api/kimarite` on 2026-09-07: `yorikiri, oshidashi, hatakikomi, uwatenage, yoritaoshi, tsukiotoshi, hikiotoshi, oshitaoshi, shitatenage, okuridashi, sukuinage, tsukidashi, kotenage, uwatedashinage, tsuridashi, katasukashi, sotogake, fusen, utchari, okuritaoshi, shitatedashinage, abisetaoshi, kirikaeshi, kimedashi, tsukitaoshi, kubinage, shitatehineri, isamiashi, kakenage, tottari, uchigake, uwatehineri, hikkake, kainahineri, makiotoshi, kimetaoshi, watashikomi, ashitori, kekaeshi, ketaguri, uchimuso, komatasukui, susoharai, tsukihiza, amiuchi, okurinage, sokubiotoshi, hansoku, koshikudake, nichonage, tsukite, zubuneri, chongake, harimanage, sakatottari, kawazugake, tsuriotoshi, fumidashi, kubihineri, nimaigeri, ipponzeoi, okurihikiotoshi, sotokomata, sabaori, ushiromotare, tokkurinage, izori, kotehineri, waridashi, osakate, yaguranage, sotomuso, tsutaezori, gasshohineri, koshinage, susotori, tasukizori, yobimodoshi, kozumatori, mitokorozeme, okuritsuridashi, okuritsuriotoshi, tsumatori, omata, okurigake, tsukaminage` — plus `shumokuzori, kakezori, sototasukizori` which have not been used recently but complete the 82):

```ts
/**
 * The eighty-two kimarite (winning techniques) the JSA recognises, in its six
 * groups, plus the five non-technique decisions, the foul and the forfeit.
 * Keys are sumo-api.com's romaji, which is what the results carry; the
 * Japanese is what the hoshitori and the bout list print.
 */
import type { Language } from '../types/banzuke'

export const KIMARITE: Record<string, { jp: string; en: string }> = {
  // 基本技 — basic techniques
  tsukidashi: { jp: '突き出し', en: 'frontal thrust out' },
  tsukitaoshi: { jp: '突き倒し', en: 'frontal thrust down' },
  oshidashi: { jp: '押し出し', en: 'frontal push out' },
  oshitaoshi: { jp: '押し倒し', en: 'frontal push down' },
  yorikiri: { jp: '寄り切り', en: 'frontal force out' },
  yoritaoshi: { jp: '寄り倒し', en: 'frontal crush out' },
  abisetaoshi: { jp: '浴せ倒し', en: 'backward force down' },
  // 投げ手 — throws
  uwatenage: { jp: '上手投げ', en: 'overarm throw' },
  shitatenage: { jp: '下手投げ', en: 'underarm throw' },
  kotenage: { jp: '小手投げ', en: 'armlock throw' },
  sukuinage: { jp: '掬い投げ', en: 'beltless arm throw' },
  uwatedashinage: { jp: '上手出し投げ', en: 'pulling overarm throw' },
  shitatedashinage: { jp: '下手出し投げ', en: 'pulling underarm throw' },
  koshinage: { jp: '腰投げ', en: 'hip throw' },
  kubinage: { jp: '首投げ', en: 'headlock throw' },
  ipponzeoi: { jp: '一本背負い', en: 'one-armed shoulder throw' },
  nichonage: { jp: '二丁投げ', en: 'body drop throw' },
  yaguranage: { jp: '櫓投げ', en: 'inner thigh throw' },
  kakenage: { jp: '掛け投げ', en: 'hooking inner thigh throw' },
  tsukaminage: { jp: '掴み投げ', en: 'lifting throw' },
  // 掛け手 — leg trips
  uchigake: { jp: '内掛け', en: 'inside leg trip' },
  sotogake: { jp: '外掛け', en: 'outside leg trip' },
  chongake: { jp: 'ちょん掛け', en: 'pulling heel hook' },
  kirikaeshi: { jp: '切り返し', en: 'twisting backward knee trip' },
  kawazugake: { jp: '河津掛け', en: 'hooking backward counter throw' },
  kekaeshi: { jp: '蹴返し', en: 'minor inner foot sweep' },
  ketaguri: { jp: '蹴手繰り', en: 'pulling inside ankle sweep' },
  mitokorozeme: { jp: '三所攻め', en: 'triple attack force out' },
  watashikomi: { jp: '渡し込み', en: 'thigh grabbing push down' },
  nimaigeri: { jp: '二枚蹴り', en: 'ankle kicking twist down' },
  komatasukui: { jp: '小股掬い', en: 'over thigh scooping body drop' },
  sotokomata: { jp: '外小股', en: 'under thigh scooping body drop' },
  omata: { jp: '大股', en: 'thigh scooping body drop' },
  tsumatori: { jp: '褄取り', en: 'rear foot sweep' },
  kozumatori: { jp: '小褄取り', en: 'ankle pick' },
  ashitori: { jp: '足取り', en: 'leg pick' },
  susotori: { jp: '裾取り', en: 'ankle pick' },
  susoharai: { jp: '裾払い', en: 'rear foot sweep' },
  // 反り手 — backward body drops
  izori: { jp: '居反り', en: 'backward body drop' },
  shumokuzori: { jp: '撞木反り', en: 'bell hammer backward body drop' },
  kakezori: { jp: '掛け反り', en: 'hooking backward body drop' },
  tasukizori: { jp: 'たすき反り', en: 'reverse backward body drop' },
  sototasukizori: { jp: '外たすき反り', en: 'outer reverse backward body drop' },
  tsutaezori: { jp: '伝え反り', en: 'underarm forward body drop' },
  // 捻り手 — twist downs
  tsukiotoshi: { jp: '突き落とし', en: 'thrust down' },
  makiotoshi: { jp: '巻き落とし', en: 'twist down' },
  tottari: { jp: 'とったり', en: 'arm bar throw' },
  sakatottari: { jp: '逆とったり', en: 'arm bar throw counter' },
  katasukashi: { jp: '肩透かし', en: 'under shoulder swing down' },
  sotomuso: { jp: '外無双', en: 'outer thigh propping twist down' },
  uchimuso: { jp: '内無双', en: 'inner thigh propping twist down' },
  zubuneri: { jp: '頭捻り', en: 'head pivot throw' },
  uwatehineri: { jp: '上手捻り', en: 'twisting overarm throw' },
  shitatehineri: { jp: '下手捻り', en: 'twisting underarm throw' },
  amiuchi: { jp: '網打ち', en: 'fisherman’s throw' },
  sabaori: { jp: '鯖折り', en: 'forward force down' },
  harimanage: { jp: '波離間投げ', en: 'backward belt throw' },
  osakate: { jp: '大逆手', en: 'backward twisting overarm throw' },
  kainahineri: { jp: '腕捻り', en: 'two-handed arm twist down' },
  gasshohineri: { jp: '合掌捻り', en: 'clasped hand twist down' },
  tokkurinage: { jp: '徳利投げ', en: 'two-handed head twist down' },
  kubihineri: { jp: '首捻り', en: 'head twisting throw' },
  kotehineri: { jp: '小手捻り', en: 'armlock twist down' },
  // 特殊技 — special techniques
  hikiotoshi: { jp: '引き落とし', en: 'hand pull down' },
  hikkake: { jp: '引っ掛け', en: 'arm grabbing force out' },
  hatakikomi: { jp: '叩き込み', en: 'slap down' },
  sokubiotoshi: { jp: '素首落とし', en: 'head chop down' },
  tsuridashi: { jp: '吊り出し', en: 'lift out' },
  okuritsuridashi: { jp: '送り吊り出し', en: 'rear lift out' },
  tsuriotoshi: { jp: '吊り落とし', en: 'lifting body slam' },
  okuritsuriotoshi: { jp: '送り吊り落とし', en: 'rear lifting body slam' },
  okuridashi: { jp: '送り出し', en: 'rear push out' },
  okuritaoshi: { jp: '送り倒し', en: 'rear push down' },
  okurinage: { jp: '送り投げ', en: 'rear throw down' },
  okurigake: { jp: '送り掛け', en: 'rear leg trip' },
  okurihikiotoshi: { jp: '送り引き落とし', en: 'rear pull down' },
  waridashi: { jp: '割り出し', en: 'upper arm force out' },
  utchari: { jp: 'うっちゃり', en: 'backward pivot throw' },
  kimedashi: { jp: '極め出し', en: 'arm barring force out' },
  kimetaoshi: { jp: '極め倒し', en: 'arm barring force down' },
  ushiromotare: { jp: '後ろもたれ', en: 'backward lean out' },
  yobimodoshi: { jp: '呼び戻し', en: 'pulling body slam' },
  // 非技 — non-techniques, and the two decisions that are not techniques at all
  isamiashi: { jp: '勇み足', en: 'forward step out' },
  koshikudake: { jp: '腰砕け', en: 'inadvertent collapse' },
  tsukite: { jp: 'つき手', en: 'hand touch down' },
  tsukihiza: { jp: 'つきひざ', en: 'knee touch down' },
  fumidashi: { jp: '踏み出し', en: 'rear step out' },
  hansoku: { jp: '反則', en: 'foul' },
  fusen: { jp: '不戦', en: 'forfeit' },
}

/** Kanji in Japanese, romaji in English; unknown keys pass through. */
export function kimariteLabel(key: string, language: Language): string {
  if (language === 'jp') return KIMARITE[key]?.jp ?? key
  return key
}

export function kimariteGloss(key: string): string | null {
  return KIMARITE[key]?.en ?? null
}
```
(89 keys: 82 + 5 + hansoku + fusen. The test's `87 + 2` counts the same.)

- [ ] **Step 4:** test → PASS. `npx vitest run scripts/lib/font-coverage.test.ts` → FAILS listing the new kanji. `npm run subset-fonts` → new glyph count; coverage → PASS. Gate; commit `data: the kimarite table; mincho subset covers it` with the source, test, manifest and woff2.

---

### Task B2: `useResults` hook

**Files:** Create `src/hooks/useResults.ts`, `src/hooks/useResults.test.tsx`.

**Produces:** `loadResults(bashoId: number): Promise<ResultsFile | null>` (cached per id; null on 404/invalid/mismatched `bashoId`, with `console.warn` except for a clean 404 which is the normal out-of-season case), `resetResultsCache()`, `useResults(bashoId: number | null): { status: 'idle' | 'loading' | 'ready' | 'unavailable'; results: ResultsFile | null }`. URL `${import.meta.env.BASE_URL}results/${bashoId}.json`.

- [ ] **Step 1: Failing tests**
```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetResultsCache, useResults } from './useResults'
import { makeResultsFile } from '../test/fixtures'

const json = (body: unknown): Response =>
  ({ ok: true, status: 200, json: vi.fn().mockResolvedValue(body) }) as unknown as Response
const notFound = { ok: false, status: 404 } as Response

describe('useResults', () => {
  beforeEach(() => resetResultsCache())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is idle without a basho, then loads the file once and shares it', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(json(makeResultsFile()))
    vi.stubGlobal('fetch', fetchSpy)
    const { result, rerender } = renderHook(({ id }) => useResults(id), {
      initialProps: { id: null as number | null },
    })
    expect(result.current).toEqual({ status: 'idle', results: null })
    rerender({ id: 637 })
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.results?.day).toBe(12)
    renderHook(() => useResults(637))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/results\/637\.json$/)
  })

  it('treats a missing file as unavailable without warning (out of season is normal)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(notFound))
    const { result } = renderHook(() => useResults(637))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(warn).not.toHaveBeenCalled()
  })

  it('refuses a file for another tournament or an invalid one, with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(makeResultsFile({ bashoId: 636 }))))
    const { result } = renderHook(() => useResults(637))
    await waitFor(() => expect(result.current.status).toBe('unavailable'))
    expect(warn).toHaveBeenCalled()
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement**
```ts
import { useEffect, useState } from 'react'
import { resultsFileName, validateResults, type ResultsFile } from '../data/results'

const RESULTS_BASE = `${import.meta.env.BASE_URL}results/`
const pending = new Map<number, Promise<ResultsFile | null>>()

/**
 * One tournament's results, once per page. A 404 is the normal state for most
 * of the year (no tournament running), so it is silent; anything else that
 * goes wrong is logged. Failure is cached for the page like the archive.
 */
export function loadResults(bashoId: number): Promise<ResultsFile | null> {
  let promise = pending.get(bashoId)
  if (!promise) {
    promise = fetch(`${RESULTS_BASE}${resultsFileName(bashoId)}`)
      .then(async (response) => {
        if (response.status === 404) return null
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const result = validateResults((await response.json()) as unknown)
        if (!result.ok) throw new Error(result.error)
        if (result.results.bashoId !== bashoId) {
          throw new Error(`file is for basho ${result.results.bashoId}`)
        }
        return result.results
      })
      .catch((error: unknown) => {
        console.warn(`Results for basho ${bashoId} unavailable:`, error instanceof Error ? error.message : error)
        return null
      })
    pending.set(bashoId, promise)
  }
  return promise
}

export function resetResultsCache(): void {
  pending.clear()
}

export interface ResultsState {
  status: 'idle' | 'loading' | 'ready' | 'unavailable'
  results: ResultsFile | null
}

export function useResults(bashoId: number | null): ResultsState {
  const [state, setState] = useState<ResultsState & { bashoId: number | null }>({
    status: 'idle',
    results: null,
    bashoId: null,
  })

  useEffect(() => {
    if (bashoId === null) return
    let cancelled = false
    loadResults(bashoId).then((results) => {
      if (cancelled) return
      setState({ status: results ? 'ready' : 'unavailable', results, bashoId })
    })
    return () => {
      cancelled = true
    }
  }, [bashoId])

  if (bashoId === null) return { status: 'idle', results: null }
  if (state.bashoId !== bashoId) return { status: 'loading', results: null }
  return { status: state.status, results: state.results }
}
```
- [ ] **Step 4:** PASS. Gate; commit `hooks: load a tournament's results file`.

---

### Task B3: Strings

**Files:** `src/i18n/strings.ts` (both tables).

- [ ] Add to `en` after the Changes block:
```ts
  // Tournament results
  results: 'Results',
  resultsThrough: (day: number) => `Results through day ${day}`,
  resultsHide: 'Hide results',
  kachikoshi: 'Kachi-koshi',
  makekoshi: 'Make-koshi',
  yusho: 'Yusho',
  record: 'Record',
  boutsHeading: (day: number) => `Day ${day}`,
  boutsNone: 'The card for this day has not been published.',
  previousDay: 'Previous day',
  nextDay: 'Next day',
  leadersAfter: (day: number) => `Leaders after day ${day}`,
  oneBehind: 'one behind',
  undecided: 'Not yet fought',
  wonBy: (kimarite: string) => `won by ${kimarite}`,
  boutAgainst: (opponent: string) => `vs ${opponent}`,
  absentDay: 'Absent',
  fusenWin: 'Forfeit win',
  fusenLoss: 'Forfeit loss',
```
and to `jp`:
```ts
  results: '星取',
  resultsThrough: (day: number) => `${day}日目までの星取`,
  resultsHide: '星取を隠す',
  kachikoshi: '勝ち越し',
  makekoshi: '負け越し',
  yusho: '優勝',
  record: '星取',
  boutsHeading: (day: number) => `${day}日目`,
  boutsNone: 'この日の取組はまだ発表されていません。',
  previousDay: '前日',
  nextDay: '翌日',
  leadersAfter: (day: number) => `${day}日目終了時の首位`,
  oneBehind: '一差',
  undecided: '未了',
  wonBy: (kimarite: string) => `${kimarite}で勝ち`,
  boutAgainst: (opponent: string) => `対 ${opponent}`,
  absentDay: '休場',
  fusenWin: '不戦勝',
  fusenLoss: '不戦敗',
```
- [ ] `npx vitest run src/i18n` → PASS. Font coverage → FAIL on new kanji → `npm run subset-fonts` → PASS. Commit `i18n: strings for results, bouts and leaders; subset regenerated`.

---

### Task B4: `Hoshitori`

**Files:** Create `src/components/Hoshitori/Hoshitori.tsx`, `Hoshitori.module.css`, `Hoshitori.test.tsx`.

**Produces:** `Hoshitori({ record, variant, champion }: { record: RikishiRecord; variant: 'sheet' | 'row'; champion?: boolean })` — `aria-hidden` (the parent button speaks `describeRecord`); `data-state` from `kachikoshiState`. Sheet: `8–3` (+ `優` seal when champion). Row: 15 cells (`boutMark` per bout by day, `·` for days without a bout), then the score, then the state label / `優勝`.

- [ ] **Step 1: Failing tests**
```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Hoshitori } from './Hoshitori'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeRecord } from '../../test/fixtures'

const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>).container

describe('Hoshitori', () => {
  it('on the sheet shows the score, hidden from assistive tech, with the state as data', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="sheet" />).firstElementChild!
    expect(el).toHaveTextContent('8–3–1')
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveAttribute('data-state', 'kachikoshi')
    expect(el.textContent).not.toContain('優')
  })

  it('marks the champion', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="sheet" champion />).firstElementChild!
    expect(el).toHaveTextContent('優')
  })

  it('on a row draws fifteen cells in day order, padding the days to come', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="row" />).firstElementChild!
    const cells = el.querySelectorAll('[data-day]')
    expect(cells).toHaveLength(15)
    expect([...cells].map((c) => c.textContent).join('')).toBe('○○●○○●○休○○●○···')
    expect(el).toHaveTextContent('Kachi-koshi')
  })

  it('reads make-koshi off the record', () => {
    const el = wrap(
      <Hoshitori record={{ wins: 2, losses: 8, absences: 0, bouts: [] }} variant="row" />
    ).firstElementChild!
    expect(el).toHaveAttribute('data-state', 'makekoshi')
    expect(el).toHaveTextContent('Make-koshi')
    expect(el).toHaveTextContent('2–8')
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement**
```tsx
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import {
  boutMark,
  kachikoshiState,
  MAX_DAYS,
  scoreLabel,
  type RikishiRecord,
} from '../../data/results'
import styles from './Hoshitori.module.css'

interface HoshitoriProps {
  record: RikishiRecord
  /** Under the name on the sheet (score only); under the name on a row (full strip). */
  variant: 'sheet' | 'row'
  /** Tournament champion, once decided. */
  champion?: boolean
}

/**
 * The star chart. Decorative: the button around it says the record in words
 * (`describeRecord`), since ○ and ● are not a sentence. Kachi-koshi is ink
 * weight and make-koshi is muted; nothing here is a new colour, and the
 * champion's mark is a hairline seal, never gold, which belongs to the
 * Yokozuna alone.
 */
export function Hoshitori({ record, variant, champion = false }: HoshitoriProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const state = kachikoshiState(record)
  const lang = langAttr(language)
  const stateLabel =
    state === 'kachikoshi' ? strings.kachikoshi : state === 'makekoshi' ? strings.makekoshi : ''

  if (variant === 'sheet') {
    return (
      <span className={`${styles.badge} ${styles.sheet}`} data-state={state} lang={lang} aria-hidden="true">
        {scoreLabel(record, language)}
        {champion && (
          <span className={styles.seal} lang="ja">
            優
          </span>
        )}
      </span>
    )
  }

  const byDay = new Map(record.bouts.map((bout) => [bout.day, bout]))
  return (
    <span className={`${styles.badge} ${styles.row}`} data-state={state} lang={lang} aria-hidden="true">
      <span className={styles.strip} lang="ja">
        {Array.from({ length: MAX_DAYS }, (_, i) => {
          const bout = byDay.get(i + 1)
          return (
            <span key={i} className={styles.cell} data-day={i + 1} data-outcome={bout?.outcome}>
              {bout ? boutMark(bout.outcome) : '·'}
            </span>
          )
        })}
      </span>
      <span className={styles.score}>{scoreLabel(record, language)}</span>
      {champion ? (
        <span className={`${styles.state} ${styles.seal}`}>{strings.yusho}</span>
      ) : (
        stateLabel && <span className={styles.state}>{stateLabel}</span>
      )}
    </span>
  )
}
```
CSS:
```css
/* The star chart: ○ won, ● lost, 休 absent, · not yet fought. Weight and
   ink carry the state — kachi-koshi bold, make-koshi muted — no new hue. */
.badge {
  font-family: var(--font-names);
  font-weight: 600;
  font-size: var(--text-xs);
  letter-spacing: 0.04em;
  line-height: 1.2;
  color: var(--text);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.badge[data-state='kachikoshi'] {
  font-weight: 700;
}

.badge[data-state='makekoshi'] {
  color: var(--muted);
}

/* Under the name on the sheet: horizontal, tiny — digits have no vertical form */
.sheet {
  display: inline-flex;
  align-items: center;
  gap: 0.2em;
  margin-top: var(--space-1);
  font-size: 0.6rem;
  writing-mode: horizontal-tb;
}

/* Under the name on a row: strip, score, state */
.row {
  display: inline-flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  margin-top: 0.15rem;
}

.strip {
  font-family: var(--font-jp-serif);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text);
}

.cell {
  display: inline-block;
  width: 1em;
  text-align: center;
}

.cell[data-outcome='loss'],
.cell[data-outcome='fusen-loss'] {
  color: var(--muted);
}

.cell:not([data-outcome]) {
  color: var(--border);
}

.score {
  font-weight: 700;
}

.state {
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: var(--tracking-caps);
}

.state:lang(ja) {
  font-family: var(--font-jp-serif);
  text-transform: none;
  letter-spacing: 0.1em;
}

/* The champion's mark: a hairline seal in ink */
.seal {
  display: inline-grid;
  place-items: center;
  min-width: 1.2em;
  height: 1.2em;
  padding-inline: 0.15em;
  font-family: var(--font-jp-serif);
  font-weight: 700;
  color: var(--text);
  border: 1px solid var(--text);
  border-radius: var(--radius-sm);
  text-transform: none;
  letter-spacing: 0;
}

@media (max-width: 600px) {
  .strip {
    letter-spacing: 0.02em;
  }
}
```
- [ ] **Step 4:** PASS; `npm run check:css` clean. Font coverage: `優`, `休` are already in the source via strings/results (B1/B3 regenerated) — if the test fails, `npm run subset-fonts` again. Gate; commit `components: Hoshitori`.

---

### Task B5: `ResultsToggle`

**Files:** Create `src/components/ResultsToggle/ResultsToggle.tsx`, `.module.css`, `.test.tsx`.

**Produces:** `ResultsToggle({ on, onChange, day }: { on: boolean; onChange: (on: boolean) => void; day: number })` — `<button aria-pressed title={resultsThrough(day)} data-print="hide">` with mark `○●`, label `strings.results`, visually-hidden ` — ${resultsThrough(day)}`. CSS: copy `ChangesToggle.module.css` verbatim (same seal; two uses of one pattern — say so in the head comment).

- [ ] **Step 1: Failing test**
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResultsToggle } from './ResultsToggle'
import { LanguageProvider } from '../../contexts/LanguageContext'

describe('ResultsToggle', () => {
  it('is a pressed button that says how far the results go', async () => {
    const onChange = vi.fn()
    render(
      <LanguageProvider>
        <ResultsToggle on onChange={onChange} day={8} />
      </LanguageProvider>
    )
    const button = screen.getByRole('button', { name: /Results.*through day 8/ })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(button)
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement**
```tsx
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import styles from './ResultsToggle.module.css'

interface ResultsToggleProps {
  on: boolean
  onChange: (on: boolean) => void
  /** The latest day with a decided bout. */
  day: number
}

/** Shows or hides the star chart. The same pressed seal as ChangesToggle. */
export function ResultsToggle({ on, onChange, day }: ResultsToggleProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const through = strings.resultsThrough(day)
  return (
    <button
      type="button"
      className={`${styles.toggle} ${on ? styles.on : ''}`}
      aria-pressed={on}
      title={through}
      onClick={() => onChange(!on)}
      lang={langAttr(language)}
      data-print="hide"
    >
      <span className={styles.mark} aria-hidden="true">
        ○●
      </span>
      {strings.results}
      <span className="visually-hidden"> — {through}</span>
    </button>
  )
}
```
- [ ] **Step 4:** PASS; `check:css`; commit `components: ResultsToggle`.

---

### Task B6: `Bouts` — the day's card and the leaders

**Files:** Create `src/components/Bouts/Bouts.tsx`, `.module.css`, `.test.tsx`.

**Produces:** `Bouts({ results, division, rows, day, onChangeDay, onSelectRikishi }: { results: ResultsFile; division: Division; rows: Rikishi[]; day: number; onChangeDay: (day: number) => void; onSelectRikishi?: (r: Rikishi) => void })`. `<section aria-labelledby>` with heading `boutsHeading(day)`, ‹ › buttons (disabled at 1 and at the last published day), leaders line when `results.day ≥ 1` (`leadersAfter(results.day)`: `Onosato 8–0 · Hoshoryu, Aonishiki 7–1`), then `<ol>` of the day's matches for this division: East (rank label) — West (rank label); winner in `<strong>`, then the kimarite via `kimariteLabel`; undecided → `strings.undecided`. A fighter whose id is on `rows` is a `<button>` opening the modal; others a `<span>`. `boutsNone` when the day has no card.

- [ ] **Step 1: Failing test**
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Bouts } from './Bouts'
import { LanguageProvider } from '../../contexts/LanguageContext'
import { makeBanzuke, makeResultsFile } from '../../test/fixtures'

describe('Bouts', () => {
  const rows = makeBanzuke().rikishi
  it('lists the day, names the winner and the kimarite, and steps days', async () => {
    const onChangeDay = vi.fn()
    const onSelect = vi.fn()
    render(
      <LanguageProvider>
        <Bouts results={makeResultsFile()} division="makuuchi" rows={rows} day={12} onChangeDay={onChangeDay} onSelectRikishi={onSelect} />
      </LanguageProvider>
    )
    expect(screen.getByRole('region', { name: 'Day 12' })).toBeInTheDocument()
    expect(screen.getByText(/Leaders after day 12/)).toHaveTextContent('Onosato 10–2 · Hoshoryu 8–3–1')
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Not yet fought')
    expect(items[1].querySelector('strong')).toHaveTextContent('Onosato')
    expect(items[1]).toHaveTextContent('yorikiri')
    await userEvent.click(screen.getByRole('button', { name: /Hoshoryu/ }))
    expect(onSelect).toHaveBeenCalledWith(rows[0])
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(onChangeDay).toHaveBeenCalledWith(11)
  })

  it('says when a day has no card yet', () => {
    render(
      <LanguageProvider>
        <Bouts results={makeResultsFile()} division="makuuchi" rows={rows} day={13} onChangeDay={() => undefined} />
      </LanguageProvider>
    )
    expect(screen.getByText('The card for this day has not been published.')).toBeInTheDocument()
  })
})
```
Note: the second test passes `day={13}` directly, beyond the last published card (12): the component renders any day it is given (the stepper itself stops at `lastSteppableDay`, the latest card or fought day), and an unpublished day shows `boutsNone`.

- [ ] **Step 2:** FAIL. **Step 3: Implement**
```tsx
import { useId } from 'react'
import type { Division, Rikishi } from '../../types/banzuke'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import { kimariteLabel } from '../../data/kimarite'
import { leaders, MAX_DAYS, scoreLabel, type Fighter, type ResultsFile } from '../../data/results'
import styles from './Bouts.module.css'

interface BoutsProps {
  results: ResultsFile
  division: Division
  /** The division's rows, for opening the dialog and naming the leaders. */
  rows: Rikishi[]
  day: number
  onChangeDay: (day: number) => void
  onSelectRikishi?: (rikishi: Rikishi) => void
}

/** The last day worth stepping to: the latest published card or the latest fought day. */
export function lastSteppableDay(results: ResultsFile): number {
  const published = Object.keys(results.torikumi).map(Number)
  return Math.min(MAX_DAYS, Math.max(results.day, ...published, 1))
}

/**
 * The day's card beneath the paper, in the sheet's smaller hand: who met
 * whom, who won and how. Above it, the leaders — the one narrative every
 * basho carries — as a single line, never a table.
 */
export function Bouts({ results, division, rows, day, onChangeDay, onSelectRikishi }: BoutsProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  const lang = langAttr(language)
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Cross-division bouts are published on the Makuuchi card only, so select by
  // who is fighting, not by the card the match came from.
  const matches = (results.torikumi[String(day)] ?? []).filter(
    (m) => (m.east.id !== null && byId.has(m.east.id)) || (m.west.id !== null && byId.has(m.west.id))
  )
  const last = lastSteppableDay(results)
  const tiers = results.day >= 1 ? leaders(results.records, rows) : []

  const name = (f: Fighter) => f.shikona[language] || f.shikona.en
  const fighter = (f: Fighter, winner: boolean) => {
    const rikishi = f.id !== null ? byId.get(f.id) : undefined
    const text = winner ? <strong>{name(f)}</strong> : name(f)
    if (rikishi && onSelectRikishi) {
      return (
        <button type="button" className={styles.fighter} onClick={() => onSelectRikishi(rikishi)}>
          {text}
        </button>
      )
    }
    return <span className={styles.fighter}>{text}</span>
  }

  return (
    <section className={styles.bouts} aria-labelledby={headingId} lang={lang}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChangeDay(day - 1)}
          disabled={day <= 1}
          aria-label={strings.previousDay}
        >
          ‹
        </button>
        <h2 id={headingId} className={styles.heading}>
          {strings.boutsHeading(day)}
        </h2>
        <button
          type="button"
          className={styles.step}
          onClick={() => onChangeDay(day + 1)}
          disabled={day >= last}
          aria-label={strings.nextDay}
        >
          ›
        </button>
      </div>
      {tiers.length > 0 && (
        <p className={styles.leaders}>
          <span className={styles.leadersLabel}>{strings.leadersAfter(results.day)}</span>{' '}
          {tiers.map((tier, i) => (
            <span key={tier.wins} className={styles.tier}>
              {i > 0 && ' · '}
              {tier.rikishi.map((r) => r.shikona[language] || r.shikona.en).join(', ')}{' '}
              {scoreLabel(results.records[String(tier.rikishi[0].id)], language)}
            </span>
          ))}
        </p>
      )}
      {matches.length === 0 ? (
        <p className={styles.none}>{strings.boutsNone}</p>
      ) : (
        <ol className={styles.list}>
          {matches.map((m) => (
            <li key={m.matchNo} className={styles.match} data-decided={m.winnerId !== null || undefined}>
              <span className={styles.east}>{fighter(m.east, m.winnerId !== null && m.winnerId === m.east.id)}</span>
              <span className={styles.result}>
                {m.winnerId === null ? strings.undecided : kimariteLabel(m.kimarite, language)}
              </span>
              <span className={styles.west}>{fighter(m.west, m.winnerId !== null && m.winnerId === m.west.id)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
```
CSS (`Bouts.module.css`): `.bouts { border-top: 1px solid var(--rule); padding-top: var(--space-2); margin-top: var(--space-5) }`; `.head { display: flex; align-items: center; justify-content: center; gap: var(--space-3) }`; `.heading` like Departed's heading (uppercase caps in EN, `:lang(ja)` mincho); `.step { font: inherit; background: none; border: 1px solid var(--border); border-radius: var(--radius-sm); min-width: 32px; min-height: 32px; color: var(--muted); cursor: pointer } .step:disabled { opacity: 0.35; cursor: default } .step:hover:not(:disabled) { color: var(--text) }`; `.leaders { text-align: center; font-size: var(--text-sm); color: var(--muted); margin: var(--space-2) 0 }`, `.leadersLabel { text-transform: uppercase; letter-spacing: var(--tracking-caps); font-weight: var(--label-weight) } .leadersLabel:lang(ja) { text-transform: none; letter-spacing: 0.1em }`, `.tier { color: var(--text) }`; `.list { list-style: none; display: grid; gap: var(--space-1) }`; `.match { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: baseline; gap: var(--space-3); padding: var(--space-1) 0; border-top: 1px solid var(--rule) }`, `.east { text-align: end } .west { text-align: start }` — East on the right of the rail as on the sheet? **No:** the bout list is read left to right like prose; East first in the DOM lands left. Keep `.east { text-align: end }` and `.west { text-align: start }` with the result centred: `.result { font-size: var(--text-sm); color: var(--muted); text-align: center; min-width: 6ch }`; `.result:lang(ja) { font-family: var(--font-jp-serif) }`; `.fighter { font: inherit; background: none; border: 0; padding: 0; color: inherit; cursor: pointer; font-family: var(--font-names); font-weight: 600 } .fighter:lang(ja) { font-family: var(--font-jp-serif); font-weight: 700 }` (`span.fighter` inherits `cursor: default` — add `span.fighter { cursor: default }`? CSS Modules cannot select by tag reliably; instead give the button `styles.clickable` in addition and put `cursor: pointer` there); `strong { font-weight: 800 }` scoped as `.fighter strong`; `.none { color: var(--muted); font-size: var(--text-sm); text-align: center }`; `@media (max-width: 600px) { .match { gap: var(--space-2) } .result { min-width: 4ch } }`.

- [ ] **Step 4:** PASS; `check:css` clean (every class referenced — including `.clickable`). Gate; commit `components: Bouts — the day's card and the leaders`.

---

### Task B7: Sheet, List and dialog carry the records

**Files:**
- Modify: `BanzukeSheet.tsx` (+test), `SideCell.tsx` (+test), `RankRow.tsx`, `BanzukeGrid.tsx`, `WrestlerModal.tsx` (+css, +test)

**Interfaces:** new optional props — `BanzukeSheet`, `BanzukeGrid`, `RankRow`: `records?: Record<string, RikishiRecord> | null; champions?: Partial<Record<Division, number>>`; `SideCell`: `record?: RikishiRecord | null; champion?: boolean`; `WrestlerModal`: `record?: RikishiRecord | null`.

- [ ] **Step 1: Failing tests** — append to `BanzukeSheet.test.tsx` (read its render helper first):
```tsx
  it('carries each wrestler\'s record under the name and in the accessible name', () => {
    renderSheet({ onSelectRikishi: vi.fn(), records: { '4227': { wins: 10, losses: 2, absences: 0, bouts: [] } }, champions: { makuuchi: 4227 } })
    const onosato = screen.getByRole('button', { name: /Onosato/ })
    expect(onosato).toHaveAccessibleName(/10 wins, 2 losses. Kachi-koshi/)
    expect(onosato).toHaveTextContent('10–2')
    expect(onosato).toHaveTextContent('優')
    expect(screen.getByRole('button', { name: /Hoshoryu/ })).not.toHaveAccessibleName(/wins/)
  })
```
to `SideCell.test.tsx`:
```tsx
  it('draws the hoshitori under the name and describes the record', () => {
    render(
      <LanguageProvider>
        <SideCell rikishi={makeRikishi()} side="east" rankLevel="yokozuna" onSelect={vi.fn()} record={makeRecord()} />
      </LanguageProvider>
    )
    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName(/8 wins, 3 losses, 1 absence. Kachi-koshi/)
    expect(button.querySelectorAll('[data-day]')).toHaveLength(15)
  })
```
to `WrestlerModal.test.tsx` (read its render helper; the dialog opens with a `rikishi`):
```tsx
  it('lists the bouts when a record is given', () => {
    renderModal({ rikishi: makeRikishi(), record: makeRecord() })
    expect(screen.getByRole('heading', { name: 'Record' })).toBeInTheDocument()
    expect(screen.getByText('8–3–1')).toBeInTheDocument()
    const bouts = screen.getAllByRole('listitem').filter((li) => li.hasAttribute('data-day'))
    expect(bouts).toHaveLength(12)
    expect(bouts[0]).toHaveTextContent('vs Wakatakakage')
    expect(bouts[0]).toHaveTextContent('yorikiri')
    expect(bouts[7]).toHaveTextContent('Absent')
  })
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Sheet** — `BanzukeSheet.tsx`: import `describeRecord`, `type RikishiRecord` from `../../data/results` and `Hoshitori`; props `records`, `champions`; `Column` gains `record: RikishiRecord | null; champion: boolean`; label: `${name}, ${side}. ${rankName}.${movementText}${recordText ? ` ${recordText}` : ''} ${viewDetails}` where `recordText = record ? describeRecord(record, language) : ''`; in `.nameBand` after `MovementBadge`: `{record && <Hoshitori record={record} variant="sheet" champion={champion} />}`; `half()` passes `record={records?.[String(rikishi.id)] ?? null}` and `champion={Object.values(champions ?? {}).includes(rikishi.id)}`.
- [ ] **Step 4: List** — `SideCell`: props `record`, `champion`; label appends `describeRecord`; inside `.text` after `detail`: `{record && <Hoshitori record={record} variant="row" champion={champion} />}`. `RankRow`: props `records`, `champions`; pass `record={group.east ? (records?.[String(group.east.id)] ?? null) : null}` and `champion={!!group.east && Object.values(champions ?? {}).includes(group.east.id)}` (same for west). `BanzukeGrid`: props threaded to every `RankRow`.
- [ ] **Step 5: Dialog** — `WrestlerModal`: prop `record?: RikishiRecord | null`; after `{profile && <ProfileRows …/>}` render `{record && <RecordSection record={record} />}`:
```tsx
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
          <li key={bout.day} className={styles.bout} data-day={bout.day} data-outcome={bout.outcome}>
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
```
Imports: `boutMark, scoreLabel, type Bout, type RikishiRecord` from `../../data/results`; `kimariteLabel` from `../../data/kimarite`. CSS additions to `WrestlerModal.module.css`: `.score { font-weight: 700; font-size: var(--text-lg); margin: 0 0 var(--space-2); font-variant-numeric: tabular-nums }`, `.bouts { list-style: none; display: grid; gap: 0.15rem; font-size: var(--text-sm) }`, `.bout { display: grid; grid-template-columns: 2ch 1.2em minmax(0, 1fr) auto; gap: var(--space-2); align-items: baseline }`, `.boutDay { color: var(--muted); text-align: end; font-variant-numeric: tabular-nums }`, `.boutMark { font-family: var(--font-jp-serif); font-weight: 700 }`, `.bout[data-outcome='loss'] .boutMark, .bout[data-outcome='fusen-loss'] .boutMark { color: var(--muted) }`, `.boutOpponent { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }`, `.boutHow { color: var(--muted) }`, `.boutHow:lang(ja) { font-family: var(--font-jp-serif) }`.
- [ ] **Step 6:** tests PASS; full gate; `check:css`; commit `sheet, list, dialog: carry each wrestler's record`.

---

### Task B8: App wiring — `?results`, toggle, bouts

**Files:** `src/App.tsx`, `src/App.test.tsx`

- [ ] **Step 1: Failing tests** — extend the fetch stub in `beforeEach`: `String(url).includes('results/637.json') ? jsonResponse(makeResultsFile({ records: { '1000': makeRecord(), '1001': recordOf10 } , torikumi: { '12': [{ division: 'makuuchi', matchNo: 1, east: { id: 1000, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } }, west: { id: 1001, shikona: { en: 'Onosato', jp: '大の里' } }, winnerId: 1001, kimarite: 'yorikiri' }] } }))` — define `const recordOf10 = { wins: 10, losses: 2, absences: 0, bouts: [] }` at the top; import `makeRecord`, `makeResultsFile`, `resetResultsCache`; call `resetResultsCache()` in `beforeEach`. The raw fixture's dates put basho 637 at 2026-09-13…27 and tests run with a real clock, so **fake time**: `vi.useFakeTimers({ shouldAdvanceTime: true }); vi.setSystemTime(new Date('2026-09-24T12:00:00+09:00'))` in the two new tests and `vi.useRealTimers()` in `afterEach`. Add:

```tsx
  it('shows results by default during the tournament and hides them with ?results=0', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-09-24T12:00:00+09:00'))
    const user = userEvent.setup()
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /Results.*through day 12/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('button', { name: /Onosato, West.*10 wins, 2 losses/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Day 12' })).toBeInTheDocument()
    await user.click(toggle)
    expect(window.location.search).toBe('?results=0')
    expect(screen.queryByRole('region', { name: 'Day 12' })).toBeNull()
    expect(screen.getByRole('button', { name: /Onosato, West/ })).not.toHaveAccessibleName(/wins/)
  })

  it('offers no results toggle out of season or when the file is missing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-09-04T12:00:00+09:00'))
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    expect(screen.queryByRole('button', { name: /Results/ })).toBeNull()
  })
```
- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implement** in `App.tsx`:
  - imports: `useResults` (B2), `ResultsToggle`, `Bouts`, `lastSteppableDay` (B6), `getTournamentStatus` from `./utils/dates`.
  - `const [resultsParam, setResultsParam] = useUrlParam('results')`; `const [boutsDay, setBoutsDay] = useState<number | null>(null)`.
  - season gate: `const status = banzuke ? getTournamentStatus(banzuke.basho) : null; const inSeason = status != null && (status.kind === 'live' || status.kind === 'finished' || (status.kind === 'upcoming' && status.daysUntil <= 1))` — a `finished` tournament stays in season until the next banzuke replaces it, which is when the file no longer matches.
  - `const results = useResults(inSeason && banzuke ? banzuke.basho.id : null)`; `const resultsOn = resultsParam !== '0'`; `const resultsShown = resultsOn && results.results != null`; `const records = resultsShown ? results.results!.records : null`; `const champions = resultsShown ? results.results!.yusho : undefined`.
  - `const day = boutsDay ?? (results.results ? Math.max(1, results.results.day) : 1)` — defaults to the latest fought day (day 1 before the first bout; the card for day 1 may be out); the stepper's › reaches a published later card via `lastSteppableDay`.
  - controls: after `ChangesToggle`: `{results.results && <ResultsToggle on={resultsOn} onChange={(on) => setResultsParam(on ? null : '0')} day={results.results.day} />}`.
  - pass `records={records} champions={champions}` to `BanzukeSheet` and `BanzukeGrid`; `record={selectedRikishi && records ? (records[String(selectedRikishi.id)] ?? null) : null}` to `WrestlerModal`.
  - after `Departed`: `{resultsShown && !isFiltering && <Bouts results={results.results!} division={division} rows={allRows} day={day} onChangeDay={setBoutsDay} onSelectRikishi={handleSelectRikishi} />}`.
  - Reset `boutsDay` when the division changes: in `handleChangeDivision` also `setBoutsDay(null)`.
- [ ] **Step 4:** PASS; full gate; commit `app: Results — the star chart over the banzuke, on by default while the basho runs`.

---

### Task B9: Docs, visual check, PR B

- [ ] README intro: after the Changes sentence add "During a tournament **Results** lays the hoshitori over both views — each name's record, ○● on the List, kachi-koshi and the yusho — with the day's bouts and the leaders beneath the paper." CLAUDE.md "Things that look odd":
  ```markdown
  - **Results** (`?results=0` to hide; on by default in season) is the second overlay: `useResults`
    loads `results/{bashoId}.json` only when the basho is live or just over, `Hoshitori` shows the
    score on the Sheet and the ○●休 strip on the List, `Bouts` lists the day's card. An absence counts
    as a loss for make-koshi. The yusho mark is an ink seal — `--gold` is still the Yokozuna's alone.
    Kimarite are stored as sumo-api romaji; `src/data/kimarite.ts` supplies the kanji.
  ```
- [ ] Gate; commit `docs: Results overlay`.
- [ ] **Visual check** (before Aki there is no 637 file, so fake one locally and do not commit it):
  ```bash
  node -e "const f=require('./public/results/636.json');f.bashoId=637;require('fs').writeFileSync('public/results/637.json',JSON.stringify(f))"
  npm run dev
  ```
  Open the app: the Results toggle is pressed; Sheet columns show `12–3`-style scores under names, `優` beside the champion; switch to List: 15-cell strips, kachi-koshi/make-koshi labels, no row wider than before on a phone width (DevTools 390px); open a wrestler: Record section lists 15 bouts; below the paper: "Day 15" with the leaders line and the card, ‹ steps back to day 1, › disabled at 15; press `L` — 星取, 勝ち越し, kimarite in kanji, 寄り切り etc. in mincho (DevTools Rendered Fonts = Noto Serif JP); Juryo tab shows the Juryo card; search "onosato" hides the Bouts section; `?results=0` removes everything and the toggle unpresses. Then `rm public/results/637.json` and confirm `git status` is clean apart from nothing.
- [ ] Push, `gh pr create` "Results: hoshitori, kachi-koshi and the day's bouts over the banzuke", watch CI. After merge, production shows no toggle (out of season) until the evening run of 2026-09-12.

---

## Verification (end to end)

1. **Pipeline**: PR A's merge deploy logs `out of season`, `changed=false`. `curl -sI …/results/636.json` → 200. On 2026-09-12 19:00 JST the evening run should write `637.json` (day 0, card for day 1 if published) and the bot commit — ending `[skip ci]` — must **not** start a second workflow run (check the Actions list: one run per cron).
2. **Overlay**: from 2026-09-13 the site shows the Results toggle pressed, records under every name, the day's card and the leaders; each evening's deploy advances `day`. On 2026-09-27 the `優` seal appears on the champion.
3. **Tests**: `npm run test:run -- --coverage` stays above 80/80/70/80. `scripts/lib/sumo-api.test.ts` proves the id join on July 2026 against the archive; `results-files.test.ts` proves the seed file.
4. **Doctrine**: `tokens.test.ts` unchanged (no colour added); `grep -c "@keyframes" src -r` still 5 blocks / 4 effects; `check:css` clean; font coverage green with the regenerated subset.

## Self-review

- **Coverage of the ask**: B1 hoshitori → B4/B7; B2 torikumi → B6/B8; B3 kachi-koshi → A1 `kachikoshiState` + B4; B4 (honest part) → `leaders` + `yusho` in A1/A2/B6. Default-on while live (user's choice) → B8 `resultsParam !== '0'` and the season gate. Twice-daily refresh → A4. N11 → A4 `[skip ci]`.
- **Placeholders**: none. One dead block in A3 Step 1 is called out for deletion rather than left ambiguous.
- **Type consistency**: `RikishiRecord`/`Bout`/`Fighter`/`Match`/`ResultsFile` defined in A1 and used unchanged in A2, B2, B4, B6, B7, B8; `Hoshitori` props `{record, variant, champion}` match B7's calls; `ResultsToggle` `{on, onChange, day}` matches B8; `Bouts` `{results, division, rows, day, onChangeDay, onSelectRikishi}` and `lastSteppableDay` match B8; `useResults(bashoId | null)` returns `{status, results}` as B8 reads it; the results URL prefix `results/` matches `public/results/` and the deploy `cp`.
- **Rulings a controller may need**: (1) if sumo-api's live-basho `record` arrays turn out to carry 15 entries with empty `result` for unfought days, `parseOutcome('') → null` already drops them; if instead they omit entries, `day` comes from the array length — both paths are handled; (2) if the evening cron finds sumo-api has not yet posted the day (timing unknown until Sept 13), the morning run catches up — no change needed; (3) if `/rikishis?limit=1000` starts paginating below the active count, the join fails loudly (problems → exit 2) rather than silently — raise the limit or page.
