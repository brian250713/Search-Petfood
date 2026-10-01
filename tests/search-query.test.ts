import { describe, it, expect } from 'vitest';
import { searchDocs, stateKey } from '../src/lib/search-query.js';
import type { DecodedDoc } from '../src/lib/search-index.js';
import { buildSearchText } from '../src/lib/search-index.js';

function makeDoc(over: Partial<DecodedDoc> & { id: string }): DecodedDoc {
  const d: DecodedDoc = {
    id: over.id,
    name: over.name ?? '',
    item: over.item ?? '',
    source: over.source ?? '',
    origin: over.origin ?? '',
    pets: over.pets ?? [],
    usagePets: over.usagePets ?? '',
    vendorName: over.vendorName ?? '',
    vendorRegistered: over.vendorRegistered ?? false,
    _s: '',
  };
  d._s = buildSearchText(d);
  return d;
}

const docs = [
  makeDoc({ id: 'F1', name: '雞肉乾飼糧', item: '乾飼糧', source: '輸入', origin: '台灣', pets: ['犬'], usagePets: '犬', vendorName: '甲公司', vendorRegistered: true }),
  makeDoc({ id: 'F2', name: '鮪魚罐頭', item: '罐頭', source: '輸入', origin: '台灣', pets: ['貓'], usagePets: '貓', vendorName: '乙公司', vendorRegistered: false }),
  makeDoc({ id: 'F3', name: '雞肉罐頭', item: '罐頭', source: '製造、加工', origin: '日本', pets: ['犬', '貓'], usagePets: '犬貓', vendorName: '甲公司', vendorRegistered: true }),
];

const blank = { query: '', item: '', pet: '', source: '', origin: '' };

describe('searchDocs', () => {
  it('returns the same array reference when no query and no filters', () => {
    expect(searchDocs(docs, blank)).toBe(docs);
  });

  it('filters by structured fields', () => {
    expect(searchDocs(docs, { ...blank, item: '罐頭' }).map((d) => d.id)).toEqual(['F2', 'F3']);
    expect(searchDocs(docs, { ...blank, pet: '貓' }).map((d) => d.id)).toEqual(['F2', 'F3']);
    expect(searchDocs(docs, { ...blank, item: '罐頭', pet: '犬' }).map((d) => d.id)).toEqual(['F3']);
    expect(searchDocs(docs, { ...blank, source: '輸入', origin: '台灣' }).map((d) => d.id)).toEqual(['F1', 'F2']);
  });

  it('combines full-text query with filters', () => {
    expect(searchDocs(docs, { ...blank, query: '雞肉' }).map((d) => d.id)).toEqual(['F1', 'F3']);
    expect(searchDocs(docs, { ...blank, query: '雞肉', item: '罐頭' }).map((d) => d.id)).toEqual(['F3']);
    expect(searchDocs(docs, { ...blank, query: '不存在的東西' })).toEqual([]);
  });

  it('builds stable cache keys', () => {
    expect(stateKey(blank)).toBe(stateKey({ ...blank }));
    expect(stateKey({ ...blank, query: '雞' })).not.toBe(stateKey(blank));
  });
});
