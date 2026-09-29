import { describe, it, expect, vi } from 'vitest';
import {
  fetchWithRetry,
  fetchAllFood,
  validateSource,
  FetchError,
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

  it('warns but passes on exactly 9999 food records', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() =>
      validateSource(new Array(9999), 9999, { label: 'food', minAllowedDrop: 0.1 })
    ).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
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
