# banzuke-app

Static React viewer for the official grand sumo banzuke (Makuuchi and Juryo), bilingual
English/Japanese, deployed to GitHub Pages at https://jonath0n.github.io/banzuke-app/.

## Stack

- React 18 + TypeScript, Vite 6, CSS Modules (no CSS framework), Vitest + Testing Library.
- Node 22 (`.nvmrc`). Scripts in `scripts/` are TypeScript run with `tsx`.
- No runtime dependencies beyond React. Keep it that way unless there is a strong reason.

## Commands

```sh
npm run dev            # Vite dev server
npm run validate       # type-check (app + scripts), eslint (incl. jsx-a11y), prettier --check
npm run test:run       # vitest, single run
npm run test:tz        # date tests under non-JST time zones
npm run build          # tsc -b && vite build → dist/
npm run fetch-remote   # fetch + validate the latest banzuke into public/latest-banzuke.json
npm run fetch-profiles # scrape wrestler profiles into public/rikishi-profiles.json (optional)
npm run subset-fonts   # rebuild public/assets/fonts/NotoSerifJP-700-subset.woff2 + manifest
npm run make-sample    # derive public/sample-data.json (Makuuchi only, labelled) from the live file
npm run validate-data  # validate the committed snapshot
npm run archive-banzuke # write public/banzuke/{id}.json + index from the snapshot
npm run fetch-results  # in season, write public/results/{id}.json from sumo-api
npm run glossary-gaps  # list ring-name kanji the shikona glossary lacks
```

Every change must pass `npm run validate && npm run test:run && npm run build` before commit.

## Data flow (do not shortcut it)

1. `scripts/fetch-banzuke.ts` fetches the English JSON endpoint and the Japanese rikishi
   list page from sumo.or.jp for each division and writes a `RawSnapshot` (`src/data/schema.ts`,
   format 2: `divisions.makuuchi` and `divisions.juryo`; format 1 files are still read).
2. `validateSnapshot` (same module, shared by scripts and app) is the only gate on upstream data.
3. `normalizeSnapshot` (`src/data/normalize.ts`) converts raw JSON into a `BanzukeSet` in
   `src/types/banzuke.ts`: numeric ids, `side: 'east' | 'west'`, `Localized { en, jp }` text.
4. Components consume the normalized model only. **Never coerce or parse upstream fields in
   components**; add to `normalize.ts` instead.

Dates from upstream are naive JST strings; always go through `src/utils/dates.ts`, which parses
and formats in `Asia/Tokyo`.

The deploy workflow (`.github/workflows/deploy.yml`) refreshes data on every push to `main`,
twice daily (07:00 and 19:00 JST), and on demand. When the tournament data changed it also
archives the banzuke under `public/banzuke/`, regenerates the mincho subset; profiles are
re-scraped only when stale; whatever changed is committed to `main` before building. During a
tournament it also fetches results into `public/results/`. `ci.yml` runs the checks on pull
requests. There is no separate refresh workflow.

## Conventions

- Prettier: no semicolons, single quotes, 100 columns. ESLint must pass with zero warnings.
- Component folder = `Name/Name.tsx` + `Name.module.css` (+ `Name.test.tsx`).
- Accessibility is a requirement: real `<button>`s, headings for structure, `lang` on Japanese
  text, contrast ≥ 4.5:1, focus visible. `eslint-plugin-jsx-a11y` is enabled.
- Colours, spacing and motion come from the tokens in `src/styles/tokens.css` (with `base.css`
  and `a11y.css` alongside it); do not hand-type accent RGB values in component CSS.
- **The palette is six values plus `--gold`.** Rank is expressed by type size, never by hue;
  `--gold` marks the Yokozuna and nothing else. `src/styles/tokens.test.ts` enforces contrast on
  every pair, so adding a colour means adding it there too.
- **Motion budget: four keyframe effects in the whole app**, and no infinite animations — this is
  a printed document. Adding one means removing one. Entrance animation plays once per page load
  (the `data-entered` gate on `<main>`); tab switches and searches settle in place.
- Tests use the fixtures in `src/test/fixtures.ts`; add cases there rather than inventing new
  ad-hoc shapes.
- Japanese naming helpers (kanji numerals, rank names, era years) live in `src/data/kanji.ts`.

## Things that look odd but are intentional

- `public/sample-data.json` is the fallback when the live file fails validation and nothing is
  cached. It is **Makuuchi only** and its `sources` say "Bundled sample …" — derived by
  `npm run make-sample`, never copied by hand; `src/data/sample.test.ts` enforces all three
  properties. Do not make it a copy of `latest-banzuke.json` again.
- `readings` in the snapshot are hiragana readings of ring names, used for search and shown in
  the modal. They are deliberately **not** on the Sheet: a printed banzuke carries no furigana.
- The Sheet's column follows the printed sheet exactly — rank band, home province, ring name.
  The rank band prints only the **tier** (前頭, never 前頭十七枚目) at a uniform bold size, because
  on paper the position along the band says which one; the numeral sits small beneath it since a
  screen has no fixed sheet to count along. The province is abbreviated the way the sheet
  abbreviates it (`shortPrefecture` in `src/data/kanji.ts`: 石川県 → 石川). The three bands have
  fixed heights (`--rank-band`, `--origin-band`) so they line up across every column; size them
  for the worst case (前頭 over 十七, カザフスタン) or characters spill into the band below.
- The rankings render two ways, switched by `?view=list` (`BanzukeSheet` / `BanzukeGrid`). Sheet
  is the default. Both take the same `rows` and `highlight` props and share the grid's empty
  state, so search behaves identically in either. Each half of the Sheet is `direction: rtl` so
  East — which is DOM-first — lands on the right as it does in print, and DOM, focus and visual
  order stay in agreement; `RankRow` mirrors the same trick on its grid.
