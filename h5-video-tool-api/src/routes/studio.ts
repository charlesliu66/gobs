import { Router, Request, Response } from 'express';
import {
  generateStoryArc,
  generateProductionDesign,
  generateStoryboardTable,
  extractStyleReference,
  extractCharacterVisuals,
  assemblePrompts,
  type StructureTemplate,
  type StoryArcLayer,
  type ProductionDesignLayer,
  type ProductionShot,
  type CharacterVisualProfile,
} from '../services/studioPipeline.js';
import { compassChatCompletion } from '../services/compassLlm.js';
import {
  isLikelyProductionDesignParseError,
  requestProductionDesignFallback,
} from '../services/productionDesignFallback.js';
import {
  collectStringSamples,
  localizeStructuredPayload,
  resolveReplyLocale,
  type ReplyLocale,
} from '../services/replyLocale.js';

export const studioRouter = Router();

// ── Auto-refine: batch review all shots in one LLM call ──────────────────
const BATCH_REFINE_SYSTEM = `你是资深分镜导演。给你一组结构化镜头 JSON 数组，逐镜检查并优化以下字段使其可直接用于 Seedance 2.0 AI 视频生成：
- structuredStill：sp_subject 需具体人物外貌/动作，sp_environment 需场景细节，sp_lighting 需明确光源/色温，sp_style 需风格一致
- structuredMotion：mp_motion 需清晰的动作描述，mp_camera 需精确运镜指令，mp_tempo 需节奏描述

你必须仅输出一段合法 JSON 数组（与输入长度相同，每个元素只包含需要修改的字段路径和新值）。
格式：[{"shotIndex":number,"patches":[{"path":"structuredStill.sp_lighting","value":"..."},...]}]
如果某镜不需要修改，patches 为空数组。不要输出 markdown 代码块。只改确实不够好的字段，不要为了改而改。`;

async function autoRefineShots(
  shots: ProductionShot[],
  styleRef?: string,
): Promise<ProductionShot[]> {
  if (!shots.length) return shots;
  const pickFields = (s: ProductionShot) => ({
    shotIndex: s.shotIndex,
    subject: s.subject,
    action: s.action,
    lighting: s.lighting,
    structuredStill: s.structuredStill,
    structuredMotion: s.structuredMotion,
  });
  const userText = JSON.stringify({
    globalStyleRef: styleRef ?? '',
    shots: shots.map(pickFields),
  });
  try {
    const raw = await compassChatCompletion({
      systemPrompt: BATCH_REFINE_SYSTEM,
      userText,
      temperature: 0.3,
      maxTokens: 16384,
    });
    let text = raw.trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(text);
    if (fence) text = fence[1].trim();
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      text = text.slice(firstBracket, lastBracket + 1);
    }
    const patches = JSON.parse(text) as Array<{
      shotIndex: number;
      patches: Array<{ path: string; value: string }>;
    }>;
    const refined = shots.map((s) => {
      const entry = patches.find((p) => p.shotIndex === s.shotIndex);
      if (!entry?.patches?.length) return s;
      let next = { ...s };
      for (const p of entry.patches) {
        const parts = p.path.split('.');
        if (parts.length === 2) {
          const [group, key] = parts;
          if (group === 'structuredStill' && next.structuredStill) {
            next = { ...next, structuredStill: { ...next.structuredStill, [key]: p.value } };
          } else if (group === 'structuredMotion' && next.structuredMotion) {
            next = { ...next, structuredMotion: { ...next.structuredMotion, [key]: p.value } };
          }
        }
      }
      return next;
    });
    return refined;
  } catch (e) {
    console.warn('[studio/auto-refine] skipped:', e instanceof Error ? e.message : e);
    return shots;
  }
}

const TEMPLATES: StructureTemplate[] = ['three_act', 'five_act', 'save_the_cat'];

function getStudioReplyLocale(req: Request, samples: unknown[] = []): ReplyLocale {
  const body = req.body as Record<string, unknown>;
  return resolveReplyLocale({
    explicit:
      typeof body.replyLocale === 'string'
        ? body.replyLocale
        : req.get('X-Reply-Locale'),
    contentLocale: req.get('X-Content-Locale'),
    samples: samples.flatMap((sample) => collectStringSamples(sample)),
  });
}

function localizeStoryArc(story: StoryArcLayer, replyLocale: ReplyLocale): Promise<StoryArcLayer> {
  return localizeStructuredPayload(story, replyLocale, {
    preserveKeys: ['beatIds', 'relatedBeatIds'],
  });
}

function localizeProductionDesign(
  productionDesign: ProductionDesignLayer,
  replyLocale: ReplyLocale,
): Promise<ProductionDesignLayer> {
  return localizeStructuredPayload(productionDesign, replyLocale);
}

function localizeShots(shots: ProductionShot[], replyLocale: ReplyLocale): Promise<ProductionShot[]> {
  return localizeStructuredPayload(shots, replyLocale);
}

function localizeCharacterVisualProfile(
  characterVisualProfile: CharacterVisualProfile,
  replyLocale: ReplyLocale,
): Promise<CharacterVisualProfile> {
  return localizeStructuredPayload(characterVisualProfile, replyLocale);
}

/**
 * POST /api/studio/story-arc
 * Body: { characterBible, synopsis, styleRef, structureTemplate }
 */
