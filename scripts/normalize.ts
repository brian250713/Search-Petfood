import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  RawFoodRecord,
  RawVendorRecord,
  PetFood,
  VendorDetail,
  Meta,
} from '../src/types/petfood.js';
import { cleanText } from '../src/lib/clean.js';
import { normalizePets } from '../src/lib/pet.js';
import { normalizeVendorName, vendorTypeLabel } from '../src/lib/vendor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDir = path.join(projectRoot, 'data');

const rawFoodPath = path.join(dataDir, 'raw-food.json');
const rawVendorsPath = path.join(dataDir, 'raw-vendors.json');

const productsOutPath = path.join(dataDir, 'products.json');
const vendorsOutPath = path.join(dataDir, 'vendors.json');
const metaOutPath = path.join(dataDir, 'meta.json');
const logOutPath = path.join(dataDir, 'build-log.json');

function main() {
  console.log('[normalize] 開始執行寵物食品資料標準化...');

  if (!fs.existsSync(rawFoodPath) || !fs.existsSync(rawVendorsPath)) {
    console.error('[normalize] 找不到 raw-food.json 或 raw-vendors.json，請先執行 pnpm fetch');
    process.exit(1);
  }

  const rawFood: RawFoodRecord[] = JSON.parse(fs.readFileSync(rawFoodPath, 'utf8'));
  const rawVendors: RawVendorRecord[] = JSON.parse(fs.readFileSync(rawVendorsPath, 'utf8'));

  const skippedFood: { index: number; reason: string; id: string }[] = [];
  const productsById = new Map<string, { raw: RawFoodRecord; index: number }>();
  let duplicateFood = 0;

  for (let i = 0; i < rawFood.length; i++) {
    const raw = rawFood[i];
    const id = cleanText(raw.ID);
    const name = cleanText(raw.fname);
    if (!id || !name) {
      skippedFood.push({ index: i, reason: '空白 ID 或品名', id: String(raw.ID ?? '') });
      continue;
    }
    if (productsById.has(id)) duplicateFood++;
    productsById.set(id, { raw, index: i }); // 重複保留最後一筆
  }

  console.log(
    `[normalize] 食品原始 ${rawFood.length} 筆，略過 ${skippedFood.length} 筆，重複覆蓋 ${duplicateFood} 筆，有效 ${productsById.size} 筆。`
  );

  // 業者正規化（以正規化名稱為 key，重複保留最後一筆）——先建，供食品連結判定
  // 公司名稱空白的個人業者（legaltype=3）以負責人姓名登記，不覆蓋既有同名公司
  const vendorMap = new Map<string, VendorDetail>();
  let ownnameRegistered = 0;
  for (const raw of rawVendors) {
    const name = normalizeVendorName(raw.legalname);
    if (!name) {
      const fallback = normalizeVendorName(raw.ownname);
      if (fallback && !vendorMap.has(fallback)) {
        vendorMap.set(fallback, {
          id: cleanText(raw.ID),
          type: cleanText(raw.legaltype),
          typeLabel: vendorTypeLabel(raw.legaltype),
          name: fallback,
          owner: cleanText(raw.ownname),
          tel: cleanText(raw.legaltel),
          address: cleanText(raw.legaladdress),
          contact: cleanText(raw.contactname),
          country: cleanText(raw.legalcountry),
          zone: cleanText(raw.legalgzone),
        });
        ownnameRegistered++;
      }
      continue;
    }
    vendorMap.set(name, {
      id: cleanText(raw.ID),
      type: cleanText(raw.legaltype),
      typeLabel: vendorTypeLabel(raw.legaltype),
      name,
      owner: cleanText(raw.ownname),
      tel: cleanText(raw.legaltel),
      address: cleanText(raw.legaladdress),
      contact: cleanText(raw.contactname),
      country: cleanText(raw.legalcountry),
      zone: cleanText(raw.legalgzone),
    });
  }

  console.log(`[normalize] 業者原始 ${rawVendors.length} 筆，有效 ${vendorMap.size} 家。`);

  const products: PetFood[] = [];
  // 食品↔業者連結統計（normalize 階段即判定，供 UI 決定是否加連結）
  const unmatchedCounts = new Map<string, number>();
  let matchedProducts = 0;
  for (const [id, { raw }] of productsById.entries()) {
    const usagePets = cleanText(raw.fusage1);
    const vendorName = normalizeVendorName(raw.flegalname);
    const vendorRegistered = Boolean(vendorName) && vendorMap.has(vendorName);
    if (vendorRegistered) matchedProducts++;
    else if (vendorName) unmatchedCounts.set(vendorName, (unmatchedCounts.get(vendorName) || 0) + 1);
    const product: PetFood = {
      id,
      name: cleanText(raw.fname),
      item: cleanText(raw.fitem),
      source: cleanText(raw.fsource),
      packageSpec: cleanText(raw.fwcn),
      materials: cleanText(raw.fmat),
      nutrients: cleanText(raw.fnut),
      usagePets,
      usageMethod: cleanText(raw.fusage3),
      storageMethod: cleanText(raw.fusage2),
      origin: cleanText(raw.forigin),
      vendorRaw: cleanText(raw.flegalname),
      vendorName,
      vendorRegistered,
      pets: normalizePets(usagePets),
    };
    products.push(product);
  }

  // 食品↔業者連結統計彙總
  const distinctVendorNames = new Set(products.map((p) => p.vendorName).filter(Boolean));
  const matchedNames = [...distinctVendorNames].filter((n) => vendorMap.has(n));
  const topUnmatched = [...unmatchedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([name, count]) => ({ name, count }));

  const meta: Meta = {
    fetchedAt: new Date().toISOString(),
    normalizedAt: new Date().toISOString(),
    foodRecords: products.length,
    vendorRecords: vendorMap.size,
    matchedVendorNames: matchedNames.length,
    unmatchedVendorNames: distinctVendorNames.size - matchedNames.length,
  };

  const buildLog = {
    meta,
    skippedFoodCount: skippedFood.length,
    skippedFood,
    duplicateFood,
    ownnameRegistered,
    matchedProducts,
    topUnmatchedVendorNames: topUnmatched,
  };

  fs.writeFileSync(productsOutPath, JSON.stringify(products), 'utf8');
  fs.writeFileSync(vendorsOutPath, JSON.stringify([...vendorMap.values()], null, 2), 'utf8');
  fs.writeFileSync(metaOutPath, JSON.stringify(meta, null, 2), 'utf8');
  fs.writeFileSync(logOutPath, JSON.stringify(buildLog, null, 2), 'utf8');

  console.log('[normalize] 建置產出完成：');
  console.log(`  - 食品數: ${products.length}`);
  console.log(`  - 業者數: ${vendorMap.size}`);
  console.log(`  - 食品廠商連結率: ${matchedProducts}/${products.length}`);
  console.log(`  - 相符業者名: ${matchedNames.length}，未相符: ${distinctVendorNames.size - matchedNames.length}`);
}

main();
