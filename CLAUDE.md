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
npm run validate-data  # validate the committed snapshot
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
daily, and on demand, committing `public/latest-banzuke.json` only when tournament data changed.

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

- `public/sample-data.json` is a full snapshot used only when the live file fails validation.
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
  does the same via `flex-wrap` and fills as many bands as the viewport allows. Columns take up
  the slack in their band (`flex: 1 1 auto` with a `max-width` cap) so they distribute across the
  sheet instead of packing to one edge. Do not reintroduce a horizontal scroller.
- The Sheet carries no portraits. Rank is legible from the size ladder alone, which is the point;
  photos live in `WrestlerModal`.
- `public/rikishi-profiles.json` (`src/data/profiles.ts`) is optional enrichment loaded on the first
  modal open; the app must work without it.
- Photos are hot-linked from the JSA CDN with `referrerPolicy="no-referrer"`; only the `60x60`
  and `270x474` sizes exist upstream.
