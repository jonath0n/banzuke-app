# Day 1 Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deployed site refresh its data as documented, render its Japanese serif the same on every platform, and stop shipping a fallback that is a byte copy of the live file.

**Architecture:** Three independent maintenance changes on the existing static pipeline. (1) Install the already-written `Build & Deploy` workflow from `.github/pending-workflows/` and delete the dead `refresh-banzuke.yml`. (2) Add a `scripts/subset-fonts.ts` that instances Noto Serif JP at weight 700 and subsets it to the glyphs the snapshot and source code use, committed to `public/assets/fonts/` with a manifest that a test checks for coverage; the deploy job regenerates it whenever the banzuke changes. (3) Add `scripts/make-sample.ts` that derives a labelled, Makuuchi-only `public/sample-data.json` from the live snapshot, guarded by a test.

**Tech Stack:** Node 22, TypeScript via `tsx`, Vitest, one new dev dependency (`subset-font@2.7.0`, HarfBuzz-in-WASM). No runtime dependencies added.

**Spec:** Design agreed in chat (this session); summarised in "Design summary" below. No separate spec file.

## Global Constraints

- Prettier: no semicolons, single quotes, 100 columns. ESLint zero warnings. (`npm run validate` must pass.)
- No runtime dependencies beyond React; new packages are `devDependencies` only.
- The palette is six values plus `--gold`; this plan adds no colours.
- Motion budget of four keyframes; this plan adds no motion.
- Data flow: components consume the normalized model only; nothing here touches components.
- `src/test/fixtures.ts` is the source of test shapes; no ad-hoc snapshot shapes in tests.
- Every task ends with `npm run validate && npm run test:run && npm run build` green before commit.
- Work on a branch (`chore/day-1-foundations`), never directly on `main`.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg
  ```

## Design summary

**Problem 1 — the refresh never runs.** `.github/workflows/refresh-banzuke.yml` invokes `scripts/fetch-banzuke.mjs` (does not exist; the script is `.ts`) and validates a v1 file shape. `.github/workflows/deploy.yml` only builds; it never fetches. README and CLAUDE.md both describe a daily refresh that does not happen. A corrected pipeline already exists at `.github/pending-workflows/deploy.yml` + `ci.yml` (see its README): it fetches with `--if-changed`, falls back to the committed snapshot, refreshes profiles, commits changed data to `main` with the Actions bot, and builds from the refreshed data via an artifact. Pushes made with `GITHUB_TOKEN` do not trigger new workflow runs, so the bot commit cannot loop.

**Problem 2 — the mincho is a gamble.** `--font-jp-serif` lists only system fonts (Hiragino, Yu Mincho, Noto Serif JP …) and no `@font-face`. Windows and Android frequently have none, so the Sheet's whole calligraphic voice silently falls back to gothic. Fix: self-host a subset. The Sheet, tabs, toggles, masthead and modal badge set mincho at weight 700 exclusively, so one static instance suffices. Glyph set = every CJK/kana/fullwidth character in `public/latest-banzuke.json` and `src/**/*.{ts,tsx}` (436 distinct today) plus the full hiragana and katakana blocks (readings, foreign birthplaces). Output: `public/assets/fonts/NotoSerifJP-700-subset.woff2`, `NotoSerifJP-subset.json` (manifest with the glyph string), `NotoSerifJP-OFL.txt`. The family name `'Noto Serif JP'` goes **first** in `--font-jp-serif` so every platform renders the same face. A test compares the manifest's glyphs against the current snapshot and source, so a new wrestler's kanji cannot ship un-subset; the deploy job runs the script whenever the banzuke changed.

**Problem 3 — the fallback is the thing that failed.** `public/sample-data.json` is md5-identical to `public/latest-banzuke.json`. `scripts/make-sample.ts` derives a Makuuchi-only copy with `sources` rewritten to say what it is, and a test asserts it validates, carries no Juryo, and is labelled. The app already handles `juryo: null` (tabs hide) and already shows "Bundled sample data" when `source === 'sample'`.

## File structure

| Path | Responsibility |
|---|---|
| `.github/workflows/deploy.yml` | (moved from pending) data refresh → build → deploy; plus a font-subset step |
| `.github/workflows/ci.yml` | (moved from pending) checks on PRs and non-main branches |
| `.github/workflows/refresh-banzuke.yml` | **deleted** |
| `.github/pending-workflows/` | **deleted** |
| `scripts/lib/http.ts` | add `fetchBytes` (binary download with the same retry policy) |
| `scripts/lib/http.test.ts` | one new case for `fetchBytes` |
| `scripts/lib/charset.ts` | pure: collect the glyph set from strings (CJK/kana/fullwidth + kana blocks) |
| `scripts/lib/charset.test.ts` | tests for `collectGlyphs` |
| `scripts/lib/subset-font.d.ts` | ambient types for `subset-font` (ships none) |
| `scripts/subset-fonts.ts` | CLI: download variable Noto Serif JP (cached in `.data/`), instance 700, subset, write woff2 + manifest |
| `scripts/lib/font-coverage.test.ts` | asserts the committed manifest covers the current snapshot + source |
| `public/assets/fonts/NotoSerifJP-700-subset.woff2` | the face |
| `public/assets/fonts/NotoSerifJP-subset.json` | manifest: glyphs, weight, source URL, generatedAt |
| `public/assets/fonts/NotoSerifJP-OFL.txt` | licence, mirroring `Archivo-OFL.txt` |
| `src/styles/base.css` | `@font-face` for the subset |
| `src/styles/tokens.css` | `'Noto Serif JP'` first in `--font-jp-serif` |
| `index.html` | preload the woff2, mirroring Archivo |
| `scripts/make-sample.ts` | CLI: derive labelled Makuuchi-only sample from the live snapshot |
| `src/data/sample.test.ts` | asserts `public/sample-data.json` is valid, Makuuchi-only, labelled |
| `public/sample-data.json` | regenerated |
| `package.json` | scripts `subset-fonts`, `make-sample`; devDependency `subset-font` |
| `README.md`, `CLAUDE.md` | document the above |

---

### Task 0: Branch

**Files:** none

- [ ] **Step 1: Create the working branch**

```bash
git checkout -b chore/day-1-foundations
```

- [ ] **Step 2: Confirm the baseline is green**

Run: `npm run validate && npm run test:run && npm run build`
Expected: all pass (this is the baseline; if it is red, stop and report).

---

### Task 1: Install the staged pipeline, delete the dead one

**Files:**
- Move: `.github/pending-workflows/deploy.yml` → `.github/workflows/deploy.yml` (overwrites)
- Move: `.github/pending-workflows/ci.yml` → `.github/workflows/ci.yml`
- Delete: `.github/workflows/refresh-banzuke.yml`
- Delete: `.github/pending-workflows/README.md` (and the directory)

**Interfaces:**
- Consumes: `scripts/fetch-banzuke.ts` flags `--out`, `--previous`, `--if-changed` and its `$GITHUB_OUTPUT` keys `changed`, `basho_id`, `start_date` (already implemented). `scripts/fetch-profiles.ts` flags `--snapshot`, `--previous`, `--out` (already implemented).
- Produces: the `data` job's `.data/` artifact, downloaded into `public/` by the `build` job. Task 5 adds a step to this job.

- [ ] **Step 1: Confirm what the dead workflow references does not exist**

Run: `ls scripts/fetch-banzuke.mjs`
Expected: `No such file or directory` — this is the proof the workflow has been failing.

- [ ] **Step 2: Move the staged files into place**

```bash
git mv -f .github/pending-workflows/deploy.yml .github/workflows/deploy.yml
git mv .github/pending-workflows/ci.yml .github/workflows/ci.yml
git rm .github/workflows/refresh-banzuke.yml
git rm .github/pending-workflows/README.md
```

Then confirm the directory is gone: `ls .github/pending-workflows` → `No such file or directory`. (If it lingers as an empty directory, `rmdir .github/pending-workflows`.)

- [ ] **Step 3: Review the installed deploy.yml for the three properties that matter**

Open `.github/workflows/deploy.yml` and confirm by reading:
1. `on:` has `push: branches: [main]`, `schedule: - cron: '0 22 * * *'`, and `workflow_dispatch:`.
2. The `data` job runs `npx tsx scripts/fetch-banzuke.ts --out .data/latest-banzuke.json --previous public/latest-banzuke.json --if-changed` with `continue-on-error: true`, and has a fallback step that copies the committed snapshot when the fetch failed.
3. `permissions:` includes `contents: write` (needed for the bot commit) and the `build` job downloads artifact `banzuke-data` into `public`.

No edits in this task; Task 5 edits the commit step.

- [ ] **Step 4: Validate the YAML parses**

Run:
```bash
node -e "
const fs=require('fs');
for (const f of ['.github/workflows/deploy.yml','.github/workflows/ci.yml']) {
  const s=fs.readFileSync(f,'utf8');
  if (!/^name:/m.test(s) || !/^on:/m.test(s) || !/^jobs:/m.test(s)) { console.error('missing top-level key in', f); process.exit(1) }
  console.log('ok', f)
}"
```
Expected: `ok .github/workflows/deploy.yml` and `ok .github/workflows/ci.yml`. (There is no YAML parser in the dev deps; a real parse happens on push, in Step 6 of Task 7.)

- [ ] **Step 5: Run the repo checks**

Run: `npm run validate && npm run test:run && npm run build`
Expected: pass (workflow files are not linted; this confirms nothing else moved).

- [ ] **Step 6: Commit**

```bash
git add -A .github
git commit -m "ci: install the build-and-deploy pipeline; remove the dead refresh workflow

