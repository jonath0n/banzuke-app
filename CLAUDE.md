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
- Colours, spacing and motion come from the tokens in `src/index.css`; do not hand-type accent
  RGB values in component CSS.
- Tests use the fixtures in `src/test/fixtures.ts`; add cases there rather than inventing new
  ad-hoc shapes.
- Japanese naming helpers (kanji numerals, rank names, era years) live in `src/data/kanji.ts`.

## Things that look odd but are intentional

- `public/sample-data.json` is a full snapshot used only when the live file fails validation.
- `readings` in the snapshot are hiragana readings of ring names, used for search and display.
- Photos are hot-linked from the JSA CDN with `referrerPolicy="no-referrer"`; only the `60x60`
  and `270x474` sizes exist upstream.
