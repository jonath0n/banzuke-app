# Day 4 — Teaching Layer: Rot Sweep, Keyboard and Pairs, Guide, Shikona Glossary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> On approval this file is copied to `docs/superpowers/plans/2026-09-07-teaching-layer.md` and committed on the first working branch (plan mode only permits writing here).

**Goal:** Make the banzuke understandable to someone who has never read one, and make the sheet a proper instrument to move around: a guide that marks the real sheet with numbered notes and explains each in both languages; a hand-curated glossary of the kanji in every ring name, shown in the wrestler dialog; arrow keys across the Sheet and the List with the East/West partner lit; previous/next in the dialog; and a sweep of the rot the Day 3 review found — with the deploy pipeline never put at risk by any of it.

**Architecture:** Four sequential branches, each its own PR, in priority order. **Part A** (rot sweep) touches strings, CSS, the manifest, the language bootstrap, the workflow, and adds the two missing tests. **Part B** (keyboard + pairs) adds `data-id`/`data-pair`/`data-side` to every wrestler button, one pure `keyTarget()` function that maps arrow keys to the next button in either layout, a `litPair` state on the Sheet, and a canonical-order previous/next in the dialog that replaces (never pushes) the URL entry. **Part C** (guide) adds a pure `buildGuide()` that decides which columns carry which numbered mark for the rows on screen, renders the marks as CSS circles (no new glyphs) placed in the column grid, and a bilingual `Guide` legend beneath the paper; `?guide=1` is a shareable link and the guide is a Sheet-only affair. **Part D** (glossary) adds `src/data/shikona-glossary.ts` (125 characters across the archive, plus compounds and stable notes), an `explainShikona()` segmenter, a "Name" section in the dialog, a `glossary-gaps` script that warns in the deploy log, and a test that is deliberately **not** tied to live data.

**Tech Stack:** React 19 + TypeScript, Vite 7, CSS Modules, Vitest + Testing Library; Node 22 scripts via `tsx`; GitHub Actions. No new dependencies.

**Spec:** The "Context" and "Design" sections below, agreed in chat 2026-09-07 (brainstorm: each Day 4 item weighed; verdicts recorded here). The guide's entry point is the **link**, as recommended.

## Global Constraints