refresh-banzuke.yml called scripts/fetch-banzuke.mjs, which does not exist,
and validated the v1 file shape; it had failed on every run. deploy.yml
never fetched data at all. The pipeline staged under pending-workflows does
both: fetch with --if-changed, fall back to the committed snapshot, commit
changed data to main, then build and deploy from it.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 2: `fetchBytes` in the http helper

**Files:**
- Modify: `scripts/lib/http.ts` (add after `fetchText`, ~line 70)
- Test: `scripts/lib/http.test.ts`

**Interfaces:**
- Produces: `export async function fetchBytes(url: string, options?: FetchJsonOptions): Promise<Uint8Array>` — same retry/timeout/User-Agent policy as `fetchText`, `Accept: */*`.

- [ ] **Step 1: Read the existing test file's helpers**

Open `scripts/lib/http.test.ts` and note how it builds fake responses and injects `fetchImpl` / `sleep` (the existing tests for `fetchJson`/`fetchText` do this). Reuse the same pattern; do not add a new mocking approach.

- [ ] **Step 2: Write the failing test**

Append to `scripts/lib/http.test.ts` (inside the existing top-level `describe`, or as a sibling `describe('fetchBytes')`):

```ts
describe('fetchBytes', () => {
  it('returns the response body as bytes and retries a 503 once', async () => {
    const body = new Uint8Array([0x77, 0x4f, 0x46, 0x32]) // "wOF2"
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(new Response(body, { status: 200 }))
    const sleep = vi.fn(async () => undefined)

    const bytes = await fetchBytes('https://example.test/font.ttf', { fetchImpl, sleep })

    expect(Array.from(bytes)).toEqual([0x77, 0x4f, 0x46, 0x32])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledTimes(1)
    const init = fetchImpl.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Accept).toBe('*/*')
  })
})
```

Add `fetchBytes` to the import from `./http.ts` at the top of the file.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run scripts/lib/http.test.ts`
Expected: FAIL — `fetchBytes` is not exported.

- [ ] **Step 4: Implement**

In `scripts/lib/http.ts`, directly after `fetchText`:

```ts
/** Fetches a URL and returns the body as bytes, with the same retry policy. */
export async function fetchBytes(
  url: string,
  options: FetchJsonOptions = {}
): Promise<Uint8Array> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: { Accept: '*/*', ...options.headers },
  })
  return new Uint8Array(await response.arrayBuffer())
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run scripts/lib/http.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Checks and commit**

Run: `npm run validate && npm run test:run`
Expected: pass.

