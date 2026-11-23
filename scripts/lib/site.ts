/**
 * Where the site lives. The one place the public URL is written: index.html's
 * canonical and social tags (through vite.config.ts), the share pages, the
 * sitemap, robots.txt and the JSON-LD (scripts/lib/stubs.ts), and the live-site
 * checks in watch-results.ts and measure-upstream.ts all read it from here.
 */

/** The public origin, with a trailing slash. */
export const SITE_URL = 'https://banzuke.app/'

/** The path the app is served from (Vite's `base`). */
export const BASE = '/'
