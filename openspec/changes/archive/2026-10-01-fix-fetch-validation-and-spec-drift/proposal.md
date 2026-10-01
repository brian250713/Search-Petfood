# Proposal

## Why

程式碼審查（issue #1、#2）揭露兩類缺陷：分頁抓取只驗證首頁欄位，畸形資料會靜默污染 raw 快照；以及 `search-index.json` 的規格、README、首頁 placeholder 三處對「可搜尋欄位」的描述互相矛盾，其中兩處會讓使用者預期錯誤的搜尋結果（打原料名卻查無結果）。

這兩類問題都源自同一個 commit 群組（`d0abd64..2e09bbc`）在改成分頁抓取與精簡索引後，相關敘述沒有同步更新。

## What Changes

- `src/lib/fetcher.ts` 的 `fetchAllFood` 改為對**每一頁**回傳的紀錄執行欄位驗證，不再只驗首頁（`skip === 0` 條件移除）。若 MOA 在抓取中途變更 schema，第 2 頁以後的畸形紀錄會讓抓取失敗，而非寫入 `raw-food.json`。
- `src/pages/index.astro` 的搜尋框 placeholder 移除「原料（如雞胸肉）」，改為與實際可搜尋欄位一致（品名、廠商、序號、適用寵物、種類）。
- `openspec/specs/data-normalization/spec.md` 的索引輸出描述由 "MiniSearch-serializable documents" 改為實際的精簡文件陣列（`{version, count, docs}`），與 `food-search` 規格及 `scripts/build-search-index.ts` 一致。
- `README.md` 同步：搜尋範圍描述移除原料與營養成分；技術架構移除已不存在的 MiniSearch 索���格式說明。

不變更部分：`skip += chunk.length` 與 `+= foodPageSize` 在短頁即停止的條件下等價，本次不動。

## Capabilities

### New Capabilities

無。本次修正的是既有能力的既有需求，未引入新能力。

### Modified Capabilities

- `data-ingestion`: 新增「每一頁回傳的食品紀錄都必須通過欄位驗證」的需求。目前規格只規定分頁行為與重試，未規定欄位驗證範圍，因此實作只驗首頁並不違反現行條文——這是規格的空白，必須補上。
- `data-normalization`: `search-index.json` 的輸出格式描述過時（宣稱 MiniSearch 可序列化格式，實際為精簡文件陣列），兩份規格因此互相矛盾。

`food-search` 規格本身已是正確的（compact docs、`fmat`/`fnut` 不進索引），故不列入修改；首頁 placeholder 與 README 是**向既有規格看齊**，不是改變規格。

## Impact

- 程式碼：`src/lib/fetcher.ts`（1 處條件判斷）、`src/pages/index.astro`（1 行文字）
- 規格：`openspec/specs/data-normalization/spec.md`
- 文件：`README.md`（2 處）
- 相依性：無新增或移除
- 風險：欄位驗證套用至每一頁後，若真實資料的第 2 頁以後確實存在缺欄位紀錄，`pnpm run fetch` 將會失敗。這是預期行為（寧可失敗也不污染快照），但會改變 CI 的失敗條件，實作時需以真實資料驗證。