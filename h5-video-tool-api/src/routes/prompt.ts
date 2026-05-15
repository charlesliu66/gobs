import { Router, Request, Response } from 'express';
import {
  type CaptionCampaignContext,
  type PromptReferenceAsset,
  polishPrompt,
  generateCaptionForPost,
  translateCaptionForPost,
} from '../services/promptPolish.js';
import {
  replyLocaleToCaptionLanguage,
  resolveReplyLocale,
} from '../services/replyLocale.js';
import { getTemplates, getShortDramaPresets } from '../config/prompt-templates/index.js';

export const promptRouter = Router();

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readCampaignPhraseList(...values: unknown[]): string[] {
  const phrases: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      const phrase = readTrimmedString(item);
      if (!phrase || seen.has(phrase)) continue;
      seen.add(phrase);
      phrases.push(phrase);
    }
  }
  return phrases;
}

function normalizePromptReferenceAssetsInput(value: unknown): PromptReferenceAsset[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const assets: PromptReferenceAsset[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const asset: PromptReferenceAsset = {
      slotId: readTrimmedString(record.slotId),
      title: readTrimmedString(record.title),
      kind: readTrimmedString(record.kind),
      filename: readTrimmedString(record.filename),
      token: readTrimmedString(record.token),
      semanticRole: readTrimmedString(record.semanticRole),
    };
    if (asset.slotId || asset.title || asset.kind || asset.filename || asset.token || asset.semanticRole) {
      assets.push(asset);
    }
  }
  return assets.length > 0 ? assets : undefined;
}

export function normalizeCaptionCampaignContextInput(body: Record<string, unknown>): CaptionCampaignContext | undefined {
  const nested =
    asRecord(body.campaignContext) ??
    asRecord(body.campaign) ??
    asRecord(body.campaignFraming) ??
    {};

  const normalized: CaptionCampaignContext = {
    objective:
      readTrimmedString(nested.objective) ??
      readTrimmedString(nested.campaignObjective) ??
      readTrimmedString(body.objective) ??
      readTrimmedString(body.campaignObjective),
    targetAudience:
      readTrimmedString(nested.targetAudience) ??
      readTrimmedString(nested.audience) ??
      readTrimmedString(body.targetAudience) ??
      readTrimmedString(body.audience),
    callToAction:
      readTrimmedString(nested.callToAction) ??
      readTrimmedString(nested.cta) ??
      readTrimmedString(body.callToAction) ??
      readTrimmedString(body.cta),
    targetMarket:
      readTrimmedString(nested.targetMarket) ??
      readTrimmedString(nested.market) ??
      readTrimmedString(body.targetMarket) ??
      readTrimmedString(body.market),
    complianceNotes:
      readTrimmedString(nested.complianceNotes) ??
      readTrimmedString(nested.noGoNotes) ??
      readTrimmedString(body.complianceNotes) ??
      readTrimmedString(body.noGoNotes),
  };

  const bannedPhrases = readCampaignPhraseList(
    nested.bannedPhrases,
    nested.avoidPhrases,
    body.bannedPhrases,
    body.avoidPhrases,
  );
  if (bannedPhrases.length > 0) {
    normalized.bannedPhrases = bannedPhrases;
  }

  return normalized.objective ||
    normalized.targetAudience ||
    normalized.callToAction ||
    normalized.targetMarket ||
    normalized.complianceNotes ||
    normalized.bannedPhrases?.length
    ? normalized
    : undefined;
}

/**
 * GET /api/prompt/templates
 * Response: { templates: [...] } — Studio Phase 1 active templates only.
 */
promptRouter.get('/templates', (_req: Request, res: Response) => {
  const templates = getTemplates().map((t) => ({
    id: t.id,
    name: t.name,
    nameZh: t.nameZh,
    description: t.description,
    duration: t.duration,
    aspectRatio: t.aspectRatio,
    pipelineMode: t.pipelineMode,
  }));
  res.json({ templates });
});

/**
 * GET /api/prompt/short-drama-presets
 * Response: { presets: [] }
 *
 * Kept as a compatibility-safe legacy endpoint after short-drama templates were removed
 * from Studio Phase 1.
 */
promptRouter.get('/short-drama-presets', (_req: Request, res: Response) => {
  res.json({ presets: getShortDramaPresets() });
});

/**
 * POST /api/prompt/polish
 * Body: { prompt: string, templateId?: string, style?: string, multishot?: boolean, duration?: number, aspectRatio?: string, mode?: string, referenceAssets?: [...] }
 * Response: { polishedPrompt, searchKeywords, folderHints?, template?, shots? }
 *
 * templateId 优先于 style。传入 templateId 时按模板优化。
 * 自定义模式 + multishot：仅用导演知识生成多镜分镜。
 */
