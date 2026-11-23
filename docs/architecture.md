# Architecture

How each feature works and why it looks the way it does. `CLAUDE.md` holds the rules that apply
everywhere; read the section here for the feature you are about to touch. Much of this looks odd
at first and is intentional.

## App shell and URL state

`App.tsx` is the URL state and the render tree; each concern is a hook under `src/app/`
(`useTournamentPhase`, `useResultsOverlay`, `useSearch`, `useSelection`, `useChanges`, `useGuide`,
`useDocumentTitle`, `useArchiveViewer`). `App.test.tsx` is the regression net for all of them.

URL parameters (each read with `useUrlParam` in `App.tsx`): `?view=list`, `?q=`,
`?rikishi=<id>`, `?heya=<id>`, `?diff=0|1`, `?results=0`, `?basho=<id>`, `?guide=1`, plus
`?lang=`.

## Data loading and fallbacks

- `public/sample-data.json` is the fallback when the live file fails validation and nothing is
  cached. It is **Makuuchi only** and its `sources` say "Bundled sample …" — derived by
  `npm run make-sample`, never copied by hand; `src/data/sample.test.ts` enforces all three
  properties. Do not make it a copy of `latest-banzuke.json` again.
- `readings` in the snapshot are hiragana readings of ring names, used for search and shown in
  the modal. They are deliberately **not** on the Sheet: a printed banzuke carries no furigana.
- `public/rikishi-profiles.json` (`src/data/profiles.ts`) is optional enrichment loaded on the
  first modal open; the app must work without it.
- Photos are hot-linked from the JSA CDN with `referrerPolicy="no-referrer"`; only the `60x60`
  and `270x474` sizes exist upstream.

## The Sheet and the List

- The rankings render two ways, switched by `?view=list` (`BanzukeSheet` / `BanzukeGrid`). Sheet
  is the default. Both take the same `rows` and `highlight` props and share the grid's empty
  state, so search behaves identically in either. Each half of the Sheet is `direction: rtl` so
  East — which is DOM-first — lands on the right as it does in print, and DOM, focus and visual
  order stay in agreement; `RankRow` mirrors the same trick on its grid.
- The Sheet's column follows the printed sheet exactly — rank band, home province, ring name.
  The rank band prints only the **tier** (前頭, never 前頭十七枚目) at a uniform bold size, because
  on paper the position along the band says which one; the numeral sits small beneath it since a
  screen has no fixed sheet to count along. The province is abbreviated the way the sheet
  abbreviates it (`shortPrefecture` in `src/data/kanji.ts`: 石川県 → 石川). The three bands have
  fixed heights (`--rank-band`, `--origin-band`) so they line up across every column; size them
  for the worst case (前頭 over 十七, カザフスタン) or characters spill into the band below.
- **The Sheet never scrolls sideways: it wraps.** A printed banzuke is ruled into horizontal
  bands that stack down the paper, which is how every division fits on one sheet; each half here
  does the same via `flex-wrap` and fills as many bands as the viewport allows. Columns are
  packed, not spread (`flex: 0 0 auto` with a `min-width` floor of 1.5rem, the 24px target
  size): a column is as wide as its characters, which is what makes the sheet read as one dense
  block. Do not reintroduce a horizontal scroller.
- The Sheet carries no portraits. Rank is legible from the size ladder alone, which is the
  point; photos live in `WrestlerModal`.
- **Promotions print on the Sheet** too (`PromotionPill`, vertical under the name), not only on
  the List. **Kadoban** (角番) is derived, never stored: `kadobanIds()` in `src/utils/stakes.ts` —
  an Ozeki now, an Ozeki on the previous banzuke, make-koshi there (absences counted) — and
  prints as an ink pill with a hairline, never over a printed flag. **横綱大関** is a printed
  tier, not a rank: `printedTier` on `Rikishi` is read off the JSA's Japanese rank name and the
  Sheet shrinks the four characters to fit the band.

## Keyboard and focus

- Both layouts use a **roving tabindex**: one wrestler button is in the Tab order (the last
  focused, or the highest rank), the arrows walk to the rest, so Tab crosses the paper or the
  list in one step.
