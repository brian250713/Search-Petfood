import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllSources } from '../src/lib/fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dataDir = path.join(projectRoot, 'data');
const baselinePath = path.join(dataDir, 'baseline.json');
const rawFoodPath = path.join(dataDir, 'raw-food.json');
const rawVendorsPath = path.join(dataDir, 'raw-vendors.json');

async function main() {
  console.log('[fetch] 開始執行寵物食品與業者資料擷取...');

  let baselineFood: number | undefined;
  let baselineVendors: number | undefined;
  if (fs.existsSync(baselinePath)) {
    try {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
      baselineFood = baseline.foodRecords;
      baselineVendors = baseline.vendorRecords;
      console.log(`[fetch] 基準筆數: 食品 ${baselineFood} / 業者 ${baselineVendors}`);
    } catch {
      console.warn('[fetch] 警告：無法解析 baseline.json，將不進行筆數下降檢查');
    }
  }

  try {
    const { food, vendors } = await fetchAllSources({
      baselineFood,
      baselineVendors,
      onProgress: (label, count) => console.log(`[fetch] 抓取 ${label} 中...累積 ${count} 筆`),
    });

    console.log(`[fetch] 抓取完成並通過防呆驗證！食品 ${food.length} 筆，業者 ${vendors.length} 筆。`);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(rawFoodPath, JSON.stringify(food), 'utf-8');
    fs.writeFileSync(rawVendorsPath, JSON.stringify(vendors), 'utf-8');
    console.log(`[fetch] 已寫入 raw-food.json 與 raw-vendors.json`);
  } catch (error: any) {
    console.error(`[fetch] 錯誤：資料擷取流程失敗 - ${error.message}`);
    process.exit(1);
  }
}

main();