```bash
git add scripts/lib/http.ts scripts/lib/http.test.ts
git commit -m "scripts: fetchBytes for binary downloads with the shared retry policy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 3: Glyph-set collection (`charset.ts`)

**Files:**
- Create: `scripts/lib/charset.ts`
- Test: `scripts/lib/charset.test.ts`

**Interfaces:**
- Produces:
  - `export const JAPANESE_GLYPH_RE: RegExp` — global regex matching one character in the CJK punctuation/kana/kanji/compatibility/fullwidth ranges.
  - `export function collectGlyphs(texts: Iterable<string>): string` — every distinct matching character across `texts`, **plus** the full hiragana (U+3041–U+3096) and katakana (U+30A1–U+30FA) blocks and `ー々〆〇`, returned as one string sorted by code point.
  - `export function missingGlyphs(available: string, texts: Iterable<string>): string[]` — the matching characters in `texts` that are not in `available`, sorted, unique. Used by the coverage test.

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/charset.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { collectGlyphs, missingGlyphs } from './charset.ts'

describe('collectGlyphs', () => {
  it('keeps Japanese characters and drops Latin, digits and ASCII punctuation', () => {
    const glyphs = collectGlyphs(['大の里 Onosato 4227, 石川県'])
    for (const ch of '大の里石川県') expect(glyphs).toContain(ch)
    for (const ch of 'Onosato4227, ') expect(glyphs).not.toContain(ch)
  })

  it('always includes the kana blocks and the iteration marks', () => {
    const glyphs = collectGlyphs([])
    for (const ch of 'あぃゔカザフスタンヶーゝ々〆〇') expect(glyphs).toContain(ch)
  })

  it('is unique and sorted by code point', () => {
    const glyphs = collectGlyphs(['里大', '大里', '里'])
    const codes = Array.from(glyphs, (ch) => ch.codePointAt(0)!)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toEqual([...codes].sort((a, b) => a - b))
  })

  it('includes fullwidth punctuation and the ideographic space family', () => {
    const glyphs = collectGlyphs(['両国国技館（東京）', '令和八年・九月場所'])
    for (const ch of '（）・') expect(glyphs).toContain(ch)
  })
})

describe('missingGlyphs', () => {
  it('lists Japanese characters absent from the available set', () => {
    expect(missingGlyphs('大の里', ['大の里', '豊昇龍 abc'])).toEqual(['昇', '豊', '龍'])
  })

  it('is empty when everything is covered', () => {
    expect(missingGlyphs(collectGlyphs(['豊昇龍']), ['豊昇龍 Hoshoryu'])).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run scripts/lib/charset.test.ts`
Expected: FAIL — cannot resolve `./charset.ts`.

- [ ] **Step 3: Implement**

Create `scripts/lib/charset.ts`:

```ts
/**
 * Glyph-set collection for the self-hosted mincho subset.
 *
 * The Sheet sets ring names, rank kanji, the masthead and the 東/西 marks in
 * a serif Japanese face. Rather than ship the whole of Noto Serif JP (several
 * megabytes), `scripts/subset-fonts.ts` keeps only the characters the app can
 * actually render: everything Japanese in the current snapshot and in the
 * source code, plus the kana blocks in full so a reading or a katakana
 * birthplace never falls back to a different face mid-word.
 */

/** One character in the CJK punctuation, kana, kanji, compatibility or fullwidth ranges. */
export const JAPANESE_GLYPH_RE =
  /[　-〿ぁ-ゟ゠-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/gu

/** Always present, whatever the data says: hiragana, katakana, and the iteration marks. */
function kanaBlocks(): string[] {
  const chars: string[] = []
  for (let code = 0x3041; code <= 0x3096; code++) chars.push(String.fromCodePoint(code))
  for (let code = 0x30a1; code <= 0x30fa; code++) chars.push(String.fromCodePoint(code))
  chars.push('ー', 'ゝ', 'ゞ', 'ヽ', 'ヾ', '々', '〆', '〇')
  return chars
}

function japaneseCharacters(texts: Iterable<string>): Set<string> {
  const found = new Set<string>()
  for (const text of texts) {
    for (const match of text.matchAll(JAPANESE_GLYPH_RE)) found.add(match[0])
  }
  return found
}

function sortByCodePoint(chars: Iterable<string>): string[] {
  return [...chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
}

/**
 * Every distinct Japanese character in `texts`, plus the kana blocks, as one
 * string sorted by code point (so the output is stable across runs).
 */
export function collectGlyphs(texts: Iterable<string>): string {
  const found = japaneseCharacters(texts)
  for (const ch of kanaBlocks()) found.add(ch)
  return sortByCodePoint(found).join('')
}

/** Japanese characters in `texts` that `available` does not contain. */
export function missingGlyphs(available: string, texts: Iterable<string>): string[] {
  const have = new Set(available)
  return sortByCodePoint([...japaneseCharacters(texts)].filter((ch) => !have.has(ch)))
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/lib/charset.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Checks and commit**

Run: `npm run validate && npm run test:run`
Expected: pass.

```bash
git add scripts/lib/charset.ts scripts/lib/charset.test.ts
git commit -m "scripts: collect the Japanese glyph set for font subsetting

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 4: `subset-fonts.ts` and the committed face

**Files:**
- Modify: `package.json` (devDependency, script)
- Create: `scripts/lib/subset-font.d.ts`
- Create: `scripts/subset-fonts.ts`
- Create: `public/assets/fonts/NotoSerifJP-700-subset.woff2` (generated)
- Create: `public/assets/fonts/NotoSerifJP-subset.json` (generated)
- Create: `public/assets/fonts/NotoSerifJP-OFL.txt` (downloaded once)
- Test: `scripts/lib/font-coverage.test.ts`

**Interfaces:**
- Consumes: `fetchBytes` (Task 2), `collectGlyphs`, `missingGlyphs` (Task 3).
- Produces: the manifest shape
  ```ts
  interface FontManifest {
    version: 1
    family: 'Noto Serif JP'
    weight: 700
    file: 'NotoSerifJP-700-subset.woff2'
    source: string        // URL of the variable TTF
    license: 'OFL-1.1'
    glyphs: string        // collectGlyphs() output
    glyphCount: number
    generatedAt: string   // ISO
  }
  ```
  Task 5 (workflow) calls `npx tsx scripts/subset-fonts.ts --snapshot <path> --out-dir <dir>`.

- [ ] **Step 1: Install the subsetter**

Run: `npm install --save-dev subset-font@2.7.0`
Expected: `package.json` gains `"subset-font": "^2.7.0"` under `devDependencies`; lockfile updates. Confirm it is **not** under `dependencies`.

- [ ] **Step 2: Declare its types (the package ships none)**

Create `scripts/lib/subset-font.d.ts`:

