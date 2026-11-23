# banzuke-app

Static React viewer for the official grand sumo banzuke (Makuuchi and Juryo), bilingual
English/Japanese, served by Cloudflare (Workers static assets) at https://banzuke.app/. No
backend: GitHub Actions fetch the data, commit it to `main` and redeploy; the browser reads only
the JSON files under `public/`.

**Before touching a feature, read its section in [`docs/architecture.md`](docs/architecture.md)**
(Sheet/List, keyboard, dialogs, fonts, archive, Changes, Results, guide, service worker, share
pages, deploy). Much of the code looks odd and is intentional; that file says why.

## Stack

- React 19 + TypeScript, Vite 8 (Rolldown: chunking is `codeSplitting.groups`, not
  `manualChunks`), CSS Modules (no CSS framework), Vitest 5 + Testing Library, ESLint 9 (pinned:
  `eslint-plugin-jsx-a11y` peers on ≤9), Playwright for the smoke spec.
- Node 22 (`.nvmrc`). Scripts in `scripts/` are TypeScript run with `tsx`.
- No runtime dependencies beyond React. Keep it that way unless there is a strong reason.

## Commands

```sh
npm ci                 # install (if `tsc: command not found`, node_modules is incomplete: rerun this)
npm run dev            # Vite dev server on :5173
npm run check          # validate + test:run + build: run before every commit
npm run validate       # type-check (app + scripts + e2e), eslint, prettier --check, check:css
npm run test:run       # vitest, single run   (npx vitest run <path> for one file)
npm run test:tz        # date tests under non-JST time zones
npm run test:e2e       # Playwright smoke spec against `vite preview` (build first; PW_CHROMIUM=<path>)
npm run build          # tsc -b && vite build → dist/, then share pages, sitemap, JSON-LD
npm run preview        # serve dist/
npm run format         # prettier --write;  npm run lint:fix for eslint --fix
npm run validate-data  # validate the committed snapshot
npm run glossary-gaps  # list ring-name kanji the shikona glossary lacks
```

Data-writing scripts (hit upstream and rewrite committed files; the deploy job runs them):

```sh
npm run fetch-remote     # latest banzuke → public/latest-banzuke.json
npm run fetch-profiles   # wrestler profiles → public/rikishi-profiles.json (optional)
npm run fetch-stables    # stables on the sheet → public/stables.json (optional)
npm run fetch-results    # in season: public/results/{id}.json from sumo-api
npm run archive-banzuke  # public/banzuke/{id}.json + index from the snapshot
npm run subset-fonts     # rebuild the NotoSerifJP subset faces, manifest and fonts-jp.css
npm run make-sample      # derive public/sample-data.json (Makuuchi only, labelled)
npm run backfill-archive # one-off: earlier tournaments from sumo-api
npx tsx scripts/measure-upstream.ts  # tournament evening: CSV of when sumo-api and the site get the day
```

**Every change must pass `npm run check` before commit.**

## Data flow (do not shortcut it)

1. `scripts/fetch-banzuke.ts` fetches the English JSON endpoint and the Japanese rikishi list
   page from sumo.or.jp for each division and writes a `RawSnapshot` (`src/data/schema.ts`,
   format 2: `divisions.makuuchi` and `divisions.juryo`; format 1 files are still read).
2. `validateSnapshot` (same module, shared by scripts and app) is the only gate on upstream data.
3. `normalizeSnapshot` (`src/data/normalize.ts`) converts raw JSON into a `BanzukeSet` in
   `src/types/banzuke.ts`: numeric ids, `side: 'east' | 'west'`, `Localized { en, jp }` text.
4. Components consume the normalized model only. **Never coerce or parse upstream fields in
   components**; add to `normalize.ts` instead.

Dates from upstream are naive JST strings; always go through `src/utils/dates.ts`, which parses
and formats in `Asia/Tokyo`.

## Layout

- `src/App.tsx` — URL state and render tree; each concern is a hook in `src/app/`.
  `App.test.tsx` is the regression net for them.
