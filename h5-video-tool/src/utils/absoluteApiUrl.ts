/**
 * 将相对 API 路径转为服务端可拉取的绝对 URL（合并/Remix 时后端会请求这些地址下载成片）。
 */
export function absoluteApiUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (/^https?:\/\//i.test(s)) return s;
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  if (base) return `${base}${s.startsWith('/') ? s : `/${s}`}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${s.startsWith('/') ? s : `/${s}`}`;
  }
  return s;
}
