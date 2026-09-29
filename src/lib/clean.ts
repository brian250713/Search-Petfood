/** HTML 清理與空白正規化（寵物食品欄位含 &amp; 等跳脫與多餘空白） */
export function cleanText(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .replace(/＆amp;?/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .replace(/[\s　]+/g, ' ')
    .trim();
}
