/**
 * 前端认证 API
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'gobs_token';
const USER_KEY = 'gobs_user';

export interface AuthUser {
  username: string;
  displayName: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** 后端统一响应格式 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || '登录失败');
    }
    const body = (await res.json()) as ApiResponse<LoginResponse>;
    // 兼容新格式 { success, data: { token, user } } 和旧格式 { token, user }
    const data = body.data ?? (body as unknown as LoginResponse);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data;
  },

  logout: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),

  isLoggedIn: (): boolean => !!localStorage.getItem(TOKEN_KEY),

  getUser: (): AuthUser | null => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },
};

