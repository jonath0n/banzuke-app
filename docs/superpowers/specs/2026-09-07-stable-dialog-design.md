# Stable dialog — design

**Date:** 2026-09-07
**Status:** approved in chat, awaiting written review
**Session:** https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg

## Goal

A stable (heya) name anywhere in the app can be opened to see who the stable is and who is in
it: the stablemaster, the sekitori on the current banzuke, and a way to see those members
picked out on the sheet. Today the name is plain text in the List cell and in the wrestler
dialog, even though every row already carries the JSA stable id.

## Decisions (from the brainstorm)

| Question | Decision |
|---|---|
| Roster scope | Sekitori only, derived from the loaded `BanzukeSet`. No roster scraping. |
| Stablemaster data | Name, former ring name, highest rank. Not the full master card. |
| Entry points | The wrestler dialog's Stable row and the List's detail line. The Sheet is unchanged. |
| Link back to the sheet | "Show on the banzuke" fills search with the stable name and closes. |
| Architecture | A sibling dialog with its own URL param and an optional enrichment file (approach A). |
| List button Tab order | Out of the Tab order (`tabIndex=-1`); keyboard users reach the stable via the wrestler dialog. |
| Both URL params present | The wrestler wins; `?heya` is ignored. |

## 1. Data and the scrape

### Source

sumo.or.jp publishes one page per stable, in both languages, keyed by the same id the banzuke
JSON carries as `heya_id` (Tatsunami is 1 in both):

- English: `https://www.sumo.or.jp/EnSumoDataSumoBeya/detail/{id}/`
- Japanese: `https://www.sumo.or.jp/ResultRikishiDataSumoBeya/detail/{id}/`

The English page carries the master's name, former ring name with highest rank, given name,
birthday, birthplace, career record and prizes, and the roster down to Jonidan. The Japanese
page carries the stable name, the master (name, former shikona with highest rank, real name)
and the postal address. Neither carries founding date, history, ichimon or photos.

### Script

`scripts/fetch-stables.ts`, modelled on `scripts/fetch-profiles.ts`:

- Reads the snapshot (`--snapshot`, default `public/latest-banzuke.json`), collects the distinct
  non-empty `heya_id`s across both divisions.
- For each id whose previous entry (`--previous`) is missing or has a `bashoId` older than the
  snapshot's tournament, fetches both pages with `fetchText` from `scripts/lib/http.ts` and
  parses them with `scripts/lib/stable-parser.ts`.
- Keeps the previous entry when a fetch or parse fails; exits non-zero only when nothing at all
  could be written.
- Writes `--out` (default `public/stables.json`) and prints `changed=true|false` the way the
  profiles script does, so the deploy job can commit it.

Parsing (`scripts/lib/stable-parser.ts`): `parseStablePage(enHtml, jpHtml, id): Stable | null`.
Fixture HTML for one stable in both languages lives in `scripts/lib/__fixtures__/`.

### File shape

```ts
// src/data/stables.ts
export interface StableMaster {
  name: Localized          // 'Tatsunami Taiji' / '立浪 耐治'
  formerShikona: Localized // 'Asahiyutaka' / '旭豊'
  highestRank: Localized   // 'Komusubi' / '小結'
}

export interface Stable {
  id: number               // JSA stable id
  name: Localized          // 'Tatsunami' / '立浪'
  master: StableMaster | null
  address: string | null   // Japanese postal address, stored but not shown
  bashoId: number          // tournament this entry was fetched for
}

export interface StablesFile {
  version: 1
  fetchedAt: string
  stables: Record<string, Stable> // keyed by stable id
}

export function validateStablesFile(
  value: unknown
): { ok: true; file: StablesFile } | { ok: false; error: string }
```

The file is optional enrichment exactly like `rikishi-profiles.json`: the app works without it,
and a stable may be missing from it.

### Loading

`src/hooks/useStables.ts`: `loadStables(): Promise<Record<string, Stable>>` (one shared promise,
resolves to `{}` on any failure) and
`useStableState(id: number | null): { loading: boolean; stable: Stable | null }`, mirroring
`useProfileState`. The App warms it with `loadStables()` alongside the profiles prefetch on the
first pointer/focus over the panel.

