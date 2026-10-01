/**
 * 查詢斷詞：英數 token + CJK bigram。
 *
 * 舊版同時產生 unigram + bigram 做 AND 比對，但 unigram 是冗餘的：
 * 若某 CJK 片段的所有 bigram 都命中，片段內每個字必然命中（每個字都屬於某個 bigram）。
 * 因此長度 >= 2 的片段只取 bigram，只有單字片段才保留該單字，token 數直接減半。
 * 回傳前按長度由長到短排序，讓高選擇性的 token 先比對、早失敗早跳出。
 */
export function tokenizeQuery(text: string | null | undefined): string[] {
  if (!text) return [];
  const norm = text.toLowerCase();
  const tokens: string[] = [];
  tokens.push(...norm.split(/[^a-z0-9]+/i).filter(Boolean));
  const cjkSegs = norm.match(/[\u4e00-\u9fa5]+/g) || [];
  for (const seg of cjkSegs) {
    if (seg.length < 2) {
      tokens.push(seg);
    } else {
      for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2));
    }
  }
  // 去重 + 長者優先（早跳出）
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      uniq.push(t);
    }
  }
  uniq.sort((a, b) => b.length - a.length);
  return uniq;
}
