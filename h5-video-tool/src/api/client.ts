import { getMessage } from '../i18n/messages.ts';
import {
  buildLocaleHeaders,
  getInitialContentLocale,
  getInitialUiLocale,
  readStoredContentLocale,
  readStoredUiLocale,
} from '../i18n/locale.ts';

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';
const POST_LOGIN_REDIRECT_KEY = 'gobs_post_login_redirect';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gobs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getLocaleHeaders(): Record<string, string> {
  const storage = typeof window === 'undefined' ? null : window.localStorage;
  const uiLocale = storage
    ? readStoredUiLocale(storage)
    : getInitialUiLocale(null, null);
  const contentLocale = storage
    ? readStoredContentLocale(storage, uiLocale)
    : getInitialContentLocale(null, uiLocale);
  return buildLocaleHeaders(uiLocale, contentLocale);
}

function getCurrentUiLocale() {
  const storage = typeof window === 'undefined' ? null : window.localStorage;
  return storage ? readStoredUiLocale(storage) : getInitialUiLocale(null, null);
}

export function clearAuthStorage(): void {
  localStorage.removeItem('gobs_token');
  localStorage.removeItem('gobs_user');
  localStorage.removeItem('gobs_fat');
}

export function clearPostLoginRedirect(): void {
  try {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  } catch {
    /* noop */
  }
}

function normalizeAppRedirect(target: string | null | undefined): string {
  const value = (target || '').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/api/')) return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}

function currentAppPath(): string {
  return normalizeAppRedirect(`${window.location.pathname}${window.location.search}${window.location.hash}`);
}

export function rememberPostLoginRedirect(target?: string): string {
  const next = normalizeAppRedirect(target ?? currentAppPath());
  try {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, next);
  } catch {
    /* noop */
  }
  return next;
}

export function consumePostLoginRedirect(): string | null {
  try {
    const next = normalizeAppRedirect(sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY));
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return next;
  } catch {
    return null;
  }
}

export function redirectToLogin(target?: string): void {
  const next = rememberPostLoginRedirect(target);
  clearAuthStorage();
  if (window.location.pathname.includes('/login')) return;
  window.location.assign(`/login?from=${encodeURIComponent(next)}`);
}

export function getFileAccessToken(): string {
  return localStorage.getItem('gobs_fat') ?? '';
}

let _fatEnsurePromise: Promise<void> | null = null;
export function ensureFileAccessToken(): Promise<void> {
  if (_fatEnsurePromise) return _fatEnsurePromise;
  const token = localStorage.getItem('gobs_token');
  const existing = localStorage.getItem('gobs_fat');
  if (!token || existing) return Promise.resolve();

  _fatEnsurePromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/file-access-token`, {
        headers: { Authorization: `Bearer ${token}`, ...getLocaleHeaders() },
      });
      if (res.status === 401) {
        redirectToLogin();
        return;
      }
      if (!res.ok) return;
      const body = (await res.json()) as { data?: { fileAccessToken?: string } };
      const fat = body?.data?.fileAccessToken?.trim();
      if (fat) localStorage.setItem('gobs_fat', fat);
    } catch {
      // Keep JWT query fallback available for transient network errors.
    } finally {
      _fatEnsurePromise = null;
    }
  })();

  return _fatEnsurePromise;
}

export function appendFileAccessToken(url: string): string {
  if (!url) return url;
  void ensureFileAccessToken();
  const fat = getFileAccessToken();
  if (fat) {
    if (url.includes('fat=') || url.includes('?u=') || url.includes('&u=')) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}fat=${encodeURIComponent(fat)}`;
  }

  const jwt = localStorage.getItem('gobs_token');
  if (jwt && !url.includes('token=')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(jwt)}`;
  }
  return url;
}

function triggerBrowserDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function isDirectDownloadCapable(path: string): boolean {
  return path.startsWith('/api/editor/export/download/');
}

function getFilenameFromDisposition(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || fallback;
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    redirectToLogin();
  }
}

function wrapFetchError(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  const uiLocale = getCurrentUiLocale();
  if (/Failed to fetch|NetworkError|network error|Load failed/i.test(msg)) {
    throw new Error(getMessage(uiLocale, 'errors.networkUnavailable'));
  }
  throw e instanceof Error ? e : new Error(msg);
}

export class ApiError extends Error {
  errorCode?: string;
  status?: number;

  constructor(message: string, opts?: { errorCode?: string; status?: number }) {
    super(message);
    this.name = 'ApiError';
    this.errorCode = opts?.errorCode;
    this.status = opts?.status;
  }
}

async function throwApiError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({ error: res.statusText }));
  const b = body as { error?: string; errorCode?: string };
  throw new ApiError(b.error || res.statusText || getMessage(getCurrentUiLocale(), 'errors.requestFailed'), {
    errorCode: b.errorCode,
    status: res.status,
  });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...getLocaleHeaders(),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    wrapFetchError(e);
  }
  handleUnauthorized(res);
  if (!res.ok) {
    await throwApiError(res);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...getAuthHeaders(),
        ...getLocaleHeaders(),
      },
    });
  } catch (e) {
    wrapFetchError(e);
  }
  handleUnauthorized(res);
  if (!res.ok) {
    await throwApiError(res);
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...getLocaleHeaders(),
    },
    body: JSON.stringify(body),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiDownload(path: string, filename: string): Promise<void> {
  if (isDirectDownloadCapable(path)) {
    await ensureFileAccessToken();
    const token = localStorage.getItem('gobs_token');
    const fat = getFileAccessToken();
    if (!fat && !token) return;
    triggerBrowserDownload(appendFileAccessToken(`${BASE_URL}${path}`), filename);
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        ...getAuthHeaders(),
        ...getLocaleHeaders(),
      },
    });
  } catch (e) {
    wrapFetchError(e);
  }
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const downloadName = getFilenameFromDisposition(res.headers.get('content-disposition'), filename);
  triggerBrowserDownload(url, downloadName);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...getLocaleHeaders(),
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    wrapFetchError(e);
  }
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      ...getLocaleHeaders(),
    },
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}
