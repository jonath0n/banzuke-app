# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grand sumo fans who read English, Japanese or both, served equally: neither language is the
secondary one. Two moments of use matter most:

- **Evening, in season, on a phone**: checking the day's results, the yusho race and what each
  wrestler still needs, as the results come in.
- **Desktop reference**: looking up a wrestler, a stable or an earlier tournament, at leisure.

## Product Purpose

banzuke.app shows the official grand sumo banzuke for all six divisions (Makuuchi to
Jonokuchi), in English and Japanese, refreshed automatically from the Japan Sumo Association.
During a tournament it lays the results over the ranking; between tournaments it shows how the
ranking changed and why. Success is a fan opening it and finding the answer at once, and coming
away more drawn to the sport than before.

## Positioning

The banzuke treated as a document worth reading, not a stats table. It reads like the printed
banzuke (East on the right, rank expressed by size), and on top of
that it does what neither the JSA site nor a database does together:

- **Live tournament overlay**: each wrestler's record, ○●, kachi-koshi, the day's bouts, the
  yusho race, playoffs and prizes, laid over the ranking itself.
- **Learning the names**: every ring name spelled out kanji by kanji with readings and
  meanings, so the Japanese becomes legible rather than decorative.
- **Fast, quiet, no clutter**: static, offline-capable, no ads, accounts or tracking.
- **Reverence**: a beautiful interface that inspires fandom and honours sumo as a sport and a
  tradition. The design should treat the subject with respect, never as novelty or kitsch.

## Operating Context

- The sumo calendar drives use: six honbasho a year, fifteen days each; the new banzuke is
  announced about two weeks before day 1; results arrive in the Tokyo evening (JST).
- Changes is on by itself from the banzuke announcement until day 1; Results is on during the
  tournament. `?basho=<id>` opens any archived tournament.
- Wrestler and stable share pages (`/r/<id>/`, `/heya/<id>/`) are what spreads in chats and
  social posts, so a link has to unfurl well.
- Served at https://banzuke.app/ (Cloudflare static assets); data is refreshed by GitHub Actions.

## Capabilities and Constraints

- Static React 19 + TypeScript (Vite), no backend, no runtime dependencies beyond React. The
  browser reads only committed JSON under `public/`.
- One view, the List: a row per rank, West | rail | East. It **never scrolls sideways** at any
  width from 360px up. No portraits on the List; photos live in the wrestler dialog.
- Wrestler dialog (portrait, profile, ring-name breakdown, next bout, stakes, kadoban) and stable
  dialog; keyboard navigation between wrestlers and along the banzuke.
- Profiles and stables are optional enrichment: the app must work without them.
- Japanese type is a generated NotoSerifJP subset; it is regenerated, never edited by hand.
- Terminology is sumo's own and used correctly in both languages: banzuke, basho, honbasho,
  shikona, heya, yusho, kachi-koshi / make-koshi, kadoban, kinboshi, senshuraku, hoshitori,
  East / West.
- Product rules that are deliberate, not visual taste: the interface is treated as a printed
  document, so motion is limited (at most four keyframe effects, no infinite animation,
  entrance plays once per page load).
  Details: `CLAUDE.md` and `docs/architecture.md`.

## Brand Commitments

- Name: **banzuke.app**; page title "Grand Sumo Banzuke".
- A hanko (seal) sits in the footer by the credit.
- Voice: plain and exact, in the register of a well-made reference; sumo terms used without
  fuss or explanation-by-exclamation.
- Sumo's own visual symbols are used respectfully; loaded or militaristic imagery is never used
  as decoration.

## Evidence on Hand

- Official data from the Japan Sumo Association (sumo.or.jp): rankings, names in both
  languages, portraits (hot-linked, 60×60 and 270×474 only).
- Results from sumo-api.com, committed per tournament under `public/results/`.
- Archive of every tournament from 2025-11 onward under `public/banzuke/`.
- Wrestler profiles and stable details (`public/rikishi-profiles.json`, `public/stables.json`).
- A hand-written shikona glossary (`src/data/shikona-glossary.ts`).
- OG image and icon renderers in `design/`.
- No testimonials, user counts, press or endorsements exist; do not invent any. The site is not
  affiliated with the JSA and must not imply it is.

## Product Principles

1. **The banzuke is the interface.** Everything — results, changes, stakes — is laid over the
   ranking rather than moved into separate screens.
2. **Two languages, one standing.** English and Japanese are equals; Japanese text is real,
   correctly set and explained, never ornament.
3. **The answer at a glance.** On a phone in the evening, the day's state of the tournament
   should be readable without hunting.
4. **Quiet over busy.** No clutter, no tracking, no noise; restraint is how the product shows
   respect.
5. **Honour the sport.** Craft and accuracy are how the site earns a fan's trust and deepens
   their regard for sumo.

## Accessibility & Inclusion

Accessibility is a requirement: real buttons, headings for structure, `lang` on Japanese text,
text contrast ≥ 4.5:1 (enforced on every palette pair by `src/styles/tokens.test.ts`), visible
focus, full keyboard operation, and one source for every wrestler's accessible name
(`describeWrestler()`). Reduced motion is respected.
