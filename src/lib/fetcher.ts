import type { RawFoodRecord, RawVendorRecord } from '../types/petfood.js';

export const FOOD_ENDPOINT =
  'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=wxV177kLhEE3';
export const VENDOR_ENDPOINT =
  'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=6GNl6qsdx4nx';

export const EXPECTED_FOOD_FIELDS: (keyof RawFoodRecord)[] = [
  'ID',
  'fname',
  'fitem',
  'fsource',
  'fwcn',
  'fmat',
  'fnut',
  'fusage1',
  'fusage2',
  'fusage3',
  'forigin',
  'flegalname',
];

export const EXPECTED_VENDOR_FIELDS: (keyof RawVendorRecord)[] = [
  'ID',
  'legaltype',
  'legalname',
  'ownname',
  'legaltel',
  'legaladdress',
  'contactname',
  'legalcountry',
  'legalgzone',
];

export class FetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  fetchFn: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<any[]> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      const res = await fetchFn(url);
      if (!res.ok) {
        throw new FetchError(`HTTP error! status: ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      const data = JSON.parse(text.replace(/^\uFEFF/, ''));
      if (!Array.isArray(data)) {
        throw new FetchError('Response is not a JSON array');
      }
      return data;
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await sleep(delay);
      }
    }
  }

  throw new FetchError(
    `Failed to fetch from ${url} after ${maxRetries} retries. Last error: ${lastError?.message || lastError}`
  );
}

function checkFields(
  records: any[],
  expected: string[],
  label: string
): void {
  for (let i = 0; i < records.length; i++) {
    const missing = expected.filter((f) => !(f in records[i]));
    if (missing.length > 0) {
      throw new FetchError(
        `Validation failed: ${label} record at index ${i} is missing expected fields: ${missing.join(', ')}`
      );
    }
  }
}

/**
 * MOA TransService 已知回傳筆數上限。此值為平台限制，非可調參數；
 * 食品抓取若恰為此筆數即代表回應遭截斷，必須失敗而非寫入不完整快照。
 */
export const MOA_FOOD_RESPONSE_CEILING = 9999;

export interface SourceCheck {
  label: string;
  minAllowedDrop: number;
}

export function validateSource(
  records: any[],
  baselineCount: number | undefined,
  check: SourceCheck
): void {
  if (records.length === 0) {
    throw new FetchError(`Validation failed: No ${check.label} records fetched.`);
  }
  // 食品筆數恰為 MOA_FOOD_RESPONSE_CEILING 代表撞到平台已知回傳上限，資料不完整。
  // 此檢查刻意置於基準比較之前且不依賴 baselineCount：首次執行沒有
  // data/baseline.json 時若放行，截斷的 raw 快照會被當成完整資料寫入。
  if (check.label === 'food' && records.length === MOA_FOOD_RESPONSE_CEILING) {
    throw new FetchError(
      `Validation failed: ${check.label} records (${records.length}) hit the MOA TransService ` +
        `response ceiling of ${MOA_FOOD_RESPONSE_CEILING}, indicating a truncated response. ` +
        `No raw file was written.`
    );
  }
  if (baselineCount !== undefined && baselineCount > 0) {
    const minAllowed = baselineCount * (1 - check.minAllowedDrop);
    if (records.length < minAllowed) {
      throw new FetchError(
        `Validation failed: ${check.label} records (${records.length}) dropped by more than ${check.minAllowedDrop * 100}% compared to baseline (${baselineCount}).`
      );
    }
  }
}

export interface FetchAllOptions {
  maxRetries?: number;
  baselineFood?: number;
  baselineVendors?: number;
  fetchFn?: typeof fetch;
  onProgress?: (label: string, count: number) => void;
  /** 食品分段抓取每段筆數（TransService 實測 $top=10000 有效） */
  foodPageSize?: number;
}

/** 食品全量抓取：$top/$skip 分段迴圈，直到回傳筆數不足一段才停止 */
export async function fetchAllFood(
  options: FetchAllOptions = {}
): Promise<RawFoodRecord[]> {
  const {
    maxRetries = 3,
    baselineFood,
    fetchFn = fetch,
    onProgress,
    foodPageSize = 10000,
  } = options;

  const all: RawFoodRecord[] = [];
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const url = `${FOOD_ENDPOINT}&$top=${foodPageSize}&$skip=${skip}`;
    const chunk = (await fetchWithRetry(url, maxRetries, fetchFn)) as RawFoodRecord[];
    checkFields(chunk, EXPECTED_FOOD_FIELDS as string[], 'food');
    all.push(...chunk);
    if (onProgress) onProgress('food', all.length);
    if (chunk.length < foodPageSize) break;
    skip += chunk.length;
  }
  validateSource(all, baselineFood, { label: 'food', minAllowedDrop: 0.1 });
  return all;
}

export async function fetchAllSources(
  options: FetchAllOptions = {}
): Promise<{ food: RawFoodRecord[]; vendors: RawVendorRecord[] }> {
  const { maxRetries = 3, baselineFood, baselineVendors, fetchFn = fetch, onProgress } = options;

  if (onProgress) onProgress('food', 0);
  const food = await fetchAllFood({ maxRetries, baselineFood, fetchFn, onProgress, foodPageSize: options.foodPageSize });

  if (onProgress) onProgress('vendors', 0);
  const vendors = (await fetchWithRetry(VENDOR_ENDPOINT, maxRetries, fetchFn)) as RawVendorRecord[];
  checkFields(vendors, EXPECTED_VENDOR_FIELDS as string[], 'vendor');
  validateSource(vendors, baselineVendors, { label: 'vendors', minAllowedDrop: 0.1 });

  return { food, vendors };
}
