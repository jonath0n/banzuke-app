---
name: banzuke.app
description: The grand sumo banzuke set as a Japanese sports daily's results page — newsprint, kin-aka red for rank and rises, 藍 indigo section bars and falls, and a yellow highlighter on what matters now.
colors:
  newsprint: "#e9e9e4"
  sheet: "#ffffff"
  ink: "#111111"
  on-ink: "#ffffff"
  pencil: "#55554f"
  column-rule: "#c9c9c2"
  hairline: "rgba(17, 17, 17, 0.13)"
  kin-aka: "#d10010"
  kin-aka-deep: "#a3000c"
  on-kin-aka: "#ffffff"
  section-bar: "#1e2c6b"
  fall: "#2a43a0"
  on-section-bar: "#ffffff"
  masthead-band: "#d10010"
  on-masthead-band: "#ffffff"
  band-rule: "#111111"
  highlighter: "#ffe34d"
  on-highlighter: "#111111"
  danger: "#b91c1c"
  warning: "#a04a08"
  night-newsprint: "#0f0f0f"
  night-sheet: "#181818"
  night-ink: "#f2f2ee"
  night-on-ink: "#0f0f0f"
  night-pencil: "#a3a39b"
  night-column-rule: "#3a3a35"
  night-hairline: "rgba(242, 242, 238, 0.12)"
  night-kin-aka: "#ff4a4f"
  night-kin-aka-hover: "#ff7276"
  night-section-bar: "#2e3d82"
  night-fall: "#8ea4ff"
  night-on-section-bar: "#f2f2ee"
  night-masthead-band: "#a3000c"
  night-band-rule: "#5c0007"
  night-highlighter: "#524600"
  night-on-highlighter: "#ffffff"
  night-danger: "#fca5a5"
  night-warning: "#fcd34d"
typography:
  masthead:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "clamp(1.6rem, 5vw, 4rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "0.01em"
  headline:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "clamp(2.4rem, 7.5vw, 6rem)"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "0"
  title:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "1.2rem"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.01em"
  name-yokozuna:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "clamp(1.75rem, 6.5vw, 3.4rem)"
    fontWeight: 850
    lineHeight: 1.05
  name-ozeki:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "clamp(1.5rem, 5.2vw, 2.6rem)"
    fontWeight: 800
    lineHeight: 1.05
  name-sekiwake:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "clamp(1.3rem, 4.5vw, 2.05rem)"
    fontWeight: 800
    lineHeight: 1.05
  name-komusubi:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "clamp(1.2rem, 4vw, 1.75rem)"
    fontWeight: 750
    lineHeight: 1.05
  name-maegashira:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "clamp(1.05rem, 3.4vw, 1.3rem)"
    fontWeight: 700
    lineHeight: 1.05
  name-jp:
    fontFamily: "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', serif"
    fontWeight: 700
    letterSpacing: "0.02em"
  label:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.04em"
  score:
    fontFamily: "'Sofia Sans Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum'"
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: "0"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
components:
  masthead-band:
    backgroundColor: "{colors.masthead-band}"
    textColor: "{colors.on-masthead-band}"
    typography: "{typography.masthead}"
    rounded: "{rounded.none}"
    height: "4.5rem"
  division-tab:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem 0.6875rem"
    height: "48px"
  division-tab-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.none}"
  toggle:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.35rem 0.8rem"
    height: "40px"
  toggle-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.none}"
  basho-picker:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "40px"
  search-input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0.5rem 2.75rem 0.5rem 2.5rem"
    height: "48px"
  section-bar:
    backgroundColor: "{colors.section-bar}"
    textColor: "{colors.on-section-bar}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.35rem 0.75rem"
  rank-rail-yokozuna:
    backgroundColor: "{colors.masthead-band}"
    textColor: "{colors.on-masthead-band}"
    rounded: "{rounded.none}"
    width: "5.5rem"
  stamp:
    backgroundColor: "{colors.masthead-band}"
    textColor: "{colors.on-masthead-band}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0.2rem 0.35rem"
  highlighted-name:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.on-highlighter}"
    rounded: "{rounded.none}"
  side-box:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 0.75rem 0.75rem"
    width: "360px"
  scroll-to-top:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.none}"
    size: "44px"
