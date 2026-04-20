const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gobs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * 返回用于 <video>/<img> 等无法携带 Bearer 的媒体接口的 file-access-token。
 * 登录时由后端下发并缓存在 localStorage；若缺失（v0.60 之前登录的老用户）则懒加载补拉。
 */
export function getFileAccessToken(): string {
  return localStorage.getItem('gobs_fat') ?? '';
}

/**
 * 兼容：v0.60 前登录的用户 localStorage 里只有 gobs_token、没有 gobs_fat。
 * 对已登录态但缺 FAT 的情况，启动时异步拉取一次并写回，避免后续所有媒体 URL 缺参数 401。
 * 失败不抛错——后端已兼容 `?token=<jwt>` 旁路，老媒体 URL 仍可用。
 */
let _fatEnsurePromise: Promise<void> | null = null;
export function ensureFileAccessToken(): Promise<void> {
  if (_fatEnsurePromise) return _fatEnsurePromise;
  const token = localStorage.getItem('gobs_token');
  const existing = localStorage.getItem('gobs_fat');
  if (!token || existing) {
    _fatEnsurePromise = Promise.resolve();
    return _fatEnsurePromise;
  }
  _fatEnsurePromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/file-access-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { data?: { fileAccessToken?: string } };
      const fat = body?.data?.fileAccessToken?.trim();
      if (fat) localStorage.setItem('gobs_fat', fat);
    } catch {
      /* 后端已兼容 ?token=<jwt>，即使此处失败也能继续工作 */
    }
  })();
  return _fatEnsurePromise;
}

/**
 * 在任意 URL 上附加 ?fat=<token>，供 `<video src>` / `<img src>` 使用。
 * 若 URL 已含 fat 查询参数或 token 不存在，则原样返回。
 */
export function appendFileAccessToken(url: string): string {
  if (!url) return url;
  void ensureFileAccessToken();
  const fat = getFileAccessToken();
  if (fat) {
    if (url.includes('fat=') || url.includes('?u=') || url.includes('&u=')) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}fat=${encodeURIComponent(fat)}`;
  }
  // FAT 尚未就绪：用 JWT 作为兼容旁路（后端支持 ?token=<jwt>）
  const jwt = localStorage.getItem('gobs_token');
  if (jwt && !url.includes('token=')) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(jwt)}`;
  }
  return url;
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

/**
 * 带 errorCode 的 API 错误：后端 { error, errorCode } 的错误响应会被封装成该类。
 * 前端可用 `err instanceof ApiError && err.errorCode === 'DREAMINA_CONCURRENCY'`
 * 精确区分"并发排队"等可重试错误，而不依赖脆弱的字符串匹配。
 */
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
  throw new ApiError(b.error || res.statusText || '请求失败', {
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
      headers: getAuthHeaders(),
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
