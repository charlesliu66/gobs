import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearPostLoginRedirect, consumePostLoginRedirect } from '../api/client';
import { useLocale } from '../i18n/LocaleContext.tsx';
import { buildLocaleHeaders } from '../i18n/locale.ts';
import { LocalePresetSwitcher } from '../components/LocalePresetSwitcher.tsx';

function normalizeAppRedirect(target: string | null | undefined): string {
  const value = (target || '').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/api/')) return '/';
  if (value.startsWith('/login')) return '/';
  return value;
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { uiLocale, contentLocale, t } = useLocale();
  const [from] = useState(() => {
    const queryFrom = new URLSearchParams(location.search).get('from');
    const stateFrom = (location.state as { from?: string } | null)?.from;
    return normalizeAppRedirect(stateFrom ?? queryFrom ?? consumePostLoginRedirect() ?? '/');
  });

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
        headers: {
          'Content-Type': 'application/json',
          ...buildLocaleHeaders(uiLocale, contentLocale),
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('login.failed'));
      localStorage.setItem('gobs_token', data.data.token);
      localStorage.setItem('gobs_user', JSON.stringify(data.data.user));
      if (typeof data.data.fileAccessToken === 'string' && data.data.fileAccessToken) {
        localStorage.setItem('gobs_fat', data.data.fileAccessToken);
      }
      clearPostLoginRedirect();
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('login.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] p-4">
      <form onSubmit={(e) => void submit(e)} className="relative w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-8 shadow-sm">
        <div className="absolute left-4 right-4 top-4 flex flex-wrap items-center justify-end gap-2">
          <LocalePresetSwitcher compact />
        </div>
        <div className="text-center mb-6">
          <img src="/logo.png" alt="GOBS" className="h-14 mx-auto mb-3 object-contain" />
          <h1 className="text-lg font-semibold text-[var(--color-text)]">{t('login.title')}</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {t('login.subtitle')}
          </p>
        </div>
        {err && (
          <div className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {err}
          </div>
        )}
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('login.username')}</label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm"
          placeholder={t('login.usernamePlaceholder')}
        />
        <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">{t('login.password')}</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm"
          placeholder={t('login.passwordPlaceholder')}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-95 disabled:opacity-50"
        >
          {busy ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
    </div>
  );
}
