# banzuke-app

React + TypeScript viewer for the official Japan Sumo Association banzuke endpoint.
Renders the current Makuuchi and Juryo divisions two ways: **Sheet**, the banzuke as it is
printed — vertical, read right to left, East on the right, ranked by character size — and
**List**, a searchable row per rank. Either view can be overlaid with **Changes** (`?diff=1`),
which marks each name with the rank it held at the previous tournament and lists who left each
division. During a tournament **Results** lays the hoshitori over both views — each name's
record, ○● on the List, kachi-koshi and the yusho — with the day's bouts and the leaders beneath
the paper. Arrow keys move between wrestlers on the Sheet and the List; the wrestler dialog steps
along the banzuke with ‹ › or ← →. Not sure how to read it? `?guide=1` marks the real sheet with
numbered notes and explains each beneath it, in English and Japanese. Open a wrestler and the
dialog spells out the ring name character by character, with what each means. Bilingual
English/Japanese.

## Project structure

```
src/
  main.tsx                     # React entry point
  App.tsx                      # Main app component
  styles/
    tokens.css                 # Design tokens (colour, type, spacing, motion)
    base.css                   # Reset, page frame, fonts, print
    a11y.css                   # Skip link and visually-hidden
  components/
    Hero/                      # Wordmark, seal, masthead, basho info
    ViewToggle/                # Sheet or List
    BanzukeSheet/              # The printed sheet: vertical, right to left
    BanzukeGrid/               # The list: container for rank rows
    RankRow/                   # Single rank row (West | Rank | East)
    SideCell/                  # Wrestler cell on a list row
    Hoshitori/                 # The star chart: score on the Sheet, ○●休 strip on the List
    ResultsToggle/             # Results on/off (on by default in season)
    Guide/                     # ?guide=1: the legend beneath the paper and its link
    Bouts/                     # The day's card and the leaders, under the paper
    Footer/                    # Attribution
  data/
    schema.ts                  # Raw upstream types + snapshot validation (shared with scripts)
    kimarite.ts                # Kimarite romaji → kanji + gloss
    shikona-glossary.ts        # What the kanji in ring names mean (hand-curated)
  hooks/
    useBanzuke.ts              # Data fetching hook
    useResults.ts              # Loads results/{bashoId}.json in season
  types/
    banzuke.ts                 # TypeScript interfaces
  utils/
    formatting.ts              # Date, rank, and URL helpers
    rovingFocus.ts             # Arrow-key travel between wrestlers (sheet and list)
public/
  latest-banzuke.json          # Static data snapshot, both divisions (auto-updated)
  sample-data.json             # Fallback: Makuuchi only, labelled (npm run make-sample)
  banzuke/                     # One file per tournament + index.json (npm run archive-banzuke)
  results/                     # One file per tournament of records, cards and yusho (npm run fetch-results)
  assets/
    FranSans-Solid.otf         # Wordmark font
    fonts/
      Archivo-latin.woff2            # Ring names and labels (Latin)
      NotoSerifJP-700-subset.woff2   # The Sheet's mincho, subset to the glyphs in use
      NotoSerifJP-subset.json        # Which glyphs; checked by a test
scripts/
  fetch-banzuke.ts             # Fetches + validates the latest data from sumo.or.jp
  validate-banzuke.ts          # Validates a snapshot file
  fetch-profiles.ts            # Scrapes wrestler profiles (height, weight, debut …)
  subset-fonts.ts              # Builds the mincho subset from the snapshot + source
  make-sample.ts               # Derives sample-data.json from the live snapshot
  archive-banzuke.ts           # Adds the snapshot's tournament to public/banzuke/
  backfill-archive.ts          # One-off: earlier tournaments from sumo-api.com, joined by JSA id
  fetch-results.ts             # Tournament results from sumo-api.com, joined by JSA id
  glossary-gaps.ts             # Lists ring-name characters the glossary lacks (deploy warns)
  lib/charset.ts               # Collects the Japanese glyph set
  lib/http.ts                  # fetch with timeout, retries and a User-Agent
  lib/jp-search-page.ts        # Parses the Japanese rikishi list page
  lib/jp-payload.ts            # Builds the Japanese payload from EN data + that page
  lib/sumo-api.ts              # sumo-api shapes → archive format
  lib/archive-io.ts            # Read/write the archive directory
.github/
  workflows/
    deploy.yml                 # Refresh data, regenerate the font subset, build, deploy
    ci.yml                     # Validate, test, build on pull requests
```

