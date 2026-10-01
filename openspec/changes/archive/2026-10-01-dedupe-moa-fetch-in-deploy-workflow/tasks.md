# Tasks

> 實作來源說明：tasks 1.1–2.4 的 workflow 改動由 commit `73c6b72`
>（`ci: pass raw data via artifact to avoid double MOA fetch`，Fixes #3）
> 在本 change 建立後、apply 開始前直接合併至 `main` 並經 run `36805736882`
> 驗證成功；本 session 未重寫 `.github/workflows/deploy.yml`，
> 僅逐項比對該 commit 與 CI log 確認符合以下任務，並完成 3.1（README）、
> 4.x（驗證）與 5.x（首次執行驗收）。

## 1. Upload raw snapshots from the build job

- [x] 1.1 In `.github/workflows/deploy.yml`, add an `actions/upload-artifact@v4` step as the last step of the `build` job, uploading `data/raw-food.json` and `data/raw-vendors.json` under a single named artifact with `retention-days: 1`; verify the step is positioned after `pnpm verify` and before the Pages setup steps — done in `73c6b72` (step `Upload raw data for baseline`, `name: raw-data`, `retention-days: 1`, plus `if-no-files-found: error` beyond the original task); verified by reading the merged file
- [x] 1.2 Verify the workflow YAML parses and the job graph is unchanged: run a YAML parse check over the file and confirm `build` still has no `needs`, `deploy` still `needs: build`, and `update-baseline` still `needs: deploy` — parsed locally with `yaml.safe_load` (jobs: build/deploy/update-baseline, needs edges unchanged)
- [x] 1.3 Confirm the published Pages artifact is untouched by this addition: re-read the `upload-pages-artifact@v3` step and verify it still points only at `./dist`, so the raw snapshots cannot reach the live site — confirmed `path: './dist'` unchanged

## 2. Consume the artifact in the baseline job

- [x] 2.1 In `.github/workflows/deploy.yml`, add an `actions/download-artifact@v4` step to the `update-baseline` job before the baseline script runs, downloading the artifact named in 1.1 into `data/`; verify the resulting paths are `data/raw-food.json` and `data/raw-vendors.json` and not a nested artifact-named directory — done in `73c6b72`; run `36805736882` log proves correct landing (`Starting download of artifact to: .../Search-Petfood/data`, followed by `[update-baseline] 已更新：食品 102300 / 業者 4045`)
- [x] 2.2 Replace the `pnpm run fetch` invocation inside the update-baseline job's "Fetch and update baseline" step with `pnpm tsx scripts/update-baseline.ts`, and verify no `pnpm run fetch` call remains anywhere outside the `build` job — done in `73c6b72` (step renamed `Update baseline from build output`); confirmed by reading the merged file
- [x] 2.3 Keep the `update-baseline` job's `pnpm install` step (the script runs via `tsx`, a devDependency); verify by reading the job definition that only the fetch line was removed and the install remains — confirmed; run log shows `pnpm install` completing in 1.2s before the download step
- [x] 2.4 Verify the baseline commit guard is unchanged: re-read the `git add` / `git diff --quiet` / `||` / `git commit` / `git push` sequence and confirm it is byte-identical to before this change — confirmed byte-identical in `73c6b72` diff (that hunk is absent from the diff)

## 3. Documentation

- [x] 3.1 In `README.md`, update the deployment section to state that a workflow run retrieves MOA once and that the baseline is refreshed from the snapshots that produced the deployed site, instead of describing the flow as "抓取 → 標準化 → 測試 → 建置 → 驗證 → 部署" followed by a separate fetch; verify the description matches `.github/workflows/deploy.yml` step by step — done this session; deployment paragraph now states single fetch plus artifact-based baseline refresh

## 4. Spec sync

- [x] 4.1 Run `openspec validate --all --strict` and verify all specs plus this change report no errors — 8 passed / 0 failed (7 specs + 1 change)
- [x] 4.2 Confirm the new `release-pipeline` delta is registered under this change's `specs/release-pipeline/spec.md` with its `## Purpose` section present, and verify `openspec status --change dedupe-moa-fetch-in-deploy-workflow --json` shows every artifact `done` — delta file present with Purpose; artifacts 4/4 complete

## 5. First-run verification (after merge)

- [x] 5.1 After the change is pushed, watch the first workflow run and confirm the `update-baseline` job no longer logs fetch progress lines (the `累積 N 筆` messages) and completes faster than the previous full-fetch runs; verify by comparing the `update-baseline` job duration against the ~5m5s of run 36804596866 — run `36805736882`: no fetch lines under `update-baseline`, job duration ~9s (install 1.2s + download 1s + script 1s + git 2s); full run 10m31s → 4m25s
- [x] 5.2 Confirm the resulting `data/baseline.json` counts equal the record counts of the `data/raw-food.json` and `data/raw-vendors.json` used by that run's build job; verify by inspecting the run's artifact download and the committed baseline in the same run — build fetch logged `102300 筆 / 業者 4045 筆`; `update-baseline` logged `已更新：食品 102300 / 業者 4045`; same numbers from the same artifact
- [x] 5.3 Confirm the fetch count for the run is exactly one by checking that only the `build` job logs the `抓取 food 中...累積` progress lines; verify no second occurrence appears under the `update-baseline` job — confirmed: 13 progress lines, all under `build` → `1. Fetch data from MOA API`; zero under `update-baseline`
