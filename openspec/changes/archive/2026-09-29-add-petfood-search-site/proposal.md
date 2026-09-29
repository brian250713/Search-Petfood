# Proposal

## Why

飼主與業者查詢農業部寵物食品申報資料時，只能在官方申報網逐筆瀏覽，難以全文搜尋、比較產品，也難以從廠商反查其所有食品。本 change 以既有 `Search-VeterinaryDrug` 的 Astro 靜態站架構為範本，為「寵物食品資料」與「寵物食品業者資料」兩份開放資料建立可搜尋、可分享、可比較的查詢站。

## What Changes

- 從 MOA TransService 雙源抓取食品（約 9999 筆）與業者（約 4044 筆）資料，落地 `data/raw-*.json` 並以 `data/baseline.json` 做筆數防呆。
- 正規化食品欄位（種類、產品來源、適用寵物犬貓歸一、原產地、廠商名去 `【】` 前綴）與業者欄位，產出搜尋索引與 `food/`、`vendor/` JSON 分片。
- 首頁全文搜尋（品名、原料、營養成分、廠商），可依食品種類、適用寵物、產品來源、原產地篩選，篩選結果可用網址分享。
- 食品詳情頁 `/food/?id=`：顯示品名、種類、來源、包裝、原料、營養成分、適用寵物、使用/保存方法、原產地，廠商名連到業者頁。
- 業者頁 `/vendor/?name=`：顯示業者登記資料與名下所有食品，可依食品種類篩選；業者總覽頁 `/vendors`：列出全部業者，可依名稱過濾、縣市篩選與排序。
- 食品並排比較（最多 3 項，網址可分享）。
- 關於資料頁：資料來源、授權、更新時間與免責聲明。

## Capabilities

### New Capabilities

- `data-ingestion`：雙源抓取、重試、筆數防呆檢查。
- `data-normalization`：欄位正規化、犬貓歸一、廠商名歸一、索引與分片產出。
- `food-search`：首頁搜尋、篩選與分享網址。
- `food-detail`：食品詳情頁與業者互連。
- `vendor-browse`：業者頁、業者總覽頁與食品互連。
- `food-compare`：食品並排比較與分享網址。
- `data-attribution`：資料來源標示、授權與免責聲明。

### Modified Capabilities

（無既有 specs，本專案為新建。）

## Impact

- 新增 Astro 靜態站全部原始碼（`src/`、`scripts/`、`tests/`、`data/`、`.github/workflows/deploy.yml`），部署到 `brian250713/Search-Petfood` 的 GitHub Pages（base path `/Search-Petfood`）。
- 依賴：Astro 5、MiniSearch、pnpm 10、Node.js 22；執行期無後端，純靜態託管。
- 資料授權遵循政府資料開放授權條款，站上標示來源與免責聲明。
