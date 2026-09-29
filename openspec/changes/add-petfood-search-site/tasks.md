# Tasks

## 1. Openspec 驗收基線

- [x] 1.1 完成 proposal/spec/design/tasks 並通過 `openspec validate --change add-petfood-search-site`，以其作為驗收依據
- [x] 1.2 以 `ui-ux-pro-max --design-system` 產出設計語言定稿並記錄於實作（色票/字體/卡片與詳情資訊層級），驗證方式為設計定稿存在且頁面遵循

## 2. 資料管線（先修正規化，再修索引分片）

- [x] 2.1 實作 `scripts/fetch.ts`＋`src/lib/fetcher.ts` 雙源抓取含重試與 baseline 筆數防呆，驗證方式為 `pnpm run fetch` 產生 `data/raw-food.json`（約9999筆）與 `data/raw-vendors.json`（約4044筆）且 exit 0
- [x] 2.2 實作正規化（食品/犬貓歸一/廠商名歸一/業者）與單元測試，驗證方式為 `pnpm test` 中正規化測試全過且 `build-log.json` 含廠商 match 率與 top unmatched
- [x] 2.3 實作搜尋索引＋food/vendor 分片＋vendors 摘要，驗證方式為 `pnpm normalize` 產出 `search-index.json`、128 food shards、64 vendor shards 且每個 ID/name 可定位
- [x] 2.4 實作 `scripts/verify-release.ts`（分片數量/抽樣查找/頁面存在），驗證方式為 `pnpm verify` exit 0

## 3. 前端頁面

- [x] 3.1 首頁搜尋（MiniSearch 延遲載入＋種類/寵物/來源/原產地篩選＋分享網址），驗證方式為真實資料搜尋 `雞胸肉` 命中且篩選網址可還原
- [x] 3.2 食品詳情頁 `/food/`（殼頁＋分片載入＋廠商雙向連結），驗證方式為 `?id=F202605220056` 顯示正確欄位且廠商連到業者頁
- [x] 3.3 業者頁 `/vendor/`＋業者總覽 `/vendors`（登記資料＋名下食品＋過濾/排序），驗證方式為真實業者名下食品可列出且互相連結
- [x] 3.4 比較頁 `/compare`（最多3項＋分享網址），驗證方式為分享網址重開還原同表格
- [x] 3.5 關於資料頁＋全站導覽/頁尾/免責聲明＋375px 無水平捲動，驗證方式為 `pnpm build` 產出頁面存在且手動檢查通過

## 4. 整合驗收與部署

- [x] 4.1 跑通 `pnpm install`、`pnpm test`、`pnpm build`、`pnpm verify` 全綠，驗證方式為各指令 exit 0 的執行證據
- [x] 4.2 以真實抓取資料證明食品搜尋、食品詳情、業者瀏覽、業者總覽、分享網址正常運作，驗證方式為操作記錄或截圖對照 spec 場景
- [x] 4.3 建立 `.github/workflows/deploy.yml`（每週排程＋baseline 更新）並推送 `main`、啟用 Pages，驗證方式為 Actions 綠燈且公開網址可瀏覽
