# Apply ops workflows: the last workflow you copy by hand (owner applies, once)

Every workflow change reaches this repository as a whole file under `docs/ops/`, because the
sessions that write the code push over a token without the `workflow` permission, and no token
with it can be given to them (the cloud environment's secret store refuses GitHub hosts). Until
now the owner copied each file into `.github/workflows/` by hand. `apply-ops.yml` does the copy
from inside Actions, where the deploy key can push workflow files, so after this one is in place
a workflow change is: merge the PR that updates `docs/ops/<name>.yml`, then dispatch
**Apply ops workflows**. The sessions can fire that dispatch themselves.

| File in `docs/ops/` | Copy to |
|---|---|
| `apply-ops.yml` | `.github/workflows/apply-ops.yml` (new) |

## What it does

1. Checks out `main` over SSH with `DEPLOY_KEY`, the same key the deploy job's data commits use.
2. Takes the `files` input (space-separated bare names, e.g. `deploy.yml watch.yml`), or every
   `.yml` under `docs/ops/` when the input is empty. Each must be a bare `.yml` name, exist, parse
   as YAML, and declare `on` and `jobs`; anything else fails the run before it touches a file.
3. Copies each into `.github/workflows/` and writes the diff to the job summary.
4. If anything changed, commits as `github-actions[bot]` with the subject
   `ops: apply <files> from docs/ops` and pushes to `main`. Nothing to apply means a green run
   that says "Already applied".

The commit carries **no** `[skip ci]` on purpose: applying `deploy.yml` starts a deploy run of
the new file, and that run going green is the check that the change took.

## Why it is safe enough

- It reads `docs/ops/` from `main` only, never from a branch. A workflow change still has to go
  through a pull request and the required CI check before it can be applied.
- Permissions are `contents: read`; the push is the deploy key's, which already bypasses the
  ruleset for the bot's data commits. This adds no new actor.
- The `concurrency` group keeps it to one run at a time, so two dispatches cannot race on `main`.
- What it adds is that anyone who can merge to `main` and dispatch a workflow can change CI
  without the `workflow` scope. In a single-owner repository with branch protection that is the
  owner, and the sessions the owner runs.

## Check it took

1. Actions → **Apply ops workflows** → **Run workflow** with `files` left empty. The run should
   be green and its summary should say "Already applied" for every file (the committed
   `deploy.yml`, `watch.yml` and `ci.yml` under `docs/ops/` are the ones meant to be on `main`).
   If instead it commits, that is the pending `docs/ops/` changes being applied, which is also
   what you want; read the diff in the summary.
2. From a session: `actions_run_trigger` on `apply-ops.yml` with `files: "deploy.yml"` and then
   read the run. If the token refuses the dispatch, the GitHub App lacks `actions: write` on the
   repository and the owner dispatches by hand.
