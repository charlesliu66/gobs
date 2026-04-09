/**
 * 风控大师 · 舆情监控：Apify 采集 → Compass 分析 → GeeLark 下发评论任务
 */
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { jsonrepair } from 'jsonrepair';
import { compassChatCompletion } from './compassLlm.js';
import { getGeelarkOpenApiV1Base, geelarkApiTraceId, resolveGeelarkBearerToken } from './geelarkClient.js';

const DATA_FILE = join(process.cwd(), '.data', 'risk-sentiment.json');
/** 可选：粘贴你从 skills.sh / 自建 skill 里选中的「分析侧重点」全文，会拼进 Compass 系统提示，影响「风控大师建议」等输出 */
const RISK_EXTRA_PROMPT_FILE = join(process.cwd(), 'config', 'risk-sentiment-extra-prompt.md');

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type RiskVideo = {
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
  riskTag: '高风险' | '可借势' | '建议覆盖' | '持续观察';
  url: string;
  /** Apify 评论 Actor 抓取后按赞排序截断，用于 LLM 与列表展示 */
  topComments?: Array<{ text: string; likeCount: number }>;
  analysis?: {
    summary: string;
    reasons: string[];
    risks: string[];
    hotCommentsSummary?: string;
    strategies?: { positive?: string; neutral?: string; clarify?: string };
  };
};

export type RiskCreator = {
  id: string;
  nickname: string;
  followers: number;
  recentVideoCount: number;
  avgEngagementRate: number;
  contentTendency: string;
  potentialScore: number;
  sampleUrl?: string;
  status: '未跟进' | '已观察' | '已投放' | '合作中';
};

export type CommentAttitude = '正面引导' | '中性互动' | '防御缓冲' | '纠偏澄清';

export type CommentTask = {
  id: string;
  videoId: string;
  videoUrl: string;
  authorNickname: string;
  sentiment: SentimentLabel;
  attitude: CommentAttitude;
  lang: string;
  candidates: string[];
  selectedIndex: number;
  editedText?: string;
};

export type RiskSnapshot = {
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
    /** 各情感维度的依据（非仅数字），便于理解「正/中/负」分别体现在哪里 */
    positiveSummary?: string;
    neutralSummary?: string;
    negativeSummary?: string;
  };
  topics: Array<{ term: string; count: number }>;
  videos: RiskVideo[];
  creators: RiskCreator[];
  strategy: {
    conclusion: string;
    level: '低风险' | '中风险' | '高风险';
    narrative: string;
    riskPoints: string[];
    actions: string[];
    /** 下一步运营/社区侧优先事项（1～3 句） */
    nextFocus?: string;
    /** 本批评论任务的态度分布与整体口吻建议 */
    commentToneSummary?: string;
  };
  commentTasks: CommentTask[];
  lastRefreshStatus: 'idle' | 'ok' | 'error';
  lastError?: string;
  apifyUsedMock?: boolean;
  /** 本次 TikTok 采集实际送入 Apify 的标签（含从游戏名自动推导），可与用户手输 keywords 对照 */
  effectiveKeywords?: string[];
  /** social-listening：监测维度与关键词 */
  keywordMatrix: Array<{ category: string; keywords: string[]; monitorNote?: string }>;
  /** social-listening：绿/黄/橙/红 告警条 */
  listeningAlerts: Array<{
    level: '绿' | '黄' | '橙' | '红';
    title: string;
    detail: string;
    responseWithin?: string;
  }>;
  /** social-trend-monitor：基于本批样本的「与游戏相关」崛起话题/内容形态 */
  recentTrends: {
    summary: string;
    risingItems: Array<{ topic: string; whyRising: string; tieToGame: string }>;
  };
};

const defaultSnapshot = (partial?: Partial<RiskSnapshot>): RiskSnapshot => ({
  game: partial?.game ?? '',
  days: partial?.days ?? 7,
  keywords: partial?.keywords ?? [],
  limit: partial?.limit ?? 10,
  updatedAt: partial?.updatedAt ?? 0,
  overview: {
    score: 0,
    positivePct: 0,
    neutralPct: 0,
    negativePct: 0,
    helperText: '暂无数据',
    ...partial?.overview,
  },
  topics: partial?.topics ?? [],
  videos: partial?.videos ?? [],
  creators: partial?.creators ?? [],
  strategy: {
    conclusion: '建议：暂不控评',
    level: '低风险',
    narrative: '请先点击「立即刷新」获取数据。',
    riskPoints: [],
    actions: [],
    ...partial?.strategy,
  },
  commentTasks: partial?.commentTasks ?? [],
  lastRefreshStatus: partial?.lastRefreshStatus ?? 'idle',
  lastError: partial?.lastError,
  apifyUsedMock: partial?.apifyUsedMock,
  effectiveKeywords: partial?.effectiveKeywords,
  keywordMatrix: partial?.keywordMatrix ?? [],
  listeningAlerts: partial?.listeningAlerts ?? [],
  recentTrends: partial?.recentTrends ?? { summary: '', risingItems: [] },
});

async function ensureDataDir() {
  await mkdir(join(process.cwd(), '.data'), { recursive: true });
}

function parseJsonRelaxed(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return JSON.parse(jsonrepair(raw)) as unknown;
  }
}

export async function loadSnapshot(): Promise<RiskSnapshot> {
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const j = parseJsonRelaxed(raw) as RiskSnapshot;
    if (!j || typeof j !== 'object') return rehydrateSnapshot(defaultSnapshot());
    const base = defaultSnapshot();
    const merged: RiskSnapshot = {
      ...base,
      ...j,
      overview: { ...base.overview, ...j.overview },
      strategy: {
        ...base.strategy,
        ...(j.strategy && typeof j.strategy === 'object' ? j.strategy : {}),
      },
      effectiveKeywords: Array.isArray(j.effectiveKeywords) ? j.effectiveKeywords : undefined,
      keywordMatrix: Array.isArray(j.keywordMatrix) ? j.keywordMatrix : [],
      listeningAlerts: Array.isArray(j.listeningAlerts) ? j.listeningAlerts : [],
      recentTrends:
        j.recentTrends && typeof j.recentTrends === 'object'
          ? {
              summary: String((j.recentTrends as { summary?: unknown }).summary ?? ''),
              risingItems: Array.isArray((j.recentTrends as { risingItems?: unknown }).risingItems)
                ? ((j.recentTrends as { risingItems: unknown[] }).risingItems as Record<string, unknown>[]).map((r) => ({
                    topic: String(r.topic ?? ''),
                    whyRising: String(r.whyRising ?? ''),
                    tieToGame: String(r.tieToGame ?? ''),
                  }))
                : [],
            }
          : { summary: '', risingItems: [] },
    };
    return rehydrateSnapshot(merged);
  } catch {
    return rehydrateSnapshot(defaultSnapshot());
  }
}