### Deploy

`.github/workflows/deploy.yml` gains a "Refresh stables" step beside "Refresh wrestler profiles",
with the same copy-previous / write-to-`.data` / `changed` output pattern; the commit step adds
`public/stables.json` when present and the subject gains ", stables". `package.json` gains
`fetch-stables`; `tsconfig.scripts.json` includes `src/data/stables.ts`. CLAUDE.md and README
document the file and the command.

## 2. Membership from the model

`src/utils/stables.ts`, pure:

```ts
export interface StableRoster {
  id: number
  name: Localized
  members: Rikishi[] // banzuke order: Makuuchi then Juryo, East before West at each rank
  makuuchi: number
  juryo: number
}

export function rosterFor(set: BanzukeSet, heyaId: number): StableRoster | null
```

- Members are every `Rikishi` in `set.makuuchi.rikishi` then `set.juryo?.rikishi ?? []` whose
  `heya.id === heyaId`. Rows with `heya.id === 0` (empty upstream id) never match.
- `name` is taken from the first member. Returns `null` when no member is found.
- Works for the sample fallback (Makuuchi only) without special casing; the existing sources line
  already says the data is a sample.

This retires `heya.id` from the "unused fields" rot list. `normalize.ts` is untouched.

## 3. The dialog

`src/components/StableModal/StableModal.tsx` + `.module.css` + `.test.tsx`. A native `<dialog>`
following `WrestlerModal`: `showModal` on open, Escape and backdrop click close, focus returns to
the opener on close, `aria-labelledby` the heading, `lang` on Japanese runs.

Props:

```ts
interface StableModalProps {
  roster: StableRoster | null
  stable: Stable | null // from the file; may be null
  stableLoading: boolean
  movements?: Map<number, Movement> | null
  records?: Record<string, RikishiRecord> | null
  onClose: () => void
  onSelectRikishi: (rikishi: Rikishi) => void
  onShowOnBanzuke: (name: string) => void
}
```

Content, top to bottom:

1. **Heading** `<h2>`: stable name in the UI language; the other language beneath in the smaller
   secondary style the wrestler dialog uses. Japanese in `--font-jp-serif`, `lang="ja"`.
2. **Count line**: EN "6 sekitori · 4 Makuuchi · 2 Juryo"; JP "関取六人 · 幕内四人 · 十両二人"
   (kanji numerals via `numberKanji` in `src/data/kanji.ts`, which retires it from the rot list).
3. **Master line**: EN "Stablemaster Tatsunami, former Komusubi Asahiyutaka";
   JP "師匠 立浪（元小結 旭豊）". Rendered when `stable?.master` exists. While `stableLoading`, a
   fixed-height `aria-busy="true"` slot holds the space (same as `.profilePending`).
4. **Members**: `<ol>` in roster order. Each `<li>` holds one `<button>` with rank name, side
   seal (東/西), ring name and province. The ring name uses the List's size ladder by
   `data-rank-level`. When `movements` is given the item shows the existing movement badge for
   that member; when `records` is given, the existing `Hoshitori` row variant. Clicking calls
   `onSelectRikishi`. Buttons carry `data-id` but no `data-pair`, so no arrow-key travel.
5. **Foot**: "Show on the banzuke" (`onShowOnBanzuke(name in UI language)`) and "Close".

Empty roster with a known stable (old link): heading from the file and one line, EN "No sekitori
on this banzuke", JP "この番付に関取はいません". Unknown roster and unknown file entry: the App
clears the param instead of opening.

No photos. No new colour. The `backdropIn` and `modalSlideUp` keyframes move from
`WrestlerModal.module.css` to `src/styles/base.css` and both modals reference them as
`global(...)`, as `fadeIn` already does; the budget stays at four and `motion.test.ts` proves it.

Strings (EN / JP) added to `src/i18n/strings.ts`: `stableDialogClose`,
`sekitoriCount(n, makuuchi, juryo)`, `stablemaster(name, rank, shikona)`, `showOnBanzuke`,
`noSekitori`, `openStable(name)` (accessible name of the entry buttons: "Tatsunami stable" /
"立浪部屋"). New Japanese characters trip the font-coverage test; the task that adds them runs
`npm run subset-fonts` and commits the subset. `public/stables.json` joins the font-coverage
file set, since master names render in the mincho.

