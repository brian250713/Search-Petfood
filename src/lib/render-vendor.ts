import { escapeHtml } from './escape-html.js';
import { vendorUrl } from './url.js';

/** 業者名稱顯示：有登記資料加連結，否則純文字（未載明處理空白） */
export function renderVendorLink(name: string, registered: boolean): string {
  const display = name && name.trim() ? escapeHtml(name) : '未載明';
  if (!name || !name.trim() || !registered) return display;
  return `<a href="${vendorUrl(name)}">${display}</a>`;
}
