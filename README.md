# banzuke-app

Simple, dependency-free front-end that consumes the official Japan Sumo Association
banzuke endpoint and renders the current makuuchi division. The goal is to keep it
portable so it can live on GitHub Pages, Cloud Storage, Netlify, or any other static host.

## Project structure

```
public/
  index.html        # UI markup + filter controls
  main.js           # Fetches live JSON and renders cards
  styles.css        # Minimal styling (works in light & dark mode)
  sample-data.json  # Bundled fallback so the page works offline
scripts/
  fetch-banzuke.mjs # Node script that snapshots the API for caching
cloud-function/
  index.js          # Google Cloud Function handler (HTTP trigger)
  package.json
```

## Local development

Because everything is just static assets, you can preview it with any web server:

```sh
# simplest option using Python
cd public
python3 -m http.server 4173
```

Then visit <http://localhost:4173>. The page tries to fetch the live API; if that fails
(e.g., during offline work) it falls back to `sample-data.json`.

### Refreshing the cached JSON

If you need a local snapshot of the live API (for tests, diffing, or bundling), run:

```sh
node scripts/fetch-banzuke.mjs
```

That writes `public/latest-banzuke.json` with a timestamp.

## Hosting options

* **GitHub Pages** – push `public/` to your repo and enable Pages (Source → `main` → `/public`).
* **Static site hosts** – drag the `public` folder into Netlify/Vercel or upload to Cloud
  Storage with "Static website" enabled.
* **Any CDN or bucket** – the assets are self-contained; there is no build step.

### Language toggle & custom endpoints

The UI supports an English ⇄ 日本語 toggle. The Japanese endpoint on sumo.or.jp does not
send permissive CORS headers, so the static app retries via a public proxy for local/dev
use. For production, deploy the Cloud Function (or any trusted proxy) and point the UI at
it so both languages can be fetched securely. You can override the endpoint by defining a
global before `main.js` loads:

```html
<script>
  window.BANZUKE_API_URL = "https://your-cloud-function-url";
</script>
<script type="module" src="./main.js"></script>
```

or by appending `?api=https://your-cloud-function-url` to the page URL. The proxy should
accept `?lang=en|jp` (the provided Cloud Function already does this).

## Cloud automation

If you want the data refresh to run on a schedule without relying on a laptop, deploy the
HTTP Cloud Function in `cloud-function/` and combine it with Cloud Scheduler.

### Deploying the Cloud Function

```sh
cd cloud-function
# deploy to Google Cloud Functions (2nd gen) with Node 20 runtime
 gcloud functions deploy fetchBanzuke \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --entry-point=fetchBanzuke \
  --trigger-http \
  --allow-unauthenticated
```

The function simply proxies the official API, adds cache headers, and returns the JSON.
You can now point the front-end at your function URL if you want to avoid direct calls to
sumo.or.jp, or use the endpoint as a trusted source for other apps.

### Scheduling refreshes

To hit the function on a cadence (and optionally write the payload to Cloud Storage or a DB):

```sh
# this example pings the function every day at 06:00 JST
 gcloud scheduler jobs create http banzuke-refresh \
  --schedule="0 6 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://YOUR_FUNCTION_URL" \
  --http-method=GET
```

If you want to persist each snapshot, extend `cloud-function/index.js` to write to
Cloud Storage or Firestore; the scaffolding is there so you can add that logic without
rewriting the UI.

## Next steps

* Style refinements – tweak `public/styles.css` to better match your branding.
* Additional divisions – the same API exposes juryo, makushita, etc. Add dropdowns or tabs
  to let users explore other ranks.
* GitHub Actions – run `node scripts/fetch-banzuke.mjs` on a schedule, commit the new JSON,
  and push so GitHub Pages always serves the freshest data.
