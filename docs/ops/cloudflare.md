# Hosting on Cloudflare at banzuke.app

The site is a static `dist/` deployed as **Workers static assets** (no Worker code) by
`wrangler deploy` with `wrangler.jsonc`. The deploy job in `deploy.yml` does it on every data
refresh. `banzuke.app` is registered at Squarespace and its DNS is a Cloudflare zone (Free plan).

## One-time setup (owner, in dashboards)

1. **Add the zone.** Cloudflare → Domains → *Onboard a domain* → `banzuke.app`, Free plan. In
   the imported DNS records, delete the Squarespace ones: the A records `198.185.159.144/145`
   and `198.49.23.144/145`, and the `www` CNAME `ext-sq.squarespace.com`. The domain has no email
   records and no DNSSEC, so there is nothing else to carry over.
2. **Point the nameservers.** Squarespace → Domains → banzuke.app → DNS → *Domain
   nameservers* → *Use custom nameservers*, and enter the two that Cloudflare assigned. If a
   Squarespace site is connected to the domain, disconnect it.
3. **Wait for Active.** The zone overview says *Active* once the nameservers are seen. That
   usually takes minutes but can take up to a day. `dig +short NS banzuke.app` shows the change.
4. **API token for the deploy.** Cloudflare → *Account API tokens* → *Create token* → template
   **Edit Cloudflare Workers**. Scope it to this account and the `banzuke.app` zone; it needs
   Workers Scripts Edit and Workers Routes Edit. In GitHub → repository → Settings → Secrets and
   variables → Actions, add:
   - `CLOUDFLARE_API_TOKEN`: the token.
   - `CLOUDFLARE_ACCOUNT_ID`: the account id, shown on the Workers overview page.
5. **www → apex.** Cloudflare → banzuke.app → Rules → *Redirect Rules* → create a rule:
   hostname equals `www.banzuke.app`, dynamic redirect to
   `concat("https://banzuke.app", http.request.uri.path)`, status 301, preserve the query string.

6. **Always Use HTTPS.** Cloudflare → banzuke.app → SSL/TLS → Edge Certificates → *Always Use
   HTTPS* on (turned on 2026-11-28). Plain `http://` then 301s to `https://` with the path and
   query kept; without it `http://banzuke.app/` answered 200 and showed up in Search Console. The
   HSTS header in `public/_headers` relies on it.

## Cutover

1. Before merging the hosting PR, deploy it from the branch to check it: `npm run build`, then
   `npx wrangler login` (opens a browser) and `npx wrangler deploy`. The first deploy creates
   the `banzuke` Worker, attaches `banzuke.app` and `www.banzuke.app` (creating their DNS
   records and certificates), and prints a `workers.dev` URL as well.
2. Check https://banzuke.app/, a share page `/r/<id>/`, `/sitemap.xml` and `/robots.txt`.
3. Add the two secrets (step 4 above) and merge. The merge's deploy run deploys to Cloudflare.
4. Actions → **Publish github.io redirect** → *Run workflow*. From then on the old address
   forwards every path and query to banzuke.app.
5. If the site is in Google Search Console, add `banzuke.app` and submit
   `https://banzuke.app/sitemap.xml`.

## Checks

```sh
curl -sI https://banzuke.app/ | head -1                       # 200
curl -sI http://banzuke.app/ | grep -i location               # https://banzuke.app/
curl -s https://banzuke.app/robots.txt                        # Sitemap: https://banzuke.app/sitemap.xml
curl -sI 'https://www.banzuke.app/?lang=jp' | grep -i location  # https://banzuke.app/?lang=jp
```

Then open `https://jonath0n.github.io/banzuke-app/?rikishi=<id>`: it should land on the same
wrestler at banzuke.app.

## Rollback

Revert the hosting PR. The restored `deploy.yml` builds with base `/banzuke-app/` and deploys
to GitHub Pages again, which also replaces the redirect bundle there. The Cloudflare Worker
and zone can stay; nothing points at them except banzuke.app.
