import type { FoodSummary, PetKind } from '../types/petfood.js';

/** 精簡搜尋索引 v2：字典編碼 + 陣列列存，避免每筆重複鍵名與重複字串 */
export const SEARCH_INDEX_FORMAT = 2;

/** 文件列順序：[id, name, itemIdx, sourceIdx, originIdx, petsMask, usageIdx, vendorIdx, reg] */
export type CompactDocRow = [string, string, number, number, number, number, number, number, number];

export interface SearchIndexV2 {
  format: 2;
  version: string | null;
  count: number;
  items: string[];
  sources: string[];
  origins: string[];
  usages: string[];
  vendors: string[];
  docs: CompactDocRow[];
}

export interface LegacySearchIndex {
  version: string | null;
  count: number;
  docs: FoodSummary[];
}

const PET_BIT: Record<string, number> = { '犬': 1, '貓': 2, '其他': 4 };

export function petsToMask(pets: PetKind[] | undefined | null): number {
  let mask = 0;
  for (const p of pets ?? []) mask |= PET_BIT[p] ?? 0;
  return mask;
}

export function maskToPets(mask: number): PetKind[] {
  const out: PetKind[] = [];
  if (mask & 1) out.push('犬');
  if (mask & 2) out.push('貓');
  if (mask & 4) out.push('其他');
  return out;
}

function buildDict(values: (string | null | undefined)[]): { dict: string[]; indexOf: Map<string, number> } {
  const dict = [...new Set(values.map((v) => v ?? ''))].sort();
  return { dict, indexOf: new Map(dict.map((v, i) => [v, i])) };
}

export function encodeSearchIndex(docs: FoodSummary[], version: string | null): SearchIndexV2 {
  const itemD = buildDict(docs.map((d) => d.item));
  const sourceD = buildDict(docs.map((d) => d.source));
  const originD = buildDict(docs.map((d) => d.origin));
  const usageD = buildDict(docs.map((d) => d.usagePets));
  const vendorD = buildDict(docs.map((d) => d.vendorName));

  const rows: CompactDocRow[] = docs.map((d) => [
    d.id,
    d.name,
    itemD.indexOf.get(d.item ?? '') ?? 0,
    sourceD.indexOf.get(d.source ?? '') ?? 0,
    originD.indexOf.get(d.origin ?? '') ?? 0,
    petsToMask(d.pets),
    usageD.indexOf.get(d.usagePets ?? '') ?? 0,
    vendorD.indexOf.get(d.vendorName ?? '') ?? 0,
    d.vendorRegistered ? 1 : 0,
  ]);

  return {
    format: SEARCH_INDEX_FORMAT,
    version,
    count: docs.length,
    items: itemD.dict,
    sources: sourceD.dict,
    origins: originD.dict,
    usages: usageD.dict,
    vendors: vendorD.dict,
    docs: rows,
  };
}

export interface DecodedDoc extends FoodSummary {
  /** 預算的小寫全文搜尋字串（name/vendorName/id/usagePets/item），與舊版查詢語義一致 */
  _s: string;
}

export function buildSearchText(doc: Pick<FoodSummary, 'name' | 'vendorName' | 'id' | 'usagePets' | 'item'>): string {
  return `${doc.name || ''} ${doc.vendorName || ''} ${doc.id || ''} ${doc.usagePets || ''} ${doc.item || ''}`.toLowerCase();
}

function decodeRow(
  row: CompactDocRow,
  dicts: Pick<SearchIndexV2, 'items' | 'sources' | 'origins' | 'usages' | 'vendors'>,
): DecodedDoc {
  const [id, name, it, so, or, pm, us, ve, reg] = row;
  const doc: DecodedDoc = {
    id,
    name,
    item: dicts.items[it] ?? '',
    source: dicts.sources[so] ?? '',
    origin: dicts.origins[or] ?? '',
    pets: maskToPets(pm),
    usagePets: dicts.usages[us] ?? '',
    vendorName: dicts.vendors[ve] ?? '',
    vendorRegistered: reg === 1,
    _s: '',
  };
  doc._s = buildSearchText(doc);
  return doc;
}

/** 解碼索引 JSON（相容舊版物件陣列格式），回傳附 `_s` 的文件陣列 */
export function decodeSearchIndex(json: SearchIndexV2 | LegacySearchIndex): DecodedDoc[] {
  if (!json || !Array.isArray((json as { docs?: unknown }).docs)) return [];
  const first = (json as { docs: unknown[] }).docs[0];
  if (Array.isArray(first)) {
    const v2 = json as SearchIndexV2;
    return v2.docs.map((row) => decodeRow(row, v2));
  }
  return (json as LegacySearchIndex).docs.map((d) => ({ ...d, _s: buildSearchText(d) }));
}
