# Operations notes

Things the repository owner does by hand, because the sessions that write the code cannot push
to `.github/workflows/` or change repository settings.

| Note | When |
|---|---|
| [`branch-protection.md`](branch-protection.md) | Once: require the `Validate, test, build` check on `main`; stop Dependabot auto-merging. |
| [`results-freshness.md`](results-freshness.md) | Before **26 October 2026** (banzuke day) and **8 November 2026** (Kyushu day 1): copy `deploy.yml` and `watch.yml` into `.github/workflows/`. |

`deploy.yml` and `watch.yml` in this directory are the files to copy, kept here as complete files
so that applying them is a `cp`, and so a reviewer can read them whole.
