# 寵物食品資訊查詢

整理農業部「寵物食品資料」與「寵物食品業者資料」開放資料的靜態查詢網站，給飼主快速查找、比較寵物食品，並從業者反查名下食品。

網站：https://brian250713.github.io/Search-Petfood/

## 功能

- **搜尋**：品名、廠商、序號、適用寵物與食品種類全文搜尋，可依食品種類、適用寵物（犬/貓）、產品來源、原產地篩選，篩選結果可用網址分享。原料與營養成分等長文本不進搜尋索引，請至食品詳情頁查看。
- **食品詳情**：`/food/?id=<序號>`，顯示種類、來源、包裝、原料、營養成分、適用寵物、使用/保存方法、原產地，廠商連到業者頁。
- **業者瀏覽**：`/vendor/?name=<業者名稱>`，顯示登記資料與名下所有食品，可依食品種類篩選。
- **業者總覽**：`/vendors`，列出全部業者，可依名稱快速過濾、縣市篩選與排序。
- **並排比較**：最多 3 項食品並排比較原料、營養成分與原產地，比較網址可分享。

食品與業者雙向互連：詳情頁廠商連到業者頁，業者頁食品連回詳情頁；未能串連的廠商名以純文字顯示。

## 技術架構

- [Astro](https://astro.build/) 靜態網站，部署在 GitHub Pages（base path `/Search-Petfood`）。
- 搜尋索引為精簡 JSON 文件陣列（含版本碼、筆數與每筆的卡片顯示欄位），延遲載入後於瀏覽器端以 CJK unigram + bigram token 過濾執行，不需後端服務。
- 詳情頁與業者頁是單一殼頁，瀏覽器依序號或業者名稱以 FNV-1a 雜湊算出分片，只下載需要的 JSON 分片（食品 128 片、業者 64 片）。
- 設計語言經 `ui-ux-pro-max` 定調：teal 主色＋暖橘點綴、圓潤字體與卡片。

### 資料流程

```
MOA TransService ──fetch──▶ data/raw-food.json、raw-vendors.json ──normalize──▶ data/products.json、vendors.json
                                                                              ├─▶ public/data/search-index.json
                                                                              └─▶ public/data/food/NNN.json、vendor/NNN.json
```

| 指令 | 說明 |
| --- | --- |
| `pnpm run fetch` | 雙源抓取，含重試與筆數檢查（對照 `data/baseline.json`，下降 >10% 即失敗） |
| `pnpm normalize` | 正規化欄位、犬貓歸一、廠商名歸一，產生搜尋索引與資料分片 |
| `pnpm build` | 建置 Astro 靜態網站到 `dist/` |
| `pnpm verify` | 檢查建置結果：分片數量、抽樣查找、頁面是否存在 |
| `pnpm test` | 執行單元測試（Vitest） |
| `pnpm lint` | TypeScript 型別檢查 |

## 本機開發

需要 Node.js 22 與 pnpm 10。

```
pnpm install
pnpm run fetch
pnpm normalize
pnpm dev
```

開發伺服器網址為 `http://localhost:4321/Search-Petfood/`。

## 部署

`.github/workflows/deploy.yml` 在推送到 `main`、每天 02:00 UTC 排程，或手動觸發時執行：抓取（每次執行只向 MOA 抓取一次全量資料） → 標準化 → 測試 → 建置 → 驗證 → 部署到 GitHub Pages。部署成功後，基準更新步驟會下載建置階段上傳的 raw 快照來更新 `data/baseline.json`，不再重新抓取，因此基準筆數即為實際部署的資料筆數。任一步驟失敗就不部署，線上版本維持不變。

## 資料來源與授權

- 資料來源：農業部「寵物食品資料」與「寵物食品業者資料」開放資料
- 資料授權：[政府資料開放授權條款](https://data.gov.tw/license)

## 免責聲明

本站內容整理自政府開放資料，適用寵物歸類為程式自動推斷、可能有誤，僅供查詢參考，不構成飼養或醫療建議。選購與餵食請諮詢獸醫師，並以主管機關公告為準。
