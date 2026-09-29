import { describe, it, expect } from 'vitest';
import { cleanText } from '../src/lib/clean.js';
import { shardOf, FOOD_SHARDS, VENDOR_SHARDS } from '../src/lib/shard.js';
import { foodUrl, vendorUrl, compareUrl } from '../src/lib/url.js';

describe('cleanText', () => {
  it('decodes entities and strips tags', () => {
    expect(cleanText('幼犬(三個月以上)＆amp  成犬')).toBe('幼犬(三個月以上)& 成犬');
    expect(cleanText('<b>雞肉</b>')).toBe('雞肉');
    expect(cleanText(null)).toBe('');
  });
});

describe('shards', () => {
  it('has expected counts and stable mapping', () => {
    expect(FOOD_SHARDS).toBe(128);
    expect(VENDOR_SHARDS).toBe(64);
    const s = shardOf('F202605220056', FOOD_SHARDS);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(FOOD_SHARDS);
    expect(shardOf('F202605220056', FOOD_SHARDS)).toBe(s);
  });
});

describe('urls', () => {
  it('builds page urls with base', () => {
    expect(foodUrl('F202605220056')).toBe('/Search-Petfood/food/?id=F202605220056');
    expect(vendorUrl('極寵有限公司')).toBe(
      `/Search-Petfood/vendor/?name=${encodeURIComponent('極寵有限公司')}`
    );
    expect(compareUrl(['a', 'b'])).toBe('/Search-Petfood/compare/?ids=a,b');
  });
});
