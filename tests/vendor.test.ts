import { describe, it, expect } from 'vitest';
import {
  normalizeVendorName,
  vendorTypeLabel,
  matchVendor,
  compareVendors,
} from '../src/lib/vendor.js';

describe('normalizeVendorName', () => {
  it('strips 【】 prefix and trims', () => {
    expect(normalizeVendorName('【公司】極寵有限公司')).toBe('極寵有限公司');
    expect(normalizeVendorName('  統一企業股份有限公司  ')).toBe('統一企業股份有限公司');
    expect(normalizeVendorName('A  LTD.')).toBe('A LTD.');
    expect(normalizeVendorName(null)).toBe('');
  });
});

describe('vendorTypeLabel', () => {
  it('maps codes', () => {
    expect(vendorTypeLabel('1')).toBe('公司');
    expect(vendorTypeLabel('3')).toBe('個人');
    expect(vendorTypeLabel('9')).toBe('9');
    expect(vendorTypeLabel('')).toBe('未載明');
  });
});

describe('matchVendor', () => {
  it('matches substring case-insensitively with county filter', () => {
    expect(matchVendor('統一企業股份有限公司', '臺南市', { query: '統一', country: '' })).toBe(true);
    expect(matchVendor('HUATA CO., LTD.', '臺北市', { query: 'huata', country: '' })).toBe(true);
    expect(matchVendor('統一企業股份有限公司', '臺南市', { query: '統一', country: '臺北市' })).toBe(false);
    expect(matchVendor('統一企業股份有限公司', '臺南市', { query: '不存在', country: '' })).toBe(false);
  });
});

describe('compareVendors', () => {
  it('sorts by food count desc then name', () => {
    const a = { name: '乙', foodCount: 5 };
    const b = { name: '甲', foodCount: 5 };
    const c = { name: '丙', foodCount: 9 };
    expect([a, b, c].sort((x, y) => compareVendors(x, y, 'food')).map((v) => v.name)).toEqual([
      '丙',
      '乙',
      '甲',
    ]);
  });
});