- **The Sheet never scrolls sideways: it wraps.** A printed banzuke is ruled into horizontal
  bands that stack down the paper, which is how every division fits on one sheet; each half here
  does the same via `flex-wrap` and fills as many bands as the viewport allows. Columns are
  packed, not spread (`flex: 0 0 auto` with a `min-width` floor of 1.5rem, the 24px target size):
  a column is as wide as its characters, which is what makes the sheet read as one dense block.
  Do not reintroduce a horizontal scroller.
- The Sheet carries no portraits. Rank is legible from the size ladder alone, which is the point;
  photos live in `WrestlerModal`.
- `public/rikishi-profiles.json` (`src/data/profiles.ts`) is optional enrichment loaded on the first
  modal open; the app must work without it.
- Photos are hot-linked from the JSA CDN with `referrerPolicy="no-referrer"`; only the `60x60`
  and `270x474` sizes exist upstream.
- The Sheet's mincho is a **self-hosted subset**: `public/assets/fonts/NotoSerifJP-700-subset.woff2`
  carries only the Japanese characters found in the snapshot and the source, plus the kana
  blocks, at weight 700 (the only weight shipped; 600 requests resolve to it).
  `NotoSerifJP-subset.json` lists the glyphs and `scripts/lib/font-coverage.test.ts` fails when
  data or source gains a character the subset lacks — the fix is `npm run subset-fonts`, which
  the deploy job also runs whenever the banzuke changes. `'Noto Serif JP'` is first in
  `--font-jp-serif` on purpose, so Windows and Android render the Sheet the same as macOS.
- `public/banzuke/` is the **archive**: one small validated file per tournament
  (`src/data/archive.ts`), keyed by JSA rikishi id, plus `index.json`. JSA-sourced files come
  from `scripts/archive-banzuke.ts`; 2025-11 → 2026-07 came from sumo-api.com via `nskId` (its
  `heya`/`pref` have `jp: ''`). `src/data/archive-files.test.ts` insists the index matches the
  files, is contiguous, and ends at the live tournament; the font subset includes these files
  because departed names render in mincho.
- **Changes** (`?diff=1`) is an overlay, not a third view: `src/utils/diff.ts` compares the current
  rows with the previous archived tournament by JSA id and yields a `Movement` per wrestler plus
  per-division departures. Badges show the **rank a wrestler came from** (`▲M5`), never a step
  count — steps are undefined across sanyaku and the Juryo line. Arrows are ink/muted; "new" borrows
  the promotion pill's vermilion. Movement is also spoken in each button's accessible name.
- **Results** (`?results=0` to hide; on by default in season) is the second overlay: `useResults`
  loads `results/{bashoId}.json` when the basho is live, a day before it starts, or finished —
  until the next banzuke replaces it — `Hoshitori` shows the score on the Sheet and the ○●休 strip
  on the List, `Bouts` lists the day's card, selected by who is fighting (cross-division bouts are
  published on the Makuuchi card only). An absence counts
  as a loss for make-koshi. The yusho mark is an ink seal — `--gold` is still the Yokozuna's alone.
  Kimarite are stored as sumo-api romaji; `src/data/kimarite.ts` supplies the kanji.
- `public/results/` holds **tournament results** (`src/data/results.ts`): one file per basho of
  per-wrestler records, per-day cards and the yusho, from sumo-api.com joined by `nskId`. The script
  fetches only in season (a day before day 1 to three days after senshuraku) and the bot commit ends
  with `[skip ci]` because deploy-key pushes trigger the push workflow. Results are **not** in the font
  subset's file set: kimarite are romaji and a visiting Makushita name may fall back.
- **Arrow keys are spatial**, not canonical: on the Sheet ← → walk a half's rank ladder (← is the
  lower rank because each half is `direction: rtl`) and ↑ ↓ cross to the East/West partner; on the
  List ↑ ↓ walk ranks and ← → cross the row. One `keyTarget()` in `src/utils/rovingFocus.ts` serves
  both from the `data-side`/`data-pair` attributes on every wrestler button. The dialog's ‹ › and
  ← → follow canonical order (`banzuke.rikishi`) and **replace** the URL entry so Back still closes.
  The Sheet tracks hover and keyboard focus as two separate states and lets pointer hover win over
  focus when both are present; whichever wins lights the East/West *partner* of the active column
  via `data-lit` on its button, never the hovered/focused column itself. Hover is cleared whenever
  focus leaves the paper, so nothing stays lit behind the wrestler dialog.
- **The guide** (`?guide=1`) is Sheet-only: `buildGuide` (`src/utils/guide.ts`) chooses which
  columns carry which numbered mark from the rows on screen (highest rank present; the two ends of
  the Maegashira ladder), the marks are CSS circles placed as grid children over the band they
  annotate (no flow content, band heights untouched, no new glyphs), and `Guide` beneath the paper
  lists the same numbers with bilingual text. The way in is a link beside the controls, not a
  third seal — a guide is read once — and the legend carries the way out.
- `src/data/shikona-glossary.ts` is **hand-written** and deliberately **not** tested against live
  data: the deploy job runs the test suite after the bot's data commit, so a new wrestler's kanji
  must never fail a test. Coverage is checked against the fixtures; `npm run glossary-gaps` (and
  the deploy job, as a `::warning::`) lists what the live data needs. The dialog shows a bare
  character for a gap. Meanings are the character's general sense, English only; notes carry
  stable marks (琴, 朝, 栃 …). The font-coverage test scans test files too, so a test's deliberately
  unknown character is written as a `\u{…}` escape, never a literal, or it lands in the glyph
  manifest.
