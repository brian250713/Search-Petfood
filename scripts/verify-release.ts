import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { shardOf, FOOD_SHARDS, VENDOR_SHARDS } from '../src/lib/shard.js';
import { decodeSearchIndex } from '../src/lib/search-index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function fail(msg: string): never {
  console.error(`[verify] FAIL: ${msg}`);
  process.exit(1);
}

function main() {
  console.log('[verify] 開始驗證發佈產出...');

  // 1. 分片數量
  const foodDir = path.join(projectRoot, 'public', 'data', 'food');
  const vendorDir = path.join(projectRoot, 'public', 'data', 'vendor');
  const foodFiles = fs.existsSync(foodDir) ? fs.readdirSync(foodDir).filter((f) => f.endsWith('.json')) : [];
  const vendorFiles = fs.existsSync(vendorDir) ? fs.readdirSync(vendorDir).filter((f) => f.endsWith('.json')) : [];
  if (foodFiles.length !== FOOD_SHARDS) fail(`食品分片數 ${foodFiles.length}，預期 ${FOOD_SHARDS}`);
  if (vendorFiles.length !== VENDOR_SHARDS) fail(`業者分片數 ${vendorFiles.length}，預期 ${VENDOR_SHARDS}`);
  console.log(`[verify] 分片數量 OK：食品 ${foodFiles.length} / 業者 ${vendorFiles.length}`);

  // 2. 搜尋索引存在且非空，且可解碼、筆數與 products 一致
  const indexPath = path.join(projectRoot, 'public', 'data', 'search-index.json');
  if (!fs.existsSync(indexPath) || fs.statSync(indexPath).size === 0) fail('search-index.json 不存在或為空');
  const productsForIndex = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data', 'products.json'), 'utf8'));
  const decoded = decodeSearchIndex(JSON.parse(fs.readFileSync(indexPath, 'utf8')));
  if (decoded.length !== productsForIndex.length) {
    fail(`search-index 筆數 ${decoded.length}，預期 ${productsForIndex.length}`);
  }
  const sample = decoded[0];
  for (const key of ['id', 'name', 'item', 'source', 'origin', 'pets', 'usagePets', 'vendorName', 'vendorRegistered', '_s']) {
    if (!(key in sample)) fail(`search-index 缺少欄位 ${key}`);
  }
  console.log(
    `[verify] search-index.json OK（${decoded.length} 筆，${(fs.statSync(indexPath).size / 1024 / 1024).toFixed(2)} MB）`
  );

  // 3. 抽樣查找：products.json 前 3 筆 ID 可在對應分片找到；vendors-summary 前 3 家可在分片找到
  const products = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data', 'products.json'), 'utf8'));
  if (!Array.isArray(products) || products.length === 0) fail('products.json 為空');
  for (const p of products.slice(0, 3)) {
    const shardFile = path.join(foodDir, `${String(shardOf(p.id, FOOD_SHARDS)).padStart(3, '0')}.json`);
    const shard = JSON.parse(fs.readFileSync(shardFile, 'utf8'));
    if (!shard[p.id]) fail(`抽樣食品 ${p.id} 在分片中找不到`);
  }
  console.log(`[verify] 食品抽樣查找 OK（${products.length} 筆）`);

  const summaries = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'data', 'vendors-summary.json'), 'utf8')
  );
  if (!Array.isArray(summaries) || summaries.length === 0) fail('vendors-summary.json 為空');
  for (const s of summaries.slice(0, 3)) {
    const shardFile = path.join(vendorDir, `${String(shardOf(s.name, VENDOR_SHARDS)).padStart(3, '0')}.json`);
    const shard = JSON.parse(fs.readFileSync(shardFile, 'utf8'));
    if (!shard[s.name]) fail(`抽樣業者 ${s.name} 在分片中找不到`);
  }
  console.log(`[verify] 業者抽樣查找 OK（${summaries.length} 家）`);

  // 4. 頁面存在
  for (const page of ['index.html', 'food/index.html', 'vendor/index.html', 'vendors/index.html', 'compare/index.html', 'about-data/index.html']) {
    if (!fs.existsSync(path.join(projectRoot, 'dist', page))) fail(`dist 缺少 ${page}`);
  }
  console.log('[verify] 頁面存在 OK：index/food/vendor/vendors/compare/about-data');

  console.log('[verify] 全部檢查通過！');
}

main();