```ts
/** subset-font 2.x ships no type declarations; this covers the options we use. */
declare module 'subset-font' {
  interface SubsetFontOptions {
    targetFormat?: 'sfnt' | 'woff' | 'woff2'
    /** Pin variable axes to instance a static face, e.g. `{ wght: 700 }`. */
    variationAxes?: Record<string, number | { min: number; max: number }>
    preserveNameIds?: number[]
  }
  export default function subsetFont(
    font: Uint8Array,
    text: string,
    options?: SubsetFontOptions
  ): Promise<Uint8Array>
}
```

(`tsconfig.scripts.json` includes `scripts/**/*.ts`, which picks up `.d.ts` files.)

- [ ] **Step 3: Write the failing coverage test**

Create `scripts/lib/font-coverage.test.ts`:

```ts
/**
 * The committed mincho subset must cover every Japanese character the app can
 * render today: the snapshot's names, stables, provinces and rank names, and
 * every literal in the source. When this fails, run `npm run subset-fonts`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { missingGlyphs } from './charset.ts'

const root = resolve(__dirname, '../..')
const fontsDir = resolve(root, 'public/assets/fonts')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('NotoSerifJP subset', () => {
  const manifest = JSON.parse(
    readFileSync(resolve(fontsDir, 'NotoSerifJP-subset.json'), 'utf8')
  ) as { version: number; weight: number; file: string; glyphs: string; glyphCount: number }

  it('has a consistent manifest and a real woff2 beside it', () => {
    expect(manifest.version).toBe(1)
    expect(manifest.weight).toBe(700)
    expect(manifest.glyphCount).toBe([...manifest.glyphs].length)
    const bytes = readFileSync(resolve(fontsDir, manifest.file))
    // woff2 magic number "wOF2"
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2')
    expect(bytes.length).toBeGreaterThan(10_000)
  })

  it('covers every Japanese character in the current snapshot', () => {
    const snapshot = readFileSync(resolve(root, 'public/latest-banzuke.json'), 'utf8')
    expect(missingGlyphs(manifest.glyphs, [snapshot])).toEqual([])
  })

  it('covers every Japanese character in the source code', () => {
    const texts = sourceFiles(resolve(root, 'src')).map((path) => readFileSync(path, 'utf8'))
    expect(missingGlyphs(manifest.glyphs, texts)).toEqual([])
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run scripts/lib/font-coverage.test.ts`
Expected: FAIL — `ENOENT … NotoSerifJP-subset.json`.

- [ ] **Step 5: Write the script**

Create `scripts/subset-fonts.ts`:

```ts
/**
 * Builds the self-hosted mincho for the Sheet.
 *
 * The Sheet, tabs, masthead and rank seals set Japanese in a serif face at
 * weight 700, and until now relied on whatever mincho the visitor's OS had —
 * often none on Windows or Android, where the calligraphic voice silently
 * became gothic. This script downloads the variable Noto Serif JP (OFL),
 * instances it at 700, keeps only the glyphs the app can render (see
 * scripts/lib/charset.ts) and writes a woff2 plus a manifest that
 * scripts/lib/font-coverage.test.ts checks against the current data.
 *
 * Usage:
 *   tsx scripts/subset-fonts.ts [--snapshot <path>] [--out-dir <dir>] [--cache <path>]
 *
 * --snapshot  Banzuke snapshot to draw glyphs from (default: public/latest-banzuke.json).
 * --out-dir   Where to write the woff2, manifest and licence (default: public/assets/fonts).
 * --cache     Where to keep the downloaded variable TTF (default: .data/NotoSerifJP[wght].ttf).
 *
 * Exit codes: 0 success, 1 download failure, 2 subsetting failure.
 */
import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import subsetFont from 'subset-font'
import { fetchBytes, fetchText } from './lib/http.ts'
import { collectGlyphs } from './lib/charset.ts'

const FAMILY = 'Noto Serif JP'
const WEIGHT = 700
const FILE = `NotoSerifJP-${WEIGHT}-subset.woff2`
const MANIFEST = 'NotoSerifJP-subset.json'
const LICENSE = 'NotoSerifJP-OFL.txt'

const GOOGLE_FONTS = 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifjp'
const SOURCE_URL = `${GOOGLE_FONTS}/NotoSerifJP%5Bwght%5D.ttf`
const LICENSE_URL = `${GOOGLE_FONTS}/OFL.txt`

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    snapshot: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    'out-dir': { type: 'string', default: resolve(rootDir, 'public/assets/fonts') },
    cache: { type: 'string', default: resolve(rootDir, '.data/NotoSerifJP[wght].ttf') },
  },
})

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return sourceFiles(path)
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
    })
  )
  return nested.flat()
}

/** Everything Japanese the app can show: the snapshot plus every source literal. */
async function gatherTexts(snapshotPath: string): Promise<string[]> {
  const texts = [await readFile(snapshotPath, 'utf8')]
  for (const path of await sourceFiles(resolve(rootDir, 'src'))) {
    texts.push(await readFile(path, 'utf8'))
  }
  return texts
}

/** The variable TTF, downloaded once and kept under .data/ (gitignored). */
async function loadSourceFont(cachePath: string): Promise<Uint8Array> {
  if (await exists(cachePath)) {
    const size = (await stat(cachePath)).size
    console.log(`Using cached ${cachePath} (${(size / 1e6).toFixed(1)} MB)`)
    return new Uint8Array(await readFile(cachePath))
  }
  console.log(`Downloading ${SOURCE_URL}`)
  const bytes = await fetchBytes(SOURCE_URL, { timeoutMs: 120_000 })
  await mkdir(dirname(cachePath), { recursive: true })
  await writeFile(cachePath, bytes)
  console.log(`Saved ${(bytes.length / 1e6).toFixed(1)} MB to ${cachePath}`)
  return bytes
}

async function main(): Promise<number> {
  const outDir = resolve(args['out-dir'] as string)
  const glyphs = collectGlyphs(await gatherTexts(resolve(args.snapshot as string)))
  const glyphCount = [...glyphs].length
  console.log(`Glyph set: ${glyphCount} characters`)

  let source: Uint8Array
  try {
    source = await loadSourceFont(resolve(args.cache as string))
  } catch (error) {
    console.error(`Could not download the source font: ${error instanceof Error ? error.message : error}`)
    return 1
  }

  let woff2: Uint8Array
  try {
    woff2 = await subsetFont(source, glyphs, {
      targetFormat: 'woff2',
      variationAxes: { wght: WEIGHT },
    })
  } catch (error) {
    console.error(`Subsetting failed: ${error instanceof Error ? error.message : error}`)
    return 2
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, FILE), woff2)
  console.log(`Wrote ${FILE} (${(woff2.length / 1e3).toFixed(1)} kB)`)

  const manifest = {
    version: 1,
    family: FAMILY,
    weight: WEIGHT,
    file: FILE,
    source: SOURCE_URL,
    license: 'OFL-1.1',
    glyphs,
    glyphCount,
    generatedAt: new Date().toISOString(),
  }
  await writeFile(join(outDir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${MANIFEST}`)

  const licensePath = join(outDir, LICENSE)
  if (!(await exists(licensePath))) {
    await writeFile(licensePath, await fetchText(LICENSE_URL), 'utf8')
    console.log(`Wrote ${LICENSE}`)
  }
  return 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
