# Design

## Context

See proposal.md - Why for motivation.

Current wiring, as of the commit that closed issues #1 and #2:

```
build job (ubuntu-latest)                update-baseline job (ubuntu-latest)
  checkout                              checkout          <- raw-*.json absent (gitignored)
  pnpm install                          pnpm install
  1. pnpm run fetch        <- 82MB  /
  2. pnpm normalize                     pnpm run fetch   <- 82MB again
  3. pnpm test                          pnpm tsx scripts/update-baseline.ts
  4. pnpm build                         git add data/baseline.json
  5. pnpm verify                        git diff --quiet && ... || git commit
  upload-pages-artifact (./dist)        git push
deploy job <- needs build
update-baseline <- needs deploy
```

Constraints that shape the approach:

- `.gitignore` excludes `data/raw-food.json` and `data/raw-vendors.json` (they are ~82MB and ~950KB), so they cannot cross job boundaries through the repository.
- `update-pages-artifact` uploads only `./dist`, so the snapshots are not in the Pages artifact either. Note this is intentional per the spec: raw snapshots must never reach the published site.
- Jobs run on separate runners with no shared filesystem. The only in-run channel between jobs is the Actions artifact service.
- `permissions` must include `actions: write` in addition to `contents: write`, `pages: write`, `id-token: write`. Verified empirically in run 36805736882: the `update-baseline` job's `download-artifact@v4` step lists `Actions: write` in its GITHUB_TOKEN permissions, and the artifact listing required for the download fails without that scope. The original planning assumption that same-run artifact transfer needs no extra scope was wrong — corrected here so a future refactor does not remove that line.
- `scripts/update-baseline.ts` is a 24-line script that reads the two raw files and writes `data/baseline.json`. It has no fetch dependency of its own — the duplication comes purely from the workflow.
- `update-baseline` still needs `pnpm install`: it runs the script through `tsx`, which is a devDependency. Only the `pnpm run fetch` step is removable.

## Goals / Non-Goals

**Goals:**

- One upstream retrieval per run, and a baseline that provably describes the deployed data.
- Keep the deployment gates exactly as they are: baseline refresh stays gated on a successful deploy.

**Non-Goals:**

- Reworking `update-baseline.ts`, the fetch/normalize/build/verify sequence, or any spec-governed runtime behavior.
- Caching the fetch across *different* workflow runs. Cross-run caching would introduce a real staleness question (how old may cached MOA data be?) and is a separate decision with its own acceptance criteria.
- Moving the raw snapshots out of the build runner by changing how the site consumes data.

## Decisions

**Decision 1: Transfer the snapshots via a workflow artifact rather than a cache or a commit.**

- Alternative A: commit the raw snapshots between jobs. Rejected — they are git-ignored precisely because of size, and un-ignoring them would bloat the repository permanently.
- Alternative B: use `actions/cache`. Rejected — cache keys are content-addressed and shared across runs; using it as a job-to-job channel conflates "reuse stale data across days" with "hand this run's file to the next job", and the key would have to encode the run anyway, at which point it is an artifact with extra steps.
- Alternative C: combine the baseline refresh into the build job. Rejected — the baseline must not be committed unless the deployment actually succeeded. Keeping it in a `needs: deploy` job is what makes the existing gating correct; the duplication is the price of that guarantee and the artifact removes the price without weakening it.
- Chosen: artifact upload in `build`, artifact download in `update-baseline`.

**Decision 2: Upload after verification, not immediately after fetch.**

Placing the upload as the last build step means an artifact exists only for runs that passed tests, build, and verify. A failing run leaves no artifact for a downstream job to download — and since `update-baseline` is gated on `deploy`, which is gated on `build`, nothing would consume it anyway. Putting it here also keeps the artifact's contents identical to what was verified.

**Decision 3: Short artifact retention.**

The artifact exists only to bridge two jobs in one run. Retention of 1 day is ample; anything longer leaves 82MB of MOA data accumulating in the Actions artifact store for no reader.

**Decision 4: Preserve the existing empty-commit guard.**

The current step is:

```yaml
git add data/baseline.json
git diff --quiet && git diff --staged --quiet || git commit -m "..." && git push
```

The `||` is what makes a no-change run skip the commit, and `a1810b3` in the history shows it works: that commit contains a real 102278 → 102300 change, and the immediately preceding scheduled run left no commit because the counts matched. Rewriting this is not required by the change, so it stays as-is. The new `Baseline commit is content-gated` scenario pins the behavior so a future refactor cannot quietly drop it.

**Decision 5: Keep `pnpm install` in `update-baseline`.**

Only the fetch step is removable. The script runs via `tsx` (`pnpm tsx scripts/update-baseline.ts`), so the install step must stay. Removing it would trade one dependency-install for a broken script invocation.

## Risks / Trade-offs

- **[Artifact transfer of an 82MB file may be slow or may hit size limits] →** `actions/upload-artifact@v4` supports files of this size routinely; it compresses and stores them per-run. The saving comes from not re-running 11 paginated HTTP requests plus the retry/backoff logic, not from raw byte transfer being free. Mitigation: watch the duration of the first real run after merge and compare against the ~14min / ~8min timings of previous runs. If the download becomes the new bottleneck, the fallback is to have the build job upload only the two counts rather than the raw files — that would require `update-baseline.ts` to accept counts as input instead of reading files, which is a larger refactor and is why it is not the first choice here.
- **[If the upload step is added but a later build step fails, a partial artifact may exist] →** Harmless. `update-baseline` is gated on `deploy`, which is gated on `build`, so a failed build never reaches the download. Placement after verify minimizes even that window.
- **[The baseline now updates only when data changes] →** This is intended and is what the guard already did. `updatedAt` still moves on every successful deploy, but the commit only lands when a count actually changed, so history stays meaningful.
- **[The 10% drop guard and a self-updating baseline] →** Pre-existing, unchanged by this work: `update-baseline.ts` rewrites the baseline from each successful run, so a genuine 5% drop would be recorded as the new baseline and would not trip the guard on subsequent runs. This change makes the baseline *more* trustworthy, but it does not fix the drift-absorption behavior. That remains a separate, unaddressed problem — see Open Questions.
- **[YAML changes cannot be validated locally without running the workflow] →** There is no local runner for GitHub Actions in this repo. Mitigation: the first push to `main` is the test; if the download path or artifact name is wrong, `update-baseline` fails loudly and no baseline commit is made, so the failure mode is visible and non-destructive.

## Open Questions

- Whether the 10% drop guard should compare against a fixed historical floor rather than the previous run's count. This is a real gap but changing it alters `data-ingestion`'s baseline guard semantics and needs its own change and its own acceptance criteria. It is explicitly out of scope here.