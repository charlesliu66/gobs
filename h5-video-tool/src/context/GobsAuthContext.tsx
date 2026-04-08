import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { GobsSessionUser } from '../types/gobsAuth';

type GobsAuthState = {
  user: GobsSessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const GobsAuthContext = createContext<GobsAuthState | null>(null);

async function fetchSession(): Promise<GobsSessionUser | null> {
  const res = await fetch('/api/gobs-auth/session', { credentials: 'include' });
  if (!res.ok) return null;
  const data = (await res.json()) as { user?: GobsSessionUser | null };
  return data.user ?? null;
}

export function GobsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GobsSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setUser(await fetchSession());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch('/api/gobs-auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, logout }),
    [user, loading, refresh, logout],
  );

  return <GobsAuthContext.Provider value={value}>{children}</GobsAuthContext.Provider>;
}

export function useGobsAuth(): GobsAuthState {
  const ctx = useContext(GobsAuthContext);
  if (!ctx) throw new Error('useGobsAuth must be used within GobsAuthProvider');
  return ctx;
}