async function saveSnapshot(s: RiskSnapshot) {
  await ensureDataDir();
  await writeFile(DATA_FILE, JSON.stringify(s, null, 2), 'utf8');
}

/** 兼容多种 Apify TikTok Actor 返回的封面字段 */
function pickCoverFromApifyRow(row: Record<string, unknown>): string {
  const asUrl = (v: unknown): string => {
    const s = typeof v === 'string' ? v.trim() : '';
    return /^https?:\/\//i.test(s) ? s : '';
  };
  const video = row.video as Record<string, unknown> | undefined;
  const covers = row.covers as Record<string, unknown> | undefined;
  const vm = row.videoMeta as Record<string, unknown> | undefined;
  const videoCover = video?.cover as Record<string, unknown> | undefined;
  const urlListFirst =
    videoCover &&
    Array.isArray((videoCover as { urlList?: unknown }).urlList) &&
    (videoCover as { urlList: unknown[] }).urlList.length > 0
      ? (videoCover as { urlList: unknown[] }).urlList[0]
      : undefined;
  const itemInfos = row.itemInfos as Record<string, unknown> | undefined;
  const itemVideo = itemInfos?.video as Record<string, unknown> | undefined;
  const list: string[] = [
    asUrl(row.coverUrl),
    asUrl(row['cover']),
    asUrl(row.thumbnail),
    asUrl(row['thumbnailUrl']),
    asUrl(row['dynamicCover']),
    asUrl(row['originCover']),
    asUrl(row['shareCover']),
    asUrl(row['zoomCover']),
    asUrl(video?.coverUrl),
    asUrl(video?.dynamicCover),
    asUrl(video?.originCover),
    asUrl(videoCover?.url),
    asUrl(urlListFirst),
    asUrl(covers?.default),
    asUrl(covers?.dynamic),
    asUrl(covers?.origin),
    asUrl(vm?.coverUrl),
    asUrl(vm?.['originalCoverUrl']),
    asUrl(itemVideo?.cover),
    asUrl(itemVideo?.dynamicCover),
    asUrl(itemVideo?.originCover),
  ];
  return list.find((u) => u.length > 10) ?? '';
}

/** TikTok 官方 oembed 返回该视频的缩略图 URL（与网页一致），仅在 Apify 未带回封面时使用 */
async function fetchTikTokOembedThumbnail(videoUrl: string): Promise<string | undefined> {
  try {
    if (!/tiktok\.com/i.test(videoUrl)) return undefined;
    const u = `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`;
    const res = await fetch(u, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return undefined;
    const j = (await res.json()) as { thumbnail_url?: string };
    const t = j.thumbnail_url?.trim();
    return t && /^https?:\/\//i.test(t) ? t : undefined;
  } catch {
    return undefined;
  }
}

/** noembed 聚合 oembed，部分环境下比直连 TikTok oembed 更稳 */
async function fetchThumbnailViaNoembed(videoUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return undefined;
    const j = (await res.json()) as { thumbnail_url?: string };
    const t = j.thumbnail_url?.trim();
    return t && /^https?:\/\//i.test(t) ? t : undefined;
  } catch {
    return undefined;
  }
}

async function enrichCoversFromTikTokOembed(items: RiskVideo[]): Promise<RiskVideo[]> {
  const out = items.map((v) => ({ ...v }));
  const need = out
    .map((v, i) => ({ i, v }))
    .filter(({ v }) => !v.coverUrl && /tiktok\.com/i.test(v.url));
  const batchSize = 6;
  for (let b = 0; b < need.length; b += batchSize) {
    const chunk = need.slice(b, b + batchSize);
    await Promise.all(
      chunk.map(async ({ i, v }) => {
        let thumb = await fetchTikTokOembedThumbnail(v.url);
        if (!thumb) thumb = await fetchThumbnailViaNoembed(v.url);
        if (thumb) out[i] = { ...out[i], coverUrl: thumb };
      }),
    );
  }
  return out;
}

function extractJsonObject(raw: string): unknown {
  let t = raw.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-z]*\n?/i, '').replace(/\s*```\s*$/i, '');
  }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return JSON.parse(jsonrepair(t)) as unknown;
  }
}

function normalizeApifyRecord(row: Record<string, unknown>, idx: number): RiskVideo | null {
  const url =
    String(row.webVideoUrl ?? row.videoUrl ?? row.url ?? row.shareUrl ?? row['videoUrl'] ?? '').trim() ||
    `https://www.tiktok.com/video/mock-${idx}`;
  const id = String(row.id ?? row.videoId ?? row.aweme_id ?? `v-${idx}`).trim() || `v-${idx}`;
  const text = String(row.text ?? row.desc ?? row.title ?? row.description ?? '（无标题）').slice(0, 500);
  const authorMeta = row.authorMeta as Record<string, unknown> | undefined;
  const author = String(authorMeta?.name ?? row.author ?? row['author'] ?? 'unknown');
  const fans = Number(authorMeta?.fans ?? row.followerCount ?? 0) || undefined;
  const stats = (row.stats as Record<string, unknown>) || row;
  const likes = Number(stats?.diggCount ?? stats?.likes ?? row.likes ?? 0) || 0;
  const comments = Number(stats?.commentCount ?? row.comments ?? 0) || 0;
  const shares = Number(stats?.shareCount ?? row.shares ?? 0) || 0;
  const cover = pickCoverFromApifyRow(row);
  const create = Number(row.createTime ?? row.createTimeISO ?? 0);
  const publishedAt =
    typeof row.createTimeISO === 'string'
      ? row.createTimeISO
      : create > 1e12
        ? new Date(create).toISOString()
        : create > 1e9
          ? new Date(create * 1000).toISOString()
          : undefined;

  return {
    id,
    coverUrl: cover || undefined,
    title: text,
    author,
    followers: fans,
    publishedAt,
    likes,
    comments,
    shares,
    sentiment: 'neutral',
    riskTag: '持续观察',
    url,
  };
}

