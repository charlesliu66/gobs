import { useCallback, useEffect, useRef, useState } from 'react';

/** TikTok 品牌绿（近似） */
const TT_GREEN = '#25F4EE';

function resolveMatrixUrl(): string {
  const full = import.meta.env.VITE_SJ_MATRIX_BASE_URL?.trim();
  if (full) return full.replace(/\/$/, '');
  const port = String(import.meta.env.VITE_SJ_MATRIX_PORT ?? '3000').trim() || '3000';
  return `http://${window.location.hostname}:${port}`;
}

function parseMatrixTcpTarget(base: string): { host: string; port: number } | null {
  try {
    const u = new URL(base.startsWith('http') ? base : `http://${base}`);
    const port = u.port ? parseInt(u.port, 10) : u.protocol === 'https:' ? 443 : 80;
    if (!Number.isFinite(port) || port <= 0) return null;
    return { host: u.hostname, port };
  } catch {
    return null;
  }
}

/**
 * 内嵌矩阵白屏的常见根因：
 * 1) 仅含 position:absolute 子元素的 flex 容器高度会塌成 0，iframe 实际不可见。
 * 2) React Strict Mode 双次 effect 导致免登与主框竞态。
 * 3) 免登 iframe onLoad 触发过早，Cookie 未就绪就打开首页。
 *
 * 对策：主区域用「flex + flex-1 + min-h-[…vh]」保证必有高度；bridge 用代数丢弃过期回调；
 * 免登后再延迟打开首页；底部保留新窗口打开作为兜底。
 */
