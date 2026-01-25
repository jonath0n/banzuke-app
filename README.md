# banzuke-app

React + TypeScript viewer for the official Japan Sumo Association banzuke endpoint.
Renders the current makuuchi division with a modern, responsive UI.

## Project structure

```
src/
  main.tsx                     # React entry point
  App.tsx                      # Main app component
  index.css                    # Global styles & CSS variables
  components/
    Hero/                      # Header with basho info
    BanzukeGrid/               # Container for rank rows
    RankRow/                   # Single rank row (East | Label | West)
    SideCell/                  # Wrestler cell with photo & name
    Footer/                    # Attribution
  hooks/
    useBanzuke.ts              # Data fetching hook
  types/
    banzuke.ts                 # TypeScript interfaces
  utils/
    formatting.ts              # Date, rank, and URL helpers
public/
  latest-banzuke.json          # Static data snapshot (auto-updated)
  sample-data.json             # Fallback for offline use
  assets/
    FranSans-Solid.otf         # Custom font
scripts/
  fetch-banzuke.mjs            # Fetches latest data from sumo.or.jp
.github/
  workflows/
    deploy.yml                 # Build & deploy to GitHub Pages
    refresh-banzuke.yml        # Daily auto-refresh via GitHub Actions
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

## Data refresh

### Automatic (GitHub Actions)

The banzuke data is automatically refreshed daily at 6:00 AM JST via GitHub Actions. The workflow:

1. Fetches both English and Japanese data from sumo.or.jp
2. Commits the updated `public/latest-banzuke.json` if changed
3. Your static host will pick up the changes on next deploy

You can also trigger a manual refresh from the GitHub Actions tab.

### Manual (local)

To refresh the data locally:

```sh
npm run fetch-remote
```

This fetches both EN and JP banzuke and saves to `public/latest-banzuke.json`.

## Deployment

The site auto-deploys to GitHub Pages on every push to `main`. The deploy workflow:

1. Installs dependencies
2. Builds the React app with Vite
3. Deploys to GitHub Pages

Live site: https://jonath0n.github.io/banzuke-app/

## Tech stack

- **React 18** with TypeScript
- **Vite** for development and builds
- **CSS Modules** for scoped component styles
- **GitHub Actions** for automated data refresh and deployment
- **GitHub Pages** for hosting