## 4. Entry points and the URL

- `?heya=<id>`, read with `useUrlParam('heya', 'push')`. Shareable; Back closes.
- `selectedStable` is computed only when `selectedRikishi` is null. If both params are present
  the wrestler dialog shows and `?heya` is ignored.
- **Wrestler dialog → stable**: the Stable `<dd>` value becomes a `<button>` "Tatsunami ›" with
  `aria-label={strings.openStable(name)}`. Click: `setUrlParams({ rikishi: null, heya: id }, 'push')`.
  The stable dialog replaces the wrestler dialog on screen; Back returns to the wrestler.
- **Stable → member**: `setUrlParams({ heya: null, rikishi: id }, 'push')`. Back returns to the
  stable.
- **List**: `SideCell`'s root becomes a `<div class="cell">` holding two siblings: the wrestler
  `<button>` (seal + name, unchanged accessible name, still `data-pair`/`data-side`/`data-id`)
  and the detail line, where the stable name is a `<button tabIndex={-1}>` with the accessible
  name above and the province stays text. Visible only ≥768px as today. The hover underline on
  the name and the `data-dimmed` behaviour move with the wrapper so nothing visible changes.
  The vacant and non-clickable variants keep a single non-interactive element.
- **Show on the banzuke**: `setUrlParams({ heya: null, q: name }, 'replace')` on the pushed
  entry, so the sheet is left filtered (search already matches `heya.en`/`heya.jp`) and one Back
  undoes it.
- `src/hooks/useUrlState.ts` gains `setUrlParams(params: Record<string, string | null>, mode)`;
  `setUrlParam` becomes a one-key wrapper. The `history.state.urlParam` marker used by close
  logic is set for the pushed key.
- Focus: opening a stable from the wrestler dialog focuses the stable heading; closing returns
  focus to the element that opened the chain, using the same opener-first logic as the wrestler
  dialog (`button[data-id]` for a wrestler, the stable button otherwise).
- The Sheet is unchanged: it carries no stable text by design.

## 5. Errors and testing

Errors are soft everywhere: missing or invalid stables file → no master line; scrape failure for
one stable → previous entry kept; stale link → empty-state line or param cleared.

Tests:

- `scripts/lib/stable-parser.test.ts`: master fields from the two HTML fixtures; null master when
  the block is absent; address from the JP page.
- `src/data/stables.test.ts`: validator accepts the fixture file, rejects wrong version, missing
  `name`, non-numeric `id`; `src/test/fixtures.ts` gains `makeStable()` / `makeStablesFile()`.
- `src/utils/stables.test.ts`: order Makuuchi→Juryo and East→West; counts; empty id never
  matches; unknown id → null; Makuuchi-only set.
- `src/hooks/useStables.test.tsx`: loading then loaded, unknown id, fetch failure → `{}`.
- `StableModal.test.tsx`: heading in both languages; count line; master pending then filled;
  member click; show-on-banzuke callback; Escape; focus return; empty-roster line.
- `SideCell.test.tsx`: stable button present, `tabIndex=-1`, no `data-pair`; wrestler button's
  accessible name unchanged; vacant cell has no stable button.
- `WrestlerModal.test.tsx`: Stable row is a button with the accessible name; absent when
  `heya.en` is empty.
- `App.test.tsx`: wrestler → stable → member, then Back → stable, Back → wrestler; "Show on the
  banzuke" writes `?q=` and removes `?heya`; both params → wrestler wins; `?heya` for an unknown
  id is cleared.
- `useUrlState.test.ts`: `setUrlParams` changes two keys in one history entry.
- Existing gates: `motion.test.ts` (four keyframes after the move), `check:css`, font coverage,
  `tokens.test.ts` untouched.

## Out of scope

Lower-division roster; the address in the UI; ichimon grouping; photos; a stable index page;
a stable filter chip in search; the List stable button in the Tab order.