export function TiktokMatrix() {
  const bridgeDoneRef = useRef(false);
  const baseRef = useRef<string>('');
  const creepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadTokenRef = useRef(0);
  const genRef = useRef(0);
  const mainSrcRef = useRef<string | null>(null);

  const [bridgeUrl, setBridgeUrl] = useState<string | null>(null);
  const [mainSrc, setMainSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusLine, setStatusLine] = useState('正在准备…');
  const [embedReady, setEmbedReady] = useState(false);

  const matrixBase = resolveMatrixUrl();

  useEffect(() => {
    mainSrcRef.current = mainSrc;
  }, [mainSrc]);

  /** 免登 iframe 长时间无 onLoad（矩阵未启动、端口错、被拦截）时的兜底 */
  useEffect(() => {
    if (!bridgeUrl || mainSrc) return;
    const myG = genRef.current;
    const tid = window.setTimeout(() => {
      if (genRef.current !== myG) return;
      if (mainSrcRef.current) return;
      const base = baseRef.current;
      if (!base) return;
      setErr(
        '矩阵免登超时：请确认本机已启动矩阵服务（默认端口 3000）、与下方「新窗口」能否打开一致；生产环境还需矩阵与 GOBS 的桥接密钥一致。',
      );
      setStatusLine('已跳过免登，尝试直接加载矩阵…');
      setProgress(100);
      setBridgeUrl(null);
      clearCreep();
      const u = new URL('/', base);
      u.searchParams.set('gobs_embed', '1');
      u.searchParams.set('t', String(Date.now()));
      setMainSrc(u.toString());
    }, 45_000);
    return () => window.clearTimeout(tid);
  }, [bridgeUrl, mainSrc]);

  const clearCreep = () => {
    if (creepRef.current) {
      clearInterval(creepRef.current);
      creepRef.current = null;
    }
  };

  const startCreep = (cap: number) => {
    clearCreep();
    creepRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= cap - 0.25) return p;
        return Math.min(cap - 0.25, p + 0.25 + Math.random() * 0.45);
      });
    }, 380);
  };

  const runBridge = useCallback(async (base: string) => {
    const myGen = ++genRef.current;
    bridgeDoneRef.current = false;
    baseRef.current = base;
    setEmbedReady(false);
    setErr(null);
    setBridgeUrl(null);
    setMainSrc(null);
    setProgress(6);
    setStatusLine('正在检查矩阵服务…');
    clearCreep();

    const tcp = parseMatrixTcpTarget(base);
    if (tcp) {
      const probe = await fetch(
        `/api/gobs-auth/matrix-tcp-probe?host=${encodeURIComponent(tcp.host)}&port=${encodeURIComponent(String(tcp.port))}`,
        { credentials: 'include' },
      );
      if (genRef.current !== myGen) return;
      const pj = (await probe.json().catch(() => ({}))) as { ok?: boolean; skipped?: boolean; host?: string; port?: number };
      if (probe.ok && !pj.skipped && pj.ok === false) {
        setErr(
          `无法连接矩阵：${tcp.host}:${tcp.port} 无进程监听（常见于矩阵 Next 未启动）。请在仓库根执行 npm run dev（同时起 api / matrix / ui），或单独终端：cd SJ/web && npm run dev（默认 :3000）。`,
        );
        setStatusLine('矩阵端口未就绪');
        setProgress(100);
        return;
      }
    }

    setStatusLine('正在获取免登令牌…');
    const res = await fetch('/api/gobs-auth/matrix-bridge-token', { credentials: 'include' });
    if (genRef.current !== myGen) return;

    const data = (await res.json().catch(() => ({}))) as { token?: string; error?: string };

    if (!res.ok) {
      setErr(data.error || '无法获取矩阵免登令牌（请确认已登录且具备 TikTok 矩阵权限）');
      setStatusLine('令牌失败，已尝试直接打开矩阵');
      setProgress(100);
      setMainSrc(`${base}/`);
      return;
    }
    const token = data.token;
    if (!token) {
      setErr('矩阵令牌为空');
      setStatusLine('已尝试直接打开矩阵');
      setProgress(100);
      setMainSrc(`${base}/`);
      return;
    }

    setProgress(28);
    setStatusLine('正在同步登录矩阵…');
    setBridgeUrl(`${base}/api/auth/gobs-bridge?token=${encodeURIComponent(token)}`);
    startCreep(68);
  }, []);

  const onHiddenBridgeLoad = () => {
    const base = baseRef.current;
    if (!base || bridgeDoneRef.current) return;
    bridgeDoneRef.current = true;
    clearCreep();
    setProgress(72);
    setStatusLine('正在加载矩阵界面…');
    startCreep(94);
    const my = ++loadTokenRef.current;
    window.setTimeout(() => {
      if (loadTokenRef.current !== my) return;
      const u = new URL('/', base);
      u.searchParams.set('gobs_embed', '1');
      u.searchParams.set('t', String(Date.now()));
      setMainSrc(u.toString());
    }, 420);
  };

  const onMainFrameLoad = () => {
    clearCreep();
    setProgress(100);
    setStatusLine('已加载');
    setEmbedReady(true);
  };

  useEffect(() => {
    const base = resolveMatrixUrl();
    void runBridge(base);
    return () => {
      clearCreep();
    };
  }, [runBridge]);

  const showHiddenBridge = Boolean(bridgeUrl && !mainSrc);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div
        className={`shrink-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 transition-all duration-300 ${
          embedReady ? 'max-h-0 overflow-hidden border-0 py-0 opacity-0' : 'opacity-100'
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
          <span className="truncate">{statusLine}</span>
          <span className="tabular-nums shrink-0">{Math.round(progress)}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-[width] duration-200 ease-out shadow-[0_0_8px_rgba(37,244,238,0.45)]"
            style={{ width: `${Math.min(100, progress)}%`, backgroundColor: TT_GREEN }}
          />
        </div>
      </div>

      {err && (
        <div className="shrink-0 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border-b border-amber-500/20 px-3 py-2">
          {err}
        </div>
      )}

      {/*
        关键：必须有「文档流」高度。仅用 absolute 填满会在父级无高度时变成 0×0 白屏。
        min-height 使用视口减侧栏/顶栏经验值，保证 iframe 始终有可渲染区域。
      */}
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ minHeight: 'min(100dvh, calc(100dvh - 3.5rem))' }}
      >
        {showHiddenBridge && (
          <iframe
            title="矩阵免登"
            src={bridgeUrl!}
            onLoad={onHiddenBridgeLoad}
            className="pointer-events-none fixed -left-[9999px] top-0 h-[2px] w-[2px] overflow-hidden border-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        )}

        {!mainSrc && !bridgeUrl && (
          <div className="flex flex-1 min-h-[240px] items-center justify-center px-4 text-sm text-[var(--color-text-muted)]">
            正在连接矩阵…
          </div>
        )}

        {!mainSrc && bridgeUrl && (
          <div className="flex flex-1 min-h-[240px] items-center justify-center px-4 text-sm text-[var(--color-text-muted)]">
            正在完成矩阵登录并拉取首页…
          </div>
        )}

        {mainSrc && (
          <iframe
            title="TikTok 矩阵"
            src={mainSrc}
            onLoad={onMainFrameLoad}
            className="block w-full flex-1 min-h-0 border-0 bg-[var(--color-surface-elevated)]"
            style={{ minHeight: 'min(70vh, calc(100dvh - 5rem))' }}
          />
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-center text-[11px] text-[var(--color-text-muted)]">
        若仍为空白，请
        <a
          href={matrixBase}
          target="_blank"
          rel="noreferrer"
          className="mx-1 text-[var(--color-primary)] underline"
        >
          在新窗口打开矩阵
        </a>
        （矩阵为 SJ/web，默认端口 3000；未起服务时请先在本仓库根目录 npm run dev）
      </div>
    </div>
  );
}
