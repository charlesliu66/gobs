/**
 * 风控大师 · 舆情监控：Apify 采集 → Compass 分析 → GeeLark 下发评论任务
 */
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { jsonrepair } from 'jsonrepair';
import { compassChatCompletion } from './compassLlm.js';
import { getGeelarkOpenApiV1Base, geelarkApiTraceId, resolveGeelarkBearerToken } from './geelarkClient.js';
import { resolvePath } from '../infra/storage/resolver.js';

export type {
  SentimentLabel,
  RiskVideo,
  RiskCreator,
  CommentAttitude,
  CommentTask,
  StrategyProfileKey,
  RiskExecutionProgram,
  RiskStrategyBlock,
  RiskStrategyVariant,
  RiskSnapshot,
  RiskExecutionLogEntry,
  GeelarkPhone,
} from './riskSentimentTypes.js';

import type {
  SentimentLabel,
  RiskVideo,
  RiskCreator,
  CommentAttitude,
  CommentTask,
  StrategyProfileKey,
  RiskExecutionProgram,
  RiskStrategyBlock,
  RiskStrategyVariant,
  RiskSnapshot,
  RiskExecutionLogEntry,
  GeelarkPhone,
} from './riskSentimentTypes.js';

const DATA_FILE = join(resolvePath('.data'), 'risk-sentiment.json');
const EXECUTION_LOG_FILE = join(resolvePath('.data'), 'risk-execution-log.json');
const RISK_EXTRA_PROMPT_FILE = join(process.cwd(), 'config', 'risk-sentiment-extra-prompt.md');

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
  strategyProfiles: partial?.strategyProfiles,
  commentTasksByProfile: partial?.commentTasksByProfile,
  lastRefreshStatus: partial?.lastRefreshStatus ?? 'idle',
  lastError: partial?.lastError,
  apifyUsedMock: partial?.apifyUsedMock,
  effectiveKeywords: partial?.effectiveKeywords,
  keywordMatrix: partial?.keywordMatrix ?? [],
  listeningAlerts: partial?.listeningAlerts ?? [],
  recentTrends: partial?.recentTrends ?? { summary: '', risingItems: [] },
});

async function ensureDataDir() {
  await mkdir(resolvePath('.data'), { recursive: true });
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
      strategyProfiles:
        j.strategyProfiles && typeof j.strategyProfiles === 'object'
          ? (j.strategyProfiles as RiskSnapshot['strategyProfiles'])
          : undefined,
      commentTasksByProfile:
        j.commentTasksByProfile && typeof j.commentTasksByProfile === 'object'
          ? (j.commentTasksByProfile as RiskSnapshot['commentTasksByProfile'])
          : undefined,
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

export async function appendRiskExecutionLog(
  partial: Omit<RiskExecutionLogEntry, 'id' | 'at'>,
): Promise<RiskExecutionLogEntry> {
  await ensureDataDir();
  const full: RiskExecutionLogEntry = {
    id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    at: Date.now(),
    ...partial,
  };
  let list: RiskExecutionLogEntry[] = [];
  try {
    const raw = await readFile(EXECUTION_LOG_FILE, 'utf8');
    const j = parseJsonRelaxed(raw) as unknown;
    list = Array.isArray(j) ? (j as RiskExecutionLogEntry[]) : [];
  } catch {
    list = [];
  }
  list.unshift(full);
  await writeFile(EXECUTION_LOG_FILE, JSON.stringify(list.slice(0, 500), null, 2), 'utf8');
  return full;
}

export async function listRiskExecutionLogs(): Promise<RiskExecutionLogEntry[]> {
  try {
    const raw = await readFile(EXECUTION_LOG_FILE, 'utf8');
    const j = parseJsonRelaxed(raw) as unknown;
    return Array.isArray(j) ? (j as RiskExecutionLogEntry[]) : [];
  } catch {
    return [];
  }
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
    return `\n\n【附加：用户自定义分析侧重点】\n你必须服从以下补充要求撰写 strategyProfiles（三方案）与 overview.helperText，不得忽略：\n${t}`;
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

function normalizeCreators(raw: unknown): RiskCreator[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: RiskCreator[] = [];
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i] as Record<string, unknown>;
    const nickname = String(c.nickname ?? c.name ?? '').trim() || `creator_${i + 1}`;
    const contentTendency =
      String(c.contentTendency ?? c.tendency ?? '').trim() || '内容方向待补充';
    const tendencyDetail = String(c.tendencyDetail ?? c.tendency_detail ?? '').trim() || undefined;
    const strengths = String(c.strengths ?? c.advantages ?? '').trim() || undefined;
    const collaborationSuggestion =
      String(c.collaborationSuggestion ?? c.collaboration_suggestion ?? '').trim() || undefined;
    const statusRaw = String(c.status ?? '未跟进').trim();
    const status: RiskCreator['status'] =
      statusRaw === '已观察' || statusRaw === '已投放' || statusRaw === '合作中'
        ? statusRaw
        : '未跟进';
    out.push({
      id: String(c.id ?? c.creatorId ?? `creator-${i + 1}`),
      nickname,
      followers: Math.max(0, Number(c.followers ?? 0) || 0),
      recentVideoCount: Math.max(0, Number(c.recentVideoCount ?? c.videoCount ?? 0) || 0),
      avgEngagementRate: Math.max(0, Number(c.avgEngagementRate ?? c.engagementRate ?? 0) || 0),
      contentTendency,
      ...(tendencyDetail ? { tendencyDetail } : {}),
      ...(strengths ? { strengths } : {}),
      ...(collaborationSuggestion ? { collaborationSuggestion } : {}),
      potentialScore: Math.max(0, Math.min(100, Number(c.potentialScore ?? 0) || 0)),
      sampleUrl: String(c.sampleUrl ?? c.url ?? '').trim() || undefined,
      status,
    });
  }
  return out.slice(0, 200);
}

