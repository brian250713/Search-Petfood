import { describe, it, expect } from 'vitest';
import {
  encodeSearchIndex,
  decodeSearchIndex,
  petsToMask,
  maskToPets,
  buildSearchText,
} from '../src/lib/search-index.js';
import type { FoodSummary } from '../src/types/petfood.js';

const sampleDocs: FoodSummary[] = [
  {
    id: 'F0001',
    name: '雞肉乾飼糧',
    item: '乾飼糧',
    source: '輸入',
    origin: '台灣',
    pets: ['犬'],
    usagePets: '犬',
    vendorName: '極寵有限公司',
    vendorRegistered: true,
  },
  {
    id: 'F0002',
    name: '鮪魚罐頭',
    item: '罐頭',
    source: '製造、加工',
    origin: '',
    pets: ['犬', '貓'],
    usagePets: '犬貓',
    vendorName: '極寵有限公司',
    vendorRegistered: false,
  },
  {
    id: 'F0003',
    name: '潔牙骨',
    item: '',
    source: '',
    origin: '日本',
    pets: ['其他'],
    usagePets: '',
    vendorName: '',
    vendorRegistered: true,
  },
];

describe('pets mask', () => {
  it('round-trips pet kinds', () => {
    expect(maskToPets(petsToMask(['犬', '貓']))).toEqual(['犬', '貓']);
    expect(maskToPets(petsToMask(['其他']))).toEqual(['其他']);
    expect(maskToPets(petsToMask([]))).toEqual([]);
  });
});

describe('search index codec', () => {
  it('round-trips docs including empty fields', () => {
    const encoded = encodeSearchIndex(sampleDocs, 'v-test');
    expect(encoded.format).toBe(2);
    expect(encoded.count).toBe(3);
    const decoded = decodeSearchIndex(encoded);
    expect(decoded.map(({ _s, ...rest }) => rest)).toEqual(sampleDocs);
    for (const d of decoded) {
      expect(d._s).toBe(buildSearchText(d));
    }
  });

  it('decodes legacy object-array format', () => {
    const decoded = decodeSearchIndex({ version: null, count: 1, docs: [sampleDocs[0]] });
    expect(decoded[0].id).toBe('F0001');
    expect(decoded[0]._s).toContain('雞肉乾飼糧'.toLowerCase());
  });

  it('dedupes repeated strings into dicts', () => {
    const encoded = encodeSearchIndex(sampleDocs, null);
    expect(encoded.vendors).toContain('極寵有限公司');
    // 兩筆共用同一廠商，只存一次
    expect(encoded.vendors.filter((v) => v === '極寵有限公司')).toHaveLength(1);
  });
});