---

# Design System: banzuke.app

## Overview

**Creative North Star: "The Sports Page"**

The banzuke as the results page of a Japanese sports daily on the morning after a day of the
basho: newsprint grey under a white sheet, a kin-aka red masthead band closed by an ink rule,
indigo section bars where the rank tier changes, condensed heavy names that scale with rank, the ○● record
set as a 星取表 in fixed day columns grouped by five, and a yellow highlighter screened over the
thing that matters now: the champion's name, the yusho race while it is open, the name you
searched for.

It is a working table first. The world lends four things only: type (Sofia Sans Condensed with a
newspaper's appetite for weight, Noto Serif JP mincho for Japanese names and rank kanji as a paper
sets names in its body text), palette (newsprint, ink, kin-aka, highlighter), density (a sports
table's tight, aligned rhythm on a 4px base), and one signature move: **the highlighter**, 網掛け,
the yellow screen a sports desk lays over the leader's line.

**What this deliberately avoids:** the cream-paper-and-vermilion-seal look this site used to wear
(and that every "Japanese" interface defaults to); dark stats dashboards with neon; gold; rounded
cards, pills and soft shadows; small tracked caps under 12px; rank told by hue alone; decorative
Japanese motifs. No Rising Sun forms, ever: the masthead is a flat band, never rays.

The wrestler and stable dialogs are set as a player file (選手名鑑) on the same sheet: see
Dialogs under Components.

**Key Characteristics:**

- A full-bleed red band closed by a 6px masthead rule (4px on phones), then everything on newsprint.
- One white sheet opened by a 5px ink rule that the division tabs stand on.
- Rank carried by type size (about 2.6x from Yokozuna to Maegashira on desktop), with red reserved for
  sanyaku kanji and the Yokozuna's solid rail block.
- Square everything: radius 0, 1.5px ink borders on controls, 1px hairlines between rows.
- Flat print: only what floats over the page (dialogs, the scroll button) casts a shadow.
- Four keyframe effects, entrance once per page load, nothing loops. The one authored moment is
  the 優勝 stamp, pressed like a hanko when the champion first appears.
- Dialogs leave the way they came, faster: 200ms ease-in, a 12px drop and a fade, by
  transition (not a fifth keyframe). A hop from one dialog to the other is a swap, not a close.

## Colors

Committed in role: ink and two spot plates, red and 藍 indigo, plus a highlighter, on a newsprint
ground. Each plate does one job as a fill and one as a letterform, so a reader can learn the page
in one look: red rose, indigo fell.

### Primary

- **Kin-aka** (`--accent`; night `--accent` brighter for contrast): the paper's red as **text**.
  Sanyaku rank kanji in the rail (Ozeki, Sekiwake, Komusubi), the ▲ and "new" movement marks, and
  a kachi-koshi score. Rank, and what rises in it.
- **Masthead Red** (`--band`, with `--on-band`; night `--band` deepens so the band is not a glare):
  the paper's red as a **fill**. The masthead band, the Yokozuna's solid rail block, the 優勝 stamp
  in the headline and the star chart, promotion stamps (新入幕 / New), and the red characters of
  the reversed 番付 box. Every red fill uses `--band`, never `--accent`, so fills stay a constant
  white-on-red pair in both schemes.
- **Kin-aka Deep** (`--accent-hover`): the pressed shade of red text links.

### Secondary

- **Ai** (`--fall`; night a light indigo for contrast): the indigo plate as **text**. What fell:
  the ▼ movement mark, a make-koshi score, a lost bout's ● in the star chart and the bout list.
  Red's counterpart, and always paired with a shape (▼, ●) so it never carries meaning alone.
- **Section Bar** (`--bar`, with `--on-bar`): the indigo plate as a **fill**. The bars over rank
  tiers, the heads of the side boxes, and the tier bars in the dialogs. Deep indigo by day, a
  raised indigo by night (a white bar on a dark page glares).
- **Highlighter** (`--highlight`, with `--on-highlight`; night a deep olive screen with white
  ink): a screen laid under ink, never a text colour. The champion's name on the sheet, each
  search match, the undecided yusho race box, the outer focus ring of the search field, and text
  selection.

### Neutral

- **Ink** (`--text`, with `--on-ink`): text, and the UI's selection colour: the selected division
  tab, a pressed toggle, the sheet's 5px opening rule, the footer's top rule, focus outlines. A
  won bout's ○.
- **Band Rule** (`--band-rule`): the 6px rule closing the masthead band (ink by day, a dark red by
  night).
- **Newsprint** (`--bg`): the page ground.
- **Sheet** (`--card-bg`): the table, the side boxes, controls, inputs, dialogs.
- **Pencil** (`--muted`): secondary text, romaji under rank kanji, counts, kimarite.
- **Column Rule** (`--border`): tab and side-seal outlines, unfought days in the star chart,
  dividers inside the basho picker.
- **Hairline** (`--rule`): the 13% ink rule between rows and either side of the rank rail.
- **Danger / Warning** (`--danger`, `--warning`): data problems only, as text on an 8% tint.

### Named Rules

**The Two Plates Rule.** Red ranks and rises, indigo structures and falls, black selects, yellow
highlights. Each plate has one job as a fill (red: masthead and stamps; indigo: section bars) and
one as a letterform (red: rank and rises; indigo: falls and losses). A colour never borrows
another's job, and no fifth hue joins them: data problems keep their own danger and warning.

**The Highlighter Rule.** Yellow only ever sits under text, and only on what the reader is looking
for or what matters now. If two things on screen are highlighted, one of them is wrong: the yusho
race drops its screen once the champion is decided, and while searching the champion's screen
yields to the matches.

**The Fill-Is-Band Rule.** Red as a ground is `--band` with `--on-band`; red as a letterform is
`--accent`. Never fill with `--accent`.

## Typography

**Display Font:** Sofia Sans Condensed (variable 1–1000, self-hosted Latin subset, with Arial
Narrow / Roboto Condensed)
**Body Font:** system UI stack, with Hiragino Sans / Yu Gothic / Noto Sans JP for Japanese
**Japanese Names:** Noto Serif JP 700 (generated subset), with Hiragino Mincho / Yu Mincho

**Character:** A condensed grotesk set heavy (700–900) so names can be bigger on a phone than a
regular face allows, beside a bold mincho that sets Japanese names and rank kanji the way a paper
sets them in body text. Reading text stays in the system face. All figures are tabular.

### Hierarchy

- **Masthead** (900, `--text-display`, line-height 0.95, uppercase): the wordmark in the band.
  20–23px on a phone (`--text-xl`).
- **Headline** (900, `--text-headline` up to 6rem, line-height 0.86, balanced; the bracketed record
  never breaks): the champion's name beside a 優勝 stamp that stretches to its height. The one
  headline on the page, and its loudest element.
- **Title** (800, `--text-lg`): the tournament name in the deck line under the band.
- **Names** (700–850, `--name-yokozuna` … `--name-maegashira`, line-height 1.05): the rank ladder
  on the sheet. Weight climbs with size: Maegashira 700, Komusubi 750, Sekiwake and Ozeki 800,
  Yokozuna 850. Phones step the ladder down to fixed sizes so the longest names stay on one line.
- **Rank kanji** (Noto Serif JP 700, `--text-lg`; Yokozuna and Ozeki `--text-2xl`): the centre
  rail, set at name scale because the sheet is organised by it. On a phone, one character per
  line in a 1.1em column.
- **Label** (800, `--text-sm`, `--tracking-caps`, uppercase): tabs, toggles, picker, section-bar
  labels, side-box heads, status badge. Japanese labels drop the caps and track at 0.06–0.1em.
- **Score** (700, `--text-sm`, tabular): records under names; kachi-koshi rises to 850 in red,
  make-koshi stays 700 in indigo.
- **Body** (400, 1rem, line-height 1.5): reading text, dates, help.
- **Caption** (400, `--text-xs`): provenance and the footer's small print.

### Named Rules

**The Ladder Rule.** Rank is told by name size and weight first, red second, never by hue alone.

**The 12px Floor.** Nothing a reader taps or needs is set below `--text-xs` (12px); condensed caps
labels sit at `--text-sm` (13px) and get their legibility from weight, not tracking.

## Layout

A full-bleed masthead band, then one measure for header, main and footer: `--sheet-max` (840px),
widening to `--page-max` (1240px) at ≥1200px where a side rail of `--aside-width` (360px) stands
beside the sheet with a 2rem gap. The rail is sticky, scrolls on its own, and holds the departed
list, the day's bouts and the yusho race, so the evening's answer is level with the top of the
banzuke. Below 1200px the side boxes follow the sheet. The measure is held by width, not padding
(1.5rem gutters, 0.75rem on a phone), so rules drawn on the boxes line up with their content.

The first viewport, top to bottom: the band; on newsprint the deck line (tournament · venue ·
dates · status badge); a 6px ink rule over the champion headline and prizes; search with the
toggles and basho picker beside it at ≥900px (beneath it below); the division tabs; the sheet.

Every sheet row is a three-column grid, `1fr | --rail-width | 1fr`, laid out right to left so
East sits on the right as on the printed banzuke. The rail is 5.5rem, 8rem at ≥768px (where the
full printed rank appears), and 2.25rem on a phone. The List never scrolls sideways from 360px;
the star chart sizes its marks to the cell (`min(--text-sm, 6.5cqi)`) rather than overflow.

Spacing runs on a 4px base, `--space-1` to `--space-7` (0.25rem to 3rem). Rows are tight:
0.5rem block padding, hairline between. Breakpoints observed: 600px (phone), 720px (tab names
become abbreviations), 768px (full rank, detail line), 900px (toolbar row, era masthead in the
band), 960px, 1200px (side rail).

## Elevation & Depth

Flat print. Separation comes from the white sheet on newsprint, indigo section bars, 3px ink rules
and hairlines. Section bars pin (`position: sticky`) while their rows scroll past; that is layering
by position, not by shadow. Only things that float over the page cast a shadow.

### Shadow Vocabulary

- **Float** (`--shadow-md`: `0 4px 14px rgba(17,17,17,0.16)`; night `rgba(0,0,0,0.5)`): the
  scroll-to-top button and the skip link.
- **Dialog** (`--shadow-lg`: `0 18px 48px rgba(17,17,17,0.28), 0 3px 8px rgba(17,17,17,0.12)`):
  the wrestler and stable dialogs.
- `--shadow-sm` is `none`.

### Named Rules

**The Flat Sheet Rule.** Nothing in the document flow casts a shadow. `box-shadow` inside the
sheet is only ever a drawing tool: the highlighter's edges, a kadoban outline, a focus ring.

## Shapes

Square. Every radius token is 0 and stays 0. Controls carry a 1.5px ink border; tabs and the
side seal a 1px column-rule outline; rows a 1px hairline; the sheet opens on a 5px ink rule, the
band closes on a 6px band rule, the headline opens on a 6px ink rule, the playoff on a 2px one, the footer on a
3px ink rule. Stamps are solid rectangles with no border. Icons are drawn as square-capped,
mitred 2.25px strokes (the stepper chevron).

## Components

### Masthead Band

Edge to edge, `--band` ground, `--on-band` type, closed by a 6px `--band-rule` (4px on phones). 7rem tall
(3.5rem on a phone). Holds the uppercase wordmark, a reversed 番付 box (white ground, red mincho),
the era masthead set small after a 45% white divider at ≥900px, and the language toggle on the
right: two square cells in a 1.5px white frame, the active language a white cell with red type
(a sliding white block, `--ease-out-expo`).

### Square Toggles and the Joined Basho Picker

- **Toggles** (Changes, Results): 1.5px ink border, sheet face, condensed 800 caps at 13px, 40px
  tall (44px on a phone). Hover lays an 8% ink tint; on, they fill with ink and reverse to
  `--on-ink`.
- **Basho picker:** one joined control in the same frame: a chevron step, the tournament label
  between column-rule dividers, the other step, and a "Current banzuke" segment when browsing the
  archive. Steps tint on hover; a disabled step greys to column rule.
- At ≥900px the toggles and picker sit level with the search field at 48px.

### Search Field

Sheet face, 1.5px ink border, 48px tall, search glyph inside on the left, a `/` key hint on the
right. Focus doubles the ink edge (inset 1.5px) and lays a 4px highlighter ring outside it. The
result count sits beside it in pencil caps.

### Division Tabs

Equal-width square tabs, 2px apart, seated on the sheet's 5px ink rule: the sheet pulls up under
them by `--frame`, so the rule runs along the foot of every tab and the selected tab, filled in
ink, joins it. Unselected: sheet face, column-rule outline open at the bottom, 6% ink tint on
hover. Each carries the division kanji in mincho, the name in condensed caps (an abbreviation
below 720px) and a count (hidden on a phone).

### The Sheet

- **Rank rail:** the centre column, hairlines either side, rank kanji over romaji. Sanyaku kanji
  in `--accent`. The **Yokozuna rail** is the one stamped solid: `--band` ground stretched the
  full row height, kanji and romaji reversed out.
- **Name ladder:** each side cell holds a 東/西 side seal (1px outline, fills ink on hover; dropped
  on a phone), the name at its rank size, its stamps, the record, and at ≥768px a stable · region
  line in pencil. Hover underlines the name with a 2px ink rule.
- **Highlighter:** the champion's name, and each match while searching, gets a `--highlight`
  ground with `--on-highlight` ink, extended 0.18em past the letters by two hard `box-shadow`
  edges so the screen overruns the word without changing its measure. A match's partner fades to
  0.62 opacity (still 4.5:1).
- **Star chart (星取表):** mincho ○●, fifteen fixed 0.95em cells in three groups of five (0.4em
  gaps after days 5 and 10), always left to right on both sides of the rail. Losses in pencil,
  unfought days in column rule, draws at 70% ink. Sized with `cqi` against the cell.
- **Entrance:** rows rise in once per page load (`riseIn`, 25ms stagger for the first ten);
  after that, tab switches and searches settle in place.

### Section Bars

The tier headings: `--bar` ground, `--on-bar` type, mincho tier kanji tracked 0.2em beside a
condensed caps label, centred, pinned while their rows scroll past. The same bar heads every side
box.

**The Tier Change Rule.** A section bar marks where the tier changes inside a sheet. The first
tier of any sheet is headed by the selected tab directly above it (and the sanyaku by the rail's
own stamps), so no division draws a bar under its own tab; in Makuuchi only 前頭 gets one. Every
tier keeps its `<h2>` for structure, visually hidden where no bar is drawn.

### Side Rail Boxes

Each decided bout carries the sheet's own notation beside the names, on the result side: ○ for the
winner in ink, ● for the loser in pencil (decorative; the winner is also set heavier).

Bouts, yusho race and departed: sheet boxes with a section-bar head bled to the box edge and
0.75rem padding. The day's bouts list East | result | West on hairlines with square steppers
(white 40% outline on the bar, filling `--on-bar` on hover); a playoff opens on a 2px ink rule.
The yusho race is a highlighter box while undecided and drops to plain text on a hairline once
decided. At ≥1200px they stack in the sticky rail; below, they follow the sheet.

### Stamps

Solid rectangles in `--band` with `--on-band` condensed 850 caps (mincho 700 in Japanese):
the **promotion stamp** (新入幕 / New) beside a name, the **優勝 seal** in the star chart line and,
larger, beside the champion headline, where it is pressed once like a hanko (`stampPress`: down
a touch large and askew, a slight give, square; a plain fade under reduced motion). **Kadoban** is the one outlined stamp: ink type in an inset
1.5px ink frame, since the printed banzuke carries no such flag. The status badge in the deck is
an ink block (outlined for "upcoming").

### Dialogs

The wrestler and stable dialogs are files on the sheet, not cards. The dialog opens on the sheet's
5px ink rule with a 1px ink frame, square, with the Dialog shadow (it floats); the backdrop is a flat
55% ink scrim, never blurred. A phone gets an edge-to-edge bottom sheet.

- **Toolbar**, pinned at the top while the file scrolls: the joined ‹ › stepper (two 41px cells in a
  1.5px ink frame, a disabled step's chevron greyed to column rule) on the left, a 44px square ✕ on
  the right.
- **Head:** a 3:4 portrait in a column-rule frame (120px, 96px on a phone; with no photo, the ring
  name set vertically in pencil mincho) beside the rank line (rank kanji: ink, `--accent` for
  sanyaku, a solid `--band` block for the Yokozuna; the 東/西 seal; rank and side in condensed caps),
  the name in condensed 850 at clamp(2rem, 8.5vw, 2.9rem) (mincho 700 in Japanese), the other-script
  name, stable › · home, and a promotion stamp or the outlined kadoban stamp.
- **Section bars:** `--bar` ground, condensed 900 caps, with the mincho kanji beside it in English
  (星取 RECORD, 名鑑 PROFILE, 昇進 CAREER, 四股名 RING NAME), pinned under the toolbar. The Record bar
  carries the score at the right, with the state in caps or the 優勝 stamp.
- **星取表 plate:** fifteen cells in three column-rule-framed groups of five, the mincho mark over
  the day number, sized with `cqi`. Under it, what he still needs sits under the highlighter.
- **Bouts and facts:** hairline rows. Bouts: day, mark, opponent in condensed 700 (mincho in
  Japanese), kimarite in pencil. The profile is an agate table, a caps label column beside the
  value.
- **Career:** stops along a 2px ink rule, as hollow ink squares; the stop for the rank he holds now
  is stamped `--band`.
- **Highlighter:** the champion's name, or while a basho is open what he still needs: one per
  dialog.
- **Stable dialog:** the same frame, toolbar and bar, then the members as the List's cells on a
  ladder stepped under the stable's own name (`--text-3xl` down to `--text-lg`).
- **Actions:** square 1.5px-ink controls in condensed caps after a 3px ink rule.

### Scroll to Top

A 44px ink square, fixed bottom right, with the float shadow; fades in past the fold.

## Do's and Don'ts

### Do:

- **Do** keep red for rank, rises and stamps, indigo for section bars and falls, black for
  selection, yellow for the highlighter (The Two Plates Rule).
- **Do** fill with `--band` / `--on-band` and write with `--accent`.
- **Do** set names in Sofia Sans Condensed at ladder sizes and Japanese names and rank kanji in
  Noto Serif JP 700.
- **Do** draw controls square: 1.5px ink border, sheet face, ink fill when selected.
- **Do** draw the highlighter with a background plus two hard `box-shadow` edges, so highlighting
  never changes layout.
- **Do** keep every control ≥44px tall on a phone and every label ≥12px.
- **Do** keep the List free of sideways scroll from 360px; shrink marks with `cqi` before
  letting anything overflow.

### Don't:

- **Don't** round a corner, add a gradient, or cast a shadow from anything in the page flow.
- **Don't** highlight two things on one screen.
- **Don't** use cream, gold, or a decorative seal; a red stamp always states a fact (優勝,
  promotion, the wordmark's 番付).
- **Don't** tell rank, or a rise or a fall, by hue alone: ▲▼, ○● and type size say it first.
- **Don't** add a fifth keyframe effect (four budgeted, all in use: `fadeIn`, `riseIn`,
  `modalSlideUp`, `stampPress`) or anything that loops.
- **Don't** draw Rising Sun rays or other decorative Japanese motifs.