studioRouter.post('/story-arc', async (req: Request, res: Response) => {
  const { characterBible, synopsis, styleRef, structureTemplate } = req.body as {
    characterBible?: string;
    synopsis?: string;
    styleRef?: string;
    structureTemplate?: string;
  };
  const bible = typeof characterBible === 'string' ? characterBible.trim() : '';
  const syn = typeof synopsis === 'string' ? synopsis.trim() : '';
  if (!bible || !syn) {
    res.status(400).json({ error: '请提供 characterBible 与 synopsis' });
    return;
  }
  const st = (structureTemplate || 'three_act') as StructureTemplate;
  if (!TEMPLATES.includes(st)) {
    res.status(400).json({ error: 'structureTemplate 须为 three_act | five_act | save_the_cat' });
    return;
  }
  try {
    const replyLocale = getStudioReplyLocale(req, [bible, syn, styleRef]);
    const story = await generateStoryArc({
      characterBible: bible,
      synopsis: syn,
      styleRef: typeof styleRef === 'string' ? styleRef.trim() : '',
      structureTemplate: st,
    });
    res.json({ story: await localizeStoryArc(story, replyLocale) });
  } catch (err) {
    console.error('[studio/story-arc]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '生成失败' });
  }
});

/**
 * POST /api/studio/production-design
 * Body: { story: StoryArcLayer }
 */
studioRouter.post('/production-design', async (req: Request, res: Response) => {
  const { story } = req.body as { story?: StoryArcLayer };
  if (!story || typeof story !== 'object') {
    res.status(400).json({ error: '请提供 story 对象' });
    return;
  }
  try {
    const replyLocale = getStudioReplyLocale(req, [story]);
    let productionDesign: ProductionDesignLayer;
    try {
      productionDesign = await generateProductionDesign(story);
    } catch (err) {
      if (!isLikelyProductionDesignParseError(err)) throw err;
      console.warn('[studio/production-design] primary parse failed, retrying fallback:', err);
      productionDesign = await requestProductionDesignFallback(story);
    }
    res.json({ productionDesign: await localizeProductionDesign(productionDesign, replyLocale) });
  } catch (err) {
    console.error('[studio/production-design]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '生成失败' });
  }
});

/**
 * POST /api/studio/storyboard-table
 * Body: { story, productionDesign, maxTotalDurationSec?, extraNotes? }
 */
studioRouter.post('/storyboard-table', async (req: Request, res: Response) => {
  const { story, productionDesign, maxTotalDurationSec, extraNotes } = req.body as {
    story?: StoryArcLayer;
    productionDesign?: ProductionDesignLayer;
    maxTotalDurationSec?: number;
    extraNotes?: string;
  };
  if (!story || !productionDesign) {
    res.status(400).json({ error: '请提供 story 与 productionDesign' });
    return;
  }
  const maxDur = typeof maxTotalDurationSec === 'number' && maxTotalDurationSec > 0 ? maxTotalDurationSec : 60;
  const styleRef = typeof (req.body as Record<string, unknown>).styleRef === 'string'
    ? ((req.body as Record<string, unknown>).styleRef as string).trim()
    : productionDesign.colorGrading?.trim();
  try {
    const replyLocale = getStudioReplyLocale(req, [story, productionDesign, extraNotes, styleRef]);
    const rawShots = await generateStoryboardTable({
      story,
      productionDesign,
      maxTotalDurationSec: maxDur,
      extraNotes: typeof extraNotes === 'string' ? extraNotes.trim() : undefined,
    });
    const shots = await autoRefineShots(rawShots, styleRef);
    res.json({ shots: await localizeShots(shots, replyLocale) });
  } catch (err) {
    console.error('[studio/storyboard-table]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '生成失败' });
  }
});

/**
 * POST /api/studio/extract-style-reference
 * Body: { imageBase64, mimeType? } — 风格参考图反解析 → 文字风格摘要
 */
studioRouter.post('/extract-style-reference', async (req: Request, res: Response) => {
  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };
  const raw = typeof imageBase64 === 'string' ? imageBase64.trim() : '';
  if (!raw) {
    res.status(400).json({ error: '请提供 imageBase64' });
    return;
  }
  try {
    const replyLocale = getStudioReplyLocale(req);
    const styleReference = await extractStyleReference({
      imageBase64: raw,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
    });
    res.json({
      styleReference: await localizeStructuredPayload(styleReference, replyLocale),
    });
  } catch (err) {
    console.error('[studio/extract-style-reference]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '反解析失败' });
  }
});

/**
 * POST /api/studio/extract-character-visuals
 * Body: { imageBase64, mimeType? }
 */
studioRouter.post('/extract-character-visuals', async (req: Request, res: Response) => {
  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };
  const raw = typeof imageBase64 === 'string' ? imageBase64.trim() : '';
  if (!raw) {
    res.status(400).json({ error: '请提供 imageBase64' });
    return;
  }
  try {
    const replyLocale = getStudioReplyLocale(req);
    const characterVisualProfile = await extractCharacterVisuals({
      imageBase64: raw,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
    });
    res.json({
      characterVisualProfile: await localizeCharacterVisualProfile(characterVisualProfile, replyLocale),
    });
  } catch (err) {
    console.error('[studio/extract-character-visuals]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '解析失败' });
  }
});

/**
 * POST /api/studio/assemble-prompts
 * Body: { shots: ProductionShot[], characterVisualProfile? }
 */
studioRouter.post('/assemble-prompts', async (req: Request, res: Response) => {
  const { shots, characterVisualProfile } = req.body as {
    shots?: ProductionShot[];
    characterVisualProfile?: CharacterVisualProfile | null;
  };
  if (!Array.isArray(shots) || shots.length === 0) {
    res.status(400).json({ error: '请提供 shots 数组' });
    return;
  }
  try {
    const replyLocale = getStudioReplyLocale(req, [shots, characterVisualProfile]);
    const assembled = assemblePrompts({
      shots,
      characterVisualProfile: characterVisualProfile ?? undefined,
    });
    res.json(await localizeStructuredPayload(assembled, replyLocale));
  } catch (err) {
    console.error('[studio/assemble-prompts]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '组装失败' });
  }
});

export default studioRouter;
