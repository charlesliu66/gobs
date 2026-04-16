/**
 * 风控大师 · 舆情解析与归一化工具函数
 * 从 riskSentimentService.ts 提取，负责 LLM 返回 JSON 的解析、字段补全、策略推导。
 */
import { jsonrepair } from 'jsonrepair';

import type {
  RiskVideo,
  RiskCreator,
  CommentAttitude,
  CommentTask,
  StrategyProfileKey,
  RiskExecutionProgram,
  RiskStrategyBlock,
  RiskStrategyVariant,
  RiskSnapshot,
} from './riskSentimentTypes.js';

// ─── JSON 容错解析 ──────────────────────────────────────────────────────

export function parseJsonRelaxed(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return JSON.parse(jsonrepair(raw)) as unknown;
  }
}

export function extractJsonObject(raw: string): unknown {
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

// ─── 数值归一化 ─────────────────────────────────────────────────────────

export function normalizePct3(p: number, n: number, neg: number): { p: number; n: number; neg: number } {
  const a = Math.max(0, p)
  const b = Math.max(0, n)
  const c = Math.max(0, neg)
  const s = a + b + c
  if (s <= 0) return { p: 34, n: 33, neg: 33 }
  return { p: (a / s) * 100, n: (b / s) * 100, neg: (c / s) * 100 }
}

export function deriveOverviewScoreFromPcts(positivePct: number, negativePct: number): number {
  const p = Math.min(100, Math.max(0, positivePct));
  const neg = Math.min(100, Math.max(0, negativePct));
  const net = p - neg;
  return Math.min(100, Math.max(0, Math.round(50 + net * 0.45)));
}

// ─── 关键词矩阵 ─────────────────────────────────────────────────────────

export function parseKeywordMatrix(raw: unknown): RiskSnapshot['keywordMatrix'] {
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

export function fallbackKeywordMatrix(game: string, searchKeywords: string[]): RiskSnapshot['keywordMatrix'] {
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

export function buildKeywordMatrixFromBatch(
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

// ─── 监听告警 ────────────────────────────────────────────────────────────

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

export function parseListeningAlerts(raw: unknown): RiskSnapshot['listeningAlerts'] {
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

export function buildListeningAlertsFromOverview(
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

// ─── 趋势 / 达人 ─────────────────────────────────────────────────────────

export function parseRecentTrends(raw: unknown, game: string): RiskSnapshot['recentTrends'] {
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

export function normalizeCreators(raw: unknown): RiskCreator[] {
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

export function fallbackCreatorsFromVideos(videos: RiskVideo[]): RiskCreator[] {
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

// ─── 策略解析 ────────────────────────────────────────────────────────────

export const STRATEGY_PROFILE_KEYS: StrategyProfileKey[] = ['balanced', 'conservative', 'aggressive'];

export function inferRecommendControlFromConclusion(conclusion: string): boolean {
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

export function parseStrategyBlockFromRaw(raw: unknown, narrativeFallback: string): RiskStrategyBlock {
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

export function parseStrategyVariantFromRaw(raw: unknown, fallback: RiskStrategyBlock): RiskStrategyVariant {
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

// ─── 评论任务 ────────────────────────────────────────────────────────────

export function inferExecutionNature(attitude: CommentAttitude, raw?: string): 'attack' | 'defense' {
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

export function sanitizeCommentTaskLang(t: CommentTask): CommentTask {
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

export function mapTaskRowsToCommentTasks(
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

export function buildFallbackCommentTasksFromVideos(
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

export function cloneCommentTasksForProfile(source: CommentTask[], profileKey: StrategyProfileKey): CommentTask[] {
  return source.map((t, i) => ({
    ...t,
    id: `ct-${profileKey}-${t.videoId}-${i}`,
  }));
}

// ─── 策略组装 ────────────────────────────────────────────────────────────

export function blockFromVariant(v: RiskStrategyVariant): RiskStrategyBlock {
  const { recommendControlComment: _r, executionProgram: _e, ...rest } = v;
  return rest;
}

export function defaultStrategyProfilesFromBlock(
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

export function enrichStrategyVariant(v: RiskStrategyVariant, tasks: CommentTask[]): RiskStrategyVariant {
  const tone = (v.commentToneSummary ?? '').trim() || summarizeCommentTaskAttitudes(tasks);
  const next =
    (v.nextFocus ?? '').trim() ||
    (v.actions?.[0] ? `下一步优先：${v.actions[0]}` : '按本方案叙事与执行纲领推进监测与互动。');
  return { ...v, commentToneSummary: tone, nextFocus: next };
}

export function mergeActionsFromStrategy(strategy: RiskStrategyBlock): string[] {
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

export function enrichStrategyPlanFields(strategy: RiskStrategyBlock, tasks: CommentTask[]): RiskStrategyBlock {
  const tone = (strategy.commentToneSummary ?? '').trim() || summarizeCommentTaskAttitudes(tasks);
  const next =
    (strategy.nextFocus ?? '').trim() ||
    (strategy.actions?.[0] ? `下一步优先：${strategy.actions[0]}` : '结合叙事与执行纲领推进监测与互动。');
  return { ...strategy, commentToneSummary: tone, nextFocus: next };
}

export function patchCommentTasksLegacy(ts: CommentTask[]): CommentTask[] {
  return (ts ?? []).map((t) => {
    const withNature = t.executionNature ? t : { ...t, executionNature: inferExecutionNature(t.attitude) };
    return sanitizeCommentTaskLang(withNature);
  });
}

// ─── 快照补全 ────────────────────────────────────────────────────────────

export function rehydrateSnapshot(snap: RiskSnapshot): RiskSnapshot {
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