```

Add to `package.json` `scripts`, after `"fetch-profiles"`:

```json
"subset-fonts": "tsx scripts/subset-fonts.ts",
```

- [ ] **Step 6: Generate the face**

Run: `npm run subset-fonts`
Expected output (numbers indicative):
```
Glyph set: ~600 characters
Downloading https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf
Saved ~10–25 MB to .data/NotoSerifJP[wght].ttf
Wrote NotoSerifJP-700-subset.woff2 (~80–150 kB)
Wrote NotoSerifJP-subset.json
Wrote NotoSerifJP-OFL.txt
```
Then: `ls -la public/assets/fonts/` shows the three new files, and `git status` shows **no** `.data/` entry (it is gitignored).

If the woff2 is over 250 kB, stop: the glyph set is wrong (probably the regex matched the JSON's Latin), inspect `manifest.glyphs`.

- [ ] **Step 7: Run the coverage test to verify it passes**

Run: `npx vitest run scripts/lib/font-coverage.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 8: Run it a second time to confirm determinism**

Run: `npm run subset-fonts && git status --short public/assets/fonts`
Expected: only `NotoSerifJP-subset.json` differs (its `generatedAt`); the woff2 is byte-identical (no `M` on it). If the woff2 changes between runs, note it in the commit body — it is not a blocker, but it means the deploy job will commit a fresh binary on every data change.

- [ ] **Step 9: Checks and commit**

Run: `npm run validate && npm run test:run && npm run build`
Expected: pass. (`check:css` is unaffected; the CSS wiring comes in Task 6.)

```bash
git add package.json package-lock.json scripts/subset-fonts.ts scripts/lib/subset-font.d.ts scripts/lib/font-coverage.test.ts public/assets/fonts/NotoSerifJP-700-subset.woff2 public/assets/fonts/NotoSerifJP-subset.json public/assets/fonts/NotoSerifJP-OFL.txt
git commit -m "fonts: self-hosted Noto Serif JP subset for the Sheet's mincho

The serif stack listed only system fonts, so on Windows and Android the
ring names, rank kanji and masthead silently fell back to gothic. This
instances the variable Noto Serif JP at 700 and keeps the ~600 glyphs the
snapshot and source use. A test checks the manifest covers the current data.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 5: Wire the subset into the deploy job

**Files:**
- Modify: `.github/workflows/deploy.yml` — the `data` job, between "Validate the snapshot that will ship" and "Refresh wrestler profiles"; and the "Commit refreshed data to main" step.

**Interfaces:**
- Consumes: `scripts/subset-fonts.ts --snapshot --out-dir` (Task 4). The `build` job downloads `.data/` into `public/`, so writing to `.data/assets/fonts/` lands at `public/assets/fonts/` in the build.

- [ ] **Step 1: Add the regeneration step**

In `.github/workflows/deploy.yml`, after the step named `Validate the snapshot that will ship`, insert:

```yaml
      # New wrestlers can bring new kanji; keep the self-hosted mincho in step
      # with the data so the coverage test passes in the build job.
      - name: Regenerate the mincho subset
        if: steps.fetch.outputs.changed == 'true'
        run: |
          mkdir -p .data/assets/fonts
          cp public/assets/fonts/NotoSerifJP-OFL.txt .data/assets/fonts/
          npx tsx scripts/subset-fonts.ts \
            --snapshot .data/latest-banzuke.json \
            --out-dir .data/assets/fonts
```

- [ ] **Step 2: Make the commit step pick up whatever changed**

Replace the existing `Commit refreshed data to main` step's `run:` block with:

```yaml
        run: |
          cp .data/latest-banzuke.json public/latest-banzuke.json
          [ -f .data/rikishi-profiles.json ] && cp .data/rikishi-profiles.json public/rikishi-profiles.json
          if [ -d .data/assets/fonts ]; then cp .data/assets/fonts/* public/assets/fonts/; fi
          git config user.name 'github-actions[bot]'
          git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
          git add public/latest-banzuke.json public/rikishi-profiles.json public/assets/fonts
          if git diff --cached --quiet; then
            echo "Nothing to commit."
            exit 0
          fi
          git commit -m "data: banzuke ${{ steps.fetch.outputs.basho_id }} (${{ steps.fetch.outputs.start_date }})"
          git pull --rebase origin main
          git push origin HEAD:main
```

Leave the step's `if:` as it is (`steps.fetch.outputs.changed == 'true' || steps.profiles.outputs.changed == 'true'`).

- [ ] **Step 3: Sanity-check the edited YAML**

Run the same node check as Task 1 Step 4. Additionally:
```bash
grep -n "Regenerate the mincho subset" .github/workflows/deploy.yml
grep -n "git diff --cached --quiet" .github/workflows/deploy.yml
```
Expected: one hit each.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: regenerate the mincho subset when the banzuke changes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 6: Use the face — `@font-face`, token order, preload

**Files:**
- Modify: `src/styles/base.css` (after the Archivo `@font-face`, ~line 24)
- Modify: `src/styles/tokens.css` (the `--font-jp-serif` declaration, ~line 61)
- Modify: `index.html` (after the Archivo preload)

**Interfaces:**
- Consumes: `public/assets/fonts/NotoSerifJP-700-subset.woff2` (Task 4).

- [ ] **Step 1: Confirm the token test will accept the edit**

Open `src/styles/tokens.test.ts` and confirm it parses colours only (it reads `tokens.css` and checks contrast pairs). It does not assert on font stacks; no test change is needed. If it does assert on `--font-jp-serif`, update that assertion to expect `'Noto Serif JP'` first.

- [ ] **Step 2: Declare the face**

In `src/styles/base.css`, after the Archivo `@font-face` block, add:

```css
/* Noto Serif JP (SIL OFL 1.1, see public/assets/fonts/NotoSerifJP-OFL.txt):
   instanced at 700 and subset to the glyphs the snapshot and source use, by
   scripts/subset-fonts.ts. One weight, because that is the only weight the
   app sets mincho at. Named as the upstream family so it slots into the
   stack where the system copy would have been, ahead of Hiragino and Yu
   Mincho, so every platform sees the same face on the Sheet. */
