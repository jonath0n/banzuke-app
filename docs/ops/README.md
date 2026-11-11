# Operations notes

The workflows live here as whole files and are applied to `.github/workflows/` by dispatching
**Apply ops workflows** (`apply-ops.yml`, see [`apply-ops.md`](apply-ops.md)), because the sessions
that write the code cannot push to `.github/workflows/` themselves. Repository settings are still
the owner's by hand.

| Note | When |
|---|---|
| [`branch-protection.md`](branch-protection.md) | Once: require the `Validate, test, build` check on `main`; stop Dependabot auto-merging. |
| [`apply-ops.md`](apply-ops.md) | Done (10 November 2026): how workflow files here reach `.github/workflows/`, and how to check a dispatch took. |
| [`ci.yml`](ci.yml) | Applied. The checks plus the Chromium smoke test job (`npm run test:e2e`). |
| [`results-freshness.md`](results-freshness.md) | Applied 10 November 2026: why `deploy.yml` has a season gate and results-only runs, and what `watch.yml` does. |

`deploy.yml`, `watch.yml`, `ci.yml` and `apply-ops.yml` in this directory are the source of truth for
`.github/workflows/`, kept as complete files so a reviewer can read them whole. Change one here by pull
request, then dispatch **Apply ops workflows** (`files` empty applies them all; the run's summary shows the
diff, and "Already applied" means the two directories already match).