function fallbackCreatorsFromVideos(videos: RiskVideo[]): RiskCreator[] {
  const byAuthor = new Map<
    string,
    { followers: number; count: number; likes: number; comments: number; shares: number; sampleUrl?: string }
  >();
  for (const v of videos) {
    const name = String(v.author ?? '').trim();
    if (!name) continue;
    const prev = byAuthor.get(name) ?? {
      followers: 0,
      count: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      sampleUrl: undefined,
    };
    prev.count += 1;
    prev.likes += Math.max(0, Number(v.likes ?? 0));
    prev.comments += Math.max(0, Number(v.comments ?? 0));
    prev.shares += Math.max(0, Number(v.shares ?? 0));
    prev.followers = Math.max(prev.followers, Math.max(0, Number(v.followers ?? 0)));
    if (!prev.sampleUrl && v.url) prev.sampleUrl = v.url;
    byAuthor.set(name, prev);
  }
  const rows = [...byAuthor.entries()]
    .map(([nickname, x]) => {
      const interactions = x.likes + x.comments + x.shares;
      const avgRate = x.followers > 0 ? ((interactions / Math.max(1, x.count)) / x.followers) * 100 : 0;
      const potential = Math.max(35, Math.min(95, Math.round(avgRate * 2.2 + x.count * 4)));
      return {
        nickname,
        followers: x.followers,
        recentVideoCount: x.count,
        avgEngagementRate: Number(avgRate.toFixed(1)),
        potentialScore: potential,
        sampleUrl: x.sampleUrl,
      };
    })
    .sort((a, b) => b.potentialScore - a.potentialScore)
    .slice(0, 20);

  return rows.map((r, i) => ({
    id: `auto-creator-${i + 1}`,
    nickname: r.nickname,
    followers: r.followers,
    recentVideoCount: r.recentVideoCount,
    avgEngagementRate: r.avgEngagementRate,
    contentTendency: '基于本批热视频自动推断',
    tendencyDetail: '模型未返回达人细分说明，已按作者近批样本互动自动补齐。',
    strengths: '高互动内容、话题承接',
    collaborationSuggestion:
      r.potentialScore >= 75 ? '优先进入测试合作池，先小预算试投再放量。' : '先保持观察，确认内容稳定后再考虑合作。',
    potentialScore: r.potentialScore,
    sampleUrl: r.sampleUrl,
    status: '未跟进',
  }));
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

const STRATEGY_PROFILE_KEYS: StrategyProfileKey[] = ['balanced', 'conservative', 'aggressive'];

function inferRecommendControlFromConclusion(conclusion: string): boolean {
  return /控评|覆盖评论|评论执行|对冲|纠偏|引导舆论|压制|反击/.test(conclusion);
}

function parseExecutionProgram(raw: unknown): RiskExecutionProgram | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const codename = String(o.codename ?? o.codeName ?? '').trim();
  if (!codename) return undefined;
  const atk = Number(o.attackPct ?? o.attack_pct ?? 35);
  const def = Number(o.defensePct ?? o.defense_pct ?? 65);
  return {
    codename,
    directionSummary:
      String(o.directionSummary ?? o.direction ?? '').trim() || '按本方案叙事与风险点执行评论层引导与缓冲。',
    attackPct: Math.min(100, Math.max(0, Number.isFinite(atk) ? atk : 35)),
    defensePct: Math.min(100, Math.max(0, Number.isFinite(def) ? def : 65)),
    expectedEffect:
      String(o.expectedEffect ?? o.expected_effect ?? '').trim() || '改善评论区观感并稳定讨论方向。',
  };
}

