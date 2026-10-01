import { tokenizeQuery } from './search-tokens.js';
import type { DecodedDoc } from './search-index.js';

export interface FilterState {
  query: string;
  item: string;
  pet: string;
  source: string;
  origin: string;
}

export function stateKey(state: FilterState): string {
  return [state.query, state.item, state.pet, state.source, state.origin].join('|');
}

/**
 * 純函式搜尋：便宜的結構化篩選先行縮小候選，再用預算的 `_s` 跑全文；
 * 無查詢無篩選時直接回傳原陣列，省掉一次 10 萬筆的全表配置。
 */
export function searchDocs(docs: DecodedDoc[], state: FilterState): DecodedDoc[] {
  const hasFilter = !!(state.item || state.pet || state.source || state.origin);
  const tokens = state.query ? tokenizeQuery(state.query) : [];
  if (!hasFilter && tokens.length === 0) return docs;

  let candidates = docs;
  if (hasFilter) {
    candidates = candidates.filter((doc) => {
      if (state.item && doc.item !== state.item) return false;
      if (state.pet && !(doc.pets || []).includes(state.pet as '犬' | '貓' | '其他')) return false;
      if (state.source && doc.source !== state.source) return false;
      if (state.origin && doc.origin !== state.origin) return false;
      return true;
    });
  }
  if (tokens.length > 0) {
    candidates = candidates.filter((doc) => {
      const allText = doc._s || '';
      return tokens.every((tok) => allText.includes(tok));
    });
  }
  return candidates;
}
