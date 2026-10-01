import { describe, it, expect, vi } from 'vitest';
import {
  fetchWithRetry,
  fetchAllFood,
  validateSource,
  FetchError,
  MOA_FOOD_RESPONSE_CEILING,
  EXPECTED_FOOD_FIELDS,
  EXPECTED_VENDOR_FIELDS,
} from '../src/lib/fetcher.js';

describe('fetchWithRetry', () => {
  it('retries transient failures then succeeds', async () => {
    const ok = { ok: true, text: async () => JSON.stringify([{ a: 1 }]) } as any;
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(ok);
    const data = await fetchWithRetry('http://x', 3, fn as any, async () => {});
    expect(data).toEqual([{ a: 1 }]);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after exhausting retries and rejects non-array', async () => {
    const instant = async () => {};
    const fn = vi.fn().mockRejectedValue(new Error('down'));
    await expect(fetchWithRetry('http://x', 2, fn as any, instant)).rejects.toThrow(FetchError);
    const notArray = vi.fn().mockResolvedValue({ ok: true, text: async () => '{}' } as any);
    await expect(fetchWithRetry('http://x', 0, notArray as any, instant)).rejects.toThrow(FetchError);
  });
});

describe('fetchAllFood', () => {
  const rec = (id: string) => ({
    ID: id,
    fname: `食品${id}`,
    fitem: '零食',
    fsource: '輸入',
    fwcn: '1公斤',
    fmat: '雞肉',
    fnut: '蛋白質',
    fusage1: '犬',
    fusage2: '存放',
    fusage3: '餵食',
    forigin: '台灣',
    flegalname: '測試公司',
  });

  it('loops segments until a short page', async () => {
    const pages = [[rec('A1'), rec('A2')], [rec('A3')]];
    const fn = vi.fn(async (url: string) => {
      const skip = Number(new URL(url).searchParams.get('$skip') || '0');
      const idx = skip / 2;
      const rows = pages[idx] ?? [];
      return { ok: true, text: async () => JSON.stringify(rows) } as any;
    });
    const all = await fetchAllFood({ foodPageSize: 2, fetchFn: fn as any });
    expect(all.map((r) => r.ID)).toEqual(['A1', 'A2', 'A3']);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('rejects when a later page is missing an expected field', async () => {
    // 首頁滿頁且合法；第二頁缺 flegalname，模擬 MOA 中途改 schema
    const missing = rec('B2') as any;
    delete missing.flegalname;
    const pages = [[rec('B1'), rec('B2')], [missing]];
    const fn = vi.fn(async (url: string) => {
      const skip = Number(new URL(url).searchParams.get('$skip') || '0');
      const rows = pages[skip / 2] ?? [];
      return { ok: true, text: async () => JSON.stringify(rows) } as any;
    });

    await expect(fetchAllFood({ foodPageSize: 2, fetchFn: fn as any })).rejects.toThrow(FetchError);
    await expect(fetchAllFood({ foodPageSize: 2, fetchFn: fn as any })).rejects.toThrow(/flegalname/);
  });

  it('fails when total drops >10% vs baseline', async () => {
    const fn = vi.fn(async () => ({ ok: true, text: async () => '[]' }) as any);
    await expect(fetchAllFood({ foodPageSize: 2, baselineFood: 100, fetchFn: fn as any })).rejects.toThrow(
      FetchError
    );
  });
});

describe('validateSource', () => {
  it('fails on empty and on >10% drop', () => {
    expect(() => validateSource([], 100, { label: 'food', minAllowedDrop: 0.1 })).toThrow();
    expect(() => validateSource(new Array(89), 100, { label: 'food', minAllowedDrop: 0.1 })).toThrow();
    expect(() =>
      validateSource(new Array(90), 100, { label: 'food', minAllowedDrop: 0.1 })
    ).not.toThrow();
  });

  // 傳入真實生產基準 102278，讓測試走 CI 實際的守衛順序：
  // 上限檢查先於基準比較，兩者都會拋錯，但訊息必須明確指出上限。
  it('fails when the food count hits the MOA response ceiling', () => {
    expect(() =>
      validateSource(new Array(MOA_FOOD_RESPONSE_CEILING), 102278, {
        label: 'food',
        minAllowedDrop: 0.1,
      })
    ).toThrow(/response ceiling of 9999/);
  });

  it('fails on the ceiling even without a baseline', () => {
    expect(() =>
      validateSource(new Array(MOA_FOOD_RESPONSE_CEILING), undefined, {
        label: 'food',
        minAllowedDrop: 0.1,
      })
    ).toThrow(/response ceiling of 9999/);
  });

  it('passes a legitimate count just above the ceiling', () => {
    const count = MOA_FOOD_RESPONSE_CEILING + 1;
    expect(() =>
      validateSource(new Array(count), count, { label: 'food', minAllowedDrop: 0.1 })
    ).not.toThrow();
  });
});

describe('expected fields', () => {
  it('covers real MOA keys', () => {
    expect(EXPECTED_FOOD_FIELDS).toContain('flegalname');
    expect(EXPECTED_FOOD_FIELDS).toContain('fusage1');
    expect(EXPECTED_VENDOR_FIELDS).toContain('legalname');
    expect(EXPECTED_VENDOR_FIELDS).toContain('legalcountry');
  });
});
