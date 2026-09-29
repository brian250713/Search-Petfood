const DEFAULT_BASE = '/Search-Petfood';

/**
 * 取得當前應用程式的 base path (不含結尾斜線)
 */
export function getBase(): string {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (
    metaEnv &&
    typeof metaEnv.BASE_URL === 'string' &&
    metaEnv.BASE_URL !== '/'
  ) {
    return metaEnv.BASE_URL.replace(/\/+$/, '');
  }
  return DEFAULT_BASE;
}

/**
 * 將相對路徑補上 base path
 */
export function withBase(path: string): string {
  const base = getBase();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  if (!cleanPath) return base || '/';
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`;
}

/** 食品詳情頁連結 */
export function foodUrl(id: string): string {
  return `${withBase('food/')}?id=${encodeURIComponent(id)}`;
}

/** 業者頁連結 */
export function vendorUrl(name: string): string {
  return `${withBase('vendor/')}?name=${encodeURIComponent(name)}`;
}

/** 比較頁連結 */
export function compareUrl(ids: string[]): string {
  return `${withBase('compare/')}?ids=${ids.map(encodeURIComponent).join(',')}`;
}

/**
 * 資料檔案連結，可附帶快取版本號
 */
export function dataUrl(path: string, version?: string): string {
  const url = withBase(path);
  if (version) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${encodeURIComponent(version)}`;
  }
  return url;
}