## Getting started

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

Then visit http://localhost:5173

## Building for production

```sh
npm run build
```

This outputs to `dist/`. Deploy this folder to any static host (GitHub Pages, Netlify, Vercel, etc.).

## Data refresh and deployment

A single workflow (`.github/workflows/deploy.yml`) runs on every push to `main`, once a day at
07:00 JST and again at 19:00 JST, and on demand from the Actions tab. It:

1. Fetches the English and Japanese banzuke for both divisions from sumo.or.jp and validates
   them (both languages present, same tournament, same wrestlers, sane row counts).
2. When the tournament data changed, archives it under `public/banzuke/` and regenerates the
   mincho subset (new wrestlers can bring new kanji). Wrestler profiles are checked on every
   run and re-scraped only for wrestlers whose stored profile predates the current tournament.
3. During a tournament, fetches every wrestler's record, each day's bouts and the yusho from
   sumo-api.com into `public/results/`.
4. Commits `public/latest-banzuke.json`, `public/rikishi-profiles.json`, the font files,
   `public/banzuke/` and `public/results/` to `main` when any of them changed (a fresh fetch
   timestamp alone is not a change).
5. Validates, tests and builds the site with the freshest valid data and deploys it to
   GitHub Pages.

If sumo.or.jp is unreachable the committed snapshot is deployed instead, so a data hiccup never
breaks a deploy.

### Data sources

- **English**: the JSON endpoint behind the official English banzuke page
  (`EnHonbashoBanzuke/indexAjax`). Provides ids, rank codes, photos, tournament dates and
  English names.
- **Japanese**: the server-rendered rikishi list page (`ResultRikishiData/search`). Provides
  kanji ring names, hiragana readings, and Japanese stable and prefecture names. The JSA's
  Japanese JSON endpoints only answer browser sessions, so the Japanese payload is assembled
  from this page plus the language-independent fields of the English payload.

### Archive

`public/banzuke/{bashoId}.json` holds every tournament the site has shown (ring names, ranks,
sides, stable and region for Makuuchi and Juryo), written by `npm run archive-banzuke` from the
JSA snapshot. Tournaments before this site kept copies (2025-11 → 2026-07) were filled once from
[sumo-api.com](https://www.sumo-api.com/), whose rikishi records carry the JSA id (`nskId`), by
`npm run backfill-archive -- 202511 202601 202603 202605 202607`. `index.json` lists them all.

### Results

`public/results/{bashoId}.json` holds one file per basho: every wrestler's record (with ○●休
bouts and kimarite as sumo-api romaji), each day's card, and the yusho. It is written by
`npm run fetch-results` from [sumo-api.com](https://www.sumo-api.com/) only while a tournament
is in season — from the day before day 1 to three days after senshuraku — and joined to JSA ids
by `nskId`. The browser never calls sumo-api.com; it reads only this file.

### Manual (local)

```sh
npm run fetch-remote     # fetch, validate and write public/latest-banzuke.json
npm run subset-fonts     # rebuild the mincho subset after the data (or source) gains new kanji
npm run fetch-profiles   # scrape wrestler profiles into public/rikishi-profiles.json
npm run make-sample      # derive the labelled Makuuchi-only fallback from the live snapshot
npm run validate-data    # validate the committed snapshot
npm run archive-banzuke  # add the current snapshot's tournament to public/banzuke/
npm run fetch-results    # in season: refresh public/results/{bashoId}.json (-- --basho 202607 for a past one)
npm run glossary-gaps    # list ring-name kanji the shikona glossary lacks
```

Live site: https://jonath0n.github.io/banzuke-app/

## Tech stack

- **React 19** with TypeScript
- **Vite** for development and builds
- **CSS Modules** for scoped component styles
- **GitHub Actions** for automated data refresh and deployment
- **GitHub Pages** for hosting
