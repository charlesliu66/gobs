import { Router } from 'express';
import {
  generateCampaignMissionBrief,
  type CampaignCreativeMode,
  type CampaignMissionUiLocale,
} from '../services/campaignMissionBrief.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

function parseMode(value: unknown): CampaignCreativeMode | undefined {
  return value === 'tiktok_content' || value === 'tiktok_ua' ? value : undefined;
}

function parseUiLocale(value: unknown): CampaignMissionUiLocale | undefined {
  return value === 'zh' || value === 'en' ? value : undefined;
}

router.post('/mission-brief', async (req, res) => {
  const body = req.body as {
    mission?: unknown;
    mode?: unknown;
    uiLocale?: unknown;
  };
  const mission = typeof body.mission === 'string' ? body.mission.trim() : '';

  if (!mission) {
    res.status(400).json({ error: 'Campaign mission is required' });
    return;
  }

  try {
    const username = sanitizeUsername(req.user?.username);
    const result = await generateCampaignMissionBrief(
      {
        mission,
        mode: parseMode(body.mode),
        uiLocale: parseUiLocale(body.uiLocale),
      },
      { username },
    );
    res.json(result);
  } catch (error) {
    console.error('[campaign-creative:mission-brief]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to generate campaign mission brief',
    });
  }
});

export default router;