- **Arrow keys are spatial**, not canonical: on the Sheet ← → walk a half's rank ladder (← is the
  lower rank because each half is `direction: rtl`) and ↑ ↓ cross to the East/West partner; on
  the List ↑ ↓ walk ranks and ← → cross the row. One `keyTarget()` in `src/utils/rovingFocus.ts`
  serves both from the `data-side`/`data-pair` attributes on every wrestler button.
- The dialog's ‹ › and ← → follow canonical order (`banzuke.rikishi`) laid out right to left like
  the sheet — ‹ and ← go to the next (lower) rank, › and → to the previous — and **replace** the
  URL entry so Back still closes.
- The Sheet tracks hover and keyboard focus as two separate states and lets pointer hover win
  over focus when both are present; whichever wins lights the East/West *partner* of the active
  column via `data-lit` on its button, never the hovered/focused column itself. Hover is cleared
  whenever focus leaves the paper, so nothing stays lit behind the wrestler dialog.

## Accessible names

**One accessible name**: `describeWrestler()` (`src/utils/describe.ts`) builds the name for
every wrestler button — Sheet column, List cell, stable roster — in the order name, side, rank,
promotion, kadoban, movement, record, yusho, then "View details". English keeps "Name, Side."
first; Japanese joins with 、 and ends sentences with 。. Nothing else builds one by hand.

## Dialogs: wrestler and stable

- **Stables** (`?heya=<id>`) are a second dialog, `StableModal`, a sibling of the wrestler one.
  Who is *in* a stable is never fetched: `rosterFor` (`src/utils/stables.ts`) reads the sekitori
  off the loaded `BanzukeSet` by `heya.id`, so it is right for whatever tournament is on screen.
- `public/stables.json` (`src/data/stables.ts`, `scripts/fetch-stables.ts`) is optional
  enrichment like the profiles: the master's name, former ring name and highest rank from the
  JSA stable pages, which share the banzuke's stable id; the address is stored but not shown.
- Opening a stable from a wrestler, or a member from a stable, **pushes** (`setUrlParams` swaps
  the two params in one entry), so Back walks the chain back; ‹ › stepping still replaces. The
  wrestler wins when a URL names both.
- The List's detail line carries the stable as a `tabIndex={-1}` button beside the wrestler
  button (a button cannot hold a button): keyboard users reach the stable from the wrestler
  dialog.
- "Show on the banzuke" leaves the dialog by writing `?q=<stable name>` in place of `?heya`, so
  the sheet stays filtered and one Back undoes it.
- The dialog keyframes live in `base.css` and both modals reference them as `global(...)`:
  `fadeIn` for the backdrop, `modalSlideUp` for the panel.
- `src/data/shikona-glossary.ts` is **hand-written** and deliberately **not** tested against live
  data: the deploy job runs the test suite after the bot's data commit, so a new wrestler's kanji
  must never fail a test. Coverage is checked against the fixtures; `npm run glossary-gaps` (and
  the deploy job, as a `::warning::`) lists what the live data needs. The dialog shows a bare
  character for a gap. Meanings are the character's general sense, English only; notes carry
  stable marks (琴, 朝, 栃 …).

## Fonts

The Sheet's mincho is a **self-hosted subset in two faces**: `NotoSerifJP-700-core.woff2` (the
kana blocks and every Japanese character in the source — rank kanji, masthead, UI) and
`NotoSerifJP-700-names.woff2` (what only the data brings: ring names, stables, birthplaces), at
weight 700 (the only weight shipped; 600 requests resolve to it). `scripts/subset-fonts.ts`
writes both, the manifest `NotoSerifJP-subset.json`, and the two `@font-face` rules with
`unicode-range` in `src/styles/fonts-jp.css` (generated, never edited by hand), so an English
reader's browser fetches the core alone. `scripts/lib/font-coverage.test.ts` fails when data or
source gains a character the faces lack — the fix is `npm run subset-fonts`, which the deploy
job also runs whenever the banzuke changes. `'Noto Serif JP'` is first in `--font-jp-serif` on
purpose, so Windows and Android render the Sheet the same as macOS.

