import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登录失败');
      localStorage.setItem('gobs_token', data.data.token);
      localStorage.setItem('gobs_user', JSON.stringify(data.data.user));
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '登录失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-4">
      <form onSubmit={(e) => void submit(e)} className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 shadow-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="GOBS" className="h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-lg font-semibold text-[var(--color-text)]">GOBS 登录</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            登录后可使用生成、剪辑、分发与 TikTok 矩阵等功能
          </p>
        </div>
        {err && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {err}
          </div>
        )}
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">用户名</label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm"
          placeholder="请输入用户名"
        />
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">密码</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm"
          placeholder="请输入密码"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-95 disabled:opacity-50"
        >
          {busy ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  );
}
