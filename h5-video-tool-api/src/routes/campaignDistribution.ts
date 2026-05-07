import { Router, type Response } from 'express';
import {
  CampaignDistributionPackageValidationError,
  createCampaignDistributionPackage,
  getCampaignDistributionPackage,
  isSafeCampaignDistributionPackageId,
  listCampaignDistributionPackages,
  updateCampaignDistributionPackage,
} from '../services/campaignDistributionPackage.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

function getActorUsername(rawUsername: string | undefined): string {
  return sanitizeUsername(rawUsername);
}

function sendValidationError(res: Response, error: unknown): void {
  res.status(400).json({
    error: error instanceof Error ? error.message : 'Invalid campaign distribution package payload',
  });
}

router.post('/packages', (req, res) => {
  try {
    const actor = getActorUsername(req.user?.username);
    const pkg = createCampaignDistributionPackage(actor, req.body);
    res.status(201).json(pkg);
  } catch (error) {
    if (error instanceof CampaignDistributionPackageValidationError) {
      sendValidationError(res, error);
      return;
    }
    console.error('[campaign-distribution:create-package]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to create campaign distribution package',
    });
  }
});

router.get('/packages', (req, res) => {
  try {
    const actor = getActorUsername(req.user?.username);
    res.json({ packages: listCampaignDistributionPackages(actor) });
  } catch (error) {
    console.error('[campaign-distribution:list-packages]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to list campaign distribution packages',
    });
  }
});

router.get('/packages/:packageId', (req, res) => {
  const packageId = req.params.packageId?.trim() ?? '';
  if (!isSafeCampaignDistributionPackageId(packageId)) {
    res.status(400).json({ error: 'Please provide a valid package id' });
    return;
  }

  try {
    const actor = getActorUsername(req.user?.username);
    const pkg = getCampaignDistributionPackage(actor, packageId);
    if (!pkg) {
      res.status(404).json({ error: 'Campaign distribution package not found' });
      return;
    }
    res.json(pkg);
  } catch (error) {
    console.error('[campaign-distribution:get-package]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to read campaign distribution package',
    });
  }
});

router.patch('/packages/:packageId', (req, res) => {
  const packageId = req.params.packageId?.trim() ?? '';
  if (!isSafeCampaignDistributionPackageId(packageId)) {
    res.status(400).json({ error: 'Please provide a valid package id' });
    return;
  }

  try {
    const actor = getActorUsername(req.user?.username);
    const pkg = updateCampaignDistributionPackage(actor, packageId, req.body);
    if (!pkg) {
      res.status(404).json({ error: 'Campaign distribution package not found' });
      return;
    }
    res.json(pkg);
  } catch (error) {
    if (error instanceof CampaignDistributionPackageValidationError) {
      sendValidationError(res, error);
      return;
    }
    console.error('[campaign-distribution:update-package]', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unable to update campaign distribution package',
    });
  }
});

export default router;
