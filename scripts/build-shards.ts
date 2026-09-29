import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  PetFood,
  VendorDetail,
  FoodSummary,
  VendorSummary,
  FoodShard,
  VendorShard,
  VendorFoodEntry,
} from '../src/types/petfood.js';
import { shardOf, shardPath, FOOD_SHARDS, VENDOR_SHARDS } from '../src/lib/shard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const productsPath = path.join(projectRoot, 'data', 'products.json');
const vendorsPath = path.join(projectRoot, 'data', 'vendors.json');
const publicDataDir = path.join(projectRoot, 'public', 'data');
const foodShardsDir = path.join(publicDataDir, 'food');
const vendorShardsDir = path.join(publicDataDir, 'vendor');

function cleanAndEnsureDir(dir: string) {
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) {
      fs.unlinkSync(path.join(dir, file));
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function toSummary(p: PetFood): FoodSummary {
  return {
    id: p.id,
    name: p.name,
    item: p.item,
    source: p.source,
    origin: p.origin,
    pets: p.pets,
    usagePets: p.usagePets,
    vendorName: p.vendorName,
    vendorRegistered: p.vendorRegistered,
  };
}

export function buildShards() {
  console.log('[build-shards] 開始產生食品與業者分片...');

  if (!fs.existsSync(productsPath) || !fs.existsSync(vendorsPath)) {
    console.error('[build-shards] 找不到 products.json 或 vendors.json，請先執行 normalize');
    process.exit(1);
  }

  const products: PetFood[] = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const vendors: VendorDetail[] = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));

  cleanAndEnsureDir(foodShardsDir);
  cleanAndEnsureDir(vendorShardsDir);

  // 1. 食品分片（FOOD_SHARDS = 128）：id → 完整 PetFood
  const foodShards: FoodShard[] = Array.from({ length: FOOD_SHARDS }, () => ({}));
  for (const p of products) {
    foodShards[shardOf(p.id, FOOD_SHARDS)][p.id] = p;
  }

  let totalFoodBytes = 0;
  for (let i = 0; i < FOOD_SHARDS; i++) {
    const filePath = path.join(projectRoot, 'public', shardPath('food', i));
    const content = JSON.stringify(foodShards[i]);
    fs.writeFileSync(filePath, content, 'utf8');
    totalFoodBytes += Buffer.byteLength(content, 'utf8');
  }

  // 2. 業者分片（VENDOR_SHARDS = 64）：name → { vendor, foods }
  const foodsByVendor = new Map<string, FoodSummary[]>();
  for (const p of products) {
    if (!p.vendorName) continue;
    const list = foodsByVendor.get(p.vendorName) ?? [];
    list.push(toSummary(p));
    foodsByVendor.set(p.vendorName, list);
  }

  const vendorShards: VendorShard[] = Array.from({ length: VENDOR_SHARDS }, () => ({}));
  const summaries: VendorSummary[] = [];

  // 有登記資料的業者
  for (const v of vendors) {
    const foods = foodsByVendor.get(v.name) ?? [];
    const entry: VendorFoodEntry = { vendor: v, foods };
    vendorShards[shardOf(v.name, VENDOR_SHARDS)][v.name] = entry;
    summaries.push({
      name: v.name,
      typeLabel: v.typeLabel,
      country: v.country,
      zone: v.zone,
      foodCount: foods.length,
    });
  }
  // 食品有但業者資料無的名稱：不建分片條目；引用端以純文字顯示（見 food-detail spec）
  summaries.sort((a, b) => b.foodCount - a.foodCount || a.name.localeCompare(b.name, 'zh-Hant'));

  let totalVendorBytes = 0;
  for (let i = 0; i < VENDOR_SHARDS; i++) {
    const filePath = path.join(projectRoot, 'public', shardPath('vendor', i));
    const content = JSON.stringify(vendorShards[i]);
    fs.writeFileSync(filePath, content, 'utf8');
    totalVendorBytes += Buffer.byteLength(content, 'utf8');
  }

  // 3. 業者摘要（總覽頁建置時靜態內嵌）
  fs.writeFileSync(
    path.join(projectRoot, 'data', 'vendors-summary.json'),
    JSON.stringify(summaries, null, 2),
    'utf8'
  );

  const logPath = path.join(projectRoot, 'data', 'build-log.json');
  if (fs.existsSync(logPath)) {
    try {
      const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      logData.shards = {
        foodShards: FOOD_SHARDS,
        vendorShards: VENDOR_SHARDS,
        vendorSummaryCount: summaries.length,
        totalFoodBytes,
        totalVendorBytes,
        avgFoodBytes: Math.round(totalFoodBytes / FOOD_SHARDS),
        avgVendorBytes: Math.round(totalVendorBytes / VENDOR_SHARDS),
      };
      fs.writeFileSync(logPath, JSON.stringify(logData, null, 2), 'utf8');
    } catch {
      // 忽略 log 寫入失敗
    }
  }

  console.log('[build-shards] 分片產出完成：');
  console.log(
    `  - 食品分片: ${FOOD_SHARDS} 片，總大小 ${(totalFoodBytes / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(
    `  - 業者分片: ${VENDOR_SHARDS} 片，總大小 ${(totalVendorBytes / 1024 / 1024).toFixed(2)} MB`
  );
  console.log(`  - 業者摘要: data/vendors-summary.json，共 ${summaries.length} 家`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildShards();
}