The font-coverage test scans test files too, so a test's deliberately unknown character is
written as a `\u{…}` escape, never a literal, or it lands in the glyph manifest.

## Archive and the basho picker

- `public/banzuke/` is the **archive**: one small validated file per tournament
  (`src/data/archive.ts`), keyed by JSA rikishi id, plus `index.json`. JSA-sourced files come
  from `scripts/archive-banzuke.ts`; 2025-11 → 2026-07 came from sumo-api.com via `nskId` (its
  `heya`/`pref` have `jp: ''`). `src/data/archive-files.test.ts` insists the index matches the
  files, is contiguous, and ends at the live tournament; the font subset includes these files
  because departed names render in mincho.
- **The archive is viewable**: `?basho=<id>` shows an earlier tournament by the same views, read
  only (`useArchiveViewer` in `src/app/`, `rikishiFromArchived` in `archive.ts` derives the rank
  names and invents nothing else), with a `BashoPicker` beside the controls. The live
  tournament's own id, or one the index lacks, means the live sheet.

## Changes overlay

**Changes** (`?diff=1` / `?diff=0`) is an overlay, not a third view: `src/utils/diff.ts` compares
the current rows with the previous archived tournament by JSA id and yields a `Movement` per
wrestler plus per-division departures. It is **on by default from the banzuke's announcement
until day 1** and off once the tournament starts. Badges show the **rank a wrestler came from**
and, when the previous results file is on disk, **the record that earned the move** (`▲M5 9–6`),
never a step count — steps are undefined across sanyaku and the Juryo line. Arrows are
ink/muted; "new" borrows the promotion pill's vermilion, and a newcomer who already carries a
printed flag (新入幕 …) gets no "new" badge. The previous banzuke and its results are loaded
whenever there is one, because the kadoban mark reads them too.

## Results overlay

- **Results** (`?results=0` to hide; on by default in season) is the second overlay:
  `useResults` loads `results/{bashoId}.json` when the basho is live, a day before it starts, or
  finished — until the next banzuke replaces it — `Hoshitori` shows the score on the Sheet and
  the ○●休 strip on the List, `Bouts` lists the day's card, selected by who is fighting
  (cross-division bouts are published on the Makuuchi card only). An absence counts as a loss
  for make-koshi. The yusho mark is an ink seal — `--gold` is still the Yokozuna's alone.
- Kimarite are stored as sumo-api romaji; `src/data/kimarite.ts` supplies the kanji. Before
  day 1 the file is the card only (no 0–0 under seventy names).
- Above the card, `YushoRace` (`yushoRace()` in `results.ts`) reads the race by losses — the
  leaders, whoever is within two losses and can still catch them, decided or not, 相星決戦 when
  the two sole leaders meet next — and `Bouts` shows a playoff (sumo-api's day 16, filed under
  `playoff` by division; 巴戦 when three fought) beneath senshuraku's card.
- The wrestler dialog says the next bout, the kinboshi (☆, a Maegashira's fought win over a
  Yokozuna) and what it still takes for kachi-koshi.
- In season a `TodayStrip` above the paper carries the day as the calendar names it
  (初日・中日・千秋楽), how much of today's card is fought, who leads and how fresh the numbers
  are; once the yusho is decided the Hero headlines the champion with the record, the three
  sansho and the Juryo yusho.
- The page re-polls the file every five minutes between 15:00 and 23:00 JST while the tab is
  visible, and on return (`useResults(id, { live })`).
- The hoshitori marks are ○ ● □ ■ 休 × △ (fought, forfeit, absent, draw).

### The results file

`public/results/` holds one file per basho (`src/data/results.ts`) of per-wrestler records,
per-day cards, the yusho, and (optional, version 1 still) the `playoff` bouts per division and
the `sansho`, from sumo-api.com joined by `nskId`.

- `day` is the latest day **fought** — sumo-api pre-records a withdrawal's absences and fusen for
  the days ahead, and records are trimmed to `day`.
