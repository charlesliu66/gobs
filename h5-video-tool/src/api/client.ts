const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gobs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * 返回用于 <video>/<img> 等无法携带 Bearer 的媒体接口的 file-access-token。
 * 登录时由后端下发并缓存在 localStorage。
 */
export function getFileAccessToken(): string {
  return localStorage.getItem('gobs_fat') ?? '';
}

/**
 * 在任意 URL 上附加 ?fat=<token>，供 `<video src>` / `<img src>` 使用。
 * 若 URL 已含 fat 查询参数或 token 不存在，则原样返回。
 */
export function appendFileAccessToken(url: string): string {
  if (!url) return url;
  const fat = getFileAccessToken();
  if (!fat) return url;
  if (url.includes('fat=') || url.includes('?u=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}fat=${encodeURIComponent(fat)}`;
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    localStorage.removeItem('gobs_token');
    localStorage.removeItem('gobs_user');
    localStorage.removeItem('gobs_fat');
    // 避免登录页自身循环跳转
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
}

function wrapFetchError(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (/Failed to fetch|NetworkError|network error|Load failed/i.test(msg)) {
    throw new Error('无法连接到服务器，请检查网络后重试');
  }
  throw e instanceof Error ? e : new Error(msg);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
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

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: getAuthHeaders(),
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

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
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

/**
 * 携带 JWT 鉴权头下载文件，通过 Blob URL 触发浏览器保存对话框。
 * 解决 <a href> 直接导航不带 Authorization 头导致 401 的问题。
 */
export async function apiDownload(path: string, filename: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: getAuthHeaders(),
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
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
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
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json() as Promise<T>;
}
