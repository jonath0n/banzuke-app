# Results freshness: the gate, the results-only run and the watcher (owner applies)

`.github/workflows/*` cannot be changed from the sessions that write this repository's code, so
workflow changes arrive as files beside this note, with the reasoning here. These two must be on
`main` before **Sunday 8 November 2026**, day 1 of the Kyushu basho:

| File in `docs/ops/` | Copy to |
|---|---|
| `deploy.yml` | `.github/workflows/deploy.yml` (replaces it) |
| `watch.yml`  | `.github/workflows/watch.yml` (new) |

`deploy.yml` here is the whole file, not a patch: it also carries the banzuke-day fixes that
were previously offered as `deploy-2026-10-banzuke-day.patch` (stables before the font subset,
the pinned source font cached, a failed cut keeping the committed subset, corrected comments),
so there is one thing to apply, and it is needed before **Monday 26 October** for the Kyushu
banzuke as much as before 8 November for its results.

## Why

During the September basho the day's results reached the site **4 to 8 hours** after the last
bout (median about 5 h 15 m). Not the JSA, not sumo-api (which has the day by ~18:15 JST), and
not the pipeline (about 2 minutes end to end): GitHub's shared cron scheduler created the evening
runs **3 h 20 m to 6 h 40 m late**, every day. Moving the slots off the hour (#60) did not help.

Two things GitHub does promptly: a `workflow_dispatch` starts within seconds, and the docs
guarantee that dispatches fired with `GITHUB_TOKEN` *always* create a run. So one long job can
stand in for a cron.

## What the files do

**`scripts/season-gate.mjs`** (already on `main`, plain Node, no install) reads the committed
snapshot and says where today stands: `phase` (upcoming / live / finished / out), `in_season`
(from the day before day 1 to three days after senshuraku — the same rule `fetch-results.ts`
applies), `day`, `basho_id`, `yyyymm`.

**`deploy.yml`** gains a `gate` job in front of `data`:

- *What this run is for.* A push, the 07:13 JST cron and a manual run with `mode=full` do
  everything as before. The three evening crons and a dispatch with `mode=results` are
  **results-only**: the data job skips the banzuke fetch, archive, fonts, stables and profiles
  and runs `fetch-results.ts` alone (about 40 seconds with the npm cache).
- *Out of season* a results-only run stops at the gate: no data job, no build, no deploy, about
  20 seconds.
- *Deploy only when something moved.* A results-only run whose fetch found nothing new skips the
  build and the deploy, so the watcher can dispatch freely.
- *Re-seed the watcher.* During a tournament, if no `watch.yml` run is in progress or queued,
  the gate starts one. This is the safety net under the chain.
- The banzuke-day fixes from the earlier patch, as above.

**`watch.yml`** is the watcher: one run checks out `main`, installs, and runs
`scripts/watch-results.ts` for up to 5 h 30 m. Every five minutes between 15:00 and 23:00 JST
it asks sumo-api for today's Makuuchi and Juryo cards and the live site for its results file, and
when sumo-api has **more decided bouts than the site shows** (or a card the site lacks), it
dispatches `deploy.yml` with `mode=results` — once per state, so a slow deploy is not
re-dispatched. Before it ends it dispatches its own successor, unless the script found the
season over, in which case the chain ends by itself. A daily seed cron at 14:17 JST starts the
chain (its lateness is harmless: it only has to start before the evening), and the gate restarts
it if it ever breaks. `concurrency: watcher` keeps it to one.

Expected lag from the last bout to the live site: **about 10 to 15 minutes** (up to 5 minutes
of polling, ~2.5 minutes of pipeline, and Pages' 10-minute `max-age`, which the site's own
5-minute re-poll (#91) rides out). The four crons stay as a last-resort backstop.

Minutes: about five watcher runs a day at ~5.6 hours each plus the dispatched deploys. Free on a
public repository; it would be ~900 minutes a tournament day on a private one.

## Apply it

```sh
git checkout main && git pull
cp docs/ops/deploy.yml .github/workflows/deploy.yml
cp docs/ops/watch.yml .github/workflows/watch.yml
git add .github/workflows
git commit -m "deploy: season gate, results-only runs, the in-season watcher; stables before fonts"
git push
```

The ruleset requires changes to `main` to come through a pull request; if the push is refused,
push to a branch and open the PR from there. CI on that PR does not exercise either workflow
(they only run on `main`), so the checks are the usual validate/test/build.

## Check it took (any day)

1. Actions → **Build & Deploy** → **Run workflow** → `mode: results`. Out of season the run
   completes in well under a minute with only the gate job run; `data`, `build` and `deploy`
   show as skipped.
2. Actions → **Watch for results** → **Run workflow**. Out of season it completes in about half a
   minute: `in_season=false`, "nothing to watch", and the handover step is skipped. No second
   run appears.
3. Actions → **Build & Deploy** → **Run workflow** → `mode: full`. The data job's step order must
   read: Fetch latest banzuke → … → Report shikona glossary gaps → **Refresh stables** → Cache the
   source font → Regenerate the mincho subset → Refresh wrestler profiles → Fetch tournament
   results. On a day the banzuke did not change, the font steps are skipped; that is expected.
   The build job should be green.

## On the day (Sunday 8 November, day 1)

- From 14:17 JST one **Watch for results** run should be in progress at all times; the Actions
  list shows them as a chain, each about 5.6 hours long.
- The Makuuchi card finishes around 18:00 JST. Within ten minutes a **Build & Deploy** run with
  `mode=results` should appear, started by `github-actions`, and `results/638.json` on the live
  site should move within ~15 minutes of the last bout:
  `curl -sI https://jonath0n.github.io/banzuke-app/results/638.json | grep -i last-modified`.
- The watcher's log lists every poll as `HH:MM:SS day N: upstream a/b, site c/d` and says
  "deploying" when it dispatched. If upstream stays at 0/21 past 18:30, sumo-api is late, not
  the pipeline.

## Measurements worth taking on day 1 (they feed the next round)

`npx tsx scripts/measure-upstream.ts` from about 17:30 JST on a tournament day appends a CSV line
every two minutes — the Tokyo time, how much of today's Makuuchi card sumo-api has decided, and how
much the live site shows with its `last-modified` — until both carry the whole card. Read-only.

1. First time the musubi's `winnerId` appears on sumo-api (the watcher's log shows the step).
2. Dispatch → `data` start → deploy end → first `last-modified` move on the site.
3. Whether the pre-recorded absences at 18:30 JST still read as day 1 (`day` in the file).

## When to retire the crons

Once the watcher has run a full tournament cleanly, the three evening crons in `deploy.yml` can
go; keep the 07:13 JST one for the banzuke. The watcher's seed cron stays.