@font-face {
  font-family: 'Noto Serif JP';
  src: url('/assets/fonts/NotoSerifJP-700-subset.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: Put it first in the stack**

In `src/styles/tokens.css`, change the `--font-jp-serif` declaration to:

```css
  /* Japanese mincho for ring names and rank kanji, the calligraphic voice.
     The self-hosted subset (base.css) leads, so Windows and Android — which
     usually ship no mincho at all — render the Sheet the way macOS does. */
  --font-jp-serif:
    'Noto Serif JP', 'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'Yu Mincho', 'YuMincho',
    'Noto Serif CJK JP', 'MS PMincho', serif;
```

(The old list had `'Noto Serif JP'` sixth; it moves to first, and the rest keep their order.)

- [ ] **Step 4: Preload it**

In `index.html`, after the Archivo `<link rel="preload" …>` block, add:

```html
    <link
      rel="preload"
      href="%BASE_URL%assets/fonts/NotoSerifJP-700-subset.woff2"
      as="font"
      type="font/woff2"
      crossorigin
    />
```

- [ ] **Step 5: Build and confirm the asset ships**

Run: `npm run build && ls dist/assets/fonts/`
Expected: `NotoSerifJP-700-subset.woff2` is listed beside `Archivo-latin.woff2`, and `grep -c "NotoSerifJP-700-subset" dist/index.html` prints `1`.

- [ ] **Step 6: Look at it**

Run: `npm run dev` and open the site (Vite prints the URL). In DevTools → Network, filter `woff2`: `NotoSerifJP-700-subset.woff2` loads with status 200. In Elements, pick a ring name on the Sheet (a `.name` element with `lang="ja"`) → Computed → "Rendered Fonts" shows **Noto Serif JP**, not Yu Gothic / Meiryo. Toggle to Japanese (`L`) and check the masthead (令和八年九月場所) renders in the same face.

Stop the dev server.

- [ ] **Step 7: Checks and commit**

Run: `npm run validate && npm run test:run && npm run build`
Expected: pass (`check:css` passes: no new classes; `tokens.test` passes).

```bash
git add src/styles/base.css src/styles/tokens.css index.html
git commit -m "design: the Sheet sets its mincho from the self-hosted subset

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 7: A labelled, Makuuchi-only sample

**Files:**
- Create: `scripts/make-sample.ts`
- Modify: `package.json` (script `make-sample`)
- Regenerate: `public/sample-data.json`
- Test: `src/data/sample.test.ts`

**Interfaces:**
- Consumes: `validateSnapshot`, `snapshotBashoId`, `RawSnapshot` from `src/data/schema.ts`.
- Produces: `public/sample-data.json` — a valid `RawSnapshot` (version 2) with only `divisions.makuuchi`, whose `sources.en` and `sources.jp` begin with `Bundled sample`.

- [ ] **Step 1: Confirm the current duplication**

Run: `md5sum public/latest-banzuke.json public/sample-data.json` (Git Bash) — the two hashes are identical. This is what the task removes.

- [ ] **Step 2: Write the failing test**

Create `src/data/sample.test.ts`:

```ts
/**
 * public/sample-data.json is the last-resort fallback shown when the live
 * snapshot fails validation and nothing is cached. It must be valid on its
 * own, clearly labelled, and deliberately smaller than the live file so it
 * cannot be mistaken for it. Regenerate with `npm run make-sample`.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateSnapshot } from './schema'

const root = resolve(__dirname, '../..')
const sample: unknown = JSON.parse(readFileSync(resolve(root, 'public/sample-data.json'), 'utf8'))

describe('public/sample-data.json', () => {
  const result = validateSnapshot(sample)

  it('is a valid version 2 snapshot', () => {
    expect(result.ok).toBe(true)
  })

  it('carries Makuuchi only', () => {
    if (!result.ok) throw new Error(result.errors.join('; '))
    expect(result.snapshot.divisions.juryo).toBeUndefined()
    expect(result.snapshot.divisions.makuuchi.payloads.en.BanzukeTable.length).toBeGreaterThan(0)
  })

  it('says what it is in its sources', () => {
    if (!result.ok) throw new Error(result.errors.join('; '))
    const { sources } = result.snapshot.divisions.makuuchi
    expect(sources.en).toMatch(/^Bundled sample/)
    expect(sources.jp).toMatch(/^Bundled sample/)
  })

  it('is not a copy of the live snapshot', () => {
    const live = readFileSync(resolve(root, 'public/latest-banzuke.json'), 'utf8')
    const text = readFileSync(resolve(root, 'public/sample-data.json'), 'utf8')
    expect(text).not.toBe(live)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/data/sample.test.ts`
Expected: FAIL on "carries Makuuchi only" (juryo is present), "says what it is" (sources are URLs), and "is not a copy".

- [ ] **Step 4: Write the script**

Create `scripts/make-sample.ts`:

```ts
/**
 * Derives public/sample-data.json from a live snapshot.
 *
 * The sample is the app's last resort — shown only when the live file fails
 * validation and nothing is cached — so it must be valid on its own and must
 * not be a byte copy of the live file that just failed. It keeps Makuuchi
 * only (enough to render a full sheet; the division tabs hide when Juryo is
 * absent) and rewrites `sources` to say what it is. The Hero already prints
 * "Bundled sample data" when this file is in use.
 *
 * Usage:
 *   tsx scripts/make-sample.ts [--from <path>] [--out <path>]
 *
 * Exit codes: 0 success, 2 the input did not validate.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { snapshotBashoId, validateSnapshot, type RawSnapshot } from '../src/data/schema.ts'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const { values: args } = parseArgs({
  options: {
    from: { type: 'string', default: resolve(rootDir, 'public/latest-banzuke.json') },
    out: { type: 'string', default: resolve(rootDir, 'public/sample-data.json') },
  },
})

/** The sample: Makuuchi only, sources relabelled, everything else as fetched. */
export function deriveSample(live: RawSnapshot): RawSnapshot {
  const bashoId = snapshotBashoId(live)
  const { payloads, readings } = live.divisions.makuuchi
  const label = (lang: 'en' | 'jp') =>
    `Bundled sample derived from basho ${bashoId} (${live.divisions.makuuchi.sources[lang]})`
  return {
    version: 2,
    fetchedAt: live.fetchedAt,
    divisions: {
      makuuchi: {
        sources: { en: label('en'), jp: label('jp') },
        payloads,
        ...(readings ? { readings } : {}),
      },
    },
  }
}

async function main(): Promise<number> {
  const fromPath = resolve(args.from as string)
  const outPath = resolve(args.out as string)

  const parsed: unknown = JSON.parse(await readFile(fromPath, 'utf8'))
  const input = validateSnapshot(parsed)
  if (!input.ok) {
    console.error(`${fromPath} is invalid:`)
    for (const error of input.errors) console.error(`  - ${error}`)
    return 2
  }

  const sample = deriveSample(input.snapshot)
  const check = validateSnapshot(sample)
  if (!check.ok) {
    console.error('Derived sample is invalid:')
    for (const error of check.errors) console.error(`  - ${error}`)
    return 2
  }

  await writeFile(outPath, `${JSON.stringify(sample, null, 2)}\n`, 'utf8')
  const rows = sample.divisions.makuuchi.payloads.en.BanzukeTable.length
  console.log(`Wrote ${outPath}: basho ${snapshotBashoId(sample)}, makuuchi only, ${rows} rows`)
  return 0
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('Unexpected error:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
```

Add to `package.json` `scripts`, after `"subset-fonts"`:

```json
"make-sample": "tsx scripts/make-sample.ts",
```

- [ ] **Step 5: Generate the sample**

Run: `npm run make-sample`
Expected: `Wrote …/public/sample-data.json: basho 637, makuuchi only, 42 rows` (row count may include placeholder rows; 42–46 is normal). `ls -la public/sample-data.json` shows roughly half the previous 103 KB.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/data/sample.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 7: Confirm the app still falls back correctly**

Run: `npx vitest run src/hooks/useBanzuke.test.tsx`
Expected: PASS — the fallback test mocks fetch with fixtures and is unaffected; this confirms nothing about the sample path regressed.

- [ ] **Step 8: Checks and commit**

Run: `npm run validate && npm run test:run && npm run build`
Expected: pass.

```bash
git add scripts/make-sample.ts package.json public/sample-data.json src/data/sample.test.ts
git commit -m "data: the bundled sample is a labelled Makuuchi-only derivation

sample-data.json was byte-identical to latest-banzuke.json, so the fallback
for a broken live file was the same file. It is now derived by a script,
keeps Makuuchi only, and says what it is in its sources; a test guards all
three properties.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 8: Documentation

**Files:**
- Modify: `README.md` — "Project structure" tree (~lines 8–48), "Data refresh and deployment" (~lines 71–84), "Manual (local)" (~lines 95–103)
- Modify: `CLAUDE.md` — "Commands" block (~lines 14–23), "Data flow" paragraph on the deploy workflow (~line 40), "Things that look odd but are intentional" (~line 62 onward)

- [ ] **Step 1: README project structure**

In the tree under `public/`, replace the `assets/` lines with:

```
  sample-data.json           # Fallback: Makuuchi only, labelled (npm run make-sample)
  assets/
    FranSans-Solid.otf       # Wordmark font
    fonts/
      Archivo-latin.woff2            # Ring names and labels (Latin)
      NotoSerifJP-700-subset.woff2   # The Sheet's mincho, subset to the glyphs in use
      NotoSerifJP-subset.json        # Which glyphs; checked by a test
```

Under `scripts/`, add after `fetch-profiles.ts`:

```
  subset-fonts.ts              # Builds the mincho subset from the snapshot + source
  make-sample.ts               # Derives sample-data.json from the live snapshot
  lib/charset.ts               # Collects the Japanese glyph set
```

Under `.github/workflows/`, replace the single `deploy.yml` line with:

```
    deploy.yml                 # Refresh data, regenerate the font subset, build, deploy
    ci.yml                     # Validate, test, build on pull requests
```

- [ ] **Step 2: README data refresh section**

Replace the numbered list in "Data refresh and deployment" with:

```markdown
1. Fetches the English and Japanese banzuke for both divisions from sumo.or.jp and validates
   them (both languages present, same tournament, same wrestlers, sane row counts).
2. When the tournament data changed, regenerates the mincho subset (new wrestlers can bring
   new kanji) and refreshes wrestler profiles.
3. Commits `public/latest-banzuke.json`, `public/rikishi-profiles.json` and the font files to
   `main` when any of them changed (a fresh fetch timestamp alone is not a change).
4. Validates, tests and builds the site with the freshest valid data and deploys it to
   GitHub Pages.
```

Keep the following paragraph ("If sumo.or.jp is unreachable …") as it is.

- [ ] **Step 3: README manual section**

Replace the `Manual (local)` code block with:

```sh
npm run fetch-remote     # fetch, validate and write public/latest-banzuke.json
npm run subset-fonts     # rebuild the mincho subset after the data (or source) gains new kanji
npm run fetch-profiles   # scrape wrestler profiles into public/rikishi-profiles.json
npm run make-sample      # derive the labelled Makuuchi-only fallback from the live snapshot
npm run validate-data    # validate the committed snapshot
```

- [ ] **Step 4: CLAUDE.md commands**

In the `## Commands` block, after the `fetch-profiles` line, add:

```sh
npm run subset-fonts   # rebuild public/assets/fonts/NotoSerifJP-700-subset.woff2 + manifest
npm run make-sample    # derive public/sample-data.json (Makuuchi only, labelled) from the live file
```

- [ ] **Step 5: CLAUDE.md data flow**

Replace the paragraph beginning `The deploy workflow (`.github/workflows/deploy.yml`) refreshes data …` with:

```markdown
The deploy workflow (`.github/workflows/deploy.yml`) refreshes data on every push to `main`,
daily at 07:00 JST, and on demand. When the tournament data changed it also regenerates the
mincho subset and the profiles, and commits all of them to `main` before building. `ci.yml`
runs the checks on pull requests. There is no separate refresh workflow.
```

- [ ] **Step 6: CLAUDE.md "things that look odd"**

Replace the bullet that begins `` `public/sample-data.json` is a full snapshot `` with:

```markdown
- `public/sample-data.json` is the fallback when the live file fails validation and nothing is
  cached. It is **Makuuchi only** and its `sources` say "Bundled sample …" — derived by
  `npm run make-sample`, never copied by hand; `src/data/sample.test.ts` enforces all three
  properties. Do not make it a copy of `latest-banzuke.json` again.
```

Add a new bullet at the end of the list:

```markdown
- The Sheet's mincho is a **self-hosted subset**: `public/assets/fonts/NotoSerifJP-700-subset.woff2`
  carries only the Japanese characters found in the snapshot and the source, plus the kana
  blocks, at weight 700 (the only weight the app sets mincho at). `NotoSerifJP-subset.json`
  lists the glyphs and `scripts/lib/font-coverage.test.ts` fails when data or source gains a
  character the subset lacks — the fix is `npm run subset-fonts`, which the deploy job also runs
  whenever the banzuke changes. `'Noto Serif JP'` is first in `--font-jp-serif` on purpose, so
  Windows and Android render the Sheet the same as macOS.
```

- [ ] **Step 7: Format check and commit**

Run: `npm run validate`
Expected: pass (Prettier does not check `.md`, but this confirms nothing else drifted).

```bash
git add README.md CLAUDE.md
git commit -m "docs: pipeline, font subset and sample derivation

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg"
```

---

### Task 9: Final verification and hand-off

**Files:** none

- [ ] **Step 1: Full local gate**

Run: `npm run validate && npm run test:run && npm run test:tz && npm run build`
Expected: all pass. Report the exact test count and any warnings verbatim.

- [ ] **Step 2: Review the branch**

Run: `git log --oneline main..HEAD` — expect 8 commits (Tasks 1–8). Run `git diff --stat main..HEAD` and confirm no unintended files (in particular: no `.data/`, no `dist/`, no `node_modules/`).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin chore/day-1-foundations
gh pr create --title "Day 1 foundations: working data refresh, self-hosted mincho, honest sample" --body "$(cat <<'EOF'
## What

- **Pipeline**: installs the staged `Build & Deploy` workflow (fetch with `--if-changed`, fall back to the committed snapshot, commit changed data, build, deploy; daily at 07:00 JST) and `ci.yml`; deletes `refresh-banzuke.yml`, which called a script that does not exist and had failed on every run.
- **Mincho**: `--font-jp-serif` had no `@font-face`, so Windows/Android rendered the Sheet in gothic. Adds `scripts/subset-fonts.ts` (Noto Serif JP, OFL, instanced at 700, ~600 glyphs) and a coverage test; the deploy job regenerates the subset when the banzuke changes.
- **Sample**: `sample-data.json` was byte-identical to the live file. Now derived by `scripts/make-sample.ts`, Makuuchi only, labelled, guarded by a test.

## Verify

`npm run validate && npm run test:run && npm run build` — green locally.
`ci.yml` runs on this PR. After merge, `deploy.yml` runs on the push to `main`; the first run should report `changed=false` and deploy.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_011khxFdA2kEdBtw4ukCBNQg
EOF
)"
```

- [ ] **Step 4: Watch CI on the PR**

Run: `gh pr checks --watch`
Expected: the `CI / Validate, test, build` check passes. If it fails, read the log with `gh run view --log-failed` and fix on the branch; do not merge red.

- [ ] **Step 5: After merge — confirm the deploy pipeline actually runs**

Once the PR is merged (the user's call), run:
```bash
gh run list --workflow "Build & Deploy" --limit 3
gh run watch
```
Expected: a run triggered by the merge push; the `Refresh banzuke data` job logs `No changes: banzuke 637 …` and `changed=false`; `Build site` and `Deploy to GitHub Pages` succeed. Then open https://jonath0n.github.io/banzuke-app/ and repeat Task 6 Step 6's font check against production.

Then trigger the schedule path by hand once: `gh workflow run "Build & Deploy"` and confirm it completes the same way.

---

## Self-review

**Spec coverage.** Problem 1 (refresh never runs) → Tasks 1, 5, 8, 9. Problem 2 (mincho) → Tasks 2, 3, 4, 5, 6, 8. Problem 3 (sample) → Tasks 7, 8. Documentation claims that were false (README/CLAUDE.md refresh story) → Task 8.

**Placeholder scan.** No TBD/TODO. Every code step shows the code. Expected outputs are stated. Indicative numbers (glyph count, woff2 size) are labelled as such with a stop condition (>250 kB).

**Type consistency.** `fetchBytes(url, options?): Promise<Uint8Array>` (Task 2) is what Task 4 calls with `{ timeoutMs: 120_000 }` (a valid `FetchJsonOptions` field). `collectGlyphs(texts: Iterable<string>): string` and `missingGlyphs(available: string, texts: Iterable<string>): string[]` (Task 3) match their uses in Task 4's script and coverage test. The manifest keys written in Task 4 (`version, weight, file, glyphs, glyphCount`) are the ones the coverage test reads. `subsetFont(font: Uint8Array, text, options): Promise<Uint8Array>` in the `.d.ts` matches the call. `deriveSample(live: RawSnapshot): RawSnapshot` sets `divisions.makuuchi.sources.{en,jp}` to strings starting `Bundled sample`, which `sample.test.ts` asserts with `/^Bundled sample/`. Workflow output path `.data/assets/fonts/` maps to `public/assets/fonts/` via the existing artifact download into `public`.

**Known judgement calls (flag, not blockers).**
- If `subset-font`'s `variationAxes` fails to instance the Google variable TTF, fall back to downloading the static `NotoSerifCJKjp-Bold.otf` from `https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/Japanese/NotoSerifCJKjp-Bold.otf` (~23 MB) and drop the `variationAxes` option; everything else in Task 4 is unchanged.
- The woff2 may not be byte-deterministic across runs (Task 4 Step 8 measures this). If not, the deploy job will commit a fresh binary whenever the banzuke changes — six times a year — which is acceptable.