function mockVideos(game: string, keywords: string[], limit: number): RiskVideo[] {
  const tag = keywords[0]?.replace(/^#/, '') || 'game';
  const n = Math.min(Math.max(limit, 3), 12);
  const out: RiskVideo[] = [];
  for (let i = 0; i < n; i++) {
    const sentiment = (['positive', 'neutral', 'negative'] as const)[i % 3];
    out.push({
      id: `mock-${i}-${Date.now()}`,
      title: `[演示数据] ${game || 'Game'} · #${tag} 相关讨论 ${i + 1}`,
      author: `creator_${i + 1}`,
      followers: 12000 + i * 900,
      publishedAt: new Date(Date.now() - i * 86400000).toISOString(),
      likes: 800 + i * 50,
      comments: 40 + i * 3,
      shares: 12 + i,
      sentiment,
      riskTag: i % 4 === 0 ? '高风险' : i % 3 === 0 ? '可借势' : '持续观察',
      url: `https://www.tiktok.com/@demo/video/${7800000000000 + i}`,
    });
  }
  return out;
}

/**
 * 仅根据「游戏」字段生成**单一** TikTok hashtag（不含 #），用于 Apify 采集。
 * 不再合并用户额外标签或其它推导词。
 */
function singleHashtagFromGameName(game: string): string {
  const raw = game.replace(/^#/, '').trim();
  if (!raw || raw === '未命名游戏') return '';
  if (/[\u4e00-\u9fff]/.test(raw)) {
    return raw.replace(/\s+/g, '').slice(0, 40);
  }
  return raw
    .replace(/\s+/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 64);
}

/** 只采 #游戏名 对应的一个标签；无有效游戏名时回退 gaming */
function mergeKeywordsForApify(game: string, _userKeywords: string[]): string[] {
  const one = singleHashtagFromGameName(game);
  return one ? [one] : ['gaming'];
}

/** 舆情评分与正/负占比对齐：净情感 = 正面% − 负面%，映射到 0～100 */
function deriveOverviewScoreFromPcts(positivePct: number, negativePct: number): number {
  const p = Math.min(100, Math.max(0, positivePct));
  const neg = Math.min(100, Math.max(0, negativePct));
  const net = p - neg;
  return Math.min(100, Math.max(0, Math.round(50 + net * 0.45)));
}

async function loadRiskSentimentExtraPrompt(): Promise<string> {
  try {
    if (!existsSync(RISK_EXTRA_PROMPT_FILE)) return '';
    const t = (await readFile(RISK_EXTRA_PROMPT_FILE, 'utf8')).trim();
    if (!t) return '';
    return `\n\n【附加：用户自定义分析侧重点】\n你必须服从以下补充要求撰写 strategy（conclusion / narrative / riskPoints / actions）及 overview.helperText，不得忽略：\n${t}`;
  } catch {
    return '';
  }
}

async function runApifyDataset(params: { keywords: string[]; limit: number }): Promise<{ items: RiskVideo[]; usedMock: boolean; note?: string }> {
  const token = process.env.APIFY_TOKEN?.trim();
  const actor = process.env.APIFY_ACTOR_ID?.trim() || 'clockworks~tiktok-hashtag-scraper';
  const hashtags = params.keywords.map((k) => k.replace(/^#/, '').trim()).filter(Boolean);
  if (!hashtags.length) hashtags.push('gaming');

  if (!token) {
    return { items: mockVideos('', hashtags, params.limit), usedMock: true, note: '未配置 APIFY_TOKEN，已使用演示数据' };
  }

  let input: Record<string, unknown> = {
    hashtags: hashtags.slice(0, 10),
    resultsPerPage: Math.min(100, params.limit),
  };
  const override = process.env.APIFY_INPUT_JSON?.trim();
  if (override) {
    try {
      input = JSON.parse(override) as Record<string, unknown>;
    } catch {
      /* keep default */
    }
  }

  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/runs?waitForFinish=300`;
  const runRes = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const runJson = (await runRes.json().catch(() => ({}))) as {
    data?: { defaultDatasetId?: string; status?: string };
    error?: { message?: string };
  };
  if (!runRes.ok || runJson.error?.message) {
    return {
      items: mockVideos('', hashtags, params.limit),
      usedMock: true,
      note: `Apify 调用失败：${runJson.error?.message || runRes.status}，已回退演示数据`,
    };
  }
  const dsId = runJson.data?.defaultDatasetId;
  if (!dsId) {
    return { items: mockVideos('', hashtags, params.limit), usedMock: true, note: 'Apify 未返回数据集，已回退演示数据' };
  }
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${dsId}/items?clean=true&format=json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rows = (await itemsRes.json().catch(() => [])) as Record<string, unknown>[];
  const items: RiskVideo[] = [];
  for (let i = 0; i < rows.length && items.length < params.limit; i++) {
    const v = normalizeApifyRecord(rows[i] ?? {}, i);
    if (v) items.push(v);
  }
  if (!items.length) {
    return { items: mockVideos('', hashtags, params.limit), usedMock: true, note: 'Apify 结果为空，已回退演示数据' };
  }
  const withCovers = await enrichCoversFromTikTokOembed(items);
  return { items: withCovers, usedMock: false };
}

function extractAwemeIdFromTiktokUrl(u: string): string | null {
  const m = u.match(/\/video\/(\d+)/i);
  return m?.[1] ?? null;
}

function videoAwemeKey(v: RiskVideo): string {
  if (/^\d{10,}$/.test(v.id)) return v.id;
  return extractAwemeIdFromTiktokUrl(v.url) ?? v.id;
}

type CommentRow = {
  awemeId?: string;
  text?: string;
  likeCount?: number;
  diggCount?: number;
  message?: string;
  error?: string;
};

/**
 * 对前若干条真实视频再跑 Apify「评论」Actor，按点赞取前 N 条，供大模型做情感判断。
 * 需与 hashtag 采集共用 APIFY_TOKEN；默认 Actor：codescraper/tiktok-comments-scraper（可用 APIFY_COMMENTS_ACTOR_ID 覆盖）。
 */
async function fetchTopCommentsViaApify(videos: RiskVideo[]): Promise<{ enriched: RiskVideo[]; note?: string }> {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) {
    return { enriched: videos, note: '未配置 APIFY_TOKEN，跳过评论抓取' };
  }
  if (process.env.RISK_FETCH_COMMENTS === '0') {
    return { enriched: videos, note: '已设置 RISK_FETCH_COMMENTS=0，跳过评论抓取' };
  }

  const actor = process.env.APIFY_COMMENTS_ACTOR_ID?.trim() || 'codescraper~tiktok-comments-scraper';
  const maxVideos = Math.min(50, Math.max(1, parseInt(process.env.RISK_COMMENT_MAX_VIDEOS ?? '10', 10) || 10));
  const minPer = Math.min(100, Math.max(5, parseInt(process.env.RISK_COMMENT_MIN_PER_VIDEO ?? '30', 10) || 30));
  const topN = Math.min(20, Math.max(3, parseInt(process.env.RISK_COMMENT_TOP_N ?? '8', 10) || 8));

  const real = videos.filter((v) => v.url && !/\/video\/mock-/i.test(v.url) && !v.url.includes('mock-'));
  const batch = real.slice(0, maxVideos);
  if (batch.length === 0) {
    return { enriched: videos, note: '无有效 TikTok 链接（或演示数据），跳过评论抓取' };
  }

  let input: Record<string, unknown> = {
    videoUrls: batch.map((v) => v.url),
    minCommentsPerVideo: minPer,
  };
  const override = process.env.APIFY_COMMENTS_INPUT_JSON?.trim();
  if (override) {
    try {
      input = { ...input, ...(JSON.parse(override) as Record<string, unknown>) };
    } catch {
      /* keep default */
    }
  }

  const runUrl = `https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/runs?waitForFinish=480`;
  const runRes = await fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const runJson = (await runRes.json().catch(() => ({}))) as {
    data?: { defaultDatasetId?: string };
    error?: { message?: string };
  };
  if (!runRes.ok || runJson.error?.message) {
    return {
      enriched: videos,
      note: `评论抓取失败：${runJson.error?.message || String(runRes.status)}`,
    };
  }
  const dsId = runJson.data?.defaultDatasetId;
  if (!dsId) {
    return { enriched: videos, note: '评论 Apify 未返回数据集' };
  }
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${dsId}/items?clean=true&format=json`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rows = (await itemsRes.json().catch(() => [])) as CommentRow[];

  const byAweme = new Map<string, Array<{ text: string; likeCount: number }>>();
  for (const row of rows) {
    if (row.message || row.error) continue;
    const aid = String(row.awemeId ?? '').trim();
    if (!aid) continue;
    const text = String(row.text ?? '').trim();
    if (!text) continue;
    const likes = Number(row.likeCount ?? row.diggCount ?? 0) || 0;
    const arr = byAweme.get(aid) ?? [];
    arr.push({ text, likeCount: likes });
    byAweme.set(aid, arr);
  }
  for (const [aid, arr] of byAweme) {
    arr.sort((a, b) => b.likeCount - a.likeCount);
    byAweme.set(aid, arr.slice(0, topN));
  }

  const enriched = videos.map((v) => {
    const key = videoAwemeKey(v);
    let list = byAweme.get(key);
    if (!list?.length) {
      const fromUrl = extractAwemeIdFromTiktokUrl(v.url);
      if (fromUrl) list = byAweme.get(fromUrl);
    }
    if (list?.length) {
      return { ...v, topComments: list };
    }
    return v;
  });

  const got = enriched.filter((v) => (v.topComments?.length ?? 0) > 0).length;
  return {
    enriched,
    note: `评论：已对 ${got}/${batch.length} 条视频拉取高赞样本（每条最多 ${topN} 条，Actor ${actor}）`,
  };
}

function normalizePct3(p: number, n: number, neg: number): { p: number; n: number; neg: number } {
  const a = Math.max(0, p)
  const b = Math.max(0, n)
  const c = Math.max(0, neg)
  const s = a + b + c
  if (s <= 0) return { p: 34, n: 33, neg: 33 }
  return { p: (a / s) * 100, n: (b / s) * 100, neg: (c / s) * 100 }
}

function parseKeywordMatrix(raw: unknown): RiskSnapshot['keywordMatrix'] {
  if (typeof raw === 'string') {
    try {
      return parseKeywordMatrix(parseJsonRelaxed(raw));
    } catch {
      return [];
    }
  }
  let arr: unknown = raw;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.rows)) arr = o.rows;
    else if (Array.isArray(o.matrix)) arr = o.matrix;
    else if (Array.isArray(o.keywordMatrix)) arr = o.keywordMatrix;
    else if (Array.isArray(o.items)) arr = o.items;
  }
  if (!Array.isArray(arr)) return [];
  const out: RiskSnapshot['keywordMatrix'] = [];
  for (const x of arr) {
    const o = x as Record<string, unknown>;
    let kw = Array.isArray(o.keywords) ? o.keywords.map((k) => String(k).trim()).filter(Boolean) : [];
    if (!kw.length && typeof o.keyword === 'string') kw = [o.keyword.trim()].filter(Boolean);
    if (!kw.length) continue;
    out.push({
      category: String(o.category ?? o.dimension ?? '').trim() || '未命名维度',
      keywords: kw.slice(0, 24),
      ...(o.monitorNote !== undefined && String(o.monitorNote).trim()
        ? { monitorNote: String(o.monitorNote).trim() }
        : {}),
    });
  }
  return out.slice(0, 12);
}

function normalizeListeningAlertLevel(lv: string): '绿' | '黄' | '橙' | '红' {
  const s = String(lv ?? '')
    .trim()
    .toLowerCase();
  const zh = String(lv ?? '').trim();
  if (zh === '绿' || zh === '黄' || zh === '橙' || zh === '红') return zh;
  if (s === 'green' || s === 'g') return '绿';
  if (s === 'yellow' || s === 'y') return '黄';
  if (s === 'orange' || s === 'o') return '橙';
  if (s === 'red' || s === 'r') return '红';
  return '绿';
}

function parseListeningAlerts(raw: unknown): RiskSnapshot['listeningAlerts'] {
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    try {
      arr = parseJsonRelaxed(raw);
    } catch {
      return [];
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.alerts)) arr = o.alerts;
    else if (Array.isArray(o.items)) arr = o.items;
    else if (Array.isArray(o.listeningAlerts)) arr = o.listeningAlerts;
  }
  if (!Array.isArray(arr)) return [];
  const out: RiskSnapshot['listeningAlerts'] = [];
  for (const x of arr) {
    const o = x as Record<string, unknown>;
    const level = normalizeListeningAlertLevel(String(o.level ?? '绿'));
    const title = String(o.title ?? o.headline ?? '').trim() || '监测提示';
    const detail = String(o.detail ?? o.message ?? o.body ?? '').trim() || '—';
    out.push({
      level,
      title,
      detail,
      ...(o.responseWithin !== undefined && String(o.responseWithin).trim()
        ? { responseWithin: String(o.responseWithin).trim() }
        : {}),
    });
  }
  return out.slice(0, 8);
}

