# deploy.yml: the banzuke-day patch (owner applies)

`.github/workflows/deploy.yml` cannot be changed from the sessions that write this repository's
code, so workflow changes arrive as a patch file beside this note, with the reasoning here. This
one must be on `main` before **Monday 26 October 2026**, when the Kyushu banzuke is published.

## What it fixes

**The font subset was cut from the old stables file.** The data job regenerated the mincho subset
*before* it refreshed `stables.json`, and `scripts/subset-fonts.ts` read `public/stables.json` by a
fixed path. The build job then tests the subset against the stables file it is about to ship. So
the first new stablemaster whose name carries a kanji the subset lacks would have turned `main`
red on banzuke day — and a red `main` deploys nothing (see `branch-protection.md` for how that
went in September). The patch runs the stables refresh first and passes `--stables
.data/stables.json`, which #80 added to the script.

**The source font was whatever google/fonts `main` held that morning.** #80 pinned it to one
commit and the SHA-256 of its bytes; the patch caches that 13.6 MB file between runs
(`actions/cache`, keyed on the commit) so a banzuke day does not depend on a download.

**A failed cut no longer fails the run.** The subset step is `continue-on-error`, and a new step
copies the committed subset into place with a `::warning::` when the cut failed. That is only a
problem if the data really needed a new glyph, in which case the build job's coverage test says
so and the fix is `npm run subset-fonts` locally.

**Comments.** The header still described the schedule from before #60 ("once a day … twice a
day"); the first cron's comment said 22:00 for a 22:13 slot; a stray whitespace-only line sat
after the crons; the artifact comment named upload-artifact@v4 for a v7 step.

## Apply it

```sh
git checkout main && git pull
git apply docs/ops/deploy-2026-10-banzuke-day.patch
git diff --stat            # expect: .github/workflows/deploy.yml, ~111 lines
git commit -am "deploy: stables before fonts, pinned font cached, failed cut keeps the committed subset"
git push
```

The ruleset requires changes to `main` to come through a pull request; if the push is refused,
push to a branch and open the PR from there. CI on that PR does not exercise the deploy
workflow (that only runs on `main`), so the checks are the usual validate/test/build.

## Check it took

Actions → **Build & Deploy** → **Run workflow** → `main`. In the data job's log the step order
must read: Fetch latest banzuke → … → Report shikona glossary gaps → **Refresh stables** →
**Cache the source font** → **Regenerate the mincho subset** → Refresh wrestler profiles → Fetch
tournament results. On a day when the banzuke did not change, the font steps are skipped (their
`if` is "the banzuke changed"); that is expected. The build job should be green.

## When the banzuke lands (26 October, ~06:00 JST; the 07:13 JST cron usually runs ~09:30)

Look at the run's summary. A `::warning::` from "Keep the committed subset" means the cut failed;
if the build job is still green, nothing needed a new glyph. If the build job is red at
`scripts/lib/font-coverage.test.ts`, a new name needs a glyph: run `npm run subset-fonts`
locally (it fetches the pinned font once), commit `public/assets/fonts/*`, and push — the next
run deploys.
