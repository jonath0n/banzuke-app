# banzuke-app

React + TypeScript viewer for the official Japan Sumo Association banzuke endpoint.
Renders the current Makuuchi and Juryo divisions two ways: **Sheet**, the banzuke as it is
printed — vertical, read right to left, East on the right, ranked by character size — and
**List**, a searchable row per rank. Bilingual English/Japanese.

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
    Footer/                    # Attribution
  data/
    schema.ts                  # Raw upstream types + snapshot validation (shared with scripts)
  hooks/
    useBanzuke.ts              # Data fetching hook
  types/
    banzuke.ts                 # TypeScript interfaces
  utils/
    formatting.ts              # Date, rank, and URL helpers
public/
  latest-banzuke.json          # Static data snapshot, both divisions (auto-updated)
  sample-data.json             # Fallback for offline use
  assets/
    FranSans-Solid.otf         # Custom font
scripts/
  fetch-banzuke.ts             # Fetches + validates the latest data from sumo.or.jp
  validate-banzuke.ts          # Validates a snapshot file
  fetch-profiles.ts            # Scrapes wrestler profiles (height, weight, debut …)
  lib/http.ts                  # fetch with timeout, retries and a User-Agent
  lib/jp-search-page.ts        # Parses the Japanese rikishi list page
  lib/jp-payload.ts            # Builds the Japanese payload from EN data + that page
.github/
  workflows/
    deploy.yml                 # Refresh data, build, and deploy to GitHub Pages
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
07:00 JST, and on demand from the Actions tab. It:

1. Fetches the English and Japanese banzuke from sumo.or.jp and validates them
   (both languages present, same tournament, same wrestlers, sane row counts).
2. Commits `public/latest-banzuke.json` to `main` when the tournament data actually changed
   (a fresh fetch timestamp alone is not a change).
3. Builds the site with the freshest valid data and deploys it to GitHub Pages.

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

### Manual (local)

```sh
npm run fetch-remote     # fetch, validate and write public/latest-banzuke.json
npm run fetch-profiles   # scrape wrestler profiles into public/rikishi-profiles.json
npm run validate-data    # validate the committed snapshot
```

Live site: https://jonath0n.github.io/banzuke-app/

## Tech stack

- **React 19** with TypeScript
- **Vite** for development and builds
- **CSS Modules** for scoped component styles
- **GitHub Actions** for automated data refresh and deployment
- **GitHub Pages** for hosting