function parseRecentTrends(raw: unknown, game: string): RiskSnapshot['recentTrends'] {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : undefined;
  const rising = Array.isArray(o?.risingItems) ? o.risingItems : [];
  const risingItems = rising
    .map((x) => {
      const r = x as Record<string, unknown>;
      return {
        topic: String(r.topic ?? '').trim(),
        whyRising: String(r.whyRising ?? '').trim(),
        tieToGame: String(r.tieToGame ?? '').trim(),
      };
    })
    .filter((x) => x.topic)
    .slice(0, 8);
  const summary = String(o?.summary ?? '').trim();
  return {
    summary:
      summary ||
      (risingItems.length
        ? `以下为与「${game || '本游戏'}」相关的样本内话题整理。`
        : '模型未返回近期趋势段落，可再次刷新。'),
    risingItems,
  };
}

function fallbackKeywordMatrix(game: string, searchKeywords: string[]): RiskSnapshot['keywordMatrix'] {
  const tags = searchKeywords.map((k) => k.replace(/^#/, '').trim()).filter(Boolean);
  const g = game.trim() || '当前游戏';
  const kws = [...new Set([g, ...tags])].filter(Boolean).slice(0, 16);
  return [{ category: '游戏 / 采集标签', keywords: kws, monitorNote: '来自本次游戏名与 hashtag 合并' }];
}

function extractHashtagsFromTitles(videos: RiskVideo[]): string[] {
  const set = new Set<string>();
  const re = /#[\p{L}\p{N}_]+/gu;
  for (const v of videos) {
    const t = v.title ?? '';
    for (const m of t.matchAll(re)) {
      const raw = m[0].slice(1).toLowerCase();
      if (raw.length >= 2) set.add(raw);
    }
  }
  return [...set].slice(0, 24);
}

function buildKeywordMatrixFromBatch(
  game: string,
  searchKeywords: string[],
  videos: RiskVideo[],
  topics: RiskSnapshot['topics'],
): RiskSnapshot['keywordMatrix'] {
  const g = game.trim() || '当前游戏';
  const tags = searchKeywords.map((k) => k.replace(/^#/, '').trim()).filter(Boolean);
  const fromTitles = extractHashtagsFromTitles(videos);
  const topicTerms = [...topics]
    .filter((t) => String(t.term ?? '').trim())
    .sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0))
    .slice(0, 14)
    .map((t) => String(t.term).trim());

  const rows: RiskSnapshot['keywordMatrix'] = [];
  rows.push({
    category: '游戏 / 采集标签',
    keywords: [...new Set([g, ...tags])].filter(Boolean).slice(0, 16),
    monitorNote: '来自本次游戏名与采集 hashtag',
  });
  if (fromTitles.length) {
    rows.push({
      category: '样本标题 hashtag',
      keywords: fromTitles.slice(0, 16),
      monitorNote: '从本批视频标题抽取',
    });
  }
  if (topicTerms.length) {
    rows.push({
      category: '高频话题词',
      keywords: topicTerms,
      monitorNote: '来自模型归纳的 topics',
    });
  }
  const riskHints = videos
    .filter((v) => v.riskTag === '高风险')
    .map((v) => v.title.replace(/\s+/g, ' ').trim().slice(0, 48))
    .filter(Boolean)
    .slice(0, 6);
  if (riskHints.length) {
    rows.push({
      category: '高风险条目（标题摘要）',
      keywords: riskHints,
      monitorNote: '仅作定位线索，请结合详情与评论',
    });
  }
  return rows.length ? rows : fallbackKeywordMatrix(game, searchKeywords);
}

function buildListeningAlertsFromOverview(
  overview: RiskSnapshot['overview'],
  videos: RiskVideo[],
): RiskSnapshot['listeningAlerts'] {
  const neg = Math.round(Math.min(100, Math.max(0, Number(overview.negativePct ?? 0))));
  const highRisk = videos.filter((v) => v.riskTag === '高风险').length;
  const alerts: RiskSnapshot['listeningAlerts'] = [];
  if (neg >= 45 || highRisk >= 3) {
    alerts.push({
      level: '橙',
      title: '负面声量或高风险帖文集中',
      detail: `本批样本负面情感约 ${neg}%，高风险标签 ${highRisk} 条，建议优先复核评论与高互动内容。`,
      responseWithin: '24h 内',
    });
  } else if (neg >= 25 || highRisk >= 1) {
    alerts.push({
      level: '黄',
      title: '需关注负面与风险信号',
      detail: `负面约 ${neg}%，高风险 ${highRisk} 条；建议纳入日常巡查与评论抽检。`,
      responseWithin: '48h 内',
    });
  } else {
    alerts.push({
      level: '绿',
      title: '样本内情感相对平稳',
      detail: `负面约 ${neg}%，高风险 ${highRisk} 条；仍建议持续监测评论区与突发话题。`,
      responseWithin: '按日',
    });
  }
  return alerts.slice(0, 4);
}

function mergeActionsFromStrategy(strategy: RiskSnapshot['strategy']): string[] {
  const actions = [...(strategy.actions ?? [])];
  const rp = strategy.riskPoints ?? [];
  for (const r of rp) {
    const line = String(r).trim();
    if (!line) continue;
    const prefix = line.startsWith('针对') ? line : `针对风险点：${line}`;
    if (!actions.some((a) => a.includes(line.slice(0, 24)))) actions.push(prefix);
  }
  if (!actions.length && String(strategy.narrative ?? '').trim()) {
    actions.push('按上方叙事摘要拆分落地：先核对评论区再决定控评或借势。');
  }
  if (!actions.length) {
    actions.push('请先点击「立即刷新」拉取 TikTok 样本并生成策略后再执行具体动作。');
  }
  return actions.slice(0, 12);
}

function summarizeCommentTaskAttitudes(tasks: CommentTask[]): string {
  const m = new Map<string, number>();
  for (const t of tasks) {
    m.set(t.attitude, (m.get(t.attitude) ?? 0) + 1);
  }
  if (m.size === 0) {
    return '暂无评论任务；刷新生成后，此处将汇总各任务的评论态度（正面引导 / 中性互动 / 防御缓冲 / 纠偏澄清）。';
  }
  const parts = [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v} 条`);
  return `本批推荐评论任务态度分布：${parts.join('；')}。执行时请按每条任务的 attitude 选择口吻。`;
}

function enrichStrategyPlanFields(strategy: RiskSnapshot['strategy'], tasks: CommentTask[]): RiskSnapshot['strategy'] {
  const tone = (strategy.commentToneSummary ?? '').trim() || summarizeCommentTaskAttitudes(tasks);
  const next =
    (strategy.nextFocus ?? '').trim() ||
    (strategy.actions?.[0] ? `下一步优先：${strategy.actions[0]}` : '结合 narrative 与页面底部「执行任务」推进监测与互动。');
  return { ...strategy, commentToneSummary: tone, nextFocus: next };
}

/** 旧快照缺字段时，用本批 videos/topics/overview 补全矩阵、告警与行动项 */
function rehydrateSnapshot(snap: RiskSnapshot): RiskSnapshot {
  const game = snap.game ?? '';
  const searchKw =
    snap.effectiveKeywords && snap.effectiveKeywords.length > 0
      ? snap.effectiveKeywords
      : snap.keywords.map((k) => k.replace(/^#/, '').trim()).filter(Boolean);

  let keywordMatrix = snap.keywordMatrix ?? [];
  if (!keywordMatrix.length) {
    keywordMatrix = buildKeywordMatrixFromBatch(game, searchKw, snap.videos ?? [], snap.topics ?? []);
  }

  let listeningAlerts = snap.listeningAlerts ?? [];
  if (!listeningAlerts.length) {
    listeningAlerts = buildListeningAlertsFromOverview(snap.overview, snap.videos ?? []);
  }

  let strategy = snap.strategy;
  if (!strategy.actions?.length) {
    const merged = mergeActionsFromStrategy(strategy);
    if (merged.length) strategy = { ...strategy, actions: merged };
  }
  strategy = enrichStrategyPlanFields(strategy, snap.commentTasks ?? []);

  const overview = {
    ...snap.overview,
    score: deriveOverviewScoreFromPcts(snap.overview.positivePct, snap.overview.negativePct),
  };

  return { ...snap, overview, keywordMatrix, listeningAlerts, strategy };
}

const ANALYSIS_SYSTEM = `你是游戏舆情与 TikTok 风控分析助手。输入中每条视频可能带有 **topComments**（按点赞从高到低截取的高赞评论样本，含点赞数 likes）。输出**严格 JSON**（不要 markdown），结构如下：
{
  "overview": {
    "score": 0-100,
    "positivePct": 0-100,
    "neutralPct": 0-100,
    "negativePct": 0-100,
    "helperText": "一句总览中文",
    "positiveSummary": "1-2句中文：正面声量主要体现在哪些角度（如玩法好评、版本期待、二创玩梗等）",
    "neutralSummary": "1-2句中文：中性内容主要是什么（纯展示、资讯、态度不明显等）",
    "negativeSummary": "1-2句中文：负面/争议/避雷/吐槽主要体现在哪些点；若标题字面几乎无贬义，也要说明「潜在风险仍可能存在于评论区或未在标题体现」，避免与 0% 矛盾"
  },
  "topics": [ { "term": string, "count": number } ],
  "videos": [
    {
      "id": string,
      "sentiment": "positive" | "neutral" | "negative",
      "riskTag": "高风险" | "可借势" | "建议覆盖" | "持续观察",
      "analysis": {
        "summary": string,
        "reasons": string[],
        "risks": string[],
        "hotCommentsSummary": string,
        "strategies": { "positive": string, "neutral": string, "clarify": string }
      }
    }
  ],
  "creators": [
    {
      "id": string,
      "nickname": string,
      "followers": number,
      "recentVideoCount": number,
      "avgEngagementRate": 0-100,
      "contentTendency": string,
      "potentialScore": 0-100,
      "sampleUrl": string,
      "status": "未跟进" | "已观察" | "已投放" | "合作中"
    }
  ],
  "strategy": {
    "conclusion": "建议：防御型控评" | "建议：借势扩散" | "建议：暂不控评" 或类似简短中文,
    "level": "低风险" | "中风险" | "高风险",
    "narrative": string,
    "riskPoints": string[],
    "actions": string[],
    "nextFocus": "1～3句：下一步运营/社区侧优先做什么（可执行）",
    "commentToneSummary": "1～3句：本批 commentTasks 各态度分布与整体评论口吻建议"
  },
  "commentTasks": [
    {
      "videoId": string,
      "attitude": "正面引导" | "中性互动" | "防御缓冲" | "纠偏澄清",
      "lang": "en" | "id" | "zh",
      "candidates": [ "评论1", "评论2", "评论3" ]
    }
  ],
  "keywordMatrix": [
    {
      "category": "品牌/游戏 或 行业/竞品/危机 等维度",
      "keywords": [ "须结合输入 game、searchKeywords 与本批标题/评论中出现过的真实词" ],
      "monitorNote": "可选：该维度监测重点"
    }
  ],
  "listeningAlerts": [
    {
      "level": "绿" | "黄" | "橙" | "红",
      "title": "短标题",
      "detail": "依据本批样本：声量/情感/具体帖文或评论现象，勿空洞",
      "responseWithin": "如 24h 内复核 / 立即关注"
    }
  ],
  "recentTrends": {
    "summary": "基于本批 TikTok 样本，概括与游戏相关的崛起话题、内容形态或标签聚集（勿编造本批未出现的具体视频标题）",
    "risingItems": [
      { "topic": "话题或内容形态", "whyRising": "为何判断为相对更热（可提互动、重复主题、hashtag）", "tieToGame": "与当前游戏或本次采集主题的关联" }
    ]
  }
}
规则：
- videos 数组顺序与输入 videos 一致，id 必须对应。
- **若某视频提供了 topComments（非空）**：该视频及整体的情感判断必须**优先依据评论原文**；overview 三个占比、各视频 sentiment、riskTag、analysis 应反映评论里 praise / 玩梗 / 质疑 / 谩骂 / 对比 / 避雷 等真实语气；标题与互动为辅。
- **若某视频未提供 topComments 或为空**：则仅依据标题、作者与互动估计，并在 narrative 或单条 analysis 中可注明「未抓取评论样本」。
- topics 为 6–12 个高频词（英文或中文短语），可结合评论高频词。
- commentTasks 优先覆盖负面/高风险视频，每条 3–5 条英文或印尼语自然短评（符合 attitude 与 lang）。
- overview 三个占比 positivePct+neutralPct+negativePct 必须加总为 100（允许四舍五入误差 ±1）。
- 占比含义：在**有评论样本时以评论为主**；无评论时按标题/元数据估计。negativePct 应反映评论中的批评、质疑、不满等，而非强行压成 0。
- positiveSummary / neutralSummary / negativeSummary 必填，各约 25–80 字，必须与占比语义一致，并点明**主要依据是评论还是标题**（有评论时写清「评论里…」）。
- strategy.narrative 必须具体可执行：先总判再分点，避免空话；riskPoints 与 actions 必须与结论一致。
- strategy.nextFocus、strategy.commentToneSummary 必填；与 commentTasks 中 attitude 分布一致。
- overview.score 可忽略（服务端会按 positivePct/negativePct 重新换算，与情感占比一致）。
- **keywordMatrix 必填**：至少 4 行，覆盖 游戏/品牌、玩法或内容类型、行业或竞品对比、危机/负向预警 等维度；keywords 必须能从输入 game、searchKeywords 或本批标题/评论中找到依据。
- **listeningAlerts 必填**：1～4 条，level 与当前批次情感与风险一致；绿=常态；黄=需关注；橙=同日处置；红=紧急/重大负面信号。
- **recentTrends 必填**：summary 2～5 句；risingItems 2～5 条。仅根据**本批视频样本**归纳「相对崛起」的话题/形式；若样本同质化或无明显崛起点，须在 summary 中说明，risingItems 可少于 2 条但不可编造数据。`;

async function runCompassFullAnalysis(input: {
  game: string;
  days: number;
  videos: RiskVideo[];
  searchKeywords: string[];
}): Promise<RiskSnapshot> {
  const userPayload = JSON.stringify({
    game: input.game,
    days: input.days,
    searchKeywords: input.searchKeywords,
    videos: input.videos.map((v) => ({
      id: v.id,
      title: v.title,
      author: v.author,
      followers: v.followers,
      likes: v.likes,
      comments: v.comments,
      shares: v.shares,
      url: v.url,
      topComments:
        v.topComments && v.topComments.length > 0
          ? v.topComments.map((c) => ({
              text: c.text.slice(0, 800),
              likes: c.likeCount,
            }))
          : undefined,
    })),
  });

  const extraPrompt = await loadRiskSentimentExtraPrompt();
  const raw = await compassChatCompletion({
    systemPrompt: ANALYSIS_SYSTEM + extraPrompt,
    userText: userPayload,
    temperature: 0.25,
    maxTokens: 8192,
  });

  const parsed = extractJsonObject(raw) as Record<string, unknown>;
  const ov = parsed.overview as Partial<RiskSnapshot['overview']> | undefined;
  const rawP = Math.min(100, Math.max(0, Number(ov?.positivePct ?? 40)))
  const rawNeu = Math.min(100, Math.max(0, Number(ov?.neutralPct ?? 35)))
  const rawNeg = Math.min(100, Math.max(0, Number(ov?.negativePct ?? 25)))
  const tri = normalizePct3(rawP, rawNeu, rawNeg)
  const overview: RiskSnapshot['overview'] = {
    score: deriveOverviewScoreFromPcts(tri.p, tri.neg),
    positivePct: tri.p,
    neutralPct: tri.n,
    negativePct: tri.neg,
    helperText: String(ov?.helperText ?? '舆情已更新'),
    positiveSummary: String(
      ov?.positiveSummary ?? '正面信号多来自玩法反馈、版本期待、创作者正向叙事与互动数据偏高的条目。',
    ),
    neutralSummary: String(
      ov?.neutralSummary ?? '中性条目多为展示/资讯/搬运类内容，标题未明显褒贬或态度混杂。',
    ),
    negativeSummary: String(
      ov?.negativeSummary ??
        '负面或争议包含吐槽、对比、避雷、平衡性/付费等担忧；若标题字面偏中性，仍可能对应评论区风险或未在标题展开的批评。',
    ),
  }
  const topics = (parsed.topics as RiskSnapshot['topics']) ?? [];
  const vPatch = new Map((parsed.videos as Array<Record<string, unknown>>)?.map((x) => [String(x.id), x]) ?? []);
  const mergedVideos = input.videos.map((v) => {
    const p = vPatch.get(v.id) as Record<string, unknown> | undefined;
    if (!p) return v;
    return {
      ...v,
      sentiment: (p.sentiment as SentimentLabel) || v.sentiment,
      riskTag: (p.riskTag as RiskVideo['riskTag']) || v.riskTag,
      analysis: p.analysis as RiskVideo['analysis'],
    };
  });

  const creators = (parsed.creators as RiskCreator[]) ?? [];
  const taskRows = (parsed.commentTasks as Array<Record<string, unknown>>) ?? [];

  const commentTasks: CommentTask[] = taskRows.map((t, i) => {
    const vid = String(t.videoId ?? '');
    const video = mergedVideos.find((x) => x.id === vid);
    const candidates = Array.isArray(t.candidates) ? (t.candidates as string[]).filter(Boolean).slice(0, 5) : [];
    return {
      id: `ct-${vid}-${i}`,
      videoId: vid,
      videoUrl: video?.url ?? '',
      authorNickname: video?.author ?? '',
      sentiment: video?.sentiment ?? 'neutral',
      attitude: (t.attitude as CommentAttitude) || '中性互动',
      lang: String(t.lang ?? 'en'),
      candidates: candidates.length ? candidates : ['Thanks for sharing — looking forward to more updates!'],
      selectedIndex: 0,
    };
  });

  const pRec = parsed as Record<string, unknown>;
  let keywordMatrix = parseKeywordMatrix(pRec.keywordMatrix ?? pRec.keyword_matrix);
  if (!keywordMatrix.length) {
    keywordMatrix = buildKeywordMatrixFromBatch(input.game, input.searchKeywords, mergedVideos, topics);
  }

  let listeningAlerts = parseListeningAlerts(pRec.listeningAlerts ?? pRec.listening_alerts);
  if (!listeningAlerts.length) {
    listeningAlerts = buildListeningAlertsFromOverview(overview, mergedVideos);
  }

  const recentTrends = parseRecentTrends(parsed.recentTrends, input.game);

  const rawSt = parsed.strategy as Record<string, unknown> | undefined;
  const strategyBase: RiskSnapshot['strategy'] =
    rawSt && typeof rawSt === 'object' && String(rawSt.narrative ?? '').trim()
      ? {
          conclusion: String(rawSt.conclusion ?? '建议：暂不控评'),
          level: (['低风险', '中风险', '高风险'].includes(String(rawSt.level))
            ? (String(rawSt.level) as RiskSnapshot['strategy']['level'])
            : '中风险') as RiskSnapshot['strategy']['level'],
          narrative: String(rawSt.narrative ?? ''),
          riskPoints: Array.isArray(rawSt.riskPoints)
            ? (rawSt.riskPoints as unknown[]).map((x) => String(x).trim()).filter(Boolean)
            : [],
          actions: Array.isArray(rawSt.actions)
            ? (rawSt.actions as unknown[]).map((x) => String(x).trim()).filter(Boolean)
            : [],
          nextFocus: String(rawSt.nextFocus ?? rawSt.next_focus ?? '').trim() || undefined,
          commentToneSummary: String(rawSt.commentToneSummary ?? rawSt.comment_tone_summary ?? '').trim() || undefined,
        }
      : {
          conclusion: '建议：暂不控评',
          level: '低风险',
          narrative: '分析结果不完整，请重试。',
          riskPoints: [],
          actions: [],
        };

  let strategyWithActions = strategyBase.actions?.length
    ? strategyBase
    : { ...strategyBase, actions: mergeActionsFromStrategy(strategyBase) };
  strategyWithActions = enrichStrategyPlanFields(strategyWithActions, commentTasks);

  return defaultSnapshot({
    game: input.game,
    days: input.days as 7 | 14 | 30,
    keywords: [],
    limit: input.videos.length,
    updatedAt: Date.now(),
    overview,
    topics,
    videos: mergedVideos,
    creators,
    strategy: strategyWithActions,
    commentTasks,
    lastRefreshStatus: 'ok',
    keywordMatrix,
    listeningAlerts,
    recentTrends,
  });
}

export async function refreshRiskSentiment(params: {
  game: string;
  days: 7 | 14 | 30;
  keywords: string[];
  limit: number;
}): Promise<RiskSnapshot> {
  let snap = await loadSnapshot();
  try {
    const searchKeywords = mergeKeywordsForApify(params.game, params.keywords);
    const { items, usedMock, note } = await runApifyDataset({ keywords: searchKeywords, limit: params.limit });
    const notes: string[] = [];
    if (note) notes.push(note);
    let videosForLlm = items;
    if (!usedMock) {
      const { enriched, note: commentNote } = await fetchTopCommentsViaApify(items);
      videosForLlm = enriched;
      if (commentNote) notes.push(commentNote);
    }
    snap = await runCompassFullAnalysis({
      game: params.game,
      days: params.days,
      videos: videosForLlm,
      searchKeywords,
    });
    snap.game = params.game;
    snap.days = params.days;
    snap.keywords = params.keywords;
    snap.effectiveKeywords = searchKeywords;
    snap.limit = params.limit;
    snap.updatedAt = Date.now();
    snap.apifyUsedMock = usedMock;
    snap.lastRefreshStatus = 'ok';
    snap.lastError = notes.filter(Boolean).join(' | ') || undefined;
    await saveSnapshot(snap);
    return snap;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    snap.lastRefreshStatus = 'error';
    snap.lastError = msg;
    await saveSnapshot(snap);
    throw e;
  }
}

const REGEN_SYSTEM = `你是 TikTok 游戏社区评论写手。根据视频标题与情感，输出严格 JSON：{"candidates":["...","...","..."]}，3-5 条，符合指定态度与语言，短句、自然、无引号编号。`;

export async function regenerateCommentsForVideo(videoId: string): Promise<RiskSnapshot> {
  const snap = await loadSnapshot();
  const video = snap.videos.find((v) => v.id === videoId);
  if (!video) throw new Error('未找到视频');
  const task = snap.commentTasks.find((t) => t.videoId === videoId);
  const lang = task?.lang ?? 'en';
  const attitude = task?.attitude ?? '中性互动';

  const raw = await compassChatCompletion({
    systemPrompt: REGEN_SYSTEM,
    userText: JSON.stringify({
      game: snap.game,
      videoTitle: video.title,
      sentiment: video.sentiment,
      attitude,
      lang,
    }),
    temperature: 0.4,
    maxTokens: 1024,
  });
  const parsed = extractJsonObject(raw) as { candidates?: string[] };
  const candidates = parsed.candidates?.filter(Boolean).slice(0, 5) ?? [];
  if (!candidates.length) throw new Error('模型未返回评论候选');

  const idx = snap.commentTasks.findIndex((t) => t.videoId === videoId);
  if (idx >= 0) {
    snap.commentTasks[idx] = {
      ...snap.commentTasks[idx],
      candidates,
      selectedIndex: 0,
      editedText: undefined,
    };
  } else {
    snap.commentTasks.push({
      id: `ct-${videoId}-${Date.now()}`,
      videoId,
      videoUrl: video.url,
      authorNickname: video.author,
      sentiment: video.sentiment,
      attitude,
      lang,
      candidates,
      selectedIndex: 0,
    });
  }
  snap.updatedAt = Date.now();
  await saveSnapshot(snap);
  return snap;
}

export type GeelarkPhone = { id: string; name: string; serialNo?: string; status?: number };

export async function listGeelarkPhones(): Promise<GeelarkPhone[]> {
  const token = await resolveGeelarkBearerToken();
  if (!token) return [];
  const base = getGeelarkOpenApiV1Base();
  const out: GeelarkPhone[] = [];
  let page = 1;
  const pageSize = 100;
  while (page < 50) {
    const res = await fetch(`${base}/phone/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        traceId: geelarkApiTraceId(),
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ page, pageSize }),
    });
    const data = (await res.json()) as { code?: number; data?: { items?: Record<string, unknown>[] }; msg?: string };
    if (data.code !== 0) break;
    const items = data.data?.items ?? [];
    for (const p of items) {
      const id = String((p as Record<string, unknown>).id ?? '');
      if (!id) continue;
      const serialName = String((p as Record<string, unknown>).serialName ?? '');
      const serialNo = String((p as Record<string, unknown>).serialNo ?? '');
      out.push({
        id,
        name: serialName || serialNo || id.slice(0, 8),
        serialNo: serialNo || undefined,
        status: typeof (p as Record<string, unknown>).status === 'number' ? ((p as Record<string, unknown>).status as number) : undefined,
      });
    }
    if (items.length < pageSize) break;
    page++;
  }
  return out;
}

