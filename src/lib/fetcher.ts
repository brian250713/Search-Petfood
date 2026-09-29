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
  // 食品筆數恰為 9999 疑似平台截斷：警告但不中斷（TransService 為單次全量回傳，
  // 無分頁參數可續抓；筆數記入 baseline 供漂移偵測）。
  if (check.label === 'food' && records.length === 9999) {
    console.warn(
      '[fetch] 警告：食品筆數恰為 9999，可能為平台截斷上限，已記錄並繼續。'
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
  onProgress?: (label: string) => void;
}

export async function fetchAllSources(
  options: FetchAllOptions = {}
): Promise<{ food: RawFoodRecord[]; vendors: RawVendorRecord[] }> {
  const { maxRetries = 3, baselineFood, baselineVendors, fetchFn = fetch, onProgress } = options;

  if (onProgress) onProgress('food');
  const food = (await fetchWithRetry(FOOD_ENDPOINT, maxRetries, fetchFn)) as RawFoodRecord[];
  checkFields(food, EXPECTED_FOOD_FIELDS as string[], 'food');
  validateSource(food, baselineFood, { label: 'food', minAllowedDrop: 0.1 });

  if (onProgress) onProgress('vendors');
  const vendors = (await fetchWithRetry(VENDOR_ENDPOINT, maxRetries, fetchFn)) as RawVendorRecord[];
  checkFields(vendors, EXPECTED_VENDOR_FIELDS as string[], 'vendor');
  validateSource(vendors, baselineVendors, { label: 'vendors', minAllowedDrop: 0.1 });

  return { food, vendors };
}
