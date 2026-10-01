import { describe, it, expect } from 'vitest';
import { tokenizeQuery } from '../src/lib/search-tokens.js';

describe('tokenizeQuery', () => {
  it('returns empty for blank input', () => {
    expect(tokenizeQuery('')).toEqual([]);
    expect(tokenizeQuery(null)).toEqual([]);
    expect(tokenizeQuery(undefined)).toEqual([]);
  });

  it('keeps single-char CJK queries searchable', () => {
    expect(tokenizeQuery('雞')).toEqual(['雞']);
  });

  it('uses bigrams only for multi-char CJK segments (unigrams are redundant under AND)', () => {
    // 舊版會產生 [雞, 肉, 雞肉]，新版只留 bigram，AND 語義結果相同
    expect(tokenizeQuery('雞肉')).toEqual(['雞肉']);
    expect(tokenizeQuery('乾飼糧')).toEqual(['乾飼', '飼糧']);
  });

  it('keeps alphanumeric tokens intact', () => {
    expect(tokenizeQuery('F202609290033')).toEqual(['f202609290033']);
    expect(tokenizeQuery('A B C')).toEqual(['a', 'b', 'c']);
  });

  it('dedupes and orders longest-first for early exit', () => {
    // 「雞 肉」→ 去重後 [雞, 肉]；混有長 token 時長者優先
    expect(tokenizeQuery('雞肉 雞')).toEqual(['雞肉', '雞']);
    const toks = tokenizeQuery('皇家 乾飼糧');
    expect(toks).toHaveLength(3);
    for (let i = 1; i < toks.length; i++) {
      expect(toks[i - 1].length).toBeGreaterThanOrEqual(toks[i].length);
    }
  });
});