export async function scheduleTiktokCommentsOnGeelark(
  items: Array<{ envId: string; videoUrl: string; comment: string; useAsia?: boolean }>,
): Promise<{ taskIds: string[]; errors: string[] }> {
  const token = await resolveGeelarkBearerToken();
  if (!token) throw new Error('未配置 GeeLark Token（GEELARK_BEARER_TOKEN / GEELARK_API_KEY 或 config/geelark.json）');
  const base = getGeelarkOpenApiV1Base();
  const taskIds: string[] = [];
  const errors: string[] = [];

  for (const it of items) {
    const path = it.useAsia ? 'rpa/task/tiktokRandomCommentAsia' : 'rpa/task/tiktokRandomComment';
    const body = {
      id: it.envId,
      scheduleAt: Math.floor(Date.now() / 1000),
      useAi: 2,
      comment: (it.comment || '').trim().slice(0, 500),
      links: it.videoUrl ? [String(it.videoUrl).trim()] : [],
      commentProbability: 100,
      name: 'TikTok评论',
    };
    if (!body.comment) {
      errors.push('评论内容为空');
      continue;
    }
    if (!body.links.length) {
      errors.push('视频链接为空');
      continue;
    }
    const res = await fetch(`${base}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        traceId: geelarkApiTraceId(),
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { code?: number; msg?: string; data?: { taskId?: string } };
    if (data.code !== 0) {
      errors.push(data.msg || 'GeeLark 任务创建失败');
      continue;
    }
    const tid = data.data?.taskId ?? '';
    if (tid) taskIds.push(tid);
  }
  return { taskIds, errors };
}
