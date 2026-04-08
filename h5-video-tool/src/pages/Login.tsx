import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useGobsAuth } from '../context/GobsAuthContext';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh, user, loading } = useGobsAuth();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [needsBootstrap, setNeedsBootstrap] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetch('/api/gobs-auth/bootstrap', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { needsBootstrap?: boolean }) => setNeedsBootstrap(Boolean(d.needsBootstrap)))
      .catch(() => setNeedsBootstrap(false));
  }, []);

  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [loading, user, from, navigate]);

  const submit = async (bootstrap: boolean) => {
    setErr(null);
    setBusy(true);
    try {
      if (bootstrap) {
        const res = await fetch('/api/gobs-auth/bootstrap', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '创建失败');
      } else {
        const res = await fetch('/api/gobs-auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '登录失败');
      }
      await refresh();
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '失败');
    } finally {
      setBusy(false);
    }
  };

  if (loading || needsBootstrap === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-muted)] text-sm">
        加载中…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 shadow-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="GOBS" className="h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            {needsBootstrap ? '创建首个管理员账号' : '登录 GOBS'}
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            登录后可使用生成、剪辑、分发与 TikTok 矩阵等功能
          </p>
        </div>
        {err && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {err}
          </div>
        )}
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">邮箱</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm"
        />
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">密码</label>
        <input
          type="password"
          autoComplete={needsBootstrap ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit(needsBootstrap)}
          className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-95 disabled:opacity-50"
        >
          {busy ? '请稍候…' : needsBootstrap ? '创建并进入' : '登录'}
        </button>
      </div>
    </div>
  );
}