function parseStrategyBlockFromRaw(raw: unknown, narrativeFallback: string): RiskStrategyBlock {
  const rawSt = raw as Record<string, unknown> | undefined;
  if (!rawSt || typeof rawSt !== 'object' || !String(rawSt.narrative ?? '').trim()) {
    return {
      conclusion: '建议：暂不控评',
      level: '低风险',
      narrative: narrativeFallback,
      riskPoints: [],
      actions: [],
    };
  }
  return {
    conclusion: String(rawSt.conclusion ?? '建议：暂不控评'),
    level: (['低风险', '中风险', '高风险'].includes(String(rawSt.level))
      ? (String(rawSt.level) as RiskStrategyBlock['level'])
      : '中风险') as RiskStrategyBlock['level'],
    narrative: String(rawSt.narrative ?? ''),
    riskPoints: Array.isArray(rawSt.riskPoints)
      ? (rawSt.riskPoints as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : [],
    actions: Array.isArray(rawSt.actions)
      ? (rawSt.actions as unknown[]).map((x) => String(x).trim()).filter(Boolean)
      : [],
    nextFocus: String(rawSt.nextFocus ?? rawSt.next_focus ?? '').trim() || undefined,
    commentToneSummary: String(rawSt.commentToneSummary ?? rawSt.comment_tone_summary ?? '').trim() || undefined,
  };
}

function parseStrategyVariantFromRaw(raw: unknown, fallback: RiskStrategyBlock): RiskStrategyVariant {
  const block = parseStrategyBlockFromRaw(raw, fallback.narrative);
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const recommend =
    typeof o.recommendControlComment === 'boolean'
      ? o.recommendControlComment
      : inferRecommendControlFromConclusion(block.conclusion);
  const ep = parseExecutionProgram(o.executionProgram ?? o.execution_program);
  return {
    ...block,
    recommendControlComment: recommend,
    executionProgram: recommend ? ep : undefined,
  };
}

function inferExecutionNature(attitude: CommentAttitude, raw?: string): 'attack' | 'defense' {
  const s = (raw ?? '').toLowerCase();
  if (s === 'attack' || s === '攻击性' || s === 'offense') return 'attack';
  if (s === 'defense' || s === '防御性' || s === 'defence') return 'defense';
  if (attitude === '纠偏澄清') return 'attack';
  return 'defense';
}

/** CJK 统一表意文字（汉字等）；en/id 任务评论中不得出现 */
const HAS_CJK_UNIFIED_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const FALLBACK_COMMENT_EN = [
  "Thanks for sharing — the team's always reading community feedback.",
  'Appreciate the honest take on the game.',
  'Solid content — looking forward to more from you.',
  'Great breakdown, thanks for posting.',
  'Love seeing different perspectives on the game here.',
];

const FALLBACK_COMMENT_ID = [
  'Makasih udah share — timnya memang dengerin feedback player.',
  'Kontennya informatif banget, thanks.',
  'Suka banget breakdown-nya, ditunggu video berikutnya.',
  'Setuju sebagian poinnya, thanks sharing.',
  'Infonya oke, makasih.',
];

const FALLBACK_COMMENT_ZH = ['感谢分享，期待更多内容！', '说得挺客观的，支持一下。', '感谢制作，已关注。'];

function langAllowsChinese(lang: string): boolean {
  const lc = (lang || 'en').toLowerCase();
  return lc === 'zh' || lc.startsWith('zh');
}

function sanitizeCommentTaskLang(t: CommentTask): CommentTask {
  const lang = String(t.lang ?? 'en');
  const allowZh = langAllowsChinese(lang);
  const lc = lang.toLowerCase();
  const pool = lc === 'id' || lc === 'in' ? FALLBACK_COMMENT_ID : allowZh ? FALLBACK_COMMENT_ZH : FALLBACK_COMMENT_EN;
  const raw = t.candidates?.length ? t.candidates : [];
  const candidates = raw.map((c, i) => {
    const s = String(c ?? '').trim();
    if (!s) return pool[i % pool.length];
    if (allowZh) return s;
    if (HAS_CJK_UNIFIED_RE.test(s)) return pool[i % pool.length];
    return s;
  });
  const filled = candidates.length ? candidates : allowZh ? [...FALLBACK_COMMENT_ZH] : pool.slice(0, 3);
  return {
    ...t,
    candidates: filled,
    meaningZh: undefined,
  };
}

function mapTaskRowsToCommentTasks(
  taskRows: Array<Record<string, unknown>> | undefined,
  mergedVideos: RiskVideo[],
  profileKey: StrategyProfileKey,
): CommentTask[] {
  const rows = taskRows ?? [];
  return rows.map((t, i) => {
    const vid = String(t.videoId ?? '');
    const video = mergedVideos.find((x) => x.id === vid);
    const candidates = Array.isArray(t.candidates) ? (t.candidates as string[]).filter(Boolean).slice(0, 5) : [];
    const attitude = (t.attitude as CommentAttitude) || '中性互动';
    const natureRaw = String(t.executionNature ?? t.nature ?? t.execution_nature ?? '').trim();
    const base: CommentTask = {
      id: `ct-${profileKey}-${vid}-${i}`,
      videoId: vid,
      videoUrl: video?.url ?? '',
      authorNickname: video?.author ?? '',
      sentiment: video?.sentiment ?? 'neutral',
      attitude,
      lang: String(t.lang ?? 'en'),
      candidates: candidates.length ? candidates : ['Thanks for sharing — looking forward to more updates!'],
      selectedIndex: 0,
      executionNature: inferExecutionNature(attitude, natureRaw),
    };
    return sanitizeCommentTaskLang(base);
  });
}

function buildFallbackCommentTasksFromVideos(
  videos: RiskVideo[],
  profileKey: StrategyProfileKey,
): CommentTask[] {
  const ranked = [...videos]
    .sort((a, b) => {
      const sa = Number(a.likes ?? 0) + Number(a.comments ?? 0) * 2 + Number(a.shares ?? 0) * 3;
      const sb = Number(b.likes ?? 0) + Number(b.comments ?? 0) * 2 + Number(b.shares ?? 0) * 3;
      return sb - sa;
    })
    .slice(0, 8);
  const picked = ranked.filter((v) => v.sentiment === 'negative' || v.riskTag === '高风险');
  const base = (picked.length ? picked : ranked).slice(0, 6);
  return base.map((v, i) => {
    const attack = v.sentiment === 'negative' || v.riskTag === '高风险';
    const attitude: CommentAttitude = attack ? '纠偏澄清' : '防御缓冲';
    const candidates = attack ? FALLBACK_COMMENT_EN.slice(0, 3) : FALLBACK_COMMENT_EN.slice(2, 5);
    return sanitizeCommentTaskLang({
      id: `ct-${profileKey}-${v.id}-${i}`,
      videoId: v.id,
      videoUrl: v.url,
      authorNickname: v.author,
      sentiment: v.sentiment,
      attitude,
      lang: 'en',
      candidates,
      selectedIndex: 0,
      executionNature: attack ? 'attack' : 'defense',
    });
  });
}

function cloneCommentTasksForProfile(source: CommentTask[], profileKey: StrategyProfileKey): CommentTask[] {
  return source.map((t, i) => ({
    ...t,
    id: `ct-${profileKey}-${t.videoId}-${i}`,
  }));
}

function blockFromVariant(v: RiskStrategyVariant): RiskStrategyBlock {
  const { recommendControlComment: _r, executionProgram: _e, ...rest } = v;
  return rest;
}

function defaultStrategyProfilesFromBlock(
  strategy: RiskStrategyBlock,
  recommendBalanced: boolean,
): Record<StrategyProfileKey, RiskStrategyVariant> {
  const b: RiskStrategyVariant = {
    ...strategy,
    recommendControlComment: recommendBalanced,
    executionProgram: undefined,
  };
  return {
    balanced: { ...b },
    conservative: {
      ...strategy,
      recommendControlComment: false,
      narrative: strategy.narrative,
      executionProgram: undefined,
    },
    aggressive: {
      ...strategy,
      recommendControlComment: true,
      narrative: strategy.narrative,
      executionProgram: undefined,
    },
  };
}

function enrichStrategyVariant(v: RiskStrategyVariant, tasks: CommentTask[]): RiskStrategyVariant {
  const tone = (v.commentToneSummary ?? '').trim() || summarizeCommentTaskAttitudes(tasks);
  const next =
    (v.nextFocus ?? '').trim() ||
    (v.actions?.[0] ? `下一步优先：${v.actions[0]}` : '按本方案叙事与执行纲领推进监测与互动。');
  return { ...v, commentToneSummary: tone, nextFocus: next };
}

function mergeActionsFromStrategy(strategy: RiskStrategyBlock): string[] {
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

function enrichStrategyPlanFields(strategy: RiskStrategyBlock, tasks: CommentTask[]): RiskStrategyBlock {
  const tone = (strategy.commentToneSummary ?? '').trim() || summarizeCommentTaskAttitudes(tasks);
  const next =
    (strategy.nextFocus ?? '').trim() ||
    (strategy.actions?.[0] ? `下一步优先：${strategy.actions[0]}` : '结合叙事与执行纲领推进监测与互动。');
  return { ...strategy, commentToneSummary: tone, nextFocus: next };
}

function patchCommentTasksLegacy(ts: CommentTask[]): CommentTask[] {
  return (ts ?? []).map((t) => {
    const withNature = t.executionNature ? t : { ...t, executionNature: inferExecutionNature(t.attitude) };
    return sanitizeCommentTaskLang(withNature);
  });
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

  const baseTasks = snap.commentTasks ?? [];
  let commentTasksByProfile: Record<StrategyProfileKey, CommentTask[]> = {
    balanced: baseTasks,
    conservative: baseTasks,
    aggressive: baseTasks,
  };
  if (snap.commentTasksByProfile && typeof snap.commentTasksByProfile === 'object') {
    for (const k of STRATEGY_PROFILE_KEYS) {
      const arr = snap.commentTasksByProfile[k];
      if (Array.isArray(arr) && arr.length) commentTasksByProfile[k] = arr;
    }
  }

  let strategyProfiles = snap.strategyProfiles;
  if (!strategyProfiles?.balanced || !strategyProfiles?.conservative || !strategyProfiles?.aggressive) {
    const rec = inferRecommendControlFromConclusion(strategy.conclusion);
    strategyProfiles = defaultStrategyProfilesFromBlock(strategy, rec);
  }

  const nextProfiles: Record<StrategyProfileKey, RiskStrategyVariant> = { ...strategyProfiles! };
  for (const k of STRATEGY_PROFILE_KEYS) {
    let v = nextProfiles[k];
    if (!v) {
      v = { ...strategy, recommendControlComment: k === 'aggressive' ? true : inferRecommendControlFromConclusion(strategy.conclusion) };
    }
    if (!v.actions?.length) {
      const merged = mergeActionsFromStrategy(v);
      if (merged.length) v = { ...v, actions: merged };
    }
    v = enrichStrategyVariant(v, commentTasksByProfile[k] ?? []);
    nextProfiles[k] = v;
  }

  nextProfiles.conservative = enrichStrategyVariant(
    { ...nextProfiles.conservative, recommendControlComment: false, executionProgram: undefined },
    [],
  );
  commentTasksByProfile.conservative = [];

  if (nextProfiles.balanced.recommendControlComment && !commentTasksByProfile.balanced.length) {
    commentTasksByProfile.balanced = buildFallbackCommentTasksFromVideos(snap.videos ?? [], 'balanced');
    nextProfiles.balanced = enrichStrategyVariant(nextProfiles.balanced, commentTasksByProfile.balanced);
  }

  if (!commentTasksByProfile.aggressive?.length && commentTasksByProfile.balanced?.length) {
    commentTasksByProfile.aggressive = cloneCommentTasksForProfile(commentTasksByProfile.balanced, 'aggressive');
    nextProfiles.aggressive = enrichStrategyVariant(nextProfiles.aggressive, commentTasksByProfile.aggressive);
  }

  for (const k of STRATEGY_PROFILE_KEYS) {
    commentTasksByProfile[k] = patchCommentTasksLegacy(commentTasksByProfile[k] ?? []);
  }

  strategy = blockFromVariant(nextProfiles.balanced);

  const overview = {
    ...snap.overview,
    score: deriveOverviewScoreFromPcts(snap.overview.positivePct, snap.overview.negativePct),
  };

  const balancedTasks = commentTasksByProfile.balanced;
  const creators = snap.creators?.length ? snap.creators : fallbackCreatorsFromVideos(snap.videos ?? []);

  return {
    ...snap,
    creators,
    overview,
    keywordMatrix,
    listeningAlerts,
    strategy,
    strategyProfiles: nextProfiles,
    commentTasksByProfile,
    commentTasks: balancedTasks,
  };
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
      "tendencyDetail": string,
      "strengths": "逗号分隔，如 游戏教学、赛事解说、版本实测",
      "collaborationSuggestion": string,
      "potentialScore": 0-100,
      "sampleUrl": string,
      "status": "未跟进" | "已观察" | "已投放" | "合作中"
    }
  ],
  "strategyProfiles": {
    "balanced": {
      "conclusion": "建议：防御型控评" | "建议：借势扩散" | "建议：暂不控评" 或类似简短中文,
      "level": "低风险" | "中风险" | "高风险",
      "narrative": string,
      "riskPoints": string[],
      "actions": string[],
      "nextFocus": "1～3句",
      "commentToneSummary": "1～3句：与本 profile 下 commentTasks 态度分布一致",
      "recommendControlComment": boolean,
      "executionProgram": null | {
        "codename": "简短行动代号，如：剿灭浪人差评行动",
        "directionSummary": "本批控评的总体方向（中文）",
        "attackPct": 0-100,
        "defensePct": 0-100,
        "expectedEffect": "希望达到的效果（中文）"
      }
    },
    "conservative": { 同 balanced 结构 },
    "aggressive": { 同 balanced 结构 }
  },
  "commentTasksByProfile": {
    "balanced": [
      {
        "videoId": string,
        "attitude": "正面引导" | "中性互动" | "防御缓冲" | "纠偏澄清",
        "lang": "en" | "id" | "zh",
        "executionNature": "attack" | "defense",
        "candidates": [ "与 lang 完全一致的短评（en=全英文；id=全印尼语；zh=中文）", "..." ]
      }
    ],
    "conservative": [],
    "aggressive": [ 与 balanced 单条结构相同 ]
  },
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
- **三方案说明（必须同时给出 strategyProfiles 与 commentTasksByProfile 三个键）：**
  - **balanced（平衡）**：结合样本**独立判断**是否建议控评（recommendControlComment）。若建议控评，commentTasksByProfile.balanced 须混合攻防；每条任务必填 **executionNature**；**candidates 每条文案必须与 lang 一致**：lang=en 时全英文且不得含汉字；lang=id 时全印尼语且不得含汉字；lang=zh 时可用中文。executionProgram 中 attackPct/defensePct 之和约 100。
  - **conservative（保守）**：**不开展评论执行**：recommendControlComment **必须为 false**，**commentTasksByProfile.conservative 必须为空数组 []**，narrative 说明以监测与运营响应为主、不下场控评。
  - **aggressive（激进）**：原则上 recommendControlComment 为 **true**（样本与游戏无关时可 false 并说明）；任务须混合 attack 与 defense；字段同 balanced。
- 每个 profile 的 narrative / riskPoints / actions 必须自洽；nextFocus、commentToneSummary 与该 profile 下 commentTasks 态度分布一致。
- 三个 profile 的 commentTasks 优先覆盖负面/高风险视频；每条 3–5 条候选评论，语言自然，符合 attitude 与 lang。**禁止**在 lang 为 en 或 id 的 candidates 中出现中日韩统一表意文字（汉字等）。
- overview 三个占比 positivePct+neutralPct+negativePct 必须加总为 100（允许四舍五入误差 ±1）。
- 占比含义：在**有评论样本时以评论为主**；无评论时按标题/元数据估计。negativePct 应反映评论中的批评、质疑、不满等，而非强行压成 0。
- positiveSummary / neutralSummary / negativeSummary 必填，各约 25–80 字，必须与占比语义一致，并点明**主要依据是评论还是标题**（有评论时写清「评论里…」）。
- overview.score 可忽略（服务端会按 positivePct/negativePct 重新换算，与情感占比一致）。
- **keywordMatrix 必填**：至少 4 行，覆盖 游戏/品牌、玩法或内容类型、行业或竞品对比、危机/负向预警 等维度；keywords 必须能从输入 game、searchKeywords 或本批标题/评论中找到依据。
- **listeningAlerts 必填**：1～4 条，level 与当前批次情感与风险一致；绿=常态；黄=需关注；橙=同日处置；红=紧急/重大负面信号。
- **recentTrends**：可给简短 summary，risingItems 0～3 条即可（服务端可能不使用）。`;

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

  let creators = normalizeCreators(parsed.creators);
  if (!creators.length) {
    creators = fallbackCreatorsFromVideos(mergedVideos);
  }

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

  const fallbackNarrative = '模型未返回完整策略结构，请再点击「立即刷新」尝试。';
  const spRaw = parsed.strategyProfiles as Record<string, unknown> | undefined;
  const ctpRaw = parsed.commentTasksByProfile as Record<string, unknown> | undefined;
  const legacyStrategy = parsed.strategy as Record<string, unknown> | undefined;
  const legacyTasks = (parsed.commentTasks as Array<Record<string, unknown>>) ?? [];

  const baseFallbackBlock = parseStrategyBlockFromRaw(legacyStrategy, fallbackNarrative);

  const useNewShape =
    spRaw &&
    typeof spRaw === 'object' &&
    STRATEGY_PROFILE_KEYS.every((k) => spRaw[k] && typeof spRaw[k] === 'object') &&
    ctpRaw &&
    typeof ctpRaw === 'object';

  let strategyProfiles: Record<StrategyProfileKey, RiskStrategyVariant>;
  let commentTasksByProfile: Record<StrategyProfileKey, CommentTask[]>;

  if (useNewShape) {
    strategyProfiles = {} as Record<StrategyProfileKey, RiskStrategyVariant>;
    commentTasksByProfile = {} as Record<StrategyProfileKey, CommentTask[]>;
    for (const k of STRATEGY_PROFILE_KEYS) {
      let v = parseStrategyVariantFromRaw(spRaw[k], baseFallbackBlock);
      if (!v.actions?.length) v = { ...v, actions: mergeActionsFromStrategy(v) };
      const rows = (ctpRaw[k] as Array<Record<string, unknown>> | undefined) ?? [];
      const taskRows = rows.length ? rows : legacyTasks;
      commentTasksByProfile[k] = mapTaskRowsToCommentTasks(taskRows, mergedVideos, k);
      v = enrichStrategyVariant(v, commentTasksByProfile[k]);
      strategyProfiles[k] = v;
    }
  } else {
    let single = parseStrategyBlockFromRaw(legacyStrategy, fallbackNarrative);
    if (!single.actions?.length) single = { ...single, actions: mergeActionsFromStrategy(single) };
    const lt = mapTaskRowsToCommentTasks(legacyTasks, mergedVideos, 'balanced');
    single = enrichStrategyPlanFields(single, lt);
    const rec = inferRecommendControlFromConclusion(single.conclusion);
    strategyProfiles = defaultStrategyProfilesFromBlock(single, rec);
    commentTasksByProfile = {
      balanced: mapTaskRowsToCommentTasks(legacyTasks, mergedVideos, 'balanced'),
      conservative: mapTaskRowsToCommentTasks(legacyTasks, mergedVideos, 'conservative'),
      aggressive: mapTaskRowsToCommentTasks(legacyTasks, mergedVideos, 'aggressive'),
    };
    for (const k of STRATEGY_PROFILE_KEYS) {
      let v = strategyProfiles[k];
      if (!v.actions?.length) v = { ...v, actions: mergeActionsFromStrategy(v) };
      v = enrichStrategyVariant(v, commentTasksByProfile[k]);
      strategyProfiles[k] = v;
    }
  }

  /** 保守方案：不控评、无执行任务；激进若为空则复制平衡方案任务避免前端空白 */
  {
    const cons = { ...strategyProfiles.conservative, recommendControlComment: false, executionProgram: undefined };
    strategyProfiles.conservative = enrichStrategyVariant(cons, []);
    commentTasksByProfile.conservative = [];
    if (strategyProfiles.balanced.recommendControlComment && !commentTasksByProfile.balanced.length) {
      commentTasksByProfile.balanced = buildFallbackCommentTasksFromVideos(mergedVideos, 'balanced');
      strategyProfiles.balanced = enrichStrategyVariant(strategyProfiles.balanced, commentTasksByProfile.balanced);
    }
    if (!commentTasksByProfile.aggressive.length && commentTasksByProfile.balanced.length) {
      commentTasksByProfile.aggressive = cloneCommentTasksForProfile(commentTasksByProfile.balanced, 'aggressive');
      strategyProfiles.aggressive = enrichStrategyVariant(strategyProfiles.aggressive, commentTasksByProfile.aggressive);
    }
  }

  const balancedTasks = commentTasksByProfile.balanced;
  const strategyOut = blockFromVariant(strategyProfiles.balanced);

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
    strategy: strategyOut,
    commentTasks: balancedTasks,
    strategyProfiles,
    commentTasksByProfile,
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

const REGEN_SYSTEM = `你是 TikTok 游戏社区评论写手。根据输入 JSON 里的 lang 字段书写 candidates：
- lang 为 "en"：全部英文短句，不得出现汉字或日文、韩文表意文字。
- lang 为 "id"：全部印尼语短句，不得出现汉字等。
- lang 为 "zh"：可用简体中文。
输出严格 JSON：{"candidates":["...","..."]}，3-5 条，符合 attitude，短句自然，无引号编号。`;

export async function regenerateCommentsForVideo(
  videoId: string,
  profile: StrategyProfileKey = 'balanced',
): Promise<RiskSnapshot> {
  const snap = await loadSnapshot();
  const video = snap.videos.find((v) => v.id === videoId);
  if (!video) throw new Error('未找到视频');
  const pool = snap.commentTasksByProfile?.[profile] ?? snap.commentTasks;
  const task = pool.find((t) => t.videoId === videoId);
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
      profile,
    }),
    temperature: 0.4,
    maxTokens: 1024,
  });
  const parsed = extractJsonObject(raw) as { candidates?: string[] };
  const candidates = parsed.candidates?.filter(Boolean).slice(0, 5) ?? [];
  if (!candidates.length) throw new Error('模型未返回评论候选');

  const by = { ...(snap.commentTasksByProfile ?? {}) } as Record<StrategyProfileKey, CommentTask[]>;
  const list = [...(by[profile] ?? snap.commentTasks)];
  const idx = list.findIndex((t) => t.videoId === videoId);
  const patch = (t: CommentTask): CommentTask =>
    sanitizeCommentTaskLang({
      ...t,
      candidates,
      selectedIndex: 0,
      editedText: undefined,
    });
  if (idx >= 0) {
    list[idx] = patch(list[idx]);
  } else {
    list.push(
      sanitizeCommentTaskLang({
        id: `ct-${profile}-${videoId}-${Date.now()}`,
        videoId,
        videoUrl: video.url,
        authorNickname: video.author,
        sentiment: video.sentiment,
        attitude,
        lang,
        candidates,
        selectedIndex: 0,
        executionNature: task?.executionNature ?? inferExecutionNature(attitude),
      }),
    );
  }
  by[profile] = list;
  snap.commentTasksByProfile = by;
  if (profile === 'balanced') snap.commentTasks = list;
  snap.updatedAt = Date.now();
  await saveSnapshot(snap);
  return loadSnapshot();
}

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
