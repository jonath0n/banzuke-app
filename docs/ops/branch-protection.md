# Branch protection: never merge a red check again

Between 28 September and 1 October 2026 every deploy run (#128–#140) failed in its first ten
seconds, because two Dependabot majors (eslint 10, @eslint/js 10) had been merged while their CI
check was red. The site stopped refreshing for three days, and the Kyushu banzuke would have been
missed. One repository setting prevents the whole class of failure. These are the clicks; they
cannot be made from a pull request.

## 1. Require the CI check on `main`

1. Repository → **Settings** → **Rules** → **Rulesets** → open the existing ruleset that requires
   changes via pull request (it is the one the deploy key bypasses).
2. Under **Branch rules**, tick **Require status checks to pass**.
3. **Add checks** → search for `Validate, test, build` → select it. This is the job name in
   `.github/workflows/ci.yml` (`jobs.check.name`); the ruleset matches on that string, so renaming
   the job means updating this rule.
4. Tick **Require branches to be up to date before merging**, so a PR is re-tested against the
   `main` it will land on.
5. Leave **Bypass list** as it is — the deploy key must keep its bypass for the bot's data commits.
6. **Save changes**.

## 2. Turn off auto-merge if it is on

Settings → **General** → **Pull Requests** → untick **Allow auto-merge**. Dependabot cannot merge
on its own then even when a check happens to be green at the wrong moment.

## 3. Check it took

Open any Dependabot PR whose check is still running: the Merge button must read "Required
statuses must pass before merging". If it is enabled, step 1 did not save.

## What the repository side already does

- `.github/dependabot.yml` ignores **major** versions of the build and test toolchain (eslint and
  its plugins, vite and plugin-react, vitest and its coverage package, jsdom, typescript,
  @types/node, react). A major there is a migration and gets a hand-written PR. Minors and patches
  still arrive weekly in one grouped PR.
- GitHub Actions bumps are grouped, so `upload-artifact` and `download-artifact` move together.

## Running the deploy by hand

Actions → **Build & Deploy** → **Run workflow** → branch `main`. Use this after merging the
toolchain fix to confirm the pipeline reaches "Fetch latest banzuke" again, and any time the site
looks stale: the data job refetches everything, and the build job redeploys.
