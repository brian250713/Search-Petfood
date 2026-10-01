# Proposal

## Why

`data-ingestion` 規格宣稱「食品筆數恰為 9999 時印出截斷警告但仍成功」，但實作在真實基準值下從來不會成功：警告印出後，緊接著的 10% 筆數下降檢查必然拋錯（baseline 102278 → 門檻 92050，9999 遠低於此），`pnpm run fetch` 直接以 exit code 1 結束。

規格承諾了一個程式碼不提供的行為。更糟的是警告訊息寫「已記錄並繼續」，與實際結果相反，會讓維護者以為截斷資料可以安全上線。這個特例在改成分頁抓取後已無意義：分頁是為了取得完整資料，截斷即代表資料不完整，沒有理由放行。

同一批審查也發現 `minisearch` 依賴與 `src/lib/search-tokenizer.ts` 早已無人使用，README 卻仍宣稱使用 MiniSearch 索引格式。

## What Changes

- **截斷語意改為失敗**：移除 `validateSource` 中針對食品筆數恰為 9999 的警告特例。筆數異常接近平台已知上限時，抓取以失敗結束，不寫入 `raw-food.json`。既有 10% 下降規則繼續作為主要防線。
- 警告訊息重寫：不再聲稱「已記錄並繼續」，改為明確說明 9999 是 MOA TransService 的已知回傳上限、代表資料不完整、抓取將中止。
- `data-ingestion` 規格的基準計數守則條款改寫，移除「印出警告但仍成功」的語意。
- **BREAKING**（測試面）：`tests/fetch.test.ts` 中以 `baselineFood: 9999` 為前提、斷言「不拋錯且有警告」的用例，改為斷言拋錯。該用例目前以基準值等於 9999 的方式掩蓋了真實基準下的失敗行為。
- 移除未使用的 `minisearch` 依賴（`package.json`）與 `src/lib/search-tokenizer.ts`（`cjkBigramTokenizer` 無任何引用，`index.astro` 有自帶的 inline 實作）。

不做的事：本次不新增「中途截斷」的偵測機制（例如逐頁記錄筆數、或連續滿頁時發警告）。選擇切斷即失敗本身就是承認無法可靠偵測中途截斷，而非假裝能偵測。此缺口維持已知，另行評估。

## Capabilities

### New Capabilities

無。

### Modified Capabilities

- `data-ingestion`: 「基準計數守則」需求中，食品筆數恰為 9999 的處理方式由「印出警告但仍成功」改為「視為平台截斷並失敗」。同時補上該需求的前置說明，說明此判斷在分頁抓取下的意義。

死程式碼移除（`minisearch` 依賴、未引用的 tokenizer 檔案）不影響任何規格行為，因此不列為能力變更。

## Impact

- 程式碼：`src/lib/fetcher.ts`（`validateSource` 的 9999 分支與註解）
- 規格：`openspec/specs/data-ingestion/spec.md`
- 測試：`tests/fetch.test.ts`（9999 用例語意反轉）
- 相依性：移除 `minisearch`（`package.json` dependencies），無程式碼引用它
- 刪除檔案：`src/lib/search-tokenizer.ts`
- 風險評估：**低**。真實基準（102278）下，改動前後 `pnpm run fetch` 遇到 9999 筆時都是 exit 1。本次變更不帶來新的偵測力，價值在於讓規格與訊息誠實、移除錯誤的安全感。若 `baseline.json` 不存在（首次執行）則兩種行為皆為放行，9999 攔截仍會生效並失敗。