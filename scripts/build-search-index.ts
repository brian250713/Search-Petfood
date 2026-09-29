import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PetFood } from '../src/types/petfood.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const productsPath = path.join(projectRoot, 'data', 'products.json');
const metaPath = path.join(projectRoot, 'data', 'meta.json');
const indexOutPath = path.join(projectRoot, 'public', 'data', 'search-index.json');

function main() {
  console.log('[build-search-index] 開始產生搜尋索引...');

  if (!fs.existsSync(productsPath)) {
    console.error('[build-search-index] 找不到 products.json，請先執行 normalize');
    process.exit(1);
  }

  const products: PetFood[] = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};

  // 精簡文件陣列：只保留卡片顯示與查詢比對所需欄位（長文本原料/營養成分不進索引，詳情由分片載入）
  const docs = products.map((p) => ({
    id: p.id,
    name: p.name,
    item: p.item,
    source: p.source,
    origin: p.origin,
    pets: p.pets,
    usagePets: p.usagePets,
    vendorName: p.vendorName,
    vendorRegistered: p.vendorRegistered,
  }));

  const outDir = path.dirname(indexOutPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(indexOutPath, JSON.stringify({ version: meta.fetchedAt ?? null, count: docs.length, docs }), 'utf8');

  const bytes = fs.statSync(indexOutPath).size;
  console.log(
    `[build-search-index] 索引完成：${docs.length} 筆，${(bytes / 1024 / 1024).toFixed(2)} MB → ${indexOutPath}`
  );
}

main();
