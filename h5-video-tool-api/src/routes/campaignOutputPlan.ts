import { Router, type Response } from 'express';
import {
  CampaignOutputPlanValidationError,
  createCampaignOutputPlan,
  getCampaignOutputPlan,
  isSafeCampaignOutputPlanId,
  listCampaignOutputPlans,
  updateCampaignOutputPlan,
} from '../services/campaignOutputPlan.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

function getActorUsername(rawUsername: string | undefined): string {
  return sanitizeUsername(rawUsername);
}

function sendValidationError(res: Response, error: unknown): void {
  res.status(400).json({
    error: error instanceof Error ? error.message : 'Invalid campaign output plan payload',
  });
}

router.post('/plans', (req, res) => {
  try {
    const actor = getActorUsername(req.user?.username);
    const plan = createCampaignOutputPlan(actor, req.body);
    res.status(201).json(plan);
  } catch (error) {
    if (error instanceof CampaignOutputPlanValidationError) {
      sendValidationError(res, error);
      return;
    }
    console.error('[campaign-output:create-plan]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to create campaign output plan',
    });
  }
});

router.get('/plans', (req, res) => {
  try {
    const actor = getActorUsername(req.user?.username);
    res.json({ items: listCampaignOutputPlans(actor) });
  } catch (error) {
    console.error('[campaign-output:list-plans]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to list campaign output plans',
    });
  }
});

router.get('/plans/:planId', (req, res) => {
  const planId = req.params.planId?.trim() ?? '';
  if (!isSafeCampaignOutputPlanId(planId)) {
    res.status(400).json({ error: 'Please provide a valid output plan id' });
    return;
  }

  try {
    const actor = getActorUsername(req.user?.username);
    const plan = getCampaignOutputPlan(actor, planId);
    if (!plan) {
      res.status(404).json({ error: 'Campaign output plan not found' });
      return;
    }
    res.json(plan);
  } catch (error) {
    console.error('[campaign-output:get-plan]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to read campaign output plan',
    });
  }
});

router.patch('/plans/:planId', (req, res) => {
  const planId = req.params.planId?.trim() ?? '';
  if (!isSafeCampaignOutputPlanId(planId)) {
    res.status(400).json({ error: 'Please provide a valid output plan id' });
    return;
  }

  try {
    const actor = getActorUsername(req.user?.username);
    const plan = updateCampaignOutputPlan(actor, planId, req.body);
    if (!plan) {
      res.status(404).json({ error: 'Campaign output plan not found' });
      return;
    }
    res.json(plan);
  } catch (error) {
    if (error instanceof CampaignOutputPlanValidationError) {
      sendValidationError(res, error);
      return;
    }
    console.error('[campaign-output:update-plan]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to update campaign output plan',
    });
  }
});

export default router;
