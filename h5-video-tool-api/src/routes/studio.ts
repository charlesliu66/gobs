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

export const studioRouter = Router();

const TEMPLATES: StructureTemplate[] = ['three_act', 'five_act', 'save_the_cat'];

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
    const story = await generateStoryArc({
      characterBible: bible,
      synopsis: syn,
      styleRef: typeof styleRef === 'string' ? styleRef.trim() : '',
      structureTemplate: st,
    });
    res.json({ story });
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
    const productionDesign = await generateProductionDesign(story);
    res.json({ productionDesign });
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
  try {
    const shots = await generateStoryboardTable({
      story,
      productionDesign,
      maxTotalDurationSec: maxDur,
      extraNotes: typeof extraNotes === 'string' ? extraNotes.trim() : undefined,
    });
    res.json({ shots });
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
    const styleReference = await extractStyleReference({
      imageBase64: raw,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
    });
    res.json({ styleReference });
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
    const characterVisualProfile = await extractCharacterVisuals({
      imageBase64: raw,
      mimeType: typeof mimeType === 'string' ? mimeType : undefined,
    });
    res.json({ characterVisualProfile });
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
    const assembled = assemblePrompts({
      shots,
      characterVisualProfile: characterVisualProfile ?? undefined,
    });
    res.json(assembled);
  } catch (err) {
    console.error('[studio/assemble-prompts]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : '组装失败' });
  }
});

export default studioRouter;