- `src/components/` — one folder per component. `src/data/` — schema, normalize, archive,
  results, kanji helpers, glossary. `src/utils/` — pure logic (diff, stakes, describe, guide,
  rovingFocus, dates). `src/sw/` — the service worker. `src/styles/` — tokens and global CSS.
- `scripts/` — data fetchers and build steps; parsers and IO in `scripts/lib/` with fixtures in
  `scripts/lib/__fixtures__/`.
- `public/` — committed data: `latest-banzuke.json`, `banzuke/` (archive), `results/`,
  profiles, stables, fonts.
- `e2e/` — Playwright smoke spec. `design/` — OG image and icon renderers.

## Conventions

- Prettier: no semicolons, single quotes, 100 columns. ESLint must pass with zero warnings.
- Component folder = `Name/Name.tsx` + `Name.module.css` (+ `Name.test.tsx`).
- Accessibility is a requirement: real `<button>`s, headings for structure, `lang` on Japanese
  text, contrast ≥ 4.5:1, focus visible. `eslint-plugin-jsx-a11y` is enabled.
- Colours, spacing and motion come from the tokens in `src/styles/tokens.css` (with `base.css`
  and `a11y.css` alongside it); do not hand-type accent RGB values in component CSS.
- **The palette is six values plus `--gold`.** Rank is expressed by type size, never by hue;
  `--gold` marks the Yokozuna and nothing else. `src/styles/tokens.test.ts` enforces contrast
  on every pair, so adding a colour means adding it there too.
- **Motion budget: four keyframe effects in the whole app** (three in use: `fadeIn`,
  `modalSlideUp`, `riseIn`; one slot free), and no infinite animations — this is a printed
  document. Adding one means removing one. Entrance animation plays once per page load (the
  `data-entered` gate on `<main>`); tab switches and searches settle in place.
- Tests use the fixtures in `src/test/fixtures.ts`; add cases there rather than inventing new
  ad-hoc shapes.
- Japanese naming helpers (kanji numerals, rank names, era years) live in `src/data/kanji.ts`.
- `describeWrestler()` (`src/utils/describe.ts`) builds every wrestler button's accessible name.
  Nothing else builds one by hand.

## Hard rules (details in docs/architecture.md)

- The Sheet **never scrolls sideways**: it wraps. Do not reintroduce a horizontal scroller.
- `public/sample-data.json` is **derived** by `npm run make-sample` (Makuuchi only, labelled);
  never a copy of `latest-banzuke.json`.
- `src/styles/fonts-jp.css` and the font manifest are **generated** by `npm run subset-fonts`;
  never edit them by hand. If `font-coverage.test.ts` fails, run `npm run subset-fonts`.
- In tests, write a deliberately unknown kanji as a `\u{…}` escape, never a literal (the font
  coverage test scans test files).
- `src/data/shikona-glossary.ts` is hand-written and must **not** be tested against live data.
- Profiles and stables are optional enrichment; the app must work without them.
- Hover/focus lighting, arrow-key direction and URL push-vs-replace are deliberate; read the
  Keyboard and Dialogs sections before changing them.

## Hosting

The public URL is written once, in `scripts/lib/site.ts` (`SITE_URL`, `BASE`); index.html,
the share pages, sitemap, robots.txt and the live-site checks all read it. `wrangler.jsonc`
deploys `dist/` as Workers static assets on the `banzuke.app` zone. The old
`jonath0n.github.io/banzuke-app/` serves only a redirect (`docs/ops/pages-redirect/`). Setup,
secrets and rollback: [`docs/ops/cloudflare.md`](docs/ops/cloudflare.md).

## Workflows and ops

The live workflows are in `.github/workflows/` (`deploy.yml`, `watch.yml`, `ci.yml`,
`apply-ops.yml`, `pages-redirect.yml`). `docs/ops/*.yml` are their source copies: change the file under `docs/ops/`,
merge, then dispatch **Apply ops workflows**, which copies it into `.github/workflows/` with the
deploy key; the owner can also push both together over SSH. Keep the two in sync (each
`docs/ops/<name>.yml` identical to `.github/workflows/<name>.yml`). Bot data commits on `main` are `data: refresh … [skip ci]`.