- Prettier: no semicolons, single quotes, 100 columns (also `.css`). ESLint zero warnings. `npm run validate && npm run test:run && npm run build` green before every commit (`validate` includes `check:css`, which fails on any CSS Module class no component references).
- No runtime dependencies beyond React. No new devDependencies.
- Palette is six values plus `--gold`; **this plan adds no colour.** Guide marks are ink on paper; the lit partner uses the existing hover ink wash `rgb(var(--ink-rgb) / 0.06)`.
- Motion budget four keyframes; **this plan removes one duplicate and adds none.** After Part A: `fadeIn` (base.css), `riseIn`, `backdropIn`, `modalSlideUp`. A test enforces the count.
- Data flow: components consume the normalized model only; the glossary is static source data keyed by kanji, not parsed from upstream.
- The deploy job runs `npm run test:run` after the bot's data commit and before build. **No test may read `public/latest-banzuke.json`, `public/banzuke/*` or `public/results/*` for glossary coverage** — a new wrestler's kanji must never redden a deploy. Tests use `src/test/fixtures.ts`.
- Accessibility: real `<button>`s and `<a>`s; guide marks are `aria-hidden` and the legend is the real content; accessible names of wrestler buttons are unchanged by the guide; `lang` on every Japanese run; the dialog's step buttons are named with the neighbour's name; roving arrow keys never trap Tab.
- The Sheet never scrolls sideways and its band heights (`--rank-band`, `--origin-band`) are not changed by this plan: guide marks overlap grid cells, they do not add flow content.
- Never type U+F900–FAFF literals; use `\u{…}` escapes.
- New Japanese literals in `src/` trip `scripts/lib/font-coverage.test.ts`; the task that adds them runs `npm run subset-fonts` and commits `public/assets/fonts/NotoSerifJP-700-subset.woff2` + `NotoSerifJP-subset.json`.
- Commits end with:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg
  ```
- Branches, in order, each merged before the next starts (they all touch `App.tsx` and `strings.ts`): `chore/day4-rot-sweep` (Part A), `feat/keyboard-pairs` (Part B), `feat/guide` (Part C), `feat/shikona-glossary` (Part D).

---

## Context — the Day 4 brainstorm (2026-09-07)

The app has its past (Changes) and its present (Results). Day 4 is the teaching layer. Each item from the roadmap was weighed against the code; the verdicts:

- **Rot sweep.** *Flex note:* the CSS is right (`flex: 0 0 auto` + `min-width`, with a comment explaining the packed sheet); CLAUDE.md's "columns take up the slack" is the stale half → fix the doc. *Untranslated UI:* Hero `<h1>` → `strings.appTitle`; ScrollToTop → a string; the Japanese "since" label gets the era year when it differs from the current one. **Dropped:** the "Senshuraku · Day 15" item — senshuraku is always day 15 and the English is a gloss. *Manifest:* `theme_color` → paper `#f3ede2`; `lang: en` stays (a static manifest cannot switch). *`fadeIn` twice:* CSS Modules scope keyframes per file, so move one declaration to `base.css` and reference it with `global()`. *`navigator.language`:* between stored preference and default. *Modal jump:* the profiles file is 45 KB → prefetch on the first pointer/focus over the panel; and show a fixed-height `aria-busy` placeholder only while the file is genuinely in flight. *Workflow `[ -f … ] &&`:* lines 115 and 146 → `if … fi`. Two test gaps carried from Day 3 ride along.
- **Guide (E9).** Marks positioned in the column grid, never in band flow. Columns chosen by rule (highest rank present; first and last Maegashira), not by name. Entry point is a **link** near the paper that sets `?guide=1`, Sheet view only. Marks are CSS circles with digits, so no new glyphs are needed for them. No item about the 新 pill: the Sheet carries no promotion pill (that is the List's), and the printed banzuke marks no newcomers.
- **Glossary (D5).** 109 distinct characters on the current sheet, 125 across the archive, 72 appear in exactly one name. Gloss the archive's 125. Meanings in English; per-character readings dropped (the whole-name hiragana is already shown). Notes carry the value (stable marks: 琴, 朝, 栃, 千代, 欧, 玉). A live-data coverage test would break deploys → fixture-based test + `::warning::` gaps script. Dialog shows the section in English UI only. **Review checkpoint** on the table before it ships.
- **Keyboard (E2/E3) + pairs (E1)** merged into one PR. Spatial semantics: Sheet ← → walk the rank ladder within a half (← = lower rank, because each half is `direction: rtl`), ↑ ↓ jump to the partner; List ↑ ↓ walk ranks, ← → switch partner; Home/End first/last of the side. Dialog previous/next follows canonical order (`banzuke.rikishi` order: E, W per pair), replaces the URL entry, updates the focus-return target.

---

## Design

### Part A — the rot sweep

| Item | Change |
|---|---|
| CLAUDE.md:92–93 | "Columns are packed, not spread (`flex: 0 0 auto` with a `min-width` floor of 1.5rem for the 24px target size): a column is as wide as its characters, which is what makes the sheet read as one dense block." |
| Hero `<h1>` | `{strings.appTitle}` with `lang={langAttr(language)}`; EN stays "Grand Sumo Banzuke", JP becomes 大相撲 番付表. |
| ScrollToTop | `aria-label={strings.scrollToTop}` — new key `scrollToTop: 'Scroll to top'` / `'ページの先頭へ'`. |
| JP since-label | `jpBashoName(month)` → `${year !== banzuke.basho.year ? jpEraYear(year) : ''}${jpBashoName(month)}` so November→January reads 令和七年十一月場所. |
| `manifest.webmanifest` | `"theme_color": "#f3ede2"`. |
| `fadeIn` | Declared once in `src/styles/base.css`; `Hero.module.css` and `BanzukeGrid.module.css` use `animation: global(fadeIn) …`. New test `src/styles/motion.test.ts`: exactly four `@keyframes` across `src/**/*.css`, unique names, none `infinite`. |
| `getInitialLanguage` | After the stored preference: `navigator.languages`/`navigator.language` starting with `ja` → `'jp'`. |
| Profiles | `useProfiles.ts` gains `useProfileState(id): { loading: boolean; profile }` (`useProfile` becomes a wrapper). `App.tsx` calls `loadProfiles()` on the panel's first `pointerenter`/`focusin`. `WrestlerModal` renders `<div className={styles.profilePending} aria-busy="true" />` (fixed `min-height: 7.5rem`) while `loading`. |
| deploy.yml | `if [ -f … ]; then …; fi` at both spots. |
| Tests | SideCell: champion is spoken. Hoshitori row: champion shows 優勝 and no state label. |

### Part B — keyboard and pairs

Every wrestler button carries `data-id`, `data-side`, `data-pair` (the `RankGroup.key`, `rankCode-rankNumber-seat`). One pure function:

```ts
// src/utils/rovingFocus.ts
export type Layout = 'sheet' | 'list'
export function keyTarget(root: HTMLElement, current: HTMLElement, key: string, layout: Layout): HTMLElement | null
```

| Key | Sheet | List |
|---|---|---|
| ArrowRight | previous in side (higher rank) | partner (from West) |
| ArrowLeft | next in side (lower rank) | partner (from East) |
| ArrowUp / ArrowDown | partner | previous / next in side |
| Home / End | first / last of the side | first / last of the side |

"Side sequence" = `root.querySelectorAll('button[data-side="<side>"][data-pair]')` in DOM order, which is rank order in both layouts. Partner = `button[data-pair="<key>"][data-side="<other>"]`; null when vacant. Handled keys call `preventDefault()` and `focus()`. Tab is untouched.

Pair affinity (Sheet only — a List row is already one visual unit): `BanzukeSheet` holds `litPair: string | null`, set from `pointerover`/`focusin` on the paper via `closest('[data-pair]')` and cleared on `pointerleave`/`focusout`. `Column` (now `memo`) gets `lit: boolean` → `data-lit` on the **partner** only. CSS: `.column[data-lit] { background: rgb(var(--ink-rgb) / 0.06) }`.

Dialog: `WrestlerModal` gets `neighbours?: { previous: Rikishi | null; next: Rikishi | null }` and `onStep?: (rikishi: Rikishi) => void`. Two buttons ‹ › in the details head, named `strings.previousWrestler(name)` / `nextWrestler(name)`; ArrowLeft/ArrowRight on the dialog do the same. `App` computes neighbours from the selected wrestler's own division rows and steps with `setUrlParam('rikishi', id, 'replace')` — the pushed entry's `history.state.urlParam` survives a replace, so Close still undoes one entry. On close, focus goes to `button[data-id="<current>"]` if present, else the original opener.

### Part C — the guide

```ts
// src/utils/guide.ts
export type GuideZone = 'sideMark' | 'top' | 'rank' | 'numeral' | 'origin' | 'name' | 'movement' | 'record'
export type GuideKey = 'size' | 'east' | 'tier' | 'numeral' | 'origin' | 'name' | 'gold' | 'changes' | 'results'
export interface GuideMark { n: number; key: GuideKey; zone: GuideZone; rikishiId: number | null /* null = the East side mark */ }
export interface Guide { marks: GuideMark[]; items: GuideKey[] /* in mark order */ }
export function buildGuide(rows: Rikishi[], overlays: { movements: boolean; records: boolean }): Guide
```

Rules (marks numbered 1… in this order, skipping absent features):
1. `size` → `name` zone of the first row (highest rank, East if present).
2. `east` → the East side mark (`rikishiId: null`); present when any East wrestler exists.
3. `tier` → `rank` zone of the **last** Maegashira/Juryo (highest number) on the East side, else the last row.
4. `numeral` → `numeral` zone of that same column; present only when that column has a numeral (rankCode ≥ 500).
5. `origin` → `origin` zone of that column.
6. `name` → `name` zone of the **first** Maegashira (number 1) on the East side, else that same last column. (Two ends of the ladder: item 1 on the top, item 6 on M1 — and the legend text for 6 explains the shikona itself.)
7. `gold` → `top` zone of the first row when it is a Yokozuna.
8. `changes` → `movement` zone of the first row that has a movement, when `overlays.movements`.
9. `results` → `record` zone of the first row that has a record, when `overlays.records`.

`BanzukeSheet` gets `guide?: Guide | null`; `Column` gets `marks?: Partial<Record<GuideZone, number>>` and renders each as `<span className={styles.mark} data-zone={zone} aria-hidden="true">{n}</span>`, placed with `grid-row` (1 for `top`/`rank`/`numeral`, 2 for `origin`, 3 for `name`/`movement`/`record`) and `align-self` (`top`, `rank`, `name` → start; `numeral`, `movement`, `record` → end) and `justify-self: start` (`top` → end, over the gold rule). Mark: 1rem circle, hairline ink border, paper fill, `--font-names` 700 at 0.6rem, `pointer-events: none`, `z-index: 1`. The East half's `.sideMark` gets its mark inline after 東.

`Guide` component under the paper (before Departed/Bouts): `<section aria-labelledby>` with `<h2>` title, an intro paragraph, `<ol>` of items (each: the same circle mark + the text), and a Close link. `GuideLink` in the controls row: `<a href="?guide=1">How to read a banzuke</a>` (href built from the current URL with the param set/removed; click is intercepted to set the param without reload); reads "Hide the guide" when on. Both Sheet-only: `guideOn = guideParam === '1' && view === 'sheet' && !nothingToShow`.

Strings (EN / JP), keyed `guideTitle`, `guideOpen`, `guideClose`, `guideIntro`, and `guideItem: Record<GuideKey, string>` — full text in Task C2.

### Part D — the shikona glossary

```ts
// src/data/shikona-glossary.ts
export interface Gloss { en: string; note?: string }
export const GLOSSARY: Record<string, Gloss>        // one kanji (or の/ノ) per key
export const COMPOUNDS: Record<string, Gloss>       // two-character units read as one: 富士, 千代 …
export interface NameSegment { text: string; gloss: Gloss | null }
export function explainShikona(jp: string): NameSegment[]   // greedy: compound at position, else one char
export function glossaryGaps(names: Iterable<string>): string[]  // characters with no entry, sorted
```

Dialog: `NameSection` under `SecondaryName`, English UI only, when `rikishi.shikona.jp` differs from `shikona.en` and at least one segment has a gloss: a row of segments, each the text in mincho (`lang="ja"`) over its meaning; a `note` appears as a `title` and as a small line beneath when present on the first segment that has one. `scripts/glossary-gaps.ts` reads the snapshot + archive, prints `::warning::Shikona glossary lacks: 龘 (Name)` lines, exits 0; the deploy job runs it (`continue-on-error`) right after the archive step. Test: every entry has a non-empty `en`; every kanji in the fixture names (`src/test/fixtures.ts` NAMES + the `makeBanzuke` rows) has a gloss; `explainShikona('大の里')` and `('熱海富士')` segment as expected.

### Out of scope (deliberately)

Guide on the List; glossary in Japanese UI; per-character readings; a glossary UI beyond the dialog; extracting a shared toggle component (no third seal was added); List-side pair affinity; Day 5 items (sheet furniture, print, career line, results pruning).

---

## File structure

**Part A**
| Path | Responsibility |
|---|---|
| `CLAUDE.md` | flex note |
| `src/i18n/strings.ts` | `scrollToTop` |
| `src/components/Hero/Hero.tsx` (+test) | `<h1>` from strings |
| `src/components/ScrollToTop/ScrollToTop.tsx` | label from strings |
| `src/App.tsx` (+test) | JP since-label with era year; profiles prefetch |
| `public/manifest.webmanifest` | theme colour |
| `src/styles/base.css`, `Hero.module.css`, `BanzukeGrid.module.css` | one `fadeIn` |
| `src/styles/motion.test.ts` | the four-keyframe budget |
| `src/contexts/LanguageContext.tsx` (+test) | `navigator.language` |
| `src/hooks/useProfiles.ts` (+test) | `useProfileState` |
| `src/components/WrestlerModal/WrestlerModal.tsx` (+css) | pending placeholder |
| `.github/workflows/deploy.yml` | `if … fi` |
| `SideCell.test.tsx`, `Hoshitori.test.tsx` | the two gaps |

**Part B**
| Path | Responsibility |
|---|---|
| `src/utils/rovingFocus.ts` (+test) | `keyTarget` |
| `BanzukeSheet.tsx` (+css, +test) | data attrs, key handler, lit pair, memo Column |
| `SideCell.tsx`, `RankRow.tsx`, `BanzukeGrid.tsx` (+test) | data attrs, key handler |
| `WrestlerModal.tsx` (+css, +test) | previous/next, arrows, focus return |
| `src/App.tsx` (+test) | neighbours, step |
| `src/i18n/strings.ts`, `ShortcutsHelp.tsx` | `previousWrestler`, `nextWrestler`, `shortcutArrows` |

**Part C**
| Path | Responsibility |
|---|---|
| `src/utils/guide.ts` (+test) | `buildGuide` |
| `src/i18n/strings.ts` | guide strings |
| `BanzukeSheet.tsx` (+css, +test) | marks |
| `src/components/Guide/Guide.tsx`, `.module.css`, `.test.tsx` | legend + link |
| `src/App.tsx` (+test) | `?guide` |
| fonts manifest + woff2 | regenerated |
| `README.md`, `CLAUDE.md` | docs |

**Part D**
| Path | Responsibility |
|---|---|
| `src/data/shikona-glossary.ts` (+test) | the table, `explainShikona`, `glossaryGaps` |
| `scripts/glossary-gaps.ts` | warnings in the deploy log |
| `tsconfig.scripts.json`, `package.json`, `deploy.yml` | script wiring |
| `WrestlerModal.tsx` (+css, +test) | `NameSection` |
| `src/i18n/strings.ts` | `nameMeaning` |
| `README.md`, `CLAUDE.md` | docs |

---

# Part A — rot sweep (branch `chore/day4-rot-sweep`)

### Task A0: Branch and plan

- [ ] `git checkout main && git pull --ff-only && git checkout -b chore/day4-rot-sweep`
- [ ] Baseline `npm run validate && npm run test:run && npm run build` green (stop and report if not).
- [ ] Copy this plan to `docs/superpowers/plans/2026-09-07-teaching-layer.md`; commit it alone: `docs: Day 4 teaching-layer implementation plan`.

---

### Task A1: Strings and docs — h1, scroll label, JP since-label, CLAUDE.md, manifest

**Files:** `CLAUDE.md:92-93`, `src/i18n/strings.ts`, `src/components/Hero/Hero.tsx:83`, `src/components/Hero/Hero.test.tsx`, `src/components/ScrollToTop/ScrollToTop.tsx:29`, `src/App.tsx:147-155`, `src/App.test.tsx`, `public/manifest.webmanifest`.

- [ ] **Step 1: Failing tests.** Append to `src/components/Hero/Hero.test.tsx` (read its render helper first; it renders `<Hero data={…}/>` inside `LanguageProvider` and sets `?lang=` via `window.history.replaceState`):

```tsx
  it('titles the page in Japanese when the UI is Japanese', () => {
    window.history.replaceState({}, '', '/?lang=jp')
    renderHero()
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('大相撲 番付表')
    expect(heading).toHaveAttribute('lang', 'ja')
  })
```
(If the file's helper is named differently, use its name; do not add a second helper.) Append to `src/App.test.tsx`:

```tsx
  it('names the previous tournament with its year in Japanese when the year differs', async () => {
    window.history.replaceState(null, '', '/?lang=jp')
    vi.stubGlobal(
      'fetch',
      vi.fn((url: RequestInfo | URL) =>
        Promise.resolve(
          String(url).includes('banzuke/index.json')
            ? jsonResponse(
                makeArchiveIndex({
                  tournaments: [
                    { id: 632, year: 2025, month: 11, file: '632.json' },
                    { id: 637, year: 2026, month: 9, file: '637.json' },
                  ],
                })
              )
            : jsonResponse(makeRawSnapshot())
        )
      )
    )
    render(<App />)
    const toggle = await screen.findByRole('button', { name: /変動/ })
    expect(toggle).toHaveAttribute('title', '令和七年十一月場所からの変動')
  })
```
Read `makeArchiveIndex` in `src/test/fixtures.ts` first and match its entry shape exactly (field names for id/year/month/file); adjust the object literal, not the assertion.

- [ ] **Step 2:** `npx vitest run src/components/Hero src/App.test.tsx` → the two new tests FAIL.
- [ ] **Step 3: Implement.**
  - `strings.ts` en: after `skipLink` add `scrollToTop: 'Scroll to top',`; jp: `scrollToTop: 'ページの先頭へ',`.
  - `Hero.tsx:83`: `<h1 lang={langAttr(language)}>{strings.appTitle}</h1>` (`langAttr` and `strings` are already in scope).
  - `ScrollToTop.tsx`: `import { useStrings } from '../../i18n/useStrings'`; `const strings = useStrings()`; `aria-label={strings.scrollToTop}`.
  - `App.tsx:147-155`: import `jpEraYear` beside `jpBashoName`; replace the JP branch with
    ```ts
    ? `${prevEntry.year !== banzuke.basho.year ? jpEraYear(prevEntry.year) : ''}${jpBashoName(prevEntry.month)}`
    ```
    (`banzuke` is non-null inside the `prevEntry ?` branch because `prevEntry` derives from it; if TypeScript disagrees, use `banzuke?.basho.year`.)
  - `CLAUDE.md:92-93`: replace "Columns take up the slack in their band (`flex: 1 1 auto` with a `max-width` cap) so they distribute across the sheet instead of packing to one edge." with "Columns are packed, not spread (`flex: 0 0 auto` with a `min-width` floor of 1.5rem, the 24px target size): a column is as wide as its characters, which is what makes the sheet read as one dense block."
  - `public/manifest.webmanifest`: `"theme_color": "#f3ede2"`.
- [ ] **Step 4:** tests PASS; `npm run validate`. Font coverage: ページの先頭へ uses kana + 先頭 — run `npx vitest run scripts/lib/font-coverage.test.ts`; if it fails, `npm run subset-fonts` and commit the two font files too.
- [ ] **Step 5:** Commit `chore: translate the title and scroll label, year the JP since-label, fix the flex note and manifest colour`.

---

### Task A2: One `fadeIn`, and a test for the motion budget

**Files:** `src/styles/base.css`, `src/components/Hero/Hero.module.css:1-14`, `src/components/BanzukeGrid/BanzukeGrid.module.css:1-21`, create `src/styles/motion.test.ts`.

- [ ] **Step 1: Failing test** — `src/styles/motion.test.ts`:

```ts
/**
 * The motion budget: four keyframe effects in the whole app, none infinite.
 * This is a printed document; adding an effect means removing one.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..')

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return name.endsWith('.css') ? [path] : []
  })
}

describe('motion budget', () => {
  const sources = cssFiles(root).map((path) => ({ path, css: readFileSync(path, 'utf8') }))
  const names = sources.flatMap(({ css }) =>
    [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1])
  )

  it('declares exactly four keyframe effects, each once', () => {
    expect([...names].sort()).toEqual(['backdropIn', 'fadeIn', 'modalSlideUp', 'riseIn'])
  })

  it('never loops', () => {
    for (const { path, css } of sources) {
      expect(css, path).not.toMatch(/animation[^;]*\binfinite\b/)
    }
  })
})
```
- [ ] **Step 2:** `npx vitest run src/styles/motion.test.ts` → FAIL (`fadeIn` twice).
- [ ] **Step 3: Implement.** In `src/styles/base.css`, after the `@font-face` blocks and before `:root`, add:

```css
/* The one fade, shared by the header and the list's arrival. CSS Modules scope
   keyframes per file, so the single declaration lives here and modules refer to
   it as global(fadeIn). Four effects in all: fadeIn, riseIn, backdropIn, modalSlideUp. */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```
Delete the `@keyframes fadeIn {…}` block at the top of `Hero.module.css` and `BanzukeGrid.module.css`. Change `Hero.module.css:14` to `animation: global(fadeIn) var(--dur-slow) var(--ease-out-expo);` and `BanzukeGrid.module.css:21` to `animation: global(fadeIn) var(--dur-base) ease;`. Update the head comment of `base.css` if it lists what the file holds ("shared keyframes" is already there).
- [ ] **Step 4:** test PASS. `npm run build` then verify the built CSS keeps the reference un-hashed and defined once: `grep -o "fadeIn[A-Za-z0-9_-]*" dist/assets/*.css | sort | uniq -c` → only `fadeIn` (no hashed variant), `@keyframes fadeIn` once. If Vite emitted a hashed name instead, switch the two rules to `animation-name: global(fadeIn)` on their own line and re-check. `npm run dev` and confirm the Hero still fades in on load.
- [ ] **Step 5:** Commit `style: one fadeIn keyframe, declared in base.css; a test holds the budget at four`.

---

### Task A3: `navigator.language`

**Files:** `src/contexts/LanguageContext.tsx:27-45`, `src/contexts/LanguageContext.test.tsx`.

- [ ] **Step 1: Failing tests** — read the existing test file's setup (it clears `localStorage` and resets the URL); append:

```tsx
  it('follows the browser language when nothing is stored and the URL says nothing', () => {
    vi.stubGlobal('navigator', { ...navigator, language: 'ja-JP', languages: ['ja-JP', 'en'] })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )
    expect(screen.getByTestId('lang')).toHaveTextContent('jp')
    vi.unstubAllGlobals()
  })

  it('lets a stored preference beat the browser language', () => {
    localStorage.setItem('banzuke-language', 'en')
    vi.stubGlobal('navigator', { ...navigator, language: 'ja', languages: ['ja'] })
    render(
      <LanguageProvider>
        <Probe />
      </LanguageProvider>
    )
    expect(screen.getByTestId('lang')).toHaveTextContent('en')
    vi.unstubAllGlobals()
  })
```
If the file has no probe component, add at its top:
```tsx
function Probe() {
  const { language } = useLanguage()
  return <span data-testid="lang">{language}</span>
}
```
- [ ] **Step 2:** FAIL (first test reads `en`).
- [ ] **Step 3: Implement** — in `getInitialLanguage`, after the `try { … localStorage … }` block and before `return DEFAULT_LANGUAGE`:

```ts
  // Then the browser: a Japanese visitor should not have to find the toggle.
  const preferred = navigator.languages?.[0] ?? navigator.language ?? ''
  if (/^ja\b/i.test(preferred)) return 'jp'
```
- [ ] **Step 4:** PASS; run the whole suite — other tests assume English by default under jsdom's `en-US`, which still holds. Commit `feat: default to Japanese for Japanese browsers`.

---

### Task A4: Profiles — prefetch on first intent, honest pending state

**Files:** `src/hooks/useProfiles.ts`, `src/hooks/useProfiles.test.tsx`, `src/App.tsx`, `src/components/WrestlerModal/WrestlerModal.tsx`, `WrestlerModal.module.css`, `WrestlerModal.test.tsx`.

**Interfaces — Produces:** `useProfileState(id: number | null): { loading: boolean; profile: RikishiProfile | null }` — `loading` is true from the first render with an id until the shared file promise settles (even to `{}`); `useProfile(id)` returns `useProfileState(id).profile` (unchanged behaviour).

- [ ] **Step 1: Failing tests.** Append to `useProfiles.test.tsx`:

```tsx
  it('reports loading until the file settles, then not, even when the wrestler is unknown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(file)))
    const { result } = renderHook(() => useProfileState(1))
    expect(result.current).toEqual({ loading: true, profile: null })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toBeNull()
  })
```
(add `useProfileState` to the import). Append to `WrestlerModal.test.tsx`:

```tsx
  it('holds the profile space while the file loads, then fills it', async () => {
    let resolveFetch: (value: Response) => void = () => undefined
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        })
      )
    )
    renderModal()
    expect(screen.getByRole('dialog').querySelector('[aria-busy="true"]')).not.toBeNull()
    resolveFetch({ ok: true, status: 200, json: () => Promise.resolve(profilesFile) } as Response)
    await screen.findByText('190 cm')
    expect(screen.getByRole('dialog').querySelector('[aria-busy="true"]')).toBeNull()
  })
```
(`'190 cm'` is Onosato's height in `onosatoProfile`; confirm the rendered text by reading `formatMeasure` in `src/utils/profile.ts` and adjust the literal if it prints differently.)

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implement.** `useProfiles.ts`: replace `useProfile` with

```ts
export interface ProfileState {
  /** True until the shared file has settled (even to an empty map). */
  loading: boolean
  profile: RikishiProfile | null
}

/** The profile for a wrestler, and whether the file is still on its way. */
export function useProfileState(id: number | null): ProfileState {
  const [profiles, setProfiles] = useState<ProfileMap | null>(null)

  useEffect(() => {
    if (id == null) return
    let cancelled = false
    loadProfiles().then((map) => {
      if (!cancelled) setProfiles(map)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (id == null) return { loading: false, profile: null }
  if (!profiles) return { loading: true, profile: null }
  return { loading: false, profile: profiles[String(id)] ?? null }
}

/** The profile alone; null until loaded or when unknown. */
export function useProfile(id: number | null): RikishiProfile | null {
  return useProfileState(id).profile
}
```
`WrestlerModal.tsx`: `const { loading: profileLoading, profile } = useProfileState(rikishi?.id ?? null)` (import `useProfileState` instead of `useProfile`); replace `{profile && <ProfileRows profile={profile} />}` with
```tsx
            {profileLoading && <div className={styles.profilePending} aria-busy="true" />}
            {profile && <ProfileRows profile={profile} />}
```
CSS, after `.profile`:
```css
/* Space held for the profile while the file is on its way, so the dialog does
   not jump when it lands. Roughly the height of the facts grid. */
.profilePending {
  min-height: 7.5rem;
  margin-top: var(--space-3);
  border-top: 1px solid var(--border);
}
```
`App.tsx`: `import { loadProfiles } from './hooks/useProfiles'`; add
```ts
  // Warm the profiles file on the first sign of interest in a wrestler, so the
  // dialog almost always opens with the profile already there.
  const prefetchProfiles = useCallback(() => {
    void loadProfiles()
  }, [])
```
and on the panel `<div id={PANEL_ID} …>` add `onPointerEnter={prefetchProfiles} onFocus={prefetchProfiles}` (React's `onFocus` bubbles from the buttons). ESLint's jsx-a11y may flag mouse handlers without key handlers on a non-interactive div: `onFocus` satisfies `mouse-events-have-key-events`; if `no-static-element-interactions` fires, the div already has `role="tabpanel"` when tabs show — if it still fires, add an eslint-disable comment naming the rule with the reason "prefetch only; not an interaction".
- [ ] **Step 4:** PASS; `check:css` clean; commit `feat: prefetch profiles on first intent; hold the dialog's profile space while loading`.

---

### Task A5: Workflow `if … fi`, and the two test gaps

**Files:** `.github/workflows/deploy.yml:115,146`, `src/components/SideCell/SideCell.test.tsx`, `src/components/Hoshitori/Hoshitori.test.tsx`.

- [ ] **Step 1:** `deploy.yml:115` → `if [ -f public/rikishi-profiles.json ]; then cp public/rikishi-profiles.json .data/rikishi-profiles.json; fi`; `:146` → `if [ -f public/rikishi-profiles.json ]; then git add public/rikishi-profiles.json; fi`. Also `:139` (`… && cp … || true`) → `if [ -f .data/rikishi-profiles.json ]; then cp .data/rikishi-profiles.json public/rikishi-profiles.json; fi`.
- [ ] **Step 2: Tests** (these should pass on first run — they close gaps, not bugs; if one fails, that is a finding to report, not to paper over). Append to `SideCell.test.tsx`:

```tsx
  it('speaks the record and the championship in its accessible name', () => {
    render(
      <LanguageProvider>
        <SideCell
          rikishi={rikishi}
          side="east"
          rankLevel="yokozuna"
          onSelect={vi.fn()}
          record={makeRecord()}
          champion
        />
      </LanguageProvider>
    )
    expect(screen.getByRole('button')).toHaveAccessibleName(
      /8 wins, 3 losses, 1 absence\. Kachi-koshi\. Yusho\./
    )
  })
```
Append to `Hoshitori.test.tsx`:
```tsx
  it('on a row names the champion instead of the state', () => {
    const el = wrap(<Hoshitori record={makeRecord()} variant="row" champion />).firstElementChild!
    expect(el).toHaveTextContent('優勝')
    expect(el).not.toHaveTextContent('Kachi-koshi')
  })
```
- [ ] **Step 3:** PASS; commit `ci: bash -e safe file checks; tests: champion is spoken on the list and shown on the row`.

---

### Task A6: PR A

- [ ] Full gate; `git push -u origin chore/day4-rot-sweep`; `gh pr create` titled "Day 4 rot sweep: translations, one fadeIn, browser language, profile prefetch, workflow guards"; body lists the eight items and ends with the Claude Code line + session URL; `gh pr checks --watch`. Merge is the user's call.

---

# Part B — keyboard and pairs (branch `feat/keyboard-pairs`)

### Task B0: Branch
- [ ] `git checkout main && git pull --ff-only && git checkout -b feat/keyboard-pairs`; baseline gate green.

---

### Task B1: `keyTarget` — arrow keys to the next wrestler in either layout

**Files:** create `src/utils/rovingFocus.ts`, `src/utils/rovingFocus.test.ts`.

**Produces:** `export type Layout = 'sheet' | 'list'`; `export function keyTarget(root: HTMLElement, current: HTMLElement, key: string, layout: Layout): HTMLElement | null`. `current` must carry `data-side` and `data-pair`; returns null for unhandled keys, for a missing partner, and at the ends.

- [ ] **Step 1: Failing test:**

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { keyTarget } from './rovingFocus'

function build(pairs: Array<[string, boolean, boolean]>): HTMLElement {
  // Sheet-like DOM: all East buttons, then all West buttons (two halves).
  const root = document.createElement('div')
  for (const side of ['east', 'west'] as const) {
    for (const [pair, hasEast, hasWest] of pairs) {
      if ((side === 'east' && !hasEast) || (side === 'west' && !hasWest)) continue
      const b = document.createElement('button')
      b.dataset.side = side
      b.dataset.pair = pair
      b.dataset.id = `${pair}-${side}`
      b.textContent = b.dataset.id
      root.appendChild(b)
    }
  }
  return root
}

const root = build([
  ['100-1-1', true, true],
  ['200-1-1', true, false], // vacant West Ozeki
  ['500-1-1', true, true],
])
const at = (id: string) => root.querySelector<HTMLElement>(`[data-id="${id}"]`)!

describe('keyTarget on the sheet', () => {
  it('walks the rank ladder within a half: ← lower, → higher', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowLeft', 'sheet')).toBe(at('200-1-1-east'))
    expect(keyTarget(root, at('200-1-1-east'), 'ArrowRight', 'sheet')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowRight', 'sheet')).toBeNull()
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowLeft', 'sheet')).toBeNull()
  })
  it('jumps to the partner with ↑ ↓, or nowhere when the seat is vacant', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowDown', 'sheet')).toBe(at('100-1-1-west'))
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowUp', 'sheet')).toBe(at('500-1-1-east'))
    expect(keyTarget(root, at('200-1-1-east'), 'ArrowDown', 'sheet')).toBeNull()
  })
  it('Home and End go to the ends of the side', () => {
    expect(keyTarget(root, at('500-1-1-east'), 'Home', 'sheet')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-west'), 'End', 'sheet')).toBe(at('500-1-1-west'))
  })
  it('ignores other keys', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'Enter', 'sheet')).toBeNull()
  })
})

describe('keyTarget on the list', () => {
  it('walks ranks with ↑ ↓ and switches partner with ← →', () => {
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowDown', 'list')).toBe(at('200-1-1-east'))
    expect(keyTarget(root, at('500-1-1-west'), 'ArrowUp', 'list')).toBe(at('100-1-1-west'))
    // East sits on the right of a row: ← from East reaches West, → from West reaches East
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowLeft', 'list')).toBe(at('100-1-1-west'))
    expect(keyTarget(root, at('100-1-1-west'), 'ArrowRight', 'list')).toBe(at('100-1-1-east'))
    expect(keyTarget(root, at('100-1-1-east'), 'ArrowRight', 'list')).toBeNull()
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement:**

```ts
/**
 * Arrow-key travel between wrestler buttons. Every button carries data-side
 * ('east' | 'west') and data-pair (the rank position key, shared by the two
 * sides of one rank). DOM order within a side is banzuke order in both
 * layouts, so "next in side" is the next lower rank.
 *
 * The keys are spatial: on the Sheet, each half reads right to left, so →
 * climbs the ranks and ← descends; ↑ ↓ cross to the East/West partner. On
 * the List a row holds both sides, so ↑ ↓ walk the ranks and ← → cross to
 * the partner (East is on the right of a row).
 */
export type Layout = 'sheet' | 'list'

type Move = 'prev' | 'next' | 'partner' | 'first' | 'last'

const MOVES: Record<Layout, Record<string, Move | ((side: string) => Move | null)>> = {
  sheet: {
    ArrowRight: 'prev',
    ArrowLeft: 'next',
    ArrowUp: 'partner',
    ArrowDown: 'partner',
    Home: 'first',
    End: 'last',
  },
  list: {
    ArrowUp: 'prev',
    ArrowDown: 'next',
    ArrowLeft: (side) => (side === 'east' ? 'partner' : null),
    ArrowRight: (side) => (side === 'west' ? 'partner' : null),
    Home: 'first',
    End: 'last',
  },
}

export function keyTarget(
  root: HTMLElement,
  current: HTMLElement,
  key: string,
  layout: Layout
): HTMLElement | null {
  const side = current.dataset.side
  const pair = current.dataset.pair
  if (!side || !pair) return null
  const rule = MOVES[layout][key]
  const move = typeof rule === 'function' ? rule(side) : rule
  if (!move) return null

  if (move === 'partner') {
    const other = side === 'east' ? 'west' : 'east'
    return root.querySelector<HTMLElement>(`button[data-side="${other}"][data-pair="${pair}"]`)
  }

  const inSide = [...root.querySelectorAll<HTMLElement>(`button[data-side="${side}"][data-pair]`)]
  const index = inSide.indexOf(current)
  if (index === -1) return null
  if (move === 'first') return inSide[0] === current ? null : inSide[0]
  if (move === 'last') return inSide.at(-1) === current ? null : (inSide.at(-1) ?? null)
  return inSide[move === 'prev' ? index - 1 : index + 1] ?? null
}

/** Handles one keydown over a set of wrestler buttons: moves focus when a target exists. */
export function handleRovingKey(
  root: HTMLElement,
  event: { key: string; target: EventTarget | null; preventDefault(): void },
  layout: Layout
): void {
  const current = (event.target as HTMLElement | null)?.closest<HTMLElement>('button[data-pair]')
  if (!current) return
  const target = keyTarget(root, current, event.key, layout)
  if (target) {
    event.preventDefault()
    target.focus()
  }
}
```
Add a test for `handleRovingKey` too: it focuses the target and calls `preventDefault`, and does nothing when the event target is not a wrestler button.
- [ ] **Step 4:** PASS; commit `utils: keyTarget — arrow keys between wrestlers on the sheet and the list`.

---

### Task B2: Sheet — data attributes, arrow keys, the lit partner

**Files:** `src/components/BanzukeSheet/BanzukeSheet.tsx`, `BanzukeSheet.module.css`, `BanzukeSheet.test.tsx`.

- [ ] **Step 1: Failing tests** — append to `BanzukeSheet.test.tsx`:

```tsx
  it('moves focus with the arrow keys and lights the partner', async () => {
    const user = userEvent.setup()
    const { container } = renderSheet({ onSelectRikishi: vi.fn() })
    const onosato = screen.getByRole('button', { name: /Onosato/ })
    const hoshoryu = screen.getByRole('button', { name: /Hoshoryu/ })
    const atamifuji = screen.getByRole('button', { name: /Atamifuji/ })
    expect(onosato).toHaveAttribute('data-pair', '100-1-1')
    expect(onosato).toHaveAttribute('data-id', '1')

    onosato.focus()
    // Focus lights the partner across the halves, never the focused column itself
    expect(hoshoryu).toHaveAttribute('data-lit')
    expect(onosato).not.toHaveAttribute('data-lit')

    await user.keyboard('{ArrowLeft}')
    expect(atamifuji).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /Takayasu/ })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(hoshoryu).toHaveFocus()

    await user.hover(atamifuji)
    expect(screen.getByRole('button', { name: /Takayasu/ })).toHaveAttribute('data-lit')
    await user.unhover(atamifuji)
    expect(container.querySelectorAll('[data-lit]')).toHaveLength(1) // focus still on Hoshoryu → Onosato lit
  })
```
- [ ] **Step 2:** FAIL. **Step 3: Implement.**
  - Imports: `import { memo, useCallback, useState } from 'react'`; `import { handleRovingKey } from '../../utils/rovingFocus'`; `import type { RankGroup } from '../../types/banzuke'` is already there.
  - `Column` props gain `pairKey: string` and `lit: boolean`. On both the `<div>` and the `<button>` add `data-id={rikishi.id}`, `data-pair={pairKey}`, `data-side={rikishi.side}` (the div currently lacks `data-side`; add it), and `data-lit={lit || undefined}`. Wrap: `const Column = memo(function Column({…}) {…})`.
  - In `BanzukeSheet`: hover and focus are tracked **separately**, so a pointer leaving the paper never clears a keyboard user's light and vice versa; the pointer wins while it is over a column.
    ```tsx
    interface PairRef {
      pair: string
      side: string
    }
    const refOf = (target: EventTarget | null): PairRef | null => {
      const el = (target as HTMLElement | null)?.closest<HTMLElement>('[data-pair]')
      return el?.dataset.pair && el.dataset.side ? { pair: el.dataset.pair, side: el.dataset.side } : null
    }
    const [hover, setHover] = useState<PairRef | null>(null)
    const [focus, setFocus] = useState<PairRef | null>(null)
    const active = hover ?? focus
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => handleRovingKey(e.currentTarget, e, 'sheet'),
      []
    )
    ```
    On `.paper`: `onPointerOver={(e) => setHover(refOf(e.target))}` (fires for every child entered; a gap between columns yields null), `onPointerOut={(e) => setHover(refOf(e.relatedTarget))}` (the pointer's destination, or null when it left the paper or the test's pointer model gives none), `onPointerLeave={() => setHover(null)}` as belt and braces, `onFocus={(e) => setFocus(refOf(e.target))}`, `onBlur={(e) => setFocus(refOf(e.relatedTarget))}` (when focus moves from Onosato to Hoshoryu by ArrowDown, `relatedTarget` is Hoshoryu, so the light moves with it; when focus leaves the paper, it clears), `onKeyDown={handleKeyDown}`. jsx-a11y: `onFocus`/`onBlur` pair with the pointer events so `mouse-events-have-key-events` is satisfied; the div has `role="group"`; if `no-noninteractive-element-interactions` fires, add a one-line disable naming the rule with the reason "event delegation for the buttons inside".
  - In `half()`, iterate the groups keeping the group: `groups.flatMap((group) => (group[side] ? [{ group, rikishi: group[side]! }] : []))`; pass `pairKey={group.key}` and `lit={active !== null && active.pair === group.key && active.side !== rikishi.side}` — the partner lights, never the hovered or focused column itself (the test asserts that).
  - CSS: after `.clickable:hover { … }` add
    ```css
    /* The East/West partner of the hovered or focused column, across the halves */
    .column[data-lit] {
      background: rgb(var(--ink-rgb) / 0.06);
    }
    ```
- [ ] **Step 4:** PASS; `check:css`; the existing "reads each half from its highest rank down" test still passes (the div variant now also has `data-side`; if that test counts `[data-side]` elements and now double-counts, scope its selector to `button[data-side]`). Commit `sheet: arrow keys across the halves; the partner lights on hover and focus`.

---

### Task B3: List — data attributes and arrow keys

**Files:** `src/components/SideCell/SideCell.tsx`, `src/components/RankRow/RankRow.tsx`, `src/components/BanzukeGrid/BanzukeGrid.tsx`, `BanzukeGrid.test.tsx`.

- [ ] **Step 1: Failing test** — append to `BanzukeGrid.test.tsx` (read its render helper; it renders `<BanzukeGrid rows={…} onSelectRikishi>` in a `LanguageProvider` with `makeBanzuke().rikishi` or similar rows):

```tsx
  it('moves focus with the arrow keys: ↓ down the ranks, ← → across a row', async () => {
    const user = userEvent.setup()
    renderGrid({ rows: makeBanzuke().rikishi, onSelectRikishi: vi.fn() })
    const hoshoryu = screen.getByRole('button', { name: /Hoshoryu, East/ })
    const onosato = screen.getByRole('button', { name: /Onosato, West/ })
    const wakatakakage = screen.getByRole('button', { name: /Wakatakakage, East/ })
    expect(hoshoryu).toHaveAttribute('data-pair', '100-1-1')
    hoshoryu.focus()
    await user.keyboard('{ArrowLeft}')
    expect(onosato).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(hoshoryu).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(wakatakakage).toHaveFocus()
    await user.keyboard('{End}')
    expect(wakatakakage).toHaveFocus()
  })
```
- [ ] **Step 2:** FAIL. **Step 3: Implement.** `SideCell` gains `pairKey?: string`; on the `<button>` add `data-id={rikishi.id}` and `data-pair={pairKey}` (the div variant too). `RankRow` passes `pairKey={group.key}` to both cells. `BanzukeGrid`: `import { handleRovingKey } from '../../utils/rovingFocus'`; on `<div className={styles.grid}>` add `onKeyDown={(e) => handleRovingKey(e.currentTarget, e, 'list')}` (a `div` with a key handler and nothing else: jsx-a11y `no-static-element-interactions` fires — add `role="presentation"`? No: give it the disable comment with reason "keyboard delegation for the buttons inside; not itself interactive").
- [ ] **Step 4:** PASS; commit `list: arrow keys down the ranks and across a row`.

---

### Task B4: Dialog — previous and next

**Files:** `src/components/WrestlerModal/WrestlerModal.tsx`, `WrestlerModal.module.css`, `WrestlerModal.test.tsx`, `src/i18n/strings.ts`, `src/components/ShortcutsHelp/ShortcutsHelp.tsx`.

**Produces:** `WrestlerModal` props `neighbours?: { previous: Rikishi | null; next: Rikishi | null }`, `onStep?: (rikishi: Rikishi) => void`. Strings: `previousWrestler: (name: string) => \`Previous: ${name}\`` / `(name) => \`前へ: ${name}\``, `nextWrestler: (name) => \`Next: ${name}\`` / `\`次へ: ${name}\``, `shortcutArrows: 'Move between wrestlers; ← → in the dialog'` / `'力士の間を移動（ダイアログ内は ← →）'`.

- [ ] **Step 1: Failing tests** — append to `WrestlerModal.test.tsx` (extend `renderModal` with a fifth optional parameter `extra: Partial<React.ComponentProps<typeof WrestlerModal>> = {}` spread onto the component):

```tsx
  it('steps to the neighbours by button and by arrow key, and hides an absent side', async () => {
    const user = userEvent.setup()
    const onStep = vi.fn()
    const next = makeRikishi({ id: 1, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } })
    renderModal(onosato, vi.fn(), 'en', null, { neighbours: { previous: null, next }, onStep })
    expect(screen.queryByRole('button', { name: /Previous/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Next: Hoshoryu' }))
    expect(onStep).toHaveBeenCalledWith(next)
    await user.keyboard('{ArrowRight}')
    expect(onStep).toHaveBeenCalledTimes(2)
    await user.keyboard('{ArrowLeft}')
    expect(onStep).toHaveBeenCalledTimes(2)
  })

  it('returns focus to the current wrestler’s button on close after stepping', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { rerender } = render(
      <LanguageProvider>
        <button type="button" data-id="4227" data-pair="100-1-1" data-side="east">
          Onosato
        </button>
        <button type="button" data-id="1" data-pair="100-1-1" data-side="west">
          Hoshoryu
        </button>
        <WrestlerModal rikishi={onosato} onClose={onClose} />
      </LanguageProvider>
    )
    const hoshoryu = makeRikishi({ id: 1, shikona: { en: 'Hoshoryu', jp: '豊昇龍' } })
    rerender(
      <LanguageProvider>
        <button type="button" data-id="4227" data-pair="100-1-1" data-side="east">
          Onosato
        </button>
        <button type="button" data-id="1" data-pair="100-1-1" data-side="west">
          Hoshoryu
        </button>
        <WrestlerModal rikishi={hoshoryu} onClose={onClose} />
      </LanguageProvider>
    )
    await user.click(screen.getByRole('button', { name: 'Close wrestler details' }))
    // The native dialog's close event drives focus return
    screen.getByRole('dialog', { hidden: true }).dispatchEvent(new Event('close'))
    expect(screen.getByRole('button', { name: 'Hoshoryu' })).toHaveFocus()
  })
```
(jsdom does not implement `showModal`; read how the existing tests cope — the file likely polyfills `HTMLDialogElement.prototype.showModal`/`close` in `src/setupTests.ts` — and follow that pattern for firing `close`.)

- [ ] **Step 2:** FAIL. **Step 3: Implement.**
  - `strings.ts`: add the three keys in both tables (under "Grid and modal" and "Shortcuts").
  - `ShortcutsHelp.tsx`: add `['← → ↑ ↓', strings.shortcutArrows],` after the `/` row.
  - `WrestlerModal.tsx`: props `neighbours`, `onStep`. Track the current id for focus return: `const currentIdRef = useRef<number | null>(null)`; in the `useEffect([rikishi])` set `currentIdRef.current = rikishi?.id ?? null` when `rikishi` is non-null. In `handleClose`:
    ```ts
    const id = currentIdRef.current
    const current = id === null ? null : document.querySelector<HTMLElement>(`button[data-id="${id}"]`)
    const target = current ?? opener
    if (target instanceof HTMLElement && document.contains(target)) target.focus()
    ```
    Add `onKeyDown` on the `<dialog>`:
    ```ts
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
      if (!neighbours || !onStep) return
      const step = e.key === 'ArrowLeft' ? neighbours.previous : e.key === 'ArrowRight' ? neighbours.next : null
      if (step) {
        e.preventDefault()
        onStep(step)
      }
    }
    ```
    (The existing eslint-disable comment above the dialog covers click handlers; with a key handler now present, drop `jsx-a11y/click-events-have-key-events` from it and keep `no-noninteractive-element-interactions`.)
    In `.details`, before the `<h2>`, render the stepper when `neighbours && onStep`:
    ```tsx
    <div className={styles.stepper}>
      {neighbours.previous ? (
        <button type="button" className={styles.stepButton} onClick={() => onStep(neighbours.previous!)}
          aria-label={strings.previousWrestler(nameOf(neighbours.previous))}>‹</button>
      ) : <span className={styles.stepGap} aria-hidden="true" />}
      {neighbours.next ? (
        <button type="button" className={styles.stepButton} onClick={() => onStep(neighbours.next!)}
          aria-label={strings.nextWrestler(nameOf(neighbours.next))}>›</button>
      ) : <span className={styles.stepGap} aria-hidden="true" />}
    </div>
    ```
    with `const nameOf = (r: Rikishi) => r.shikona[language] || r.shikona.en`. Prettier will reflow.
  - CSS:
    ```css
    /* Previous / next along the banzuke, either side of the name */
    .stepper {
      display: flex;
      justify-content: space-between;
      margin: 0 0 var(--space-2);
    }

    .stepButton,
    .stepGap {
      min-width: 40px;
      min-height: 40px;
    }

    .stepButton {
      display: inline-grid;
      place-items: center;
      font: inherit;
      font-size: var(--text-lg);
      color: var(--muted);
      background: none;
      border: 1px solid var(--rule);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .stepButton:hover {
      color: var(--text);
      border-color: var(--border);
    }
    ```
- [ ] **Step 4:** PASS; `check:css`; commit `dialog: previous and next along the banzuke; focus returns to the current wrestler`.

---

### Task B5: App wiring for the dialog walk

**Files:** `src/App.tsx`, `src/App.test.tsx`.

- [ ] **Step 1: Failing test** — append to `App.test.tsx`:

```tsx
  it('walks the banzuke from the dialog without growing the history', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Hoshoryu, East/ }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Hoshoryu')
    const depth = window.history.length
    await user.click(screen.getByRole('button', { name: 'Next: Onosato' }))
    await waitFor(() => expect(dialog).toHaveAccessibleName('Onosato'))
    expect(window.location.search).toBe('?rikishi=1001')
    expect(window.history.length).toBe(depth)
    expect(screen.queryByRole('button', { name: /Previous: Hoshoryu/ })).toBeInTheDocument()
  })
```
- [ ] **Step 2:** FAIL. **Step 3: Implement** in `App.tsx`: import `setUrlParam` from `./hooks/useUrlState`;
```ts
  // Previous and next in banzuke order (East then West at each rank), within
  // the selected wrestler's own division — the walk never crosses the Juryo line.
  const neighbours = useMemo(() => {
    if (!selectedRikishi || !data) return undefined
    const rows = data.makuuchi.rikishi.includes(selectedRikishi)
      ? data.makuuchi.rikishi
      : (data.juryo?.rikishi ?? [])
    const i = rows.indexOf(selectedRikishi)
    return { previous: rows[i - 1] ?? null, next: rows[i + 1] ?? null }
  }, [data, selectedRikishi])

  // Stepping replaces the dialog's history entry, so Back still closes it in one step.
  const handleStep = useCallback((rikishi: Rikishi) => setUrlParam('rikishi', String(rikishi.id), 'replace'), [])
```
and pass `neighbours={neighbours} onStep={handleStep}` to `WrestlerModal`.
- [ ] **Step 4:** PASS; commit `app: the dialog walks the banzuke`.

---

### Task B6: Docs and PR B

- [ ] CLAUDE.md "Things that look odd": add
  ```markdown
  - **Arrow keys are spatial**, not canonical: on the Sheet ← → walk a half's rank ladder (← is the
    lower rank because each half is `direction: rtl`) and ↑ ↓ cross to the East/West partner; on the
    List ↑ ↓ walk ranks and ← → cross the row. One `keyTarget()` in `src/utils/rovingFocus.ts` serves
    both from the `data-side`/`data-pair` attributes on every wrestler button. The dialog's ‹ › and
    ← → follow canonical order (`banzuke.rikishi`) and **replace** the URL entry so Back still closes.
  ```
  README: under the app intro, one sentence: "Arrow keys move between wrestlers on the Sheet and the List; the wrestler dialog steps along the banzuke with ‹ › or ← →."
- [ ] Gate; commit `docs: keyboard travel`; push; `gh pr create` "Keyboard: arrow keys across the sheet and list, lit East/West partner, previous/next in the dialog"; watch CI.

---

# Part C — the guide (branch `feat/guide`)

### Task C0: Branch
- [ ] `git checkout main && git pull --ff-only && git checkout -b feat/guide`; baseline gate green.

---

### Task C1: `buildGuide`

**Files:** create `src/utils/guide.ts`, `src/utils/guide.test.ts`.

- [ ] **Step 1: Failing test:**

```ts
import { describe, expect, it } from 'vitest'
import { buildGuide } from './guide'
import { makeBanzuke, makeRikishi } from '../test/fixtures'

const rows = makeBanzuke().rikishi // 3842 Y-E, 4227 Y-W, 4055 M1-E

describe('buildGuide', () => {
  it('numbers the marks in legend order over the rows on screen', () => {
    const guide = buildGuide(rows, { movements: false, records: false })
    expect(guide.items).toEqual(['size', 'east', 'tier', 'numeral', 'origin', 'name', 'gold'])
    expect(guide.marks).toEqual([
      { n: 1, key: 'size', zone: 'name', rikishiId: 3842 },
      { n: 2, key: 'east', zone: 'sideMark', rikishiId: null },
      { n: 3, key: 'tier', zone: 'rank', rikishiId: 4055 },
      { n: 4, key: 'numeral', zone: 'numeral', rikishiId: 4055 },
      { n: 5, key: 'origin', zone: 'origin', rikishiId: 4055 },
      { n: 6, key: 'name', zone: 'name', rikishiId: 4055 },
      { n: 7, key: 'gold', zone: 'top', rikishiId: 3842 },
    ])
  })

  it('adds the overlay items only when the overlays are on', () => {
    const guide = buildGuide(rows, { movements: true, records: true })
    expect(guide.items.slice(-2)).toEqual(['changes', 'results'])
    expect(guide.marks.at(-2)).toEqual({ n: 8, key: 'changes', zone: 'movement', rikishiId: 3842 })
    expect(guide.marks.at(-1)).toEqual({ n: 9, key: 'results', zone: 'record', rikishiId: 3842 })
  })

  it('skips the gold item when no Yokozuna is on the sheet and the numeral when no numbered rank is', () => {
    const ozekiOnly = [
      makeRikishi({ id: 1, rankCode: 200, rankLevel: 'ozeki', rankName: { en: 'Ozeki', jp: '大関' } }),
    ]
    const guide = buildGuide(ozekiOnly, { movements: false, records: false })
    expect(guide.items).toEqual(['size', 'east', 'tier', 'origin', 'name'])
    expect(guide.marks.map((m) => m.rikishiId)).toEqual([1, null, 1, 1, 1])
  })

  it('marks the two ends of the Maegashira ladder', () => {
    const many = [
      ...rows,
      makeRikishi({ id: 9, rankCode: 500, rankLevel: 'maegashira', rankNumber: 17, side: 'east',
        rankName: { en: 'Maegashira #17', jp: '前頭十七枚目' } }),
    ]
    const guide = buildGuide(many, { movements: false, records: false })
    const by = (key: string) => guide.marks.find((m) => m.key === key)!.rikishiId
    expect(by('tier')).toBe(9)
    expect(by('numeral')).toBe(9)
    expect(by('origin')).toBe(9)
    expect(by('name')).toBe(4055)
  })

  it('is empty for an empty sheet', () => {
    expect(buildGuide([], { movements: false, records: false })).toEqual({ marks: [], items: [] })
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement:**

```ts
/**
 * Where the guide's numbered marks go. Pure: given the rows on screen and
 * which overlays are on, choose the columns that best show each feature and
 * number the marks in legend order, skipping features the sheet lacks today
 * (no Yokozuna → no gold item). The legend lists `items` in the same order,
 * so mark 3 on the sheet is item 3 beneath it.
 */
import type { Rikishi } from '../types/banzuke'
import { RANK_CODES } from '../constants/ranks'

export type GuideZone =
  | 'sideMark'
  | 'top'
  | 'rank'
  | 'numeral'
  | 'origin'
  | 'name'
  | 'movement'
  | 'record'

export type GuideKey =
  | 'size'
  | 'east'
  | 'tier'
  | 'numeral'
  | 'origin'
  | 'name'
  | 'gold'
  | 'changes'
  | 'results'

export interface GuideMark {
  n: number
  key: GuideKey
  zone: GuideZone
  /** The column that carries the mark; null for the East side mark. */
  rikishiId: number | null
}

export interface Guide {
  marks: GuideMark[]
  /** Legend items, in mark order. */
  items: GuideKey[]
}

export const GUIDE_KEYS: readonly GuideKey[] = [
  'size', 'east', 'tier', 'numeral', 'origin', 'name', 'gold', 'changes', 'results',
]

const numbered = (r: Rikishi) => r.rankCode >= RANK_CODES.MAEGASHIRA

export function buildGuide(
  rows: Rikishi[],
  overlays: { movements: boolean; records: boolean }
): Guide {
  if (rows.length === 0) return { marks: [], items: [] }
  const top = rows.find((r) => r.side === 'east') ?? rows[0]
  const east = rows.filter((r) => r.side === 'east')
  const numberedEast = east.filter(numbered)
  // The lowest numbered rank shows the tier band and the numeral; the first
  // numbered rank shows the name — the two ends of the ladder.
  const low = numberedEast.at(-1) ?? east.at(-1) ?? rows.at(-1)!
  const first = numberedEast[0] ?? low

  const candidates: Array<[GuideKey, GuideZone, number | null] | null> = [
    ['size', 'name', top.id],
    east.length > 0 ? ['east', 'sideMark', null] : null,
    ['tier', 'rank', low.id],
    numbered(low) ? ['numeral', 'numeral', low.id] : null,
    ['origin', 'origin', low.id],
    ['name', 'name', first.id],
    top.rankLevel === 'yokozuna' ? ['gold', 'top', top.id] : null,
    overlays.movements ? ['changes', 'movement', top.id] : null,
    overlays.records ? ['results', 'record', top.id] : null,
  ]
  const marks: GuideMark[] = []
  for (const candidate of candidates) {
    if (!candidate) continue
    const [key, zone, rikishiId] = candidate
    marks.push({ n: marks.length + 1, key, zone, rikishiId })
  }
  return { marks, items: marks.map((m) => m.key) }
}
```
Note for `changes`/`results`: the design said "first row that has a movement/record"; the App passes `overlays.movements = movements != null` and the top row nearly always has both. Keeping the mark on `top` keeps the function free of overlay data and the test simple. If the top row has no movement (rare: a Yokozuna unchanged still has a `same` movement in `diff.ts`? — check `diffBanzuke`: every current row yields a `Movement`, so `movements.get(top.id)` is always set when the overlay is on; records may be missing for a wrestler absent all basho — then the mark sits by an empty spot; acceptable).
- [ ] **Step 4:** PASS (fix `import` ordering / Prettier reflow of the `GUIDE_KEYS` line). Commit `utils: buildGuide places the numbered marks`.

---

### Task C2: Guide strings and the font subset

**Files:** `src/i18n/strings.ts`, fonts.

- [ ] **Step 1:** Add to `en` (a new block after "Tournament results"):

```ts
  // How to read a banzuke
  guideTitle: 'How to read a banzuke',
  guideOpen: 'How to read a banzuke',
  guideClose: 'Hide the guide',
  guideIntro:
    'A banzuke is the ranking sheet the Japan Sumo Association publishes before each of the six tournaments a year. Every wrestler in the top two divisions is on it, and the sheet itself tells you their standing: how large the name is, which half it is on, and where along the band it sits.',
  guideItem: {
    size: 'Rank is written in size. The highest ranks are printed largest and the names shrink down the sheet; on the real banzuke the lowest divisions are so small they are barely legible.',
    east: 'East is on the right and West on the left, because the sheet is read right to left. At the same rank, East is the slightly higher position.',
    tier: 'The band of heavy characters at the top of each column is the rank: 横綱 Yokozuna, 大関 Ozeki, 関脇 Sekiwake, 小結 Komusubi, 前頭 Maegashira, 十両 Juryo. The printed sheet writes only the tier, because the position along the band already says which Maegashira this is.',
    numeral: 'The small numeral beneath the tier is added here, because a screen has no fixed sheet to count along: 十七 is Maegashira 17.',
    origin: 'Between the rank and the name is the wrestler’s home: a prefecture, or a country for wrestlers born abroad.',
    name: 'The ring name, the shikona, reads top to bottom. A wrestler takes one on joining a stable, and it often shares a character with the stablemaster or the stable’s tradition.',
    gold: 'The gold rule at the head of a column marks a Yokozuna, the one rank the sheet gives a colour of its own.',
    changes: 'With Changes on, the small mark under a name is the rank the wrestler held on the previous banzuke: ▲ for a rise, ▼ for a fall, 新 for a newcomer to the division.',
    results: 'With Results on during a tournament, the score under each name is wins and losses so far. Eight wins is kachi-koshi, a winning record; a hairline 優 marks the champion.',
  } satisfies Record<GuideKey, string>,
```
(import `type { GuideKey } from '../utils/guide'`.) And to `jp`:

```ts
  guideTitle: '番付の読み方',
  guideOpen: '番付の読み方',
  guideClose: '読み方を閉じる',
  guideIntro:
    '番付は、年六回の本場所ごとに日本相撲協会が発表する力士の序列表です。字の大きさ、東西、そして段の中の位置が、そのまま力士の地位を表します。',
  guideItem: {
    size: '地位は字の大きさで表されます。上位ほど大きく、下に行くほど小さくなり、実際の番付では下位の力士の名は虫眼鏡がいるほどの細字になります。',
    east: '右が東、左が西。番付は右から左へ読み、同じ地位では東がわずかに上位です。',
    tier: '各列の上にある太い文字が地位です（横綱・大関・関脇・小結・前頭・十両）。実際の番付には枚数は書かれず、段の中の位置で何枚目かがわかります。',
    numeral: '地位の下の小さな数字はこのサイトが添えたものです。画面では位置を数えにくいため、十七なら前頭十七枚目と読めるようにしています。',
    origin: '地位と四股名の間には出身地が入ります。都道府県、外国出身の力士なら国名です。',
    name: '四股名は上から下へ読みます。入門時に師匠や部屋の伝統にちなんだ字を受けることが多く、部屋ごとの字が見て取れます。',
    gold: '列の頭の金の線は横綱の印です。番付でただひとつ色を持つ地位です。',
    changes: '「変動」をつけると、四股名の下に前の番付での地位が出ます。▲は昇進、▼は降下、新は新入幕・新十両です。',
    results: '場所中に「星取」をつけると、四股名の下にこれまでの勝敗が出ます。八勝で勝ち越し、優の印は優勝力士です。',
  },
```
- [ ] **Step 2:** `npx vitest run src/i18n` PASS; `npx vitest run scripts/lib/font-coverage.test.ts` FAILS on the new kanji → `npm run subset-fonts` → PASS. Commit `i18n: the guide's legend in both languages; mincho subset covers it` with the two font files.

---

### Task C3: Marks on the Sheet

**Files:** `BanzukeSheet.tsx`, `BanzukeSheet.module.css`, `BanzukeSheet.test.tsx`.

**Interfaces:** `BanzukeSheet` prop `guide?: Guide | null`. `Column` prop `marks?: Partial<Record<GuideZone, number>>`.

- [ ] **Step 1: Failing test:**

```tsx
  it('carries the guide marks in the right zones, hidden from assistive tech', () => {
    const guide = buildGuide(rows, { movements: false, records: false })
    const { container } = renderSheet({ onSelectRikishi: vi.fn(), guide })
    const marks = [...container.querySelectorAll('[data-zone]')]
    // DOM order: the East side mark first, then Onosato's marks in zone order
    // (top before name), then Abi's (rank, numeral, origin), then Atamifuji's name.
    expect(marks.map((m) => `${m.getAttribute('data-zone')}:${m.textContent}`)).toEqual([
      'sideMark:2',
      'top:7',
      'name:1',
      'rank:3',
      'numeral:4',
      'origin:5',
      'name:6',
    ])
    for (const mark of marks) expect(mark).toHaveAttribute('aria-hidden', 'true')
    // The accessible name of a marked column is unchanged
    expect(screen.getByRole('button', { name: /Onosato/ })).toHaveAccessibleName(/^Onosato, East\. Yokozuna\./)
  })
```
(`rows` in that file: Onosato id 1 Y-E, Hoshoryu id 2 Y-W, Atamifuji M1-E, Takayasu M1-W, Abi M2-E, Ura M2-W. So `top` = Onosato, `low` = Abi, `first` = Atamifuji. Inside a column the marks render after the content in the fixed zone order `top, rank, numeral, origin, name, movement, record`.) Import `buildGuide` from `'../../utils/guide'`.

- [ ] **Step 2:** FAIL. **Step 3: Implement.**
  - `BanzukeSheet`: prop `guide`; `const marksById = new Map<number, Partial<Record<GuideZone, number>>>()` built from `guide?.marks` where `rikishiId !== null`; `const sideMarkN = guide?.marks.find((m) => m.zone === 'sideMark')?.n`. Pass `marks={marksById.get(rikishi.id)}` to `Column`. In `half('east')`'s `.sideMark`: after `{SIDE_KANJI[side]}`, `{side === 'east' && sideMarkN && <span className={styles.mark} data-zone="sideMark">{sideMarkN}</span>}` — note the `<p>` is already `aria-hidden`, so the inner span inherits hiddenness; still put `aria-hidden="true"` on the span for the test's uniform check.
  - `Column`: after the three content spans, inside the same fragment:
    ```tsx
    {marks &&
      ZONES.filter((zone) => marks[zone] !== undefined).map((zone) => (
        <span key={zone} className={styles.mark} data-zone={zone} aria-hidden="true">
          {marks[zone]}
        </span>
      ))}
    ```
    with `const ZONES: GuideZone[] = ['top', 'rank', 'numeral', 'origin', 'name', 'movement', 'record']` at module level. Since `Column` is `memo`, `marks` objects must be stable: build `marksById` inside a `useMemo` on `guide`.
  - CSS, after `.column[data-lit]`:
    ```css
    /*
     * Guide marks: numbered circles laid over the column's cells. They are
     * grid children placed into the band they annotate, so they add no flow
     * content and the band heights never move; ink on paper, no colour.
     */
    .mark {
      grid-column: 1;
      justify-self: start;
      align-self: start;
      z-index: 1;
      pointer-events: none;
      display: inline-grid;
      place-items: center;
      width: 1rem;
      height: 1rem;
      margin: -0.2rem;
      font-family: var(--font-names);
      font-size: 0.6rem;
      font-weight: 700;
      line-height: 1;
      color: var(--text);
      background: var(--card-bg);
      border: 1px solid var(--text);
      border-radius: 50%;
      writing-mode: horizontal-tb;
    }

    .mark[data-zone='top'] {
      grid-row: 1;
      justify-self: end;
      margin-top: -0.6rem;
    }

    .mark[data-zone='rank'] {
      grid-row: 1;
    }

    .mark[data-zone='numeral'] {
      grid-row: 1;
      align-self: end;
    }

    .mark[data-zone='origin'] {
      grid-row: 2;
    }

    .mark[data-zone='name'] {
      grid-row: 3;
    }

    .mark[data-zone='movement'],
    .mark[data-zone='record'] {
      grid-row: 3;
      align-self: end;
    }

    /* The East side mark carries its number inline, after 東 */
    .sideMark .mark {
      display: inline-grid;
      vertical-align: middle;
      margin: 0 0 0 0.2rem;
    }
    ```
    `check:css` needs every class referenced: `mark` is. Attribute selectors are not classes.
- [ ] **Step 4:** PASS. `npm run dev`, open `/?guide=1` is not wired yet — temporarily pass `guide={buildGuide(…)}` from App? No: verify in the next task. Commit `sheet: guide marks as grid overlays, band heights untouched`.

---

### Task C4: `Guide` — the legend and the link

**Files:** create `src/components/Guide/Guide.tsx`, `Guide.module.css`, `Guide.test.tsx`.

**Produces:** `Guide({ items, onClose }: { items: GuideKey[]; onClose: () => void })` — the legend section. `GuideLink({ on, onToggle }: { on: boolean; onToggle: (on: boolean) => void })` — an `<a>` whose `href` is the current URL with `guide=1` set (or removed when `on`), whose click is intercepted to call `onToggle(!on)` (plain left-click only: modifier/middle clicks open the link normally).

- [ ] **Step 1: Failing test:**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Guide, GuideLink } from './Guide'
import { LanguageProvider } from '../../contexts/LanguageContext'

describe('Guide', () => {
  afterEach(() => window.history.replaceState({}, '', '/'))

  it('lists the items in mark order with their numbers, as a real list under a heading', async () => {
    const onClose = vi.fn()
    render(
      <LanguageProvider>
        <Guide items={['size', 'east', 'gold']} onClose={onClose} />
      </LanguageProvider>
    )
    expect(screen.getByRole('region', { name: 'How to read a banzuke' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent(/^1/)
    expect(items[0]).toHaveTextContent(/Rank is written in size/)
    expect(items[2]).toHaveTextContent(/^3/)
    expect(items[2]).toHaveTextContent(/gold rule/)
    await userEvent.click(screen.getByRole('link', { name: 'Hide the guide' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('links to ?guide=1 and toggles without leaving the page', async () => {
    const onToggle = vi.fn()
    window.history.replaceState({}, '', '/?div=juryo')
    render(
      <LanguageProvider>
        <GuideLink on={false} onToggle={onToggle} />
      </LanguageProvider>
    )
    const link = screen.getByRole('link', { name: 'How to read a banzuke' })
    expect(link).toHaveAttribute('href', '/?div=juryo&guide=1')
    await userEvent.click(link)
    expect(onToggle).toHaveBeenCalledWith(true)
    expect(window.location.search).toBe('?div=juryo')
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement** `Guide.tsx`:

```tsx
import { useId, type MouseEvent } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useStrings } from '../../i18n/useStrings'
import { langAttr } from '../../i18n/strings'
import type { GuideKey } from '../../utils/guide'
import styles from './Guide.module.css'

/** The current URL with the guide switched on or off, for a real, shareable link. */
function guideHref(on: boolean): string {
  const url = new URL(window.location.href)
  if (on) url.searchParams.set('guide', '1')
  else url.searchParams.delete('guide')
  return `${url.pathname}${url.search}${url.hash}`
}

/** A plain left-click is handled in place; modified clicks open the link as links do. */
function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

interface GuideLinkProps {
  on: boolean
  onToggle: (on: boolean) => void
}

/** The way in: a quiet link beside the controls, read once rather than left on. */
export function GuideLink({ on, onToggle }: GuideLinkProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  return (
    <a
      className={styles.link}
      href={guideHref(!on)}
      lang={langAttr(language)}
      data-print="hide"
      onClick={(e) => {
        if (!plainClick(e)) return
        e.preventDefault()
        onToggle(!on)
      }}
    >
      {on ? strings.guideClose : strings.guideOpen}
    </a>
  )
}

interface GuideProps {
  /** Legend items in mark order: item i carries mark i + 1. */
  items: GuideKey[]
  onClose: () => void
}

/**
 * The legend beneath the paper. Each item repeats its number as the same
 * circle the sheet carries, so a reader matches mark to meaning by eye; the
 * list is real content, and reads on its own when the marks are out of view.
 */
export function Guide({ items, onClose }: GuideProps) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  return (
    <section className={styles.guide} aria-labelledby={headingId} lang={langAttr(language)}>
      <h2 id={headingId} className={styles.heading}>
        {strings.guideTitle}
      </h2>
      <p className={styles.intro}>{strings.guideIntro}</p>
      <ol className={styles.list}>
        {items.map((key, i) => (
          <li key={key} className={styles.item}>
            <span className={styles.mark} aria-hidden="true">
              {i + 1}
            </span>
            <span className="visually-hidden">{i + 1}. </span>
            <span className={styles.text}>{strings.guideItem[key]}</span>
          </li>
        ))}
      </ol>
      <p className={styles.foot}>
        <GuideLink on onToggle={() => onClose()} />
      </p>
    </section>
  )
}
```
(The test's `toHaveTextContent(/^1/)` reads the visually-hidden "1. " too — textContent includes it; fine.) CSS:

```css
/* The guide: a quiet link in, a legend beneath the paper in the sheet's small hand */
.link {
  align-self: flex-end;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  font-family: var(--font-names);
  font-weight: 700;
  font-size: var(--text-xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  text-decoration: underline;
  text-decoration-color: var(--border);
  text-underline-offset: 0.2em;
}

.link:hover {
  color: var(--text);
  text-decoration-color: var(--text);
}

.link:lang(ja) {
  font-family: var(--font-jp-serif);
  font-size: var(--text-sm);
  text-transform: none;
  letter-spacing: 0.1em;
}

.guide {
  border-top: 1px solid var(--rule);
  padding-top: var(--space-2);
  margin-top: var(--space-5);
}

.heading {
  font-size: var(--text-base);
  font-weight: var(--label-weight);
  letter-spacing: var(--tracking-caps);
  text-transform: uppercase;
  color: var(--muted);
  margin: var(--space-3) 0 var(--space-2);
}

.heading:lang(ja) {
  text-transform: none;
  letter-spacing: 0.1em;
}

.intro {
  max-width: 60ch;
  font-size: var(--text-sm);
  color: var(--text);
  margin: 0 0 var(--space-3);
}

.list {
  list-style: none;
  display: grid;
  gap: var(--space-2);
  max-width: 60ch;
}

.item {
  display: grid;
  grid-template-columns: 1.2rem minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
  font-size: var(--text-sm);
}

/* The same circle as on the sheet */
.mark {
  display: inline-grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  margin-top: 0.1rem;
  font-family: var(--font-names);
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1;
  color: var(--text);
  background: var(--card-bg);
  border: 1px solid var(--text);
  border-radius: 50%;
}

.text:lang(ja) {
  line-height: 1.8;
}

.foot {
  margin: var(--space-3) 0 0;
}
```
- [ ] **Step 4:** PASS; `check:css`; commit `components: Guide — the legend and its link`.

---

### Task C5: App wiring — `?guide=1`

**Files:** `src/App.tsx`, `src/App.test.tsx`.

- [ ] **Step 1: Failing tests:**

```tsx
  it('opens the guide from its link, marks the sheet, and closes it from the legend', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    await user.click(screen.getByRole('link', { name: 'How to read a banzuke' }))
    expect(window.location.search).toBe('?guide=1')
    expect(screen.getByRole('region', { name: 'How to read a banzuke' })).toBeInTheDocument()
    expect(document.querySelectorAll('[data-zone]').length).toBeGreaterThan(5)
    await user.click(screen.getByRole('link', { name: 'Hide the guide' }))
    expect(window.location.search).toBe('')
    expect(screen.queryByRole('region', { name: 'How to read a banzuke' })).toBeNull()
  })

  it('offers no guide on the list view', async () => {
    window.history.replaceState(null, '', '/?view=list&guide=1')
    render(<App />)
    await screen.findByRole('button', { name: /Hoshoryu, East/ })
    expect(screen.queryByRole('link', { name: /guide|banzuke/ })).toBeNull()
    expect(screen.queryByRole('region', { name: 'How to read a banzuke' })).toBeNull()
  })
```
- [ ] **Step 2:** FAIL. **Step 3: Implement** in `App.tsx`: imports `buildGuide` from `./utils/guide`, `Guide, GuideLink` from `./components/Guide/Guide`; `const [guideParam, setGuideParam] = useUrlParam('guide')`;
```ts
  // The guide annotates the paper, so it exists only on the Sheet with something on it.
  const guideOn = guideParam === '1' && view === 'sheet' && !nothingToShow
  const guide = useMemo(
    () => (guideOn ? buildGuide(allRows, { movements: movements != null, records: records != null }) : null),
    [guideOn, allRows, movements, records]
  )
  const handleToggleGuide = useCallback((on: boolean) => setGuideParam(on ? '1' : null), [setGuideParam])
```
Controls row: after the `ResultsToggle` block, `{view === 'sheet' && !nothingToShow && <GuideLink on={guideOn} onToggle={handleToggleGuide} />}`. `BanzukeSheet` gets `guide={guide}`. Under the paper, **before** `Departed`: `{guide && <Guide items={guide.items} onClose={() => handleToggleGuide(false)} />}`.
- [ ] **Step 4:** PASS. **Visual check:** `npm run dev`, `/?guide=1`: circles sit in the band corners without moving any band; ⑦ straddles the gold rule; the East 東 carries ②; on a 390px width nothing overflows; press `L`: Japanese legend in mincho; `/?guide=1&diff=1` adds ⑧ beside the movement badge; List view shows no link and no legend; Tab order is unchanged. Commit `app: ?guide=1 — how to read a banzuke`.

---

### Task C6: Docs and PR C

- [ ] CLAUDE.md "Things that look odd":
  ```markdown
  - **The guide** (`?guide=1`) is Sheet-only: `buildGuide` (`src/utils/guide.ts`) chooses which columns
    carry which numbered mark from the rows on screen (highest rank present; the two ends of the
    Maegashira ladder), the marks are CSS circles placed as grid children over the band they annotate
    (no flow content, band heights untouched, no new glyphs), and `Guide` beneath the paper lists the
    same numbers with bilingual text. The way in is a link, not a third seal: a guide is read once.
  ```
  README intro: "Not sure how to read it? `?guide=1` marks the real sheet with numbered notes and explains each beneath it, in English and Japanese." Add `Guide/` to the components tree.
- [ ] Gate; commit `docs: the guide`; push; PR "How to read a banzuke: numbered marks on the real sheet with a bilingual legend"; watch CI.

---

# Part D — the shikona glossary (branch `feat/shikona-glossary`)

### Task D0: Branch
- [ ] `git checkout main && git pull --ff-only && git checkout -b feat/shikona-glossary`; baseline gate green.

---

### Task D1: The table, `explainShikona`, `glossaryGaps`

**Files:** create `src/data/shikona-glossary.ts`, `src/data/shikona-glossary.test.ts`.

- [ ] **Step 1: Failing test:**

```ts
import { describe, expect, it } from 'vitest'
import { COMPOUNDS, explainShikona, GLOSSARY, glossaryGaps } from './shikona-glossary'
import { makeBanzuke } from '../test/fixtures'

describe('shikona glossary', () => {
  it('has an English meaning for every entry, and no stray whitespace', () => {
    for (const table of [GLOSSARY, COMPOUNDS]) {
      for (const [key, gloss] of Object.entries(table)) {
        expect(gloss.en.trim(), key).toBe(gloss.en)
        expect(gloss.en, key).not.toBe('')
        expect(gloss.note?.trim() ?? '', key).toBe(gloss.note ?? '')
      }
    }
    for (const key of Object.keys(GLOSSARY)) expect([...key], key).toHaveLength(1)
    for (const key of Object.keys(COMPOUNDS)) expect([...key], key).toHaveLength(2)
  })

  it('covers every character in the fixture names', () => {
    const names = [
      '豊昇龍', '大の里', '霧島', '琴櫻', '出羽ノ龍', '旭海雄', '大青山', '錦木', '若隆景', '安青錦',
      ...makeBanzuke().rikishi.map((r) => r.shikona.jp),
    ]
    expect(glossaryGaps(names)).toEqual([])
  })

  it('segments a name: compounds first, then single characters, unknown ones kept', () => {
    expect(explainShikona('大の里').map((s) => [s.text, s.gloss?.en ?? null])).toEqual([
      ['大', 'great'],
      ['の', 'of'],
      ['里', 'village; home'],
    ])
    expect(explainShikona('熱海富士').map((s) => s.text)).toEqual(['熱海', '富士'])
    expect(explainShikona('龘').map((s) => [s.text, s.gloss])).toEqual([['龘', null]])
    expect(explainShikona('')).toEqual([])
  })

  it('reports the characters it lacks, once each, sorted', () => {
    expect(glossaryGaps(['龘龘', '大龘', '齉'])).toEqual(['齉', '龘'])
  })
})
```
- [ ] **Step 2:** FAIL. **Step 3: Implement.** The table below is the deliverable of this task: transcribe it exactly. Meanings are the general sense of the character as it reads in a ring name; notes name a stable's or a lineage's mark only where that is well established.

```ts
/**
 * What the characters in a ring name mean. A shikona is built from a small
 * vocabulary — mountains, seas, dragons, the stable's own character — and an
 * English reader who knows that 山 is a mountain and 琴 marks the Sadogatake
 * stable reads the sheet differently. Hand-curated: every character that has
 * appeared in Makuuchi or Juryo since the archive begins (2025-11), plus the
 * two-character units that read as one word. Meanings are the character's
 * general sense, not an etymology of the particular name.
 *
 * Coverage is checked against the test fixtures only. New wrestlers bring new
 * characters; `npm run glossary-gaps` lists them (the deploy job runs it as a
 * warning), and the dialog shows a bare character until it is added here.
 */
export interface Gloss {
  en: string
  /** A stable's mark, a reading, or a piece of context worth a line. */
  note?: string
}

export const COMPOUNDS: Record<string, Gloss> = {
  富士: { en: 'Mount Fuji' },
  千代: { en: 'a thousand generations; forever', note: 'the Kokonoe stable’s mark, from Chiyonofuji' },
  出羽: { en: 'Dewa, an old province (Yamagata and Akita)', note: 'the Dewanoumi stable’s mark' },
  日向: { en: 'Hyuga, an old province (Miyazaki)' },
  御嶽: { en: 'Mount Ontake' },
  熱海: { en: 'Atami, a hot-spring town in Shizuoka' },
  湘南: { en: 'Shonan, the Kanagawa coast' },
  平戸: { en: 'Hirado, an island town in Nagasaki' },
  疾風: { en: 'a gale; hayate' },
  不動: { en: 'immovable' },
  凌駕: { en: 'to surpass' },
  阿武: { en: 'from Onomatsu, the stable’s name (阿武松)', note: 'the Onomatsu stable’s mark' },
  佐田: { en: 'Sada, a place name' },
}

export const GLOSSARY: Record<string, Gloss> = {
  // Joining kana
  の: { en: 'of', note: 'the kana that links the parts of a name: 大の里, “Great Village”' },
  ノ: { en: 'of', note: 'the katakana form of の' },
  乃: { en: 'of', note: 'a classical character read no, used as “of”' },
  之: { en: 'of', note: 'a classical character read no, used as “of”' },
  // Numbers and size
  一: { en: 'one' },
  三: { en: 'three' },
  千: { en: 'thousand' },
  大: { en: 'great' },
  高: { en: 'high; tall' },
  // Land and water
  山: { en: 'mountain' },
  峰: { en: 'peak' },
  嶽: { en: 'high mountain; peak' },
  島: { en: 'island' },
  川: { en: 'river' },
  海: { en: 'sea' },
  津: { en: 'harbour' },
  田: { en: 'rice field' },
  里: { en: 'village; home' },
  戸: { en: 'door; household' },
  平: { en: 'flat; peaceful' },
  湘: { en: 'the Shonan coast' },
  熱: { en: 'heat' },
  出: { en: 'to emerge; to set out' },
  // Sky and weather
  天: { en: 'heaven; sky' },
  日: { en: 'sun; day' },
  旭: { en: 'the rising sun', note: 'the Oshima line’s mark, from Kyokutenho and Tomozuna' },
  陽: { en: 'sunlight' },
  晴: { en: 'clear sky' },
  明: { en: 'bright; clear' },
  雲: { en: 'cloud' },
  雷: { en: 'thunder' },
  電: { en: 'lightning' },
  霧: { en: 'mist' },
  嵐: { en: 'storm' },
  風: { en: 'wind' },
  疾: { en: 'swift' },
  炎: { en: 'flame' },
  // Seasons and time
  春: { en: 'spring' },
  時: { en: 'time', note: 'the Tokitsukaze stable’s mark' },
  代: { en: 'generation; era' },
  元: { en: 'origin; source' },
  本: { en: 'origin; root' },
  // Colours and materials
  白: { en: 'white' },
  青: { en: 'blue-green' },
  紅: { en: 'crimson' },
  紫: { en: 'purple' },
  翠: { en: 'jade green' },
  丹: { en: 'red; cinnabar' },
  金: { en: 'gold' },
  玉: { en: 'jewel', note: 'the Kataonami stable’s mark' },
  錦: { en: 'brocade' },
  // Plants
  木: { en: 'tree' },
  花: { en: 'flower' },
  桜: { en: 'cherry blossom' },
  櫻: { en: 'cherry blossom (the old form of 桜)' },
  藤: { en: 'wisteria' },
  栃: { en: 'horse chestnut', note: 'the Kasugano stable’s mark, from Tochigiyama' },
  荒: { en: 'wild; rough' },
  // Creatures
  龍: { en: 'dragon' },
  竜: { en: 'dragon (the simpler form of 龍)' },
  鵬: { en: 'the peng, a vast mythical bird', note: 'after Taiho and Hakuho, the two great 鵬' },
  鳳: { en: 'phoenix' },
  鷲: { en: 'eagle' },
  鷹: { en: 'hawk' },
  翔: { en: 'to soar' },
  羽: { en: 'feather; wing' },
  馬: { en: 'horse' },
  狼: { en: 'wolf' },
  熊: { en: 'bear' },
  猿: { en: 'monkey' },
  獅: { en: 'lion' },
  // Strength, virtue, fortune
  勝: { en: 'victory' },
  剋: { en: 'to overcome' },
  凌: { en: 'to endure; to surpass' },
  駕: { en: 'to surpass; a carriage' },
  武: { en: 'martial' },
  剣: { en: 'sword' },
  豪: { en: 'strong; magnificent' },
  雄: { en: 'hero; bold' },
  隆: { en: 'to rise; prosperity' },
  昇: { en: 'to ascend' },
  輝: { en: 'radiance' },
  栄: { en: 'to flourish; glory' },
  豊: { en: 'abundant' },
  富: { en: 'wealth; abundance' },
  寿: { en: 'long life; felicity' },
  嘉: { en: 'auspicious' },
  安: { en: 'peace; calm' },
  正: { en: 'correct; righteous' },
  義: { en: 'righteousness' },
  賢: { en: 'wise' },
  篤: { en: 'sincere; kind' },
  志: { en: 'will; aspiration' },
  意: { en: 'intention; mind' },
  尊: { en: 'revered; noble' },
  雅: { en: 'elegance' },
  美: { en: 'beauty', note: 'in 美ノ海 read chura, Okinawan for beautiful' },
  良: { en: 'good' },
  英: { en: 'excellence' },
  景: { en: 'view; scene' },
  友: { en: 'friend' },
  御: { en: 'honourable (a prefix)' },
  伯: { en: 'elder; chief' },
  王: { en: 'king' },
  司: { en: 'to govern; an official' },
  士: { en: 'warrior; gentleman' },
  生: { en: 'life; to be born' },
  治: { en: 'to govern; to heal' },
  動: { en: 'to move' },
  不: { en: 'not' },
  向: { en: 'to face toward' },
  目: { en: 'eye' },
  丸: { en: 'circle; a name ending for ships and boys' },
  佐: { en: 'to assist' },
  央: { en: 'centre' },
  宇: { en: 'the heavens; a roof' },
  若: { en: 'young' },
  朝: { en: 'morning', note: 'the Takasago stable’s mark' },
  琴: { en: 'koto, the zither', note: 'the Sadogatake stable’s mark' },
  欧: { en: 'Europe', note: 'the Naruto stable’s mark, from its master Kotooshu' },
  阿: { en: 'a prefix; a corner' },
  // Directions
  東: { en: 'east' },
  西: { en: 'west' },
  南: { en: 'south' },
  北: { en: 'north' },
}

export interface NameSegment {
  text: string
  gloss: Gloss | null
}

/**
 * Splits a ring name into the units it is read in: a two-character compound
 * where one is known at the position, otherwise one character at a time.
 * Characters the glossary lacks come back with a null gloss, so the dialog can
 * still show them.
 */
export function explainShikona(jp: string): NameSegment[] {
  const chars = [...jp]
  const segments: NameSegment[] = []
  for (let i = 0; i < chars.length; ) {
    const pair = chars[i] + (chars[i + 1] ?? '')
    if (chars[i + 1] !== undefined && COMPOUNDS[pair]) {
      segments.push({ text: pair, gloss: COMPOUNDS[pair] })
      i += 2
      continue
    }
    segments.push({ text: chars[i], gloss: GLOSSARY[chars[i]] ?? null })
    i += 1
  }
  return segments
}

/** Characters in `names` with no single-character entry, once each, sorted by code point. */
export function glossaryGaps(names: Iterable<string>): string[] {
  const missing = new Set<string>()
  for (const name of names) {
    for (const ch of name) {
      if (!GLOSSARY[ch] && !/\s/.test(ch)) missing.add(ch)
    }
  }
  return [...missing].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
}
```
Note: `glossaryGaps` checks single characters only, so a character covered by a compound but not on its own (none today: 富, 士, 千, 代 … all have entries) is reported — that is intended, since compound-only coverage leaves the character bare in other names. Prettier will reflow the long `note` lines; let it.
- [ ] **Step 4:** PASS. Then check the table against the real data (not as a test): `npx tsx -e "import {glossaryGaps} from './src/data/shikona-glossary.ts'; import fs from 'node:fs'; const names=[]; for (const f of fs.readdirSync('public/banzuke').filter(f=>/^\d+\.json$/.test(f))) for (const r of JSON.parse(fs.readFileSync('public/banzuke/'+f,'utf8')).rikishi) names.push(r.shikona.jp); console.log(glossaryGaps(names))"` → expect `[]`. If characters are listed, add them (the archive list on 2026-09-07 was exactly the 125 above). Font coverage: the source now contains every one of these kanji, all already in the subset via the archive — run the coverage test to confirm; regen if not.
- [ ] **Step 5: Review checkpoint.** Before committing, re-read every `en` and `note` against the character (this is 125 lines of curated prose written by a model). Any entry you cannot vouch for: shorten it to the plainest sense and drop the note. Record in the report which entries were changed. Commit `data: the shikona glossary — 125 characters and 13 compounds, with a segmenter`.

---

### Task D2: The "Name" section in the dialog

**Files:** `WrestlerModal.tsx`, `WrestlerModal.module.css`, `WrestlerModal.test.tsx`, `src/i18n/strings.ts`.

- [ ] **Step 1: Failing tests:**

```tsx
  it('spells out the ring name’s characters with their meanings, in English', () => {
    renderModal(onosato)
    const section = screen.getByRole('region', { name: 'Name' })
    const parts = [...section.querySelectorAll('[data-segment]')]
    expect(parts.map((p) => p.getAttribute('data-segment'))).toEqual(['大', 'の', '里'])
    expect(section).toHaveTextContent('great')
    expect(section).toHaveTextContent('village; home')
    expect(section.querySelector('[lang="ja"]')).not.toBeNull()
  })

  it('shows no name section in Japanese, or when the name has no known characters', () => {
    renderModal(onosato, vi.fn(), 'jp')
    expect(screen.queryByRole('region', { name: '四股名の字' })).toBeNull()
    renderModal(makeRikishi({ shikona: { en: 'Nobody', jp: '龘' } }))
    expect(screen.queryByRole('region', { name: 'Name' })).toBeNull()
  })
```
- [ ] **Step 2:** FAIL. **Step 3: Implement.** Strings: `nameMeaning: 'Name'` / `'四股名の字'` (under "Grid and modal"). In `WrestlerModal.tsx`, after `<SecondaryName rikishi={rikishi} />`: `<NameSection rikishi={rikishi} />`;

```tsx
/**
 * The ring name, character by character, with what each means. English only:
 * a Japanese reader does not need 海 explained. Shown when at least one part
 * of the name is in the glossary.
 */
function NameSection({ rikishi }: { rikishi: Rikishi }) {
  const { language } = useLanguage()
  const strings = useStrings()
  const headingId = useId()
  if (language !== 'en' || !rikishi.shikona.jp || rikishi.shikona.jp === rikishi.shikona.en) {
    return null
  }
  const segments = explainShikona(rikishi.shikona.jp)
  if (!segments.some((s) => s.gloss)) return null
  const note = segments.find((s) => s.gloss?.note)?.gloss?.note
  return (
    <section className={styles.nameSection} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.careerTitle}>
        {strings.nameMeaning}
      </h3>
      <ul className={styles.segments}>
        {segments.map((s, i) => (
          <li key={`${s.text}-${i}`} className={styles.segment} data-segment={s.text}>
            <span className={styles.segmentText} lang="ja">
              {s.text}
            </span>
            {s.gloss && <span className={styles.segmentGloss}>{s.gloss.en}</span>}
          </li>
        ))}
      </ul>
      {note && <p className={styles.segmentNote}>{note}</p>}
    </section>
  )
}
```
Import `explainShikona` from `'../../data/shikona-glossary'`. CSS (after `.career` block):

```css
/* The ring name spelled out: each character in mincho over its meaning */
.nameSection {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
  text-align: left;
}

.segments {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  padding: 0 var(--space-3);
}

.segment {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  min-width: 2.5rem;
}

.segmentText {
  font-family: var(--font-jp-serif);
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1.1;
}

.segmentGloss {
  font-size: var(--text-xs);
  color: var(--muted);
  text-align: center;
  max-width: 7rem;
}

.segmentNote {
  margin: var(--space-2) 0 0;
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
  color: var(--muted);
}
```
- [ ] **Step 4:** PASS; `check:css`; commit `dialog: the name, character by character`.

---

### Task D3: `glossary-gaps` script and the deploy warning

**Files:** create `scripts/glossary-gaps.ts`; `tsconfig.scripts.json` (include `src/data/shikona-glossary.ts`), `package.json` (`"glossary-gaps": "tsx scripts/glossary-gaps.ts"`), `.github/workflows/deploy.yml`.

- [ ] **Step 1: Implement:**

```ts
/**
 * Lists the ring-name characters the shikona glossary lacks, across the
 * current snapshot and the archive, with one name each appears in. Always
 * exits 0: a gap is a writing task, not a broken build. In GitHub Actions the
 * lines are emitted as workflow warnings so they show on the run summary.
 *
 * Usage: tsx scripts/glossary-gaps.ts [--snapshot <path>] [--archive-dir <dir>]
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { glossaryGaps } from '../src/data/shikona-glossary.ts'
import { validateArchive } from '../src/data/archive.ts'
import { validateSnapshot } from '../src/data/schema.ts'
import { ringName } from '../src/data/normalize.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'archive-dir': { type: 'string', default: resolve(rootDir, 'public/banzuke') },
  },
})

const names = new Map<string, string>() // character → one name carrying it
function add(name: string) {
  for (const ch of name) if (!names.has(ch)) names.set(ch, name)
}

const snapshot = validateSnapshot(JSON.parse(readFileSync(args.snapshot as string, 'utf8')))
if (snapshot.ok) {
  for (const division of Object.values(snapshot.snapshot.divisions)) {
    for (const row of division.payloads.jp.BanzukeTable) add(ringName(row.shikona))
  }
} else {
  console.warn(`Snapshot not read: ${snapshot.errors[0]}`)
}
for (const file of readdirSync(args['archive-dir'] as string).filter((f) => /^\d+\.json$/.test(f))) {
  const archive = validateArchive(JSON.parse(readFileSync(join(args['archive-dir'] as string, file), 'utf8')))
  if (archive.ok) for (const r of archive.archive.rikishi) add(r.shikona.jp)
}

const gaps = glossaryGaps(names.keys())
if (gaps.length === 0) {
  console.log('Shikona glossary covers every character in the snapshot and the archive.')
} else {
  const prefix = process.env.GITHUB_ACTIONS ? '::warning::' : ''
  for (const ch of gaps) console.log(`${prefix}Shikona glossary lacks: ${ch} (${names.get(ch)})`)
}
```
Check `ringName` is exported from `src/data/normalize.ts` (it is, line 29) and that `normalize.ts` compiles under `tsconfig.scripts.json` (add it to `include` if not already reachable; it imports only types and `kanji.ts`). If `normalize.ts` drags in something DOM-only, inline the one-liner instead: `shikona.trim().split(/[　\s]+/)[0] ?? ''`.
- [ ] **Step 2:** `npm run glossary-gaps` → "covers every character". `npx tsc --noEmit -p tsconfig.scripts.json` clean.
- [ ] **Step 3:** `deploy.yml`, after the "Archive the banzuke" step (before profiles):
```yaml
      # A new wrestler can bring a kanji the shikona glossary lacks. Never a
      # failure — the dialog shows the bare character — but worth a warning on
      # the run summary so the table gets written.
      - name: Report shikona glossary gaps
        continue-on-error: true
        run: npx tsx scripts/glossary-gaps.ts --snapshot .data/latest-banzuke.json
```
(the archive dir default is `public/banzuke`, which at that point already has the current tournament copied in only if changed — pass `--archive-dir .data/banzuke` only if that directory exists; simplest: keep the default and accept that a brand-new tournament's names are covered by `--snapshot`.)
- [ ] **Step 4:** Gate; commit `scripts: glossary-gaps warns about ring-name characters the glossary lacks`.

---

### Task D4: Docs and PR D

- [ ] README: components tree gets nothing new; `data/` gets `shikona-glossary.ts  # What the kanji in ring names mean (hand-curated)`; `scripts/` gets `glossary-gaps.ts  # Lists ring-name characters the glossary lacks (deploy warns)`; Manual list gets `npm run glossary-gaps`. CLAUDE.md Commands: `npm run glossary-gaps  # list ring-name kanji the shikona glossary lacks`; "Things that look odd":
  ```markdown
  - `src/data/shikona-glossary.ts` is **hand-written** and deliberately **not** tested against live data:
    the deploy job runs the test suite after the bot's data commit, so a new wrestler's kanji must never
    fail a test. Coverage is checked against the fixtures; `npm run glossary-gaps` (and the deploy job,
    as a `::warning::`) lists what the live data needs. The dialog shows a bare character for a gap.
    Meanings are the character's general sense, English only; notes carry stable marks (琴, 朝, 栃 …).
  ```
- [ ] Gate; commit `docs: the shikona glossary`; push; PR "Shikona glossary: what the kanji in every ring name mean"; watch CI.

---

## Verification (end to end)

1. **Part A on production:** JP mode shows 大相撲 番付表 as the title; the scroll button is labelled in Japanese; DevTools → Application → Manifest shows the paper theme colour; a Japanese-locale browser with cleared storage lands in Japanese; hovering the sheet triggers one `rikishi-profiles.json` request before any dialog opens; the dialog no longer jumps on first open.
2. **Part B:** Tab to a column; ← → walk the half; ↑ ↓ cross to the partner, which lights; on the List ↑ ↓ ← →; in the dialog ‹ › and ← → step, Back closes in one step, Esc returns focus to the wrestler you ended on.
3. **Part C:** `/?guide=1` on a phone and a desktop; every mark in its band; the legend reads without the sheet; `L` switches the legend; List view hides both link and legend; the link is right-click-copyable.
4. **Part D:** open 大の里, 熱海富士, 出羽ノ龍, 美ノ海 — segments and notes read correctly; JP mode shows no Name section; the deploy log shows "covers every character".
5. **Doctrine:** `motion.test.ts` green (four effects); `tokens.test.ts` untouched (no colour); `check:css` clean; font coverage green; no test reads live data for glossary coverage.

## Self-review

- **Coverage of the brainstorm verdicts:** flex note → A1; h1/scroll/JP year → A1; Senshuraku dropped (stated); manifest → A1; fadeIn + budget test → A2; navigator.language → A3; profiles prefetch + honest pending → A4; workflow `if…fi` + two test gaps → A5; keyboard spatial semantics → B1–B3; pair affinity folded into B2; dialog walk with replace + focus return → B4/B5; guide: marks in grid cells, rule-chosen columns, link entry, Sheet-only, no new glyphs → C1–C5; glossary: 125 chars + compounds + notes, fixture-only test, `::warning::` script, EN-only section, review checkpoint → D1–D3.
- **Placeholders:** none; every code step carries its code. The glossary table is complete (125 single characters counted: 4 kana/classical + 121 kanji; verify with `Object.keys(GLOSSARY).length === 125` in D1 Step 4).
- **Type consistency:** `GuideKey`/`GuideZone`/`Guide`/`GuideMark` defined in C1 and used unchanged in C2 (`satisfies Record<GuideKey, string>`), C3 (`guide`, `marks`), C4 (`items: GuideKey[]`), C5. `keyTarget`/`handleRovingKey(root, event, layout)` in B1 match B2/B3 calls. `neighbours`/`onStep` in B4 match B5. `useProfileState` in A4 is the only new hook. `Gloss`/`NameSegment`/`explainShikona`/`glossaryGaps` in D1 match D2/D3.
- **Rulings a controller may need:** (1) if `global(fadeIn)` is not honoured by the Vite CSS Modules pipeline, the fallback is `animation-name: global(fadeIn)` on its own line — and if that also fails, keep two declarations and change the motion test to count distinct *names* (four) rather than blocks, recording the ruling; (2) if jsx-a11y rejects the delegated handlers on the paper/grid divs under a rule not anticipated here, prefer moving the `onKeyDown` to the buttons' common ancestor with `role="presentation"` over disabling the rule; (3) if `history.length` proves unreliable in jsdom for B5's test, assert instead that `window.history.state?.urlParam === 'rikishi'` survives the step.
