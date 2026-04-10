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
    return <div className="h-14 w-11 shrink-0 rounded bg-zinc-800" title={u ? '封面加载失败' : '无封面'} />;
  }
  return (
    <img
      src={src}
      alt=""
      className="h-14 w-11 shrink-0 rounded object-cover bg-zinc-800"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

const WC_PALETTE = [
  'from-sky-500/30 to-indigo-500/20 text-sky-100 ring-1 ring-sky-500/25',
  'from-zinc-600/70 to-zinc-700/50 text-zinc-100 ring-1 ring-zinc-500/35',
  'from-emerald-500/25 to-teal-500/20 text-emerald-100 ring-1 ring-emerald-500/20',
  'from-amber-500/25 to-orange-500/18 text-amber-100 ring-1 ring-amber-500/20',
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
    return <p className="mt-2 text-[11px] text-zinc-500">暂无词频数据，刷新后可显示。</p>;
  }
  const max = items[0]?.[1] ?? 1;
  return (
    <div className="relative mt-3 overflow-hidden rounded-2xl border border-zinc-700/80 bg-gradient-to-br from-zinc-900/80 to-zinc-950 px-3 py-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(45,212,191,0.06),transparent_55%)]" />
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
              className={`inline-block rounded-full bg-gradient-to-br px-2.5 py-1 font-medium shadow-sm ${pal}`}
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

type StrategyProfileKey = 'balanced' | 'conservative' | 'aggressive';

type RiskExecutionProgram = {
  codename: string;
  directionSummary: string;
  attackPct: number;
  defensePct: number;
  expectedEffect: string;
};

type RiskStrategyVariant = {
  conclusion: string;
  level: string;
  narrative: string;
  riskPoints: string[];
  actions: string[];
  nextFocus?: string;
  commentToneSummary?: string;
  recommendControlComment: boolean;
  executionProgram?: RiskExecutionProgram;
};

type RiskCommentTask = {
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
  executionNature?: 'attack' | 'defense';
};


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
  strategyProfiles?: Record<StrategyProfileKey, RiskStrategyVariant>;
  commentTasksByProfile?: Record<StrategyProfileKey, RiskCommentTask[]>;
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
    tendencyDetail?: string;
    strengths?: string;
    collaborationSuggestion?: string;
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
  commentTasks: RiskCommentTask[];
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

const PROFILE_ORDER: { key: StrategyProfileKey; label: string; hint: string }[] = [
  { key: 'balanced', label: '平衡', hint: '结合样本判断要不要下场控评，攻防搭配' },
  { key: 'conservative', label: '保守', hint: '只监测与回应策略，不安排下场评论（不控评）' },
  { key: 'aggressive', label: '激进', hint: '倾向下场控评，攻防搭配执行' },
];

function filterUserFacingActions(actions: string[]): string[] {
  return actions.filter((a) => {
    if (/risk-sentiment-extra|skills\.sh|config[/\\]risk|API\s*项目/i.test(a)) return false;
    if (/分析结果不完整|请重试/i.test(a)) return false;
    return true;
  });
}

function sanitizeUserNarrative(text: string): string {
  if (/分析结果不完整|请重试|risk-sentiment-extra|skills\.sh/i.test(text)) {
    return '请点击「立即刷新」重新拉取样本并生成完整策略。';
  }
  return text;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-sky-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function sentimentClass(s: string): string {
  if (s === 'positive') return 'bg-emerald-500/20 text-emerald-300';
  if (s === 'negative') return 'bg-red-500/20 text-red-300';
  return 'border border-zinc-500/45 bg-zinc-800/90 text-zinc-200';
}

function natureLabel(n?: 'attack' | 'defense'): { text: string; className: string } {
  if (n === 'attack')
    return {
      text: '攻击性',
      className: 'border-rose-500/40 bg-rose-950/60 text-rose-100 ring-1 ring-rose-500/15',
    };
  return {
    text: '防御性',
    className: 'border-teal-500/40 bg-teal-950/50 text-teal-100 ring-1 ring-teal-500/15',
  };
}

function langLabel(code: string): string {
  const c = (code || '').toLowerCase();
  if (c === 'zh' || c.startsWith('zh')) return '中文';
  if (c === 'id' || c === 'in') return '印尼语';
  return '英语';
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
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
      <span>
        {label} · 第 {page}/{totalPages} 页
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-300 disabled:opacity-40"
          onClick={() => onPage(page - 1)}
        >
          上一页
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-300 disabled:opacity-40"
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
  const [strategyProfile, setStrategyProfile] = useState<StrategyProfileKey>('balanced');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [videoSort, setVideoSort] = useState<'heat' | 'likes' | 'comments' | 'shares'>('heat');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [taskEdits, setTaskEdits] = useState<Record<string, string>>({});
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [videoPage, setVideoPage] = useState(1);
  const [creatorPage, setCreatorPage] = useState(1);
  const [matrixTab, setMatrixTab] = useState<'analysis' | 'devices' | 'logs'>('analysis');
  const [confirmExecuteOpen, setConfirmExecuteOpen] = useState(false);
  type ExecLog = {
    id: string;
    at: number;
    profile?: string;
    game?: string;
    ok: boolean;
    message: string;
    taskIds: string[];
    errors: string[];
    items: Array<{ videoUrl: string; comment: string; envId: string; deviceName?: string }>;
  };
  const [executionLogs, setExecutionLogs] = useState<ExecLog[]>([]);

  const loadExecutionLogs = useCallback(async () => {
    const res = await authFetch('/api/risk-sentiment/execution-log');
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; logs?: ExecLog[] };
    if (res.ok && data.logs) setExecutionLogs(data.logs);
  }, []);

  useEffect(() => {
    if (matrixTab === 'logs') void loadExecutionLogs();
  }, [matrixTab, loadExecutionLogs]);

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
    const list = [...vids];
    const heat = (x: (typeof list)[0]) =>
      Number(x.likes ?? 0) + Number(x.comments ?? 0) * 2 + Number(x.shares ?? 0) * 3;
    if (videoSort === 'likes') list.sort((a, b) => Number(b.likes ?? 0) - Number(a.likes ?? 0));
    else if (videoSort === 'comments') list.sort((a, b) => Number(b.comments ?? 0) - Number(a.comments ?? 0));
    else if (videoSort === 'shares') list.sort((a, b) => Number(b.shares ?? 0) - Number(a.shares ?? 0));
    else list.sort((a, b) => heat(b) - heat(a));
    return list;
  }, [snapshot?.videos, videoSort]);

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

  const commentTasksForProfile = useMemo(() => {
    return snapshot?.commentTasksByProfile?.[strategyProfile] ?? snapshot?.commentTasks ?? [];
  }, [snapshot?.commentTasks, snapshot?.commentTasksByProfile, strategyProfile]);

  const activeVariant = useMemo((): RiskStrategyVariant | null => {
    if (!snapshot?.updatedAt) return null;
    const sp = snapshot.strategyProfiles?.[strategyProfile];
    if (sp) return sp;
    const s = snapshot.strategy;
    const rec = /控评|评论执行|疏导|引导/.test(s.conclusion);
    return {
      conclusion: s.conclusion,
      level: s.level,
      narrative: s.narrative,
      riskPoints: s.riskPoints ?? [],
      actions: s.actions ?? [],
      nextFocus: s.nextFocus,
      commentToneSummary: s.commentToneSummary,
      recommendControlComment: strategyProfile === 'conservative' ? false : rec,
      executionProgram: undefined,
    };
  }, [snapshot, strategyProfile]);

  const canShowExecute = Boolean(
    activeVariant?.recommendControlComment && commentTasksForProfile.length > 0,
  );

  useEffect(() => {
    setVideoPage(1);
  }, [videoSort, snapshot?.updatedAt]);

  useEffect(() => {
    setCreatorPage(1);
  }, [snapshot?.updatedAt, creatorsList.length]);

  useEffect(() => {
    if (videoPage > videoTotalPages) setVideoPage(videoTotalPages);
  }, [videoPage, videoTotalPages]);

  useEffect(() => {
    if (creatorPage > creatorTotalPages) setCreatorPage(creatorTotalPages);
  }, [creatorPage, creatorTotalPages]);

  const detailVideo = useMemo(
    () => (detailId ? snapshot?.videos.find((v) => v.id === detailId) : undefined),
    [detailId, snapshot?.videos],
  );

  const commentText = (t: RiskCommentTask) => {
    const edited = taskEdits[`${strategyProfile}:${t.id}`];
    if (edited !== undefined) return edited;
    const list = t.candidates ?? [];
    const i = Math.min(Math.max(0, t.selectedIndex ?? 0), Math.max(0, list.length - 1));
    return list[i] ?? '';
  };

  const phoneListForDisplay = useMemo(
    () => (phones.length ? phones : defaultEnvId ? [{ id: defaultEnvId, name: '默认设备' }] : []),
    [phones, defaultEnvId],
  );

  const logExecutionNote = useCallback(
    async (message: string, ok: boolean) => {
      await authFetch('/api/risk-sentiment/execution-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: strategyProfile,
          game: snapshot?.game ?? game,
          ok,
          message,
        }),
      });
      void loadExecutionLogs();
    },
    [strategyProfile, snapshot?.game, game, loadExecutionLogs],
  );

  useEffect(() => {
    if (!canShowExecute && taskModalOpen) setTaskModalOpen(false);
  }, [canShowExecute, taskModalOpen]);

  const sendExecutionBatch = async () => {
    setSendErr(null);
    setConfirmExecuteOpen(false);
    const tasks = commentTasksForProfile;
    const phoneList = phoneListForDisplay;
    if (!phoneList.length) {
      const msg = '未获取云手机，请检查 GeeLark 配置后重试';
      setSendErr(msg);
      await logExecutionNote(msg, false);
      return;
    }
    const items = tasks
      .map((t, i) => {
        const comment = commentText(t).trim();
        const p = phoneList[i % phoneList.length];
        const envId = p?.id ?? '';
        const deviceName = p?.name ?? '';
        return { envId, videoUrl: t.videoUrl, comment, useAsia: false, deviceName };
      })
      .filter((x) => x.envId && x.comment);
    if (!items.length) {
      const msg = '没有可发送的评论';
      setSendErr(msg);
      await logExecutionNote(msg, false);
      return;
    }
    try {
      const res = await authFetch('/api/risk-sentiment/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          profile: strategyProfile,
          game: snapshot?.game ?? game,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; taskIds?: string[]; errors?: string[] };
      if (!res.ok || !data.ok) {
        const errMsg = data.error || data.errors?.join('; ') || '执行失败';
        setSendErr(errMsg);
        if (res.status >= 400 && res.status !== 500) {
          await logExecutionNote(errMsg, false);
        }
      } else {
        setTaskModalOpen(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSendErr(msg);
      await logExecutionNote(`请求异常：${msg}`, false);
    }
    void loadExecutionLogs();
  };

  const o = snapshot?.overview;

  const tabBtn = (id: 'analysis' | 'devices' | 'logs', label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setMatrixTab(id)}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        matrixTab === id
          ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40'
          : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#07080a] bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-zinc-100 antialiased">
      <div className="shrink-0 space-y-3 border-b border-zinc-800/90 bg-zinc-900/75 p-3 backdrop-blur-xl">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[140px] flex-col gap-1 text-[11px] text-zinc-400">
            游戏
            <input
              className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder="例如 Free Fire、freefire"
            />
          </label>
          <div className="flex flex-col gap-1 text-[11px] text-zinc-400">
            时间范围
            <div className="flex rounded-xl border border-zinc-800 p-0.5">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${days === d ? 'bg-teal-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                  onClick={() => setDays(d)}
                >
                  近{d}天
                </button>
              ))}
            </div>
          </div>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[11px] text-zinc-400">
            备注标签（不用于采集）
            <div className="flex gap-1">
              <input
                className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-950/80 px-2 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500"
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                placeholder="仅本地备忘；TikTok 采集只使用上方「游戏」对应单一 # 标签"
              />
                <button type="button" className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-2 text-xs text-zinc-300 hover:bg-zinc-800" onClick={addKeyword}>
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {keywords.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-white/10"
                  onClick={() => setKeywords((prev) => prev.filter((x) => x !== k))}
                >
                  {k} ×
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-zinc-400">
            采集数量
            <select
              className="rounded-xl border border-zinc-700 bg-zinc-950/80 px-2 py-1.5 text-sm text-zinc-100"
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
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg disabled:opacity-50"
            onClick={() => void onRefresh()}
          >
            {loading ? '分析中…' : '立即刷新'}
          </button>
          <div className="text-[11px] text-zinc-400">
            最近更新：
            {snapshot?.updatedAt
              ? new Date(snapshot.updatedAt).toLocaleString('zh-CN', { hour12: false })
              : '—'}
          </div>
        </div>
        {snapshot?.apifyUsedMock && (
          <div className="text-xs text-amber-400/90">演示/回退数据：{snapshot.lastError || '未接 Apify 或采集为空'}</div>
        )}
        {err && <div className="text-xs text-red-400">{err}</div>}
        {snapshot?.effectiveKeywords && snapshot.effectiveKeywords.length > 0 && (
          <div className="rounded-lg border border-sky-500/30 bg-sky-950/40 px-2 py-1.5 text-[11px] leading-snug text-sky-100">
            <span className="font-medium">本次 TikTok 采集仅使用游戏名对应的单一标签：</span>
            {snapshot.effectiveKeywords.map((k) => (
              <span key={k} className="ml-1 font-mono text-[10px]">
                #{k}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-b border-zinc-800/80 bg-zinc-900/90 px-3 py-2 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          {tabBtn('analysis', '舆情分析')}
          {tabBtn('devices', '设备管理')}
          {tabBtn('logs', '任务日志')}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {matrixTab === 'devices' && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800/90 bg-zinc-900/55 p-6 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
            <h2 className="text-lg font-semibold text-zinc-100">云手机列表</h2>
            <p className="mt-1 text-sm text-zinc-400">与下发评论时轮流使用的设备一致，来自 GeeLark。</p>
            {!phones.length ? (
              <p className="mt-4 text-sm text-amber-400/90">暂无设备，请检查 API 中 GeeLark 配置。</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
                {phones.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-zinc-100">{p.name}</span>
                    <span className="font-mono text-xs text-zinc-400">{p.id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {matrixTab === 'logs' && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800/90 bg-zinc-900/55 p-6 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">任务日志</h2>
              <button
                type="button"
                className="rounded-lg border border-zinc-800 px-3 py-1 text-xs"
                onClick={() => void loadExecutionLogs()}
              >
                刷新
              </button>
            </div>
            <p className="mt-1 text-sm text-zinc-400">每次点击「一键执行」都会在服务端记一条，成功或失败都会留下记录。</p>
            {!executionLogs.length ? (
              <p className="mt-6 text-sm text-zinc-400">还没有记录，去舆情分析里执行一次即可。</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {executionLogs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-4 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{new Date(log.at).toLocaleString('zh-CN', { hour12: false })}</span>
                      <span
                        className={
                          log.ok
                            ? 'rounded bg-emerald-500/20 px-1.5 text-emerald-300'
                            : 'rounded bg-red-500/20 px-1.5 text-red-300'
                        }
                      >
                        {log.ok ? '成功' : '失败'}
                      </span>
                      {log.profile ? <span>方案：{log.profile}</span> : null}
                      {log.game ? <span>游戏：{log.game}</span> : null}
                    </div>
                    <p className="mt-2 text-zinc-100">{log.message}</p>
                    {log.errors?.length ? (
                      <p className="mt-1 text-xs text-red-400">{log.errors.join('；')}</p>
                    ) : null}
                    {log.items?.length ? (
                      <p className="mt-2 text-xs text-zinc-400">共 {log.items.length} 条评论项</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {matrixTab === 'analysis' && (
          <>
            {!snapshot?.updatedAt ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-700/80 bg-zinc-900/30 p-6 text-center text-sm text-zinc-400">
            <p>暂无舆情数据</p>
            <p className="text-xs">请先选择游戏并点击「立即刷新」</p>
            <button type="button" className="rounded bg-teal-600 px-4 py-2 text-sm text-white" onClick={() => void onRefresh()}>
              立即刷新
            </button>
          </div>
            ) : (
          <>
            <div className="mb-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/55 p-5 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
              <div className="text-sm font-semibold tracking-tight text-zinc-400">舆情总览</div>
              <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-stretch">
                <div className="flex min-w-0 flex-[0_1_38%] flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/45 p-4 lg:max-w-md">
                  <span className="text-xs font-medium text-zinc-400">舆情评分</span>
                  <div className={`mt-2 text-6xl font-bold tabular-nums leading-none tracking-tight ${scoreColor(o?.score ?? 0)}`}>
                    {Math.round(o?.score ?? 0)}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                    与右侧正/负占比对齐：50 + (正面% − 负面%) × 0.45；中性计入叙事、不单独拉高分数。
                  </p>
                  <p className="mt-4 text-[15px] leading-relaxed text-zinc-100">{o?.helperText}</p>
                </div>
                <div className="min-h-0 min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 font-medium text-emerald-300 ring-1 ring-emerald-500/20">
                      正面 {Math.round(o?.positivePct ?? 0)}%
                    </span>
                    <span className="inline-flex items-center rounded-full border border-zinc-500/40 bg-zinc-800/80 px-3 py-1.5 font-medium text-zinc-200 shadow-sm ring-1 ring-white/5">
                      中性 {Math.round(o?.neutralPct ?? 0)}%
                    </span>
                    <span className="rounded-full bg-red-500/20 px-3 py-1.5 font-medium text-red-300 ring-1 ring-red-500/20">
                      负面 {Math.round(o?.negativePct ?? 0)}%
                    </span>
                  </div>
                  <div className="space-y-3 text-[15px] leading-relaxed">
                    <p>
                      <span className="font-semibold text-emerald-400">正面</span>{' '}
                      <span className="text-zinc-100">{o?.positiveSummary ?? '—'}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-zinc-400">中性</span>{' '}
                      <span className="text-zinc-100">{o?.neutralSummary ?? '—'}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-red-400">负面</span>{' '}
                      <span className="text-zinc-100">{o?.negativeSummary ?? '—'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/55 p-4 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
                <div className="text-sm font-semibold tracking-tight text-zinc-100">话题词云</div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  本批标题与评论中的高频词（可视化）；不再展示明细表，避免信息堆叠。
                </p>
                <KeywordWordCloud matrix={snapshot.keywordMatrix} topics={snapshot.topics} />
              </div>

              <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/55 p-4 shadow-lg shadow-black/30 ring-1 ring-white/[0.04]">
                <div className="text-sm font-semibold tracking-tight text-zinc-100">评论情绪</div>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  结合样本内情感与风险信号的分级提示（绿 / 黄 / 橙 / 红）。
                </p>
                <ul className="mt-3 space-y-2">
                  {(snapshot.listeningAlerts ?? []).length ? (
                  (snapshot.listeningAlerts ?? []).map((a, i) => (
                    <li
                      key={`${a.title}-${i}`}
                      className={`rounded-r-lg border border-zinc-800 border-l-4 p-3 text-[11px] ${alertLevelBarClass(a.level)}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 font-semibold tabular-nums">{a.level}灯</span>
                        <span className="font-medium text-zinc-100">{a.title}</span>
                      </div>
                      <p className="mt-1 leading-snug text-zinc-400">{a.detail}</p>
                      {a.responseWithin ? (
                        <p className="mt-1 text-[10px] text-zinc-500">建议响应：{a.responseWithin}</p>
                      ) : null}
                    </li>
                  ))
                  ) : (
                    <li className="rounded-lg border border-zinc-800 p-3 text-[11px] text-zinc-400">
                      暂无告警条目。
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="mb-4 overflow-hidden rounded-2xl border border-teal-900/40 bg-gradient-to-br from-zinc-900 via-zinc-900 to-teal-950/35 shadow-xl shadow-black/40 ring-1 ring-teal-500/10">
              <div className="border-b border-teal-800/50 bg-gradient-to-r from-teal-950/90 to-zinc-900/95 px-5 py-3">
                <h2 className="text-base font-semibold tracking-tight text-zinc-50">风控大师 · 策略与执行</h2>
                <p className="mt-0.5 text-xs text-teal-200/80">先选方案再看结论；只有「建议控评」时才会出现执行任务入口。</p>
              </div>
              <div className="space-y-4 bg-zinc-950/40 p-5">
              <div className="flex flex-wrap gap-2">
                {PROFILE_ORDER.map(({ key, label, hint }) => (
                  <button
                    key={key}
                    type="button"
                    title={hint}
                    onClick={() => setStrategyProfile(key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      strategyProfile === key
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-950/50'
                        : 'border border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {activeVariant && (
                <>
                  <div className="text-xl font-bold tracking-tight text-zinc-50">{activeVariant.conclusion}</div>
                  <div className="text-sm text-zinc-400">风险等级：{activeVariant.level}</div>
                  <p className="text-[15px] leading-relaxed text-zinc-300">
                    {sanitizeUserNarrative(activeVariant.narrative)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(activeVariant.riskPoints ?? []).map((x) => (
                      <span
                        key={x}
                        className="rounded-full border border-rose-500/35 bg-rose-950/50 px-2.5 py-1 text-xs text-rose-100"
                      >
                        {x}
                      </span>
                    ))}
                  </div>
                  {(activeVariant.nextFocus || activeVariant.commentToneSummary) && (
                    <div className="space-y-2 rounded-xl border border-zinc-700/80 bg-zinc-900/60 p-4 text-sm">
                      {activeVariant.nextFocus ? (
                        <p>
                          <span className="font-semibold text-teal-400">下一步：</span>
                          <span className="text-zinc-100">{activeVariant.nextFocus}</span>
                        </p>
                      ) : null}
                      {activeVariant.commentToneSummary ? (
                        <p>
                          <span className="font-semibold text-teal-400">评论态度：</span>
                          <span className="text-zinc-400">{activeVariant.commentToneSummary}</span>
                        </p>
                      ) : null}
                    </div>
                  )}
                  {activeVariant.recommendControlComment && activeVariant.executionProgram && canShowExecute ? (
                    <div className="space-y-3 rounded-xl border border-teal-800/50 bg-teal-950/30 p-4 ring-1 ring-teal-500/10">
                      <div className="text-sm font-semibold text-teal-200">执行纲领</div>
                      <p className="text-xs text-zinc-400">
                        行动代号：<span className="font-semibold text-zinc-100">{activeVariant.executionProgram.codename}</span>
                      </p>
                      <p className="text-[15px] leading-relaxed text-zinc-100">{activeVariant.executionProgram.directionSummary}</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-200">
                          攻击性 ≈ {activeVariant.executionProgram.attackPct}%
                        </span>
                        <span className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-2 py-1 text-zinc-200">
                          防御性 ≈ {activeVariant.executionProgram.defensePct}%
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">预期效果：{activeVariant.executionProgram.expectedEffect}</p>
                      <button
                        type="button"
                        className="w-full rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white shadow-md hover:bg-teal-700"
                        onClick={() => setTaskModalOpen(true)}
                      >
                        前往查看具体执行任务
                      </button>
                    </div>
                  ) : (
                    <div className="border-t border-zinc-800 pt-4">
                      <div className="text-sm font-semibold text-zinc-200">建议行动</div>
                      <ol className="mt-2 list-decimal space-y-2 pl-5 text-[15px] text-zinc-100">
                        {filterUserFacingActions(activeVariant.actions ?? []).length ? (
                          filterUserFacingActions(activeVariant.actions ?? []).map((a) => <li key={a}>{a}</li>)
                        ) : (
                          <li className="text-zinc-400">暂无，请先刷新生成策略。</li>
                        )}
                      </ol>
                    </div>
                  )}
                  {canShowExecute &&
                    !(activeVariant.recommendControlComment && activeVariant.executionProgram) && (
                      <button
                        type="button"
                        className="w-full rounded-xl border border-teal-700/60 bg-zinc-900/80 py-2 text-sm font-medium text-teal-100 hover:border-teal-600 hover:bg-zinc-800"
                        onClick={() => setTaskModalOpen(true)}
                      >
                        打开评论任务（{commentTasksForProfile.length} 条）· 编辑与一键执行
                      </button>
                    )}
                </>
              )}
              </div>
            </div>

            <div className="mb-4 grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-100">热门视频</span>
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
                        className={`rounded px-2 py-0.5 transition-colors ${videoSort === k ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                        onClick={() => setVideoSort(k)}
                      >
                        {lab}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-zinc-800/60 text-xs text-zinc-400">
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
                        <tr key={v.id} className="border-t border-zinc-800/80 transition-colors hover:bg-white/[0.03]">
                          <td className="p-1">
                            <VideoCoverThumb url={v.coverUrl} />
                          </td>
                          <td className="max-w-[220px] p-2">
                            <div className="line-clamp-2 text-zinc-100">{v.title}</div>
                            <a href={v.url} target="_blank" rel="noreferrer" className="text-teal-400 underline">
                              TikTok
                            </a>
                            {v.topComments && v.topComments.length > 0 && (
                              <div className="mt-1.5 space-y-0.5 border-t border-zinc-700/70 pt-1.5">
                                <div className="text-[10px] font-medium text-zinc-400">高赞评论（样本）</div>
                                {v.topComments.slice(0, 5).map((c, ci) => (
                                  <div
                                    key={ci}
                                    className="text-[10px] leading-snug text-zinc-400 line-clamp-2"
                                    title={c.text}
                                  >
                                    <span className="tabular-nums text-zinc-500">❤{c.likeCount}</span> {c.text}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <div>{v.author}</div>
                            <div className="text-zinc-400">{v.followers != null ? `${v.followers} 粉` : ''}</div>
                          </td>
                          <td className="p-2 tabular-nums">
                            👍{v.likes} 💬{v.comments}
                          </td>
                          <td className="p-2">
                            <span className={`rounded px-1.5 py-0.5 ${sentimentClass(v.sentiment)}`}>{v.sentiment}</span>
                          </td>
                          <td className="p-2">{v.riskTag}</td>
                          <td className="p-2 space-y-1">
                            <button type="button" className="block text-teal-400" onClick={() => setDetailId(v.id)}>
                              详情
                            </button>
                            {canShowExecute && commentTasksForProfile.some((t) => t.videoId === v.id) ? (
                            <button
                              type="button"
                              className="block text-xs text-teal-400 hover:text-teal-300"
                              onClick={() => setTaskModalOpen(true)}
                            >
                              执行任务
                            </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PageNav page={videoPage} totalPages={videoTotalPages} onPage={setVideoPage} label="热门视频" />
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-zinc-100">潜力 TikToker</div>
                <div className="space-y-2">
                  {pagedCreators.map((c, ci) => (
                    <div key={c.id || `cr-${ci}`} className="rounded-xl border border-zinc-800/90 bg-zinc-900/40 p-2 text-[11px]">
                      <div className="font-medium">{c.nickname}</div>
                      <div className="text-zinc-400">
                        粉丝 {c.followers} · 相关视频 {c.recentVideoCount} · 互动率 {c.avgEngagementRate}%
                      </div>
                      <div>倾向：{c.contentTendency}</div>
                      {c.tendencyDetail ? <div className="text-zinc-400">说明：{c.tendencyDetail}</div> : null}
                      {c.strengths ? <div className="text-zinc-300">擅长：{c.strengths}</div> : null}
                      {c.collaborationSuggestion ? <div className="text-zinc-400">建议：{c.collaborationSuggestion}</div> : null}
                      <div>潜力 {c.potentialScore} · {c.status}</div>
                      {c.sampleUrl && (
                        <a href={c.sampleUrl} target="_blank" rel="noreferrer" className="text-teal-400">
                          样例
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                <PageNav page={creatorPage} totalPages={creatorTotalPages} onPage={setCreatorPage} label="潜力达人" />
              </div>
            </div>

          </>
            )}
          </>
        )}
      </div>

      {detailVideo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/5">
            <div className="mb-2 flex justify-between gap-2">
              <span className="font-semibold text-zinc-100">视频详情</span>
              <button type="button" className="text-zinc-400 hover:text-zinc-200" onClick={() => setDetailId(null)}>
                关闭
              </button>
            </div>
            <p className="text-sm text-zinc-100">{detailVideo.title}</p>
            <div className="mt-2 text-[11px] text-zinc-400">情感 {detailVideo.sentiment}</div>
            {detailVideo.analysis && (
              <div className="mt-3 space-y-2 text-xs">
                <div>{detailVideo.analysis.summary}</div>
                <div>原因：{detailVideo.analysis.reasons?.join('；')}</div>
                <div>风险：{detailVideo.analysis.risks?.join('；')}</div>
                {detailVideo.analysis.hotCommentsSummary && <div>热评：{detailVideo.analysis.hotCommentsSummary}</div>}
              </div>
            )}
            <div className="mt-4 flex gap-2">
              {canShowExecute && commentTasksForProfile.some((x) => x.videoId === detailVideo.id) ? (
              <button
                type="button"
                className="rounded bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700"
                onClick={() => {
                  setTaskModalOpen(true);
                  setDetailId(null);
                }}
              >
                打开执行任务
              </button>
              ) : null}
              <a href={detailVideo.url} target="_blank" rel="noreferrer" className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
                打开 TikTok
              </a>
            </div>
          </div>
        </div>
      )}

      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50 ring-1 ring-white/5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-lg font-semibold text-zinc-100">执行任务</div>
                <p className="mt-1 text-sm text-zinc-400">
                  方案：{PROFILE_ORDER.find((p) => p.key === strategyProfile)?.label ?? strategyProfile} · 云手机按列表顺序轮流分配
                </p>
                {activeVariant?.executionProgram ? (
                  <div className="mt-2 rounded-lg border border-teal-800/50 bg-teal-950/20 px-3 py-2 text-xs text-teal-100">
                    <div>
                      策略摘要：{activeVariant.executionProgram.directionSummary}
                    </div>
                    <div className="mt-1 text-teal-200/90">
                      攻击性 {activeVariant.executionProgram.attackPct}% · 防御性 {activeVariant.executionProgram.defensePct}%
                    </div>
                  </div>
                ) : null}
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  <span className="font-medium text-zinc-200">评论性质说明：</span>
                  「攻击性」针对不实或偏颇说法，澄清并维护游戏；「防御性」在作者说得有理时表态赞同并补充正面信息。下方发往 TikTok 的正文须与每条标注的语言一致（英语 / 印尼语 / 中文），不要混用。
                </p>
              </div>
              <button type="button" className="text-sm text-zinc-400" onClick={() => setTaskModalOpen(false)}>
                关闭
              </button>
            </div>
            <div className="space-y-4">
              {commentTasksForProfile.map((t, taskIndex) => {
                const nl = natureLabel(t.executionNature);
                const deviceName = phoneListForDisplay.length
                  ? phoneListForDisplay[taskIndex % phoneListForDisplay.length]?.name ?? '—'
                  : '（未配置云手机）';
                return (
                <div
                  key={t.id || `${strategyProfile}-${t.videoId}`}
                  className="rounded-xl border border-zinc-700/80 bg-zinc-950/50 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${nl.className}`}>{nl.text}</span>
                    <span className="text-zinc-400">作者</span>
                    <span className="font-medium text-zinc-100">{t.authorNickname}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${sentimentClass(t.sentiment)}`}>{t.sentiment}</span>
                  </div>
                  <div className="mt-2 break-all text-xs text-zinc-400">
                    视频链接：{' '}
                    <a href={t.videoUrl} target="_blank" rel="noreferrer" className="text-teal-400 underline hover:text-teal-300">
                      {t.videoUrl}
                    </a>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    预分配发送设备：<span className="font-medium text-zinc-100">{deviceName}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500">
                    本条目标语言：<span className="font-medium text-zinc-300">{langLabel(t.lang)}</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="text-[11px] font-medium text-zinc-400">候选句式（单选）</div>
                    {(t.candidates ?? []).map((c, i) => (
                      <label key={i} className="flex cursor-pointer items-start gap-2">
                        <input
                          type="radio"
                          name={`cand-${strategyProfile}-${t.id}`}
                          checked={t.selectedIndex === i && taskEdits[`${strategyProfile}:${t.id}`] === undefined}
                          onChange={() => {
                            setTaskEdits((prev) => {
                              const n = { ...prev };
                              delete n[`${strategyProfile}:${t.id}`];
                              return n;
                            });
                            setSnapshot((prev) => {
                              if (!prev) return prev;
                              const list = [...(prev.commentTasksByProfile?.[strategyProfile] ?? prev.commentTasks)];
                              const ix = list.findIndex((x) => x.id === t.id);
                              if (ix < 0) return prev;
                              list[ix] = { ...list[ix], selectedIndex: i, editedText: undefined };
                              const ctp: Record<StrategyProfileKey, RiskCommentTask[]> = {
                                balanced: prev.commentTasksByProfile?.balanced ?? prev.commentTasks ?? [],
                                conservative: prev.commentTasksByProfile?.conservative ?? [],
                                aggressive: prev.commentTasksByProfile?.aggressive ?? [],
                              };
                              ctp[strategyProfile] = list;
                              const next = { ...prev, commentTasksByProfile: ctp };
                              if (strategyProfile === 'balanced') next.commentTasks = list;
                              return next;
                            });
                          }}
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                  <label className="mt-2 block">
                    <span className="text-[11px] font-medium text-zinc-400">
                      发往平台（{langLabel(t.lang)}，可改）：
                    </span>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 p-2 text-sm text-zinc-100 placeholder:text-zinc-500"
                      rows={2}
                      value={commentText(t)}
                      onChange={(e) =>
                        setTaskEdits((prev) => ({ ...prev, [`${strategyProfile}:${t.id}`]: e.target.value }))
                      }
                    />
                  </label>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="rounded-lg border border-zinc-600 bg-zinc-800/80 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                      onClick={async () => {
                        const res = await authFetch('/api/risk-sentiment/regenerate-comments', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ videoId: t.videoId, profile: strategyProfile }),
                        });
                        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; snapshot?: RiskSnapshot };
                        if (res.ok && data.snapshot) setSnapshot(data.snapshot);
                      }}
                    >
                      重新生成
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
            {sendErr && <div className="mt-3 text-sm text-red-400">{sendErr}</div>}
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-4">
              <button type="button" className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800" onClick={() => setTaskModalOpen(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-teal-700 disabled:opacity-50"
                disabled={!commentTasksForProfile.length}
                onClick={() => setConfirmExecuteOpen(true)}
              >
                一键执行
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmExecuteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog">
          <div className="w-full max-w-md rounded-2xl border border-zinc-600 bg-zinc-900 p-6 shadow-2xl shadow-black/50 ring-1 ring-white/5">
            <div className="text-lg font-semibold text-zinc-100">确认执行？</div>
            <p className="mt-2 text-sm text-zinc-400">
              将向 {commentTasksForProfile.length} 条任务对应的视频发送评论（按云手机列表轮流）。成功或失败都会在「任务日志」里留一条记录。
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                onClick={() => setConfirmExecuteOpen(false)}
              >
                先不执行
              </button>
              <button
                type="button"
                className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700"
                onClick={() => void sendExecutionBatch()}
              >
                确定执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
