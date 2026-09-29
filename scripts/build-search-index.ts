import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MiniSearch from 'minisearch';
import type { PetFood } from '../src/types/petfood.js';
import { cjkBigramTokenizer } from '../src/lib/search-tokenizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const productsPath = path.join(projectRoot, 'data', 'products.json');
const indexOutPath = path.join(projectRoot, 'public', 'data', 'search-index.json');

function main() {
  console.log('[build-search-index] 開始產生搜尋索引...');

  if (!fs.existsSync(productsPath)) {
    console.error('[build-search-index] 找不到 products.json，請先執行 normalize');
    process.exit(1);
  }

  const products: PetFood[] = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

  const miniSearch = new MiniSearch({
    fields: ['name', 'materials', 'nutrients', 'vendorName', 'id', 'usagePets'],
    storeFields: ['id', 'name', 'item', 'source', 'origin', 'pets', 'usagePets', 'vendorName', 'vendorRegistered'],
    tokenize: cjkBigramTokenizer,
    searchOptions: {
      boost: { name: 3, vendorName: 2, materials: 1.5 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  miniSearch.addAll(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      materials: p.materials,
      nutrients: p.nutrients,
      vendorName: p.vendorName,
      usagePets: p.usagePets,
      item: p.item,
      source: p.source,
      origin: p.origin,
      pets: p.pets,
    }))
  );

  const outDir = path.dirname(indexOutPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(indexOutPath, JSON.stringify(miniSearch.toJSON()), 'utf8');

  const bytes = fs.statSync(indexOutPath).size;
  console.log(
    `[build-search-index] 索引完成：${products.length} 筆，${(bytes / 1024 / 1024).toFixed(2)} MB → ${indexOutPath}`
  );
}

main();
