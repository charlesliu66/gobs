import { Router } from 'express';
import {
  loadSnapshot,
  refreshRiskSentiment,
  regenerateCommentsForVideo,
  listGeelarkPhones,
  scheduleTiktokCommentsOnGeelark,
  appendRiskExecutionLog,
  listRiskExecutionLogs,
  type StrategyProfileKey,
} from '../services/riskSentimentService.js';

const router = Router();

/** 仅允许常见 TikTok 封面 CDN，防止 SSRF */
function isAllowedCoverImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    if (h.endsWith('tiktokcdn.com') || h.endsWith('tiktokcdn-eu.com') || h.endsWith('tiktokcdn-us.com')) return true;
    if (h.includes('tiktokcdn')) return true;
    if (h.includes('byteimg') || h.includes('ibyteimg')) return true;
    if (h.includes('tiktokv.com')) return true;
    if (h.endsWith('muscdn.com')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * GET /api/risk-sentiment/cover-proxy?url=...
 * 服务端拉取 TikTok CDN 封面，避免浏览器 Referer 防盗链导致灰块。
 */
router.get('/cover-proxy', async (req, res) => {
  const raw = String(req.query.url ?? '').trim();
  if (!raw || !isAllowedCoverImageUrl(raw)) {
    res.status(400).json({ ok: false, error: 'invalid or disallowed cover url' });
    return;
  }
  try {
    const r = await fetch(raw, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Referer: 'https://www.tiktok.com/',
      },
      redirect: 'follow',
    });
    if (!r.ok) {
      res.status(502).end();
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    let ct = r.headers.get('content-type') || 'image/jpeg';
    if (!ct.startsWith('image/')) ct = 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch {
    res.status(502).end();
  }
});

/** GET /api/risk-sentiment/state */
router.get('/state', async (req, res) => {
  try {
    const snapshot = await loadSnapshot();
    res.json({ ok: true, snapshot });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** POST /api/risk-sentiment/refresh */
router.post('/refresh', async (req, res) => {
  const body = req.body as {
    game?: string;
    days?: number;
    keywords?: string[];
    limit?: number;
  };
  const game = String(body.game ?? '').trim() || '未命名游戏';
  const daysRaw = Number(body.days);
  const days = ([7, 14, 30] as const).includes(daysRaw as 7 | 14 | 30) ? (daysRaw as 7 | 14 | 30) : 7;
  const keywords = Array.isArray(body.keywords) ? body.keywords.map((x) => String(x).trim()).filter(Boolean) : [];
  const limitRaw = Number(body.limit);
  const limit = [10, 30, 50].includes(limitRaw) ? limitRaw : 10;

  try {
    const snapshot = await refreshRiskSentiment({ game, days, keywords, limit });
    res.json({ ok: true, snapshot });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** POST /api/risk-sentiment/regenerate-comments */
router.post('/regenerate-comments', async (req, res) => {
  const videoId = String((req.body as { videoId?: string })?.videoId ?? '').trim();
  const profileRaw = String((req.body as { profile?: string })?.profile ?? 'balanced').trim();
  const profile = (['balanced', 'conservative', 'aggressive'] as const).includes(profileRaw as StrategyProfileKey)
    ? (profileRaw as StrategyProfileKey)
    : 'balanced';
  if (!videoId) {
    res.status(400).json({ ok: false, error: '缺少 videoId' });
    return;
  }
  try {
    const snapshot = await regenerateCommentsForVideo(videoId, profile);
    res.json({ ok: true, snapshot });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** GET /api/risk-sentiment/phones */
router.get('/phones', async (req, res) => {
  try {
    const phones = await listGeelarkPhones();
    res.json({ ok: true, phones });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** POST /api/risk-sentiment/send */
router.post('/send', async (req, res) => {
  const body = req.body as {
    items?: unknown;
    profile?: string;
    game?: string;
  };
  const items = body?.items;
  const profileRaw = String(body?.profile ?? '').trim();
  const profile = (['balanced', 'conservative', 'aggressive'] as const).includes(profileRaw as StrategyProfileKey)
    ? (profileRaw as StrategyProfileKey)
    : undefined;
  const game = String(body?.game ?? '').trim();
  if (!Array.isArray(items) || !items.length) {
    res.status(400).json({ ok: false, error: '请至少选择一条发送任务' });
    return;
  }
  const normalized: Array<{ envId: string; videoUrl: string; comment: string; useAsia?: boolean }> = [];
  const logItems: Array<{ videoUrl: string; comment: string; envId: string; deviceName?: string }> = [];
  for (const row of items) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const envId = String(o.envId ?? '').trim();
    const videoUrl = String(o.videoUrl ?? '').trim();
    const comment = String(o.comment ?? '').trim();
    const useAsia = Boolean(o.useAsia);
    const deviceName = String(o.deviceName ?? '').trim() || undefined;
    if (!envId || !videoUrl || !comment) continue;
    normalized.push({ envId, videoUrl, comment, useAsia });
    logItems.push({ envId, videoUrl, comment, deviceName });
  }
  if (!normalized.length) {
    res.status(400).json({ ok: false, error: '没有有效的发送项' });
    return;
  }
  try {
    const result = await scheduleTiktokCommentsOnGeelark(normalized);
    const ok = result.errors.length === 0 || result.taskIds.length > 0;
    const message =
      result.taskIds.length > 0
        ? `已提交 ${result.taskIds.length} 条评论任务${result.errors.length ? `（${result.errors.length} 条失败）` : ''}`
        : result.errors.join('; ') || '未创建任务';
    await appendRiskExecutionLog({
      profile,
      game: game || undefined,
      ok,
      message,
      taskIds: result.taskIds,
      errors: result.errors,
      items: logItems,
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendRiskExecutionLog({
      profile,
      game: game || undefined,
      ok: false,
      message: msg,
      taskIds: [],
      errors: [msg],
      items: logItems,
    });
    res.status(500).json({ ok: false, error: msg });
  }
});

/** POST /api/risk-sentiment/execution-note — 前端校验失败等场景仍写入任务日志 */
router.post('/execution-note', async (req, res) => {
  try {
    const body = req.body as {
      profile?: string;
      game?: string;
      ok?: boolean;
      message?: string;
    };
    const profileRaw = String(body?.profile ?? '').trim();
    const profile = (['balanced', 'conservative', 'aggressive'] as const).includes(profileRaw as StrategyProfileKey)
      ? (profileRaw as StrategyProfileKey)
      : undefined;
    const game = String(body?.game ?? '').trim();
    const message = String(body?.message ?? '记录').trim() || '记录';
    const ok = body?.ok !== false;
    await appendRiskExecutionLog({
      profile,
      game: game || undefined,
      ok,
      message,
      taskIds: [],
      errors: ok ? [] : [message],
      items: [],
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** GET /api/risk-sentiment/execution-log */
router.get('/execution-log', async (_req, res) => {
  try {
    const logs = await listRiskExecutionLogs();
    res.json({ ok: true, logs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

export default router;
