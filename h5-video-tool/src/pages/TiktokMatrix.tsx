import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../api/client';

function resolveMatrixUrl(): string {
  const full = import.meta.env.VITE_SJ_MATRIX_BASE_URL?.trim();
  if (full) return full.replace(/\/$/, '');
  return `${window.location.origin}/sj`;
}

type BridgeState = 'loading' | 'bridging' | 'ready' | 'error';

export function TiktokMatrix() {
  const matrixUrl = resolveMatrixUrl();
  const [state, setState] = useState<BridgeState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const bridgeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    async function doBridge() {
      try {
        const res = await apiGet<{ success: boolean; data: { token: string } }>('/api/auth/matrix-bridge-token');
        if (cancelled) return;
        if (!res.success || !res.data?.token) {
          setErrorMsg('获取 bridge token 失败');
          setState('error');
          return;
        }

        const bridgeUrl = `${matrixUrl}/api/auth/gobs-bridge?token=${encodeURIComponent(res.data.token)}`;
        setState('bridging');

        // Use hidden iframe to set sj_auth cookie
        const iframe = bridgeRef.current;
        if (iframe) {
          iframe.onload = async () => {
            try {
              const sessionRes = await fetch(`${matrixUrl}/api/auth/session`, { credentials: 'include' });
              if (!sessionRes.ok) throw new Error(`矩阵会话校验失败(${sessionRes.status})`);
              const sessionBody = (await sessionRes.json()) as { user?: unknown };
              if (!sessionBody.user) throw new Error('矩阵会话未建立');
              if (!cancelled) setState('ready');
            } catch (e) {
              if (!cancelled) {
                setErrorMsg(e instanceof Error ? e.message : '矩阵会话校验失败');
                setState('error');
              }
            }
          };
          iframe.onerror = () => {
            if (!cancelled) {
              setErrorMsg('Bridge iframe 加载失败');
              setState('error');
            }
          };
          iframe.src = bridgeUrl;
        }

        // Timeout guard: prevent infinite loading when iframe silently hangs.
        timeoutId = window.setTimeout(() => {
          if (!cancelled) {
            setErrorMsg('桥接超时，请重试');
            setState('error');
          }
        }, 8000);
      } catch (err: unknown) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : '未知错误');
          setState('error');
        }
      }
    }

    doBridge();
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-500 text-sm">认证桥接失败: {errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm text-white"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Hidden bridge iframe */}
      <iframe ref={bridgeRef} style={{ display: 'none' }} title="bridge" />

      {state !== 'ready' && (
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
            <p className="text-sm text-[var(--color-text-muted)]">
              {state === 'loading' ? '获取认证...' : '正在桥接登录...'}
            </p>
          </div>
        </div>
      )}

      {state === 'ready' && (
        <iframe
          src={matrixUrl}
          className="w-full border-0"
          style={{ height: 'calc(100vh - 64px)' }}
          title="TikTok 矩阵管理"
          allow="clipboard-read; clipboard-write"
        />
      )}
    </div>
  );
}
