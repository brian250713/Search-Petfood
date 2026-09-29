import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/** CI 發佈成功後更新筆數基準（以 raw 抓取筆數為準，與 fetch 防呆對照一致） */
const food = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data', 'raw-food.json'), 'utf8'));
const vendors = JSON.parse(fs.readFileSync(path.join(projectRoot, 'data', 'raw-vendors.json'), 'utf8'));

const baseline = {
  foodRecords: food.length,
  vendorRecords: vendors.length,
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(projectRoot, 'data', 'baseline.json'),
  JSON.stringify(baseline, null, 2),
  'utf8'
);
console.log(`[update-baseline] 已更新：食品 ${baseline.foodRecords} / 業者 ${baseline.vendorRecords}`);
