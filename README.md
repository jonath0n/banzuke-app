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
  latest-banzuke.json          # Static data snapshot
  sample-data.json             # Fallback for offline use
  assets/
    FranSans-Solid.otf         # Custom font
cloud-function/
  index.js                     # Google Cloud Function for auto-refresh
scripts/
  fetch-banzuke.mjs            # Local data refresh script
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

This outputs to `dist/`. Deploy this folder to any static host (GitHub Pages, Netlify, Vercel, Cloud Storage, etc.).

## Refreshing banzuke data

The UI reads from `public/latest-banzuke.json`. To update it locally:

```sh
npm run fetch-remote
```

## Cloud automation

Deploy the Cloud Function in `cloud-function/` to automatically refresh the data on a schedule. See the deployment instructions in that directory.

### Environment variables for Cloud Function

- `GITHUB_TOKEN` – GitHub token with `repo:contents` scope
- `GITHUB_REPO` – `owner/repo` format
- `GITHUB_BRANCH` – Branch to update (defaults to `main`)
- `GITHUB_DATA_PATH` – Path to JSON file (defaults to `public/latest-banzuke.json`)

## Tech stack

- **React 18** with TypeScript
- **Vite** for development and builds
- **CSS Modules** for scoped component styles
- No runtime dependencies beyond React

## Legacy files

The `public/` folder contains old vanilla JS files (`index.html`, `main.js`, `styles.css`) from a previous version. These are not used by the React app and can be removed.
