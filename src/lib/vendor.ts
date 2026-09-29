import { cleanText } from './clean.js';

/**
 * 業者名稱正規化：去除前後空白、連續空白合併，並 strips 食品端常見的【...】前綴
 *（例：【公司】極寵有限公司 → 極寵有限公司）。不改大小寫與標點。
 */
export function normalizeVendorName(name: string | null | undefined): string {
  if (name == null) return '';
  return cleanText(name).replace(/^【[^】]*】/, '').trim();
}

/** 廠商分類代碼 → 顯示標籤（1=公司、3=個人；未知顯示代碼原文） */
export function vendorTypeLabel(legaltype: string | null | undefined): string {
  const code = (legaltype ?? '').trim();
  if (code === '1') return '公司';
  if (code === '3') return '個人';
  return code || '未載明';
}

export type VendorSortKey = 'food' | 'name';

export interface VendorFilterOptions {
  query: string;
  country: string;
}

const normQuery = (s: string) =>
  s.trim().replace(/[\s　]+/g, ' ').toLowerCase();

/** 業者總覽過濾：名稱子字串（英文不分大小寫）＋縣市同時生效 */
export function matchVendor(
  name: string,
  country: string,
  options: VendorFilterOptions
): boolean {
  if (options.country && country !== options.country) return false;
  const q = normQuery(options.query);
  if (!q) return true;
  return normQuery(name).includes(q);
}

/** 業者總覽排序：食品數多到少（預設），或名稱（zh-Hant） */
export function compareVendors(
  a: { name: string; foodCount: number },
  b: { name: string; foodCount: number },
  sortKey: VendorSortKey
): number {
  if (sortKey === 'name') return a.name.localeCompare(b.name, 'zh-Hant');
  return b.foodCount - a.foodCount || a.name.localeCompare(b.name, 'zh-Hant');
}
