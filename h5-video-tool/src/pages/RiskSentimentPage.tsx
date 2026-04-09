import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('gobs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? {});
  for (const [k, v] of Object.entries(getAuthHeaders())) {
    headers.set(k, v);
  }
  return fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });
}

/** 经同源代理拉取 TikTok CDN 封面，避免防盗链导致灰块 */
function coverDisplaySrc(url?: string): string | undefined {
  const u = url?.trim();
  if (!u) return undefined;
  if (u.startsWith('data:') || u.startsWith('/api/')) return u;
  if (/^https?:\/\//i.test(u)) {
    return `/api/risk-sentiment/cover-proxy?url=${encodeURIComponent(u)}`;
  }
  return u;
}

function VideoCoverThumb({ url }: { url?: string }) {
  const u = url?.trim();
  const src = coverDisplaySrc(u);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [u]);
  if (!src || failed) {
    return <div className="h-14 w-11 shrink-0 rounded bg-zinc-200 dark:bg-zinc-800" title={u ? '封面加载失败' : '无封面'} />;
  }
  return (
    <img
      src={src}
      alt=""
      className="h-14 w-11 shrink-0 rounded object-cover bg-zinc-200 dark:bg-zinc-800"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

const WC_PALETTE = [
  'from-sky-500/20 to-indigo-500/15 text-sky-900 dark:text-sky-100',
  'from-violet-500/20 to-fuchsia-500/15 text-violet-900 dark:text-violet-100',
  'from-emerald-500/20 to-teal-500/15 text-emerald-900 dark:text-emerald-100',
  'from-amber-500/20 to-orange-500/15 text-amber-900 dark:text-amber-100',
];

/** 词云：胶囊标签 + 轻微旋转，按频次控制字号 */
function KeywordWordCloud({
  matrix,
  topics,
}: {
  matrix: Array<{ category: string; keywords: string[] }> | undefined;
  topics: Array<{ term: string; count: number }> | undefined;
}) {
  const items = useMemo(() => {
    const m = new Map<string, number>();
    const add = (w: string, weight: number) => {
      const k = w.trim();
      if (k.length < 2) return;
      m.set(k, (m.get(k) ?? 0) + weight);
    };
    for (const row of matrix ?? []) {
      for (const kw of row.keywords ?? []) add(kw, 2);
    }
    for (const t of topics ?? []) {
      const term = String(t?.term ?? '').trim();
      if (!term) continue;
      add(term, Math.max(1, Number(t.count) || 1));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  }, [matrix, topics]);

  if (!items.length) {
    return <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">暂无词频数据，刷新后可显示。</p>;
  }
  const max = items[0]?.[1] ?? 1;
  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-zinc-50/90 to-zinc-100/50 px-3 py-4 dark:from-zinc-900/40 dark:to-zinc-950/60">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)]" />
      <div className="relative flex min-h-[88px] flex-wrap content-center items-center justify-center gap-2">
        {items.map(([word, c], idx) => {
          const rel = max > 0 ? c / max : 1;
          const size = 12 + Math.round(11 * rel);
          const rot = ((word.charCodeAt(0) + idx * 7) % 11) - 5;
          const pal = WC_PALETTE[idx % WC_PALETTE.length];
          return (
            <span
              key={word}
              style={{ fontSize: `${size}px`, transform: `rotate(${rot}deg)` }}
              className={`inline-block rounded-full bg-gradient-to-br px-2.5 py-1 font-medium shadow-sm ring-1 ring-black/5 dark:ring-white/10 ${pal}`}
              title={`出现权重 ${c}`}
            >
              {word}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type SentimentLabel = 'positive' | 'neutral' | 'negative';

type RiskSnapshot = {
  game: string;
  days: 7 | 14 | 30;
  keywords: string[];
  limit: number;
  updatedAt: number;
  overview: {
    score: number;
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    helperText: string;
    positiveSummary?: string;
    neutralSummary?: string;
    negativeSummary?: string;
  };
  topics: Array<{ term: string; count: number }>;
  videos: Array<{
    id: string;
    coverUrl?: string;
    title: string;
    author: string;
    followers?: number;
    publishedAt?: string;
    likes: number;
    comments: number;
    shares: number;
    sentiment: SentimentLabel;
    riskTag: string;
    url: string;
    topComments?: Array<{ text: string; likeCount: number }>;
    analysis?: {
      summary: string;
      reasons: string[];
      risks: string[];
      hotCommentsSummary?: string;
      strategies?: { positive?: string; neutral?: string; clarify?: string };
    };
  }>;
  creators: Array<{
    id: string;
    nickname: string;
    followers: number;
    recentVideoCount: number;
    avgEngagementRate: number;
    contentTendency: string;
    potentialScore: number;
    sampleUrl?: string;
    status: string;
  }>;
  strategy: {
    conclusion: string;
    level: string;
    narrative: string;
    riskPoints: string[];
    actions: string[];
    nextFocus?: string;
    commentToneSummary?: string;
  };
  commentTasks: Array<{
    id: string;
    videoId: string;
    videoUrl: string;
    authorNickname: string;
    sentiment: SentimentLabel;
    attitude: string;
    lang: string;
    candidates: string[];
    selectedIndex: number;
    editedText?: string;
  }>;
  lastRefreshStatus: string;
  lastError?: string;
  apifyUsedMock?: boolean;
  effectiveKeywords?: string[];
  keywordMatrix?: Array<{ category: string; keywords: string[]; monitorNote?: string }>;
  listeningAlerts?: Array<{
    level: '绿' | '黄' | '橙' | '红';
    title: string;
    detail: string;
    responseWithin?: string;
  }>;
  recentTrends?: {
    summary: string;
    risingItems: Array<{ topic: string; whyRising: string; tieToGame: string }>;
  };
};

type GeelarkPhone = { id: string; name: string; serialNo?: string };

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-sky-600 dark:text-sky-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function sentimentClass(s: string): string {
  if (s === 'positive') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (s === 'negative') return 'bg-red-500/15 text-red-700 dark:text-red-300';
  return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300';
}

function alertLevelBarClass(level: string): string {
  if (level === '红') return 'border-l-red-500 bg-red-500/[0.06]';
  if (level === '橙') return 'border-l-orange-500 bg-orange-500/[0.06]';
  if (level === '黄') return 'border-l-amber-500 bg-amber-500/[0.06]';
  return 'border-l-emerald-500 bg-emerald-500/[0.06]';
}

const PAGE_SIZE = 10;

function PageNav({
  page,
  totalPages,
  onPage,
  label,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  label: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
      <span>
        {label} · 第 {page}/{totalPages} 页
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          className="rounded border border-[var(--color-border)] px-2 py-0.5 disabled:opacity-40"
          onClick={() => onPage(page - 1)}
        >
          上一页
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          className="rounded border border-[var(--color-border)] px-2 py-0.5 disabled:opacity-40"
          onClick={() => onPage(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export function RiskSentimentPage() {
  const [game, setGame] = useState('');
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [kwInput, setKwInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [limit, setLimit] = useState<10 | 30 | 50>(10);
  const [snapshot, setSnapshot] = useState<RiskSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [phones, setPhones] = useState<GeelarkPhone[]>([]);
  const [defaultEnvId, setDefaultEnvId] = useState('');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [videoSort, setVideoSort] = useState<'heat' | 'likes' | 'comments' | 'shares'>('heat');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [taskEdits, setTaskEdits] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [videoPage, setVideoPage] = useState(1);
  const [creatorPage, setCreatorPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);

  const loadState = useCallback(async () => {
    setErr(null);
    const res = await authFetch('/api/risk-sentiment/state');
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; snapshot?: RiskSnapshot; error?: string };
    if (!res.ok || !data.ok) {
      setErr(data.error || '加载失败');
      return;
    }
    if (data.snapshot) {
      setSnapshot(data.snapshot);
      if (data.snapshot.game) setGame(data.snapshot.game);
      if (data.snapshot.keywords?.length) setKeywords(data.snapshot.keywords);
      if (data.snapshot.limit === 30 || data.snapshot.limit === 50) setLimit(data.snapshot.limit);
      if (data.snapshot.days === 14 || data.snapshot.days === 30) setDays(data.snapshot.days);
    }
  }, []);

  const loadPhones = useCallback(async () => {
    const res = await authFetch('/api/risk-sentiment/phones');
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; phones?: GeelarkPhone[] };
    if (res.ok && data.phones) {
      setPhones(data.phones);
      setDefaultEnvId((prev) => prev || data.phones?.[0]?.id || '');
    }
  }, []);

  useEffect(() => {
    void loadState();
    void loadPhones();
  }, [loadState, loadPhones]);

  const onRefresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await authFetch('/api/risk-sentiment/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: game || '未命名游戏', days, keywords, limit }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; snapshot?: RiskSnapshot; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || '刷新失败');
      if (data.snapshot) setSnapshot(data.snapshot);
      setSelectedTaskIds(new Set());
      setTaskEdits({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    const t = kwInput.trim();
    if (!t) return;
    if (!keywords.includes(t)) setKeywords((k) => [...k, t]);
    setKwInput('');
  };

  const filteredVideos = useMemo(() => {
    const vids = snapshot?.videos ?? [];
    let list = topicFilter
      ? vids.filter((v) => String(v.title ?? '').toLowerCase().includes(topicFilter.toLowerCase()))
      : [...vids];
    const heat = (x: (typeof list)[0]) =>
      Number(x.likes ?? 0) + Number(x.comments ?? 0) * 2 + Number(x.shares ?? 0) * 3;
    if (videoSort === 'likes') list.sort((a, b) => Number(b.likes ?? 0) - Number(a.likes ?? 0));
    else if (videoSort === 'comments') list.sort((a, b) => Number(b.comments ?? 0) - Number(a.comments ?? 0));
    else if (videoSort === 'shares') list.sort((a, b) => Number(b.shares ?? 0) - Number(a.shares ?? 0));
    else list.sort((a, b) => heat(b) - heat(a));
    return list;
  }, [snapshot?.videos, topicFilter, videoSort]);

  const videoTotalPages = Math.max(1, Math.ceil(filteredVideos.length / PAGE_SIZE));
  const pagedVideos = useMemo(() => {
    const start = (videoPage - 1) * PAGE_SIZE;
    return filteredVideos.slice(start, start + PAGE_SIZE);
  }, [filteredVideos, videoPage]);

  const creatorsList = snapshot?.creators ?? [];
  const creatorTotalPages = Math.max(1, Math.ceil(creatorsList.length / PAGE_SIZE));
  const pagedCreators = useMemo(() => {
    const start = (creatorPage - 1) * PAGE_SIZE;
    return creatorsList.slice(start, start + PAGE_SIZE);
  }, [creatorsList, creatorPage]);

  const commentTasksAll = snapshot?.commentTasks ?? [];
  const taskTotalPages = Math.max(1, Math.ceil(commentTasksAll.length / PAGE_SIZE));
  const pagedCommentTasks = useMemo(() => {
    const start = (taskPage - 1) * PAGE_SIZE;
    return commentTasksAll.slice(start, start + PAGE_SIZE);
  }, [commentTasksAll, taskPage]);

  useEffect(() => {
    setVideoPage(1);
  }, [topicFilter, videoSort, snapshot?.updatedAt]);

  useEffect(() => {
    setCreatorPage(1);
  }, [snapshot?.updatedAt, creatorsList.length]);

  useEffect(() => {
    setTaskPage(1);
  }, [snapshot?.updatedAt, commentTasksAll.length]);

  useEffect(() => {
    if (videoPage > videoTotalPages) setVideoPage(videoTotalPages);
  }, [videoPage, videoTotalPages]);

  useEffect(() => {
    if (creatorPage > creatorTotalPages) setCreatorPage(creatorTotalPages);
  }, [creatorPage, creatorTotalPages]);

  useEffect(() => {
    if (taskPage > taskTotalPages) setTaskPage(taskTotalPages);
  }, [taskPage, taskTotalPages]);

  const detailVideo = useMemo(
    () => (detailId ? snapshot?.videos.find((v) => v.id === detailId) : undefined),
    [detailId, snapshot?.videos],
  );

  const toggleTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const commentText = (t: RiskSnapshot['commentTasks'][0]) => {
    const edited = taskEdits[t.id];
    if (edited !== undefined) return edited;
    const list = t.candidates ?? [];
    const i = Math.min(Math.max(0, t.selectedIndex ?? 0), Math.max(0, list.length - 1));
    return list[i] ?? '';
  };

  const previewItems = useMemo(() => {
    const tasks = snapshot?.commentTasks ?? [];
    return tasks
      .filter((t) => selectedTaskIds.has(t.id))
      .map((t) => ({
        taskId: t.id,
        videoUrl: t.videoUrl,
        comment: commentText(t),
        lang: t.lang,
        envId: defaultEnvId,
      }));
  }, [snapshot?.commentTasks, selectedTaskIds, taskEdits, defaultEnvId]);

  const langCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of previewItems) {
      m[p.lang] = (m[p.lang] ?? 0) + 1;
    }
    return m;
  }, [previewItems]);

  const sendAll = async () => {
    setSendErr(null);
    const items = previewItems
      .filter((p) => p.envId && p.comment.trim())
      .map((p) => ({ envId: p.envId, videoUrl: p.videoUrl, comment: p.comment, useAsia: false }));
    if (!items.length) {
      setSendErr('请勾选任务、选择云手机并填写评论');
      return;
    }
    const res = await authFetch('/api/risk-sentiment/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; taskIds?: string[]; errors?: string[] };
    if (!res.ok || !data.ok) {
      setSendErr(data.error || data.errors?.join('; ') || '发送失败');
      return;
    }
    setPreviewOpen(false);
    setSelectedTaskIds(new Set());
  };

  const o = snapshot?.overview;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(124,141,255,0.12),transparent_36%)]">
      <div className="gobs-glass shrink-0 space-y-3 border-b border-[var(--color-border)]/75 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[140px] flex-col gap-1 text-[11px] text-[var(--color-text-muted)]">
            游戏
            <input
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-text)]"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder="例如 Free Fire、freefire"
            />
          </label>
          <div className="flex flex-col gap-1 text-[11px] text-[var(--color-text-muted)]">
            时间范围
            <div className="flex rounded-xl border border-[var(--color-border)] p-0.5">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${days === d ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text)]'}`}
                  onClick={() => setDays(d)}
                >
                  近{d}天
                </button>
              ))}
            </div>
          </div>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[11px] text-[var(--color-text-muted)]">
            备注标签（不用于采集）
            <div className="flex gap-1">
              <input
                className="min-w-0 flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="仅本地备忘；TikTok 采集只使用上方「游戏」对应单一 # 标签"
              />
                <button type="button" className="rounded-xl border border-[var(--color-border)] px-2 text-xs" onClick={addKeyword}>
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {keywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] dark:bg-white/10"
                  onClick={() => setKeywords((prev) => prev.filter((x) => x !== k))}
                >
                  {k} ×
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--color-text-muted)]">
            采集数量
            <select
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) as 10 | 30 | 50)}
            >
              <option value={10}>10</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-lg disabled:opacity-50"
            onClick={() => void onRefresh()}
          >
            {loading ? '分析中…' : '立即刷新'}
          </button>
          <div className="text-[11px] text-[var(--color-text-muted)]">
            最近更新：
            {snapshot?.updatedAt
              ? new Date(snapshot.updatedAt).toLocaleString('zh-CN', { hour12: false })
              : '—'}
          </div>
        </div>
        {snapshot?.apifyUsedMock && (
          <div className="text-xs text-amber-700 dark:text-amber-300">演示/回退数据：{snapshot.lastError || '未接 Apify 或采集为空'}</div>
        )}
        {err && <div className="text-xs text-red-600">{err}</div>}
        {snapshot?.effectiveKeywords && snapshot.effectiveKeywords.length > 0 && (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/5 px-2 py-1.5 text-[11px] leading-snug text-sky-900 dark:text-sky-100">
            <span className="font-medium">本次 TikTok 采集仅使用游戏名对应的单一标签：</span>
            {snapshot.effectiveKeywords.map((k) => (
              <span key={k} className="ml-1 font-mono text-[10px]">
                #{k}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!snapshot?.updatedAt ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            <p>暂无舆情数据</p>
            <p className="text-xs">请先选择游戏并点击「立即刷新」</p>
            <button type="button" className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white" onClick={() => void onRefresh()}>
              立即刷新
            </button>
          </div>
        ) : (
          <>
            <div className="gobs-card mb-4 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)]">舆情总览</div>
              <div className="mt-3 grid gap-5 md:grid-cols-[minmax(0,160px)_1fr] md:items-start">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[var(--color-text-muted)]">舆情评分</span>
                  <div className={`mt-1 text-5xl font-bold tabular-nums leading-none ${scoreColor(o?.score ?? 0)}`}>
                    {Math.round(o?.score ?? 0)}
                  </div>
                  <p className="mt-1 text-[10px] leading-snug text-[var(--color-text-subtle)]">
                    与右侧正/负占比一致：50 + (正面% − 负面%) × 0.45，中性参与叙事说明、不单独拉高分数。
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">{o?.helperText}</p>
                </div>
                <div className="min-h-0 space-y-3 border-t border-[var(--color-border)] pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-700 dark:text-emerald-300">
                      正面 {Math.round(o?.positivePct ?? 0)}%
                    </span>
                    <span className="rounded-full bg-zinc-500/15 px-2.5 py-1 font-medium text-zinc-700 dark:text-zinc-300">
                      中性 {Math.round(o?.neutralPct ?? 0)}%
                    </span>
                    <span className="rounded-full bg-red-500/15 px-2.5 py-1 font-medium text-red-700 dark:text-red-300">
                      负面 {Math.round(o?.negativePct ?? 0)}%
                    </span>
                  </div>
                  <div className="space-y-2.5 text-[12px] leading-snug">
                    <p>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">正面</span>{' '}
                      <span className="text-[var(--color-text-muted)]">{o?.positiveSummary ?? '—'}</span>
                    </p>
                    <p>
                      <span className="font-medium text-slate-600 dark:text-slate-400">中性</span>{' '}
                      <span className="text-[var(--color-text-muted)]">{o?.neutralSummary ?? '—'}</span>
                    </p>
                    <p>
                      <span className="font-medium text-red-600 dark:text-red-400">负面</span>{' '}
                      <span className="text-[var(--color-text-muted)]">{o?.negativeSummary ?? '—'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <div className="gobs-card rounded-2xl p-4 shadow-sm">
                <div className="text-sm font-semibold">关键词矩阵</div>
                <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
                  监测维度与关键词（结合本次游戏名、采集标签与本批标题/评论中的真实词）；下方为词云概览。
                </p>
                <KeywordWordCloud matrix={snapshot.keywordMatrix} topics={snapshot.topics} />
                <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--color-border)]">
                  <table className="w-full min-w-[280px] text-left text-[11px]">
                    <thead className="bg-black/5 text-[var(--color-text-muted)] dark:bg-white/5">
                      <tr>
                        <th className="p-2">维度</th>
                        <th className="p-2">关键词</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(snapshot.keywordMatrix ?? []).length ? (
                        (snapshot.keywordMatrix ?? []).map((row, ri) => (
                          <tr key={`${row.category}-${ri}`} className="border-t border-[var(--color-border)]">
                            <td className="align-top p-2 font-medium text-[var(--color-text)]">{row.category}</td>
                            <td className="p-2 text-[var(--color-text-muted)]">
                              <div className="flex flex-wrap gap-1">
                                {row.keywords.map((k, ki) => (
                                  <span key={`${ri}-${ki}-${k}`} className="rounded-full bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
                                    {k}
                                  </span>
                                ))}
                              </div>
                              {row.monitorNote ? <p className="mt-1 text-[10px] text-[var(--color-text-subtle)]">{row.monitorNote}</p> : null}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="p-3 text-[var(--color-text-muted)]">
                            暂无矩阵，请刷新后重试。
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="gobs-card rounded-2xl p-4 shadow-sm">
                <div className="text-sm font-semibold">情感与告警</div>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                  情感分布见上方「舆情总览」；以下为分级告警（绿 / 黄 / 橙 / 红）。无模型数据时按本批占比与风险标签自动生成。
                </p>
                <ul className="mt-3 space-y-2">
                  {(snapshot.listeningAlerts ?? []).length ? (
                  (snapshot.listeningAlerts ?? []).map((a, i) => (
                    <li
                      key={`${a.title}-${i}`}
                      className={`rounded-r-lg border border-[var(--color-border)] border-l-4 p-3 text-[11px] ${alertLevelBarClass(a.level)}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 font-semibold tabular-nums">{a.level}灯</span>
                        <span className="font-medium text-[var(--color-text)]">{a.title}</span>
                      </div>
                      <p className="mt-1 leading-snug text-[var(--color-text-muted)]">{a.detail}</p>
                      {a.responseWithin ? (
                        <p className="mt-1 text-[10px] text-[var(--color-text-subtle)]">建议响应：{a.responseWithin}</p>
                      ) : null}
                    </li>
                  ))
                  ) : (
                    <li className="rounded-lg border border-[var(--color-border)] p-3 text-[11px] text-[var(--color-text-muted)]">
                      暂无告警条目。
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="gobs-card mb-4 rounded-2xl p-4 shadow-sm">
              <div className="text-sm font-semibold">近期趋势（样本内 · 与游戏相关）</div>
              <p className="mt-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
                参考 social-trend-monitor：基于<strong>本批 TikTok 视频</strong>归纳的相对崛起话题或内容形态，非全站实时排行榜。
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">{snapshot.recentTrends?.summary ?? '—'}</p>
              <ul className="mt-3 space-y-3">
                {(snapshot.recentTrends?.risingItems ?? []).map((it, idx) => (
                  <li key={`${it.topic}-${idx}`} className="rounded-lg border border-[var(--color-border)] bg-black/[0.02] p-3 text-[11px] dark:bg-white/[0.03]">
                    <div className="font-medium text-[var(--color-text)]">{it.topic}</div>
                    <p className="mt-1 text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-text-subtle)]">为何热：</span>
                      {it.whyRising || '—'}
                    </p>
                    <p className="mt-1 text-[var(--color-text-muted)]">
                      <span className="text-[var(--color-text-subtle)]">与游戏：</span>
                      {it.tieToGame || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-4 rounded-2xl border border-amber-500/25 border-l-4 border-l-amber-500 bg-amber-500/[0.06] p-4 dark:bg-amber-500/10">
              <div className="text-xs font-semibold text-amber-900 dark:text-amber-100">风控大师建议与行动项</div>
              <p className="mt-1 text-[10px] leading-snug text-amber-800/80 dark:text-amber-200/80">
                若对措辞不满意：在 API 项目下新建 <code className="rounded bg-black/5 px-1 font-mono text-[9px] dark:bg-white/10">config/risk-sentiment-extra-prompt.md</code>，把你在 skills.sh 等处选中的分析要点粘贴进去，保存后点「立即刷新」。
              </p>
              <div className="mt-1 text-lg font-bold text-[var(--color-text)]">{snapshot.strategy?.conclusion}</div>
              <div className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">等级：{snapshot.strategy?.level}</div>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">{snapshot.strategy?.narrative}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(snapshot.strategy?.riskPoints ?? []).map((x) => (
                  <span key={x} className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] text-red-700 dark:text-red-300">
                    {x}
                  </span>
                ))}
              </div>
              {(snapshot.strategy?.nextFocus || snapshot.strategy?.commentToneSummary) && (
                <div className="mt-3 space-y-2 rounded-lg border border-amber-500/15 bg-black/[0.03] p-3 text-[11px] dark:bg-white/[0.04]">
                  {snapshot.strategy?.nextFocus ? (
                    <p>
                      <span className="font-semibold text-amber-950 dark:text-amber-50">下一步：</span>
                      <span className="text-[var(--color-text)]">{snapshot.strategy.nextFocus}</span>
                    </p>
                  ) : null}
                  {snapshot.strategy?.commentToneSummary ? (
                    <p>
                      <span className="font-semibold text-amber-950 dark:text-amber-50">评论态度：</span>
                      <span className="text-[var(--color-text-muted)]">{snapshot.strategy.commentToneSummary}</span>
                    </p>
                  ) : null}
                </div>
              )}
              <div className="mt-4 border-t border-amber-500/20 pt-3">
                <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-100">可执行行动清单</div>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-[var(--color-text)]">
                  {(snapshot.strategy?.actions ?? []).length ? (
                    (snapshot.strategy?.actions ?? []).map((a) => <li key={a}>{a}</li>)
                  ) : (
                    <li className="text-[var(--color-text-muted)]">暂无，请先刷新生成策略。</li>
                  )}
                </ol>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 text-sm font-medium">高频话题</div>
              <div className="flex flex-wrap gap-2">
                {(snapshot.topics ?? []).map((t, ti) => (
                  <button
                    key={String(t?.term ?? ti)}
                    type="button"
                    onClick={() => {
                      const term = String(t?.term ?? '');
                      setTopicFilter((prev) => (prev === term ? null : term));
                    }}
                    className={`rounded-full border px-2 py-1 text-xs ${
                      topicFilter === String(t?.term ?? '') ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)]'
                    }`}
                  >
                    {String(t?.term ?? '—')} · {Number(t?.count ?? 0)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">热门视频</span>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {(
                      [
                        ['heat', '按热度'],
                        ['likes', '按点赞'],
                        ['comments', '按评论'],
                        ['shares', '按分享'],
                      ] as const
                    ).map(([k, lab]) => (
                      <button
                        key={k}
                        type="button"
                        className={`rounded px-2 py-0.5 ${videoSort === k ? 'bg-black/10 dark:bg-white/10' : ''}`}
                        onClick={() => setVideoSort(k)}
                      >
                        {lab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
                  <table className="w-full min-w-[720px] text-left text-[11px]">
                    <thead className="bg-black/5 text-[var(--color-text-muted)] dark:bg-white/5">
                      <tr>
                        <th className="p-2">封面</th>
                        <th className="p-2">文案</th>
                        <th className="p-2">作者</th>
                        <th className="p-2">互动</th>
                        <th className="p-2">情感</th>
                        <th className="p-2">风险</th>
                        <th className="p-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedVideos.map((v) => (
                        <tr key={v.id} className="border-t border-[var(--color-border)]">
                          <td className="p-1">
                            <VideoCoverThumb url={v.coverUrl} />
                          </td>
                          <td className="max-w-[220px] p-2">
                            <div className="line-clamp-2 text-[var(--color-text)]">{v.title}</div>
                            <a href={v.url} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline">
                              TikTok
                            </a>
                            {v.topComments && v.topComments.length > 0 && (
                              <div className="mt-1.5 space-y-0.5 border-t border-[var(--color-border)]/60 pt-1.5">
                                <div className="text-[10px] font-medium text-[var(--color-text-muted)]">高赞评论（样本）</div>
                                {v.topComments.slice(0, 5).map((c, ci) => (
                                  <div
                                    key={ci}
                                    className="text-[10px] leading-snug text-[var(--color-text-muted)] line-clamp-2"
                                    title={c.text}
                                  >
                                    <span className="tabular-nums text-[var(--color-text-subtle)]">❤{c.likeCount}</span> {c.text}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <div>{v.author}</div>
                            <div className="text-[var(--color-text-muted)]">{v.followers != null ? `${v.followers} 粉` : ''}</div>
                          </td>
                          <td className="p-2 tabular-nums">
                            👍{v.likes} 💬{v.comments}
                          </td>
                          <td className="p-2">
                            <span className={`rounded px-1.5 py-0.5 ${sentimentClass(v.sentiment)}`}>{v.sentiment}</span>
                          </td>
                          <td className="p-2">{v.riskTag}</td>
                          <td className="p-2 space-y-1">
                            <button type="button" className="block text-[var(--color-primary)]" onClick={() => setDetailId(v.id)}>
                              详情
                            </button>
                            <button
                              type="button"
                              className="block text-[11px] text-[var(--color-text-muted)]"
                              onClick={() => {
                                const task = snapshot?.commentTasks.find((t) => t.videoId === v.id);
                                if (task) setSelectedTaskIds((s) => new Set(s).add(task.id));
                              }}
                            >
                              加入评论
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PageNav page={videoPage} totalPages={videoTotalPages} onPage={setVideoPage} label="热门视频" />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">潜力 TikToker</div>
                <div className="space-y-2">
                  {pagedCreators.map((c, ci) => (
                    <div key={c.id || `cr-${ci}`} className="rounded border border-[var(--color-border)] p-2 text-[11px]">
                      <div className="font-medium">{c.nickname}</div>
                      <div className="text-[var(--color-text-muted)]">
                        粉丝 {c.followers} · 相关视频 {c.recentVideoCount} · 互动率 {c.avgEngagementRate}%
                      </div>
                      <div>倾向：{c.contentTendency}</div>
                      <div>潜力 {c.potentialScore} · {c.status}</div>
                      {c.sampleUrl && (
                        <a href={c.sampleUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)]">
                          样例
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <PageNav page={creatorPage} totalPages={creatorTotalPages} onPage={setCreatorPage} label="潜力达人" />
              </div>
            </div>

            <div className="gobs-card mb-2 rounded-2xl p-4 shadow-sm">
              <div className="mb-1 text-sm font-semibold">执行任务（评论下发）</div>
              <p className="mb-3 text-[11px] text-[var(--color-text-muted)]">
                以下为模型生成的具体评论任务；勾选后可在底部选择云手机并发送。每页最多 {PAGE_SIZE} 条。
              </p>
              <div className="space-y-3">
                {pagedCommentTasks.map((t) => (
                  <div key={t.id || t.videoId} className="rounded-lg border border-[var(--color-border)] p-3 text-[11px]">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <label className="flex items-start gap-2">
                        <input type="checkbox" checked={selectedTaskIds.has(t.id)} onChange={() => toggleTask(t.id)} />
                        <span>
                          <span className="font-medium">{t.authorNickname}</span>
                          <span className={`ml-2 rounded px-1 ${sentimentClass(t.sentiment)}`}>{t.sentiment}</span>
                          <span className="ml-2 text-[var(--color-text-muted)]">{t.attitude}</span>
                          <span className="ml-2">{t.lang}</span>
                        </span>
                      </label>
                      <a href={t.videoUrl} target="_blank" rel="noreferrer" className="text-[var(--color-primary)]">
                        打开视频
                      </a>
                    </div>
                    <div className="mt-2 space-y-1">
                      {(t.candidates ?? []).map((c, i) => (
                        <label key={i} className="flex cursor-pointer items-start gap-2">
                          <input
                            type="radio"
                            name={`cand-${t.id}`}
                            checked={t.selectedIndex === i && taskEdits[t.id] === undefined}
                            onChange={() => {
                              setTaskEdits((prev) => {
                                const n = { ...prev };
                                delete n[t.id];
                                return n;
                              });
                              setSnapshot((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      commentTasks: prev.commentTasks.map((x) =>
                                        x.id === t.id ? { ...x, selectedIndex: i, editedText: undefined } : x,
                                      ),
                                    }
                                  : prev,
                              );
                            }}
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                    <textarea
                      className="mt-2 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-xs"
                      rows={2}
                      value={commentText(t)}
                      onChange={(e) => setTaskEdits((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded border border-[var(--color-border)] px-2 py-1"
                        onClick={async () => {
                          const res = await authFetch('/api/risk-sentiment/regenerate-comments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ videoId: t.videoId }),
                          });
                          const data = (await res.json().catch(() => ({}))) as { ok?: boolean; snapshot?: RiskSnapshot };
                          if (res.ok && data.snapshot) setSnapshot(data.snapshot);
                        }}
                      >
                        重新生成
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <PageNav page={taskPage} totalPages={taskTotalPages} onPage={setTaskPage} label="执行任务" />
            </div>
          </>
        )}
      </div>

      <div className="gobs-glass z-30 shrink-0 border-t border-[var(--color-border)]/75 px-3 py-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap gap-3 text-[var(--color-text-muted)]">
            <span>已选任务：{selectedTaskIds.size}</span>
            <span>待发送评论：{previewItems.length}</span>
            <span>
              语言：
              {Object.entries(langCounts)
                .map(([k, v]) => `${k} ${v}`)
                .join(' / ') || '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1">
              云手机
              <select
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs"
                value={defaultEnvId}
                onChange={(e) => setDefaultEnvId(e.target.value)}
              >
                <option value="">请选择</option>
                {phones.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs"
              onClick={() => setSelectedTaskIds(new Set())}
            >
              取消选择
            </button>
            <button
              type="button"
              className="rounded border border-[var(--color-border)] px-3 py-1.5 text-xs"
              onClick={() => setPreviewOpen(true)}
              disabled={!selectedTaskIds.size}
            >
              预览发送
            </button>
            <button
              type="button"
              className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              disabled={!selectedTaskIds.size || !defaultEnvId}
              onClick={() => setPreviewOpen(true)}
            >
              一键发送
            </button>
          </div>
        </div>
      </div>

      {detailVideo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--color-surface-elevated)] p-4 shadow-xl">
            <div className="mb-2 flex justify-between gap-2">
              <span className="font-semibold">视频详情</span>
              <button type="button" className="text-[var(--color-text-muted)]" onClick={() => setDetailId(null)}>
                关闭
              </button>
            </div>
            <p className="text-sm text-[var(--color-text)]">{detailVideo.title}</p>
            <div className="mt-2 text-[11px] text-[var(--color-text-muted)]">情感 {detailVideo.sentiment}</div>
            {detailVideo.analysis && (
              <div className="mt-3 space-y-2 text-xs">
                <div>{detailVideo.analysis.summary}</div>
                <div>原因：{detailVideo.analysis.reasons?.join('；')}</div>
                <div>风险：{detailVideo.analysis.risks?.join('；')}</div>
                {detailVideo.analysis.hotCommentsSummary && <div>热评：{detailVideo.analysis.hotCommentsSummary}</div>}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white"
                onClick={() => {
                  const task = snapshot?.commentTasks.find((x) => x.videoId === detailVideo.id);
                  if (task) setSelectedTaskIds((s) => new Set(s).add(task.id));
                  setDetailId(null);
                }}
              >
                加入评论任务
              </button>
              <a href={detailVideo.url} target="_blank" rel="noreferrer" className="rounded border px-3 py-1.5 text-xs">
                打开 TikTok
              </a>
            </div>
          </div>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--color-surface-elevated)] p-4">
            <div className="mb-2 font-semibold">发送确认</div>
            <p className="mb-2 text-xs text-[var(--color-text-muted)]">请人工最终确认后再下发 GeeLark。</p>
            <ul className="space-y-3 text-xs">
              {previewItems.map((p) => (
                <li key={p.taskId} className="rounded border border-[var(--color-border)] p-2">
                  <div className="truncate text-[var(--color-text-muted)]">{p.videoUrl}</div>
                  <div className="mt-1 whitespace-pre-wrap text-[var(--color-text)]">{p.comment}</div>
                  <div className="mt-1 text-[var(--color-text-muted)]">
                    语言 {p.lang} · 云手机 {p.envId || '未选'}
                  </div>
                </li>
              ))}
            </ul>
            {sendErr && <div className="mt-2 text-xs text-red-600">{sendErr}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border px-3 py-1.5 text-xs" onClick={() => setPreviewOpen(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs text-white"
                onClick={() => void sendAll()}
              >
                确认发送
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