- A wrestler without a `nskId` is left out with a warning, never a frozen file.
- The sansho are written only once senshuraku's Makuuchi card is decided (they can be
  conditional until then).
- `scripts/fetch-results.ts` fetches only in season (a day before day 1 to three days after
  senshuraku), refuses a fetch that is a step backwards from the committed file (exit 3,
  `resultsRegressed`; `--force` overrides), and the bot commit ends with `[skip ci]` because
  deploy-key pushes trigger the push workflow.
- Results are **not** in the font subset's file set: kimarite are romaji and a visiting
  Makushita name may fall back.

## The guide

**The guide** (`?guide=1`) is Sheet-only: `buildGuide` (`src/utils/guide.ts`) chooses which
columns carry which numbered mark from the rows on screen (highest rank present; the two ends of
the Maegashira ladder), the marks are CSS circles placed as grid children over the band they
annotate (no flow content, band heights untouched, no new glyphs), and `Guide` beneath the paper
lists the same numbers with bilingual text. The way in is a link beside the controls, not a
third seal — a guide is read once — and the legend carries the way out.

## Service worker

**The service worker is hand-written** (`src/sw/sw.ts`, decisions in `src/sw/strategy.ts` with
tests) and emitted as `dist/sw.js` by `scripts/lib/vite-plugin-sw.ts`, which fills in the
precache list from the files Vite produced and a version hashed from it. Shell and fonts are
precached (cache-first), data files are stale-while-revalidate, a page load is network-first,
and a `cache: 'no-cache'` request (the results re-poll) goes to the network. Registered in
production only. The localStorage banzuke cache (`CACHE_KEY`) stays until the worker has
survived a tournament.

## Share pages

`scripts/build-stubs.ts` runs after `vite build` and writes `dist/r/<id>/` and `dist/heya/<id>/`
— one small page per wrestler and stable with its own title, description and JSA portrait for
the unfurl, `noindex`, a canonical to the app and a redirect that keeps `?lang=` — plus the
sitemap (with en/ja/x-default alternates), `robots.txt` and a `SportsEvent` JSON-LD in `index.html`,
all on `SITE_URL` from `scripts/lib/site.ts`. The
dialog's Copy link hands out the share page. They are build output, never committed.

## Deploy and data refresh

`.github/workflows/deploy.yml` refreshes data on every push to `main`, on demand, and on four
daily slots — 07:13 JST for the banzuke, then 18:12, 19:38 and 21:38 JST for the day's results.
A gate job (`scripts/season-gate.mjs`) decides what a run is for: the evening slots run only in
season and are results-only, and a results-only run that finds nothing new skips the build and
deploy. GitHub's shared scheduler starts the evening runs three to seven hours late, so
`watch.yml` is a self-chaining watcher that polls sumo-api through the Tokyo evening
(`scripts/watch-results.ts`) and dispatches a results-only deploy the moment more of the day is
decided than the site shows.

When the tournament data changed the data job also archives the banzuke under
`public/banzuke/` and regenerates the mincho subset (stables are refreshed first, so a new
stablemaster's kanji is in it); profiles are re-scraped only when stale; whatever changed is
committed to `main` before building. During a tournament it also fetches results into
`public/results/`. If sumo.or.jp is unreachable the committed snapshot is deployed instead.

The deploy job uploads `dist/` with `cloudflare/wrangler-action` (`wrangler.jsonc`: Workers
static assets, custom domains `banzuke.app` and `www.banzuke.app`), using the repository secrets
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Static assets are served with revalidation
(no fixed max-age), so a results deploy is visible on the next request. The public URL lives
in `scripts/lib/site.ts`; the old github.io address serves the redirect in
`docs/ops/pages-redirect/`, published once by `pages-redirect.yml`.

`ci.yml` runs validate, test, build and the Chromium smoke spec on pull requests.

## Smoke spec

`e2e/smoke.spec.ts` (`npm run test:e2e`) drives the built site in Chromium: print order, band
alignment, no horizontal scroll, tab seating, axe, the keyboard walk, the in-season overlays, at
three widths in both languages. Locally `PW_CHROMIUM=<path>` names a browser.