promptRouter.post('/polish', async (req: Request, res: Response) => {
  const { prompt, templateId, style, multishot, duration, aspectRatio, mode, referenceAssets } = req.body as {
    prompt?: string;
    templateId?: string;
    style?: string;
    multishot?: boolean;
    duration?: number;
    aspectRatio?: string;
    mode?: string;
    referenceAssets?: unknown;
  };
  const raw = typeof prompt === 'string' ? prompt : '';
  if (!raw.trim()) {
    res.status(400).json({ error: '请提供 prompt' });
    return;
  }
  let opts: {
    templateId?: string;
    styleId?: string;
    multishot?: boolean;
    duration?: number;
    aspectRatio?: string;
    mode?: string;
    referenceAssets?: PromptReferenceAsset[];
  } | undefined;
  if (typeof templateId === 'string' && templateId) {
    opts = { templateId };
  } else if (typeof style === 'string' && style) {
    opts = { styleId: style };
  }
  if (multishot === true) {
    opts = { ...(opts ?? {}), multishot: true, duration: typeof duration === 'number' ? duration : 30, aspectRatio: typeof aspectRatio === 'string' ? aspectRatio : '16:9' };
  }
  const normalizedMode = readTrimmedString(mode);
  const normalizedReferenceAssets = normalizePromptReferenceAssetsInput(referenceAssets);
  if (normalizedMode || normalizedReferenceAssets?.length) {
    opts = { ...(opts ?? {}), mode: normalizedMode, referenceAssets: normalizedReferenceAssets };
  }
  try {
    const result = await polishPrompt(raw, opts);
    res.json(result);
  } catch (err) {
    console.error('[prompt/polish]', err);
    const msg = err instanceof Error ? err.message : '优化失败';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/prompt/generate-caption
 * Body: { prompt: string, platforms?: string[], existingCaption?: string, existingHashtags?: string }
 * Response: { caption, hashtags } 或 { byPlatform: { tiktok: { caption, hashtags }, ... } }
 *
 * 格子为空：基于 prompt 生成文案和标签。
 * 格子有内容：基于平台规则优化用户已有文案和标签。
 */
promptRouter.post('/generate-caption', async (req: Request, res: Response) => {
  const {
    prompt,
    platforms,
    existingCaption,
    existingHashtags,
    language,
    videoPath,
    videoUrl,
    accountContext,
  } = req.body as {
    prompt?: string;
    platforms?: string[];
    existingCaption?: string;
    existingHashtags?: string;
    language?: 'EN' | 'CN' | 'TH' | 'ID';
    videoPath?: string;
    videoUrl?: string;
    accountContext?: Array<{
      id?: string;
      username?: string;
      platform?: string;
      region?: string;
      remark?: string;
    }>;
  };
  const raw = typeof prompt === 'string' ? prompt : '';
  const existingCap = typeof existingCaption === 'string' ? existingCaption.trim() : '';
  const existingTag = typeof existingHashtags === 'string' ? existingHashtags.trim() : '';
  const hasExisting = existingCap.length > 0 || existingTag.length > 0;
  if (!hasExisting && !raw.trim()) {
    res.status(400).json({ error: '请提供 prompt，或在文案/标签中填写待优化内容' });
    return;
  }
  const platformList = Array.isArray(platforms) ? platforms.filter((p) => typeof p === 'string') : undefined;
  const lang = ['EN', 'CN', 'TH', 'ID'].includes(language as string) ? (language as 'EN' | 'CN' | 'TH' | 'ID') : undefined;
  try {
    const resolvedLanguage =
      lang ??
      replyLocaleToCaptionLanguage(
        resolveReplyLocale({
          contentLocale: req.get('X-Content-Locale'),
          samples: [raw, existingCap, existingTag],
        }),
      );
    const result = await generateCaptionForPost(raw, platformList, {
      existingCaption: existingCap || undefined,
      existingHashtags: existingTag || undefined,
      language: resolvedLanguage,
      videoPath: typeof videoPath === 'string' ? videoPath.trim() || undefined : undefined,
      videoUrl: typeof videoUrl === 'string' ? videoUrl.trim() || undefined : undefined,
      accountContext: Array.isArray(accountContext) ? accountContext : undefined,
      campaignContext: normalizeCaptionCampaignContextInput(req.body as Record<string, unknown>),
      requestUsername: req.user?.username ?? undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('[prompt/generate-caption]', err);
    const msg = err instanceof Error ? err.message : '生成失败';
    res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/prompt/translate-caption
 * Body: { caption?: string, hashtags?: string, targetLanguage: 'EN'|'CN'|'TH'|'ID' }
 * Response: { caption, hashtags }
 *
 * 将现有文案与标签翻译为目标语言。
 */
promptRouter.post('/translate-caption', async (req: Request, res: Response) => {
  const { caption, hashtags, targetLanguage } = req.body as {
    caption?: string;
    hashtags?: string;
    targetLanguage?: 'EN' | 'CN' | 'TH' | 'ID';
  };
  const cap = typeof caption === 'string' ? caption.trim() : '';
  const tag = typeof hashtags === 'string' ? hashtags.trim() : '';
  if (!cap && !tag) {
    res.status(400).json({ error: '请提供待翻译的文案或标签' });
    return;
  }
  const lang = ['EN', 'CN', 'TH', 'ID'].includes(targetLanguage as string) ? (targetLanguage as 'EN' | 'CN' | 'TH' | 'ID') : 'EN';
  try {
    const result = await translateCaptionForPost(cap, tag, lang);
    res.json(result);
  } catch (err) {
    console.error('[prompt/translate-caption]', err);
    const msg = err instanceof Error ? err.message : '翻译失败';
    res.status(500).json({ error: msg });
  }
});

export default promptRouter;
