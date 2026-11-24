---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: the homepage (the List)

Scope: `/` and its URL states (`?div`, `?q`, `?diff`, `?basho`, `?lang`). Visitor mode: Operate.
Audience and job: fans (EN and JA equally) checking the ranking and, in season, the day's state of the tournament; phone in the evening first, desktop reference second.
Constraints: content, routes and functionality unchanged; the List never scrolls sideways from 360px; accessibility rules in CLAUDE.md.
Memorable moment: the champion's row screened yellow with a red 優勝 stamp, under a red masthead band.
Unresolved: dialogs (wrestler, stable) inherit tokens now and get their own pass after the homepage.

## Direction contract

THESIS: The banzuke as a Japanese sports daily's results page — a dense, aligned, ink-on-newsprint table with a red masthead and a highlighter on what matters now. Refuses the cream-paper-and-vermilion-seal default and the dark stats dashboard.

OWN-WORLD: Newsprint #e9e9e4 ground, white sheet, ink #111, kin-aka #d10010 for rank and stamps, highlighter yellow #ffe34d as a screen under text. Sofia Sans Condensed heavy for names/scores/labels, Noto Serif JP for Japanese names and rank kanji. Square everything; black section bars over tiers; standard square controls with ink selection.

STORY: The visitor sees the tournament's state and champion at once, finds a wrestler by scanning the size ladder or searching (match highlighted yellow), reads records as a 星取表 in groups of five, and opens a wrestler for detail.

FIRST VIEWPORT: Full-bleed red band (wordmark white, 番付, EN/日本語 right) ~64px on phone. Below on newsprint: one-line deck (tournament · venue · dates · status), the champion headline with a red 優勝 stamp, search, toggles+picker in one row, then square division tabs on the sheet; at 390×844 the Yokozuna and Ozeki rows are fully on screen. At 1440 the sheet sits left with the bouts/yusho race in a right rail.

FORM: candidate 4 of 7 (sports-daily hoshitori page) · seed:7423cf35ca76800e. Signature move: the highlighter (網掛け). Motion: the existing three effects, entrance once.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
