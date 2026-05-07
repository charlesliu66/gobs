import { Router } from 'express';
import { nanoid } from 'nanoid';
import {
  type CampaignKnowledgePackType,
  buildKnowledgePackId,
  buildKnowledgeSourceId,
  isCampaignKnowledgePackType,
  isSafeKnowledgeId,
  listCampaignKnowledgePacks,
  saveCampaignKnowledgeSource,
  upsertCampaignKnowledgePack,
} from '../services/campaignKnowledgeStore.js';
import { importCampaignKnowledgeTemplate } from '../services/campaignKnowledgeImport.js';
import { createEmptyDerivedCampaignKnowledgeContext, deriveCampaignKnowledgeContext } from '../services/campaignKnowledgeDerivation.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

function getSafeGameId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return isSafeKnowledgeId(trimmed) ? trimmed : undefined;
}

function parseSelectedPackIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ids = raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
  if (ids.some((item) => !isSafeKnowledgeId(item))) return undefined;
  return [...new Set(ids)];
}

function parseContentLines(content: string): string[] {
  return content
    .split(/\r?\n|,|;|，|；/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildSummary(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= 160) return normalized;
  return `${normalized.slice(0, 159).trimEnd()}…`;
}

router.get('/games/:gameId/packs', async (req, res) => {
  const gameId = getSafeGameId(req.params.gameId);
  if (!gameId) {
    res.status(400).json({ error: 'Please provide a valid gameId' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const packs = await listCampaignKnowledgePacks(username, gameId);
    res.json({ gameId, packs });
  } catch (error) {
    console.error('[campaign-knowledge:list]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to list knowledge packs' });
  }
});

router.post('/games/:gameId/import-template', async (req, res) => {
  const gameId = getSafeGameId(req.params.gameId);
  if (!gameId) {
    res.status(400).json({ error: 'Please provide a valid gameId' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const templateId =
      typeof (req.body as { templateId?: unknown }).templateId === 'string'
        ? String((req.body as { templateId?: string }).templateId).trim()
        : undefined;
    const result = await importCampaignKnowledgeTemplate(username, gameId, templateId || undefined);
    res.json({
      gameId: result.gameId,
      importedPackIds: result.importedPackIds,
      packs: result.packs,
    });
  } catch (error) {
    console.error('[campaign-knowledge:import-template]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to import knowledge template' });
  }
});

router.post('/games/:gameId/sources', async (req, res) => {
  const gameId = getSafeGameId(req.params.gameId);
  if (!gameId) {
    res.status(400).json({ error: 'Please provide a valid gameId' });
    return;
  }

  const body = req.body as {
    title?: unknown;
    content?: unknown;
    sourceType?: unknown;
    packType?: unknown;
  };
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const sourceType =
    typeof body.sourceType === 'string' && ['upload', 'manual'].includes(body.sourceType)
      ? (body.sourceType as 'upload' | 'manual')
      : 'manual';
  const packTypeRaw = typeof body.packType === 'string' ? body.packType.trim() : 'market_fundamentals';
  const packType: CampaignKnowledgePackType | undefined = isCampaignKnowledgePackType(packTypeRaw) ? packTypeRaw : undefined;

  if (!title || !content || !packType) {
    res.status(400).json({ error: 'Please provide title, content, and a valid packType' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const source = await saveCampaignKnowledgeSource(username, gameId, {
      sourceId: buildKnowledgeSourceId(),
      gameId,
      sourceType,
      title,
      content,
      packType,
      checksum: `manual:${nanoid(8)}`,
    });

    const lines = parseContentLines(content);
    const pack = await upsertCampaignKnowledgePack(username, gameId, {
      packId: buildKnowledgePackId(),
      gameId,
      type: packType,
      title,
      status: 'draft',
      summary: buildSummary(content),
      facts: lines.slice(0, 6),
      preferences: lines.filter((line) => /prefer|should|建议|优先|推荐/i.test(line)).slice(0, 4),
      avoid: lines.filter((line) => /avoid|don't|禁止|避免|不要/i.test(line)).slice(0, 4),
      hookSeeds: lines.filter((line) => /hook|开场|卖点|payoff|angle/i.test(line)).slice(0, 4),
      visualCues: lines.filter((line) => /visual|镜头|画面|字幕|风格/i.test(line)).slice(0, 4),
      sourceIds: [source.sourceId],
    });

    res.json({
      gameId,
      sourceId: source.sourceId,
      pack,
      packs: await listCampaignKnowledgePacks(username, gameId),
    });
  } catch (error) {
    console.error('[campaign-knowledge:create-source]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create knowledge source' });
  }
});

router.post('/games/:gameId/derive-context', async (req, res) => {
  const gameId = getSafeGameId(req.params.gameId);
  if (!gameId) {
    res.status(400).json({ error: 'Please provide a valid gameId' });
    return;
  }

  const selectedPackIds = parseSelectedPackIds((req.body as { selectedPackIds?: unknown }).selectedPackIds);
  if (!selectedPackIds) {
    res.status(400).json({ error: 'Please provide selectedPackIds as a valid string array' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const packs = await listCampaignKnowledgePacks(username, gameId);
    res.json({
      gameId,
      context: selectedPackIds.length > 0
        ? deriveCampaignKnowledgeContext(packs, selectedPackIds)
        : createEmptyDerivedCampaignKnowledgeContext(),
    });
  } catch (error) {
    console.error('[campaign-knowledge:derive-context]', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to derive knowledge context' });
  }
});

export default router;
