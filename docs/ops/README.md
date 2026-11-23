# Workflow sources

The `.yml` files here are the source copies of `.github/workflows/`. To change a workflow:

1. Edit the file here (not under `.github/workflows/`) and merge it to `main` through a PR.
2. Dispatch **Apply ops workflows** (Actions tab, or `gh workflow run apply-ops.yml`; the `files`
   input takes bare names such as `deploy.yml`, empty means all). It validates each file, copies
   it into `.github/workflows/` with the deploy key and commits `ops: apply … from docs/ops`.
3. The run's summary shows the diff; applying `deploy.yml` starts a deploy of the new file, and
   that run going green is the check that it took.

`diff docs/ops/deploy.yml .github/workflows/deploy.yml` (and likewise for the others) should
print nothing once a change is applied.
