# Pending workflow changes

These files could not be pushed to `.github/workflows/` from the automated
session because its token lacks the `workflow` scope. Apply them by hand:

```bash
git mv .github/pending-workflows/deploy.yml .github/workflows/deploy.yml
git mv .github/pending-workflows/ci.yml .github/workflows/ci.yml
git rm .github/workflows/refresh-banzuke.yml
git rm -r .github/pending-workflows
```

What changes:

- `deploy.yml` becomes the single pipeline: on every push to `main`, daily at
  07:00 JST and on demand it fetches the latest banzuke (both divisions) and
  wrestler profiles, validates them, commits changed data to `main`, then
  validates, tests, builds and deploys the site. When sumo.or.jp is
  unreachable the committed snapshot is deployed instead, so a data hiccup
  never fails a deploy.
- `ci.yml` runs validate, data validation, tests with coverage, time-zone tests
  and a build on pull requests and non-`main` branches.
- `refresh-banzuke.yml` is no longer needed: its job is folded into
  `deploy.yml`, and its `schedule` trigger had never fired.
