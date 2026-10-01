# Proposal

## Why

The deploy workflow fetches the full MOA dataset twice per run: once in the `build` job that produces the deployed site, and again in the `update-baseline` job that writes `data/baseline.json`. Because the two jobs run on separate runners and the raw snapshots are git-ignored, the second job has no choice but to re-download them.

Besides wasting a full 82MB paginated fetch on every scheduled run, the duplication creates a real correctness hazard: `baseline.json` is derived from the *second* fetch while the deployed site was built from the *first*. If MOA adds records between the two calls, the baseline is written from data that was never deployed, so the next run's 10% drop guard compares against a count the live site never had.

## What Changes

- The `build` job uploads `data/raw-food.json` and `data/raw-vendors.json` as a workflow artifact after verification passes, with a short retention period.
- The `update-baseline` job downloads that artifact instead of running `pnpm run fetch`, then runs `update-baseline.ts` against the snapshots that were actually deployed.
- Result: one full MOA fetch per workflow run, and `baseline.json` is derived from exactly the data that shipped.

No change to `scripts/update-baseline.ts`, to the fetch/normalize/build/verify pipeline, or to any spec-governed runtime behavior.

## Capabilities

### New Capabilities

- `release-pipeline`: Define how the static site is built, verified, deployed, and how the fetch baseline used by the data-ingestion drop guard is refreshed, so that a scheduled run fetches MOA once and the recorded baseline always matches the data actually deployed.

### Modified Capabilities

None. `data-ingestion` governs runtime fetch behavior, which is unchanged. The duplication is a property of how the workflow is wired, not of any requirement those specs already state.

## Impact

- Workflow: `.github/workflows/deploy.yml` — one added step in `build`, one replaced step in `update-baseline`.
- Artifact transfer between jobs in the same run via `upload-artifact` / `download-artifact`. Verified in run 36805736882 that `download-artifact@v4` requires `actions: write` on the workflow `permissions` (the job's GITHUB_TOKEN lists `Actions: write`); the existing `contents: write` / `pages: write` / `id-token: write` alone is not sufficient. The original planning assumption to the contrary was wrong — corrected here.
- `update-baseline` keeps its `pnpm install` step: it still needs `tsx` to run the script, it just no longer needs the fetch.
- Expected effect on a scheduled run: roughly halves MOA API traffic and removes the baseline/deployment drift window.
- Not verified here: artifact upload of an 82MB file and the resulting download time. `update-artifact@v4` handles files of this size routinely, but the first real run should be watched.