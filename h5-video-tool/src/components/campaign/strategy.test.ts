import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBriefFromForm,
  buildCampaignPendingActions,
  buildCampaignPlan,
  buildCampaignProfile,
  buildStrategyFromBrief,
  describeCampaignAutomationLevel,
} from './strategy.ts';

test('campaign planner builds a knowledge-aware mission control summary', () => {
  const brief = buildBriefFromForm({
    mode: 'tiktok_ua',
    objective: 'Drive installs for the new reward event',
    audience: 'RPG players who want fast payoff',
    sellingPointsText: 'Reward window hits immediately\nBoss battle opens in 3 seconds',
    cta: 'Play now',
    referenceStyle: '',
    region: 'US',
    forbiddenClaimsText: 'No guaranteed SSR',
  });

  const knowledgeContext = {
    selectedPackIds: ['pack_rewards'],
    marketTruth: ['Reward windows drive conversion spikes'],
    audienceTension: ['Players need proof before they click'],
    toneRules: ['Keep the payoff visible in the first 2 seconds'],
    forbiddenClaims: ['No guaranteed SSR'],
    approvedAngles: ['Reward-first opening'],
    hookCandidates: ['Open on the reward reveal'],
    visualCues: ['Reward splash frame'],
    rationaleNotes: ['Lead with urgency, then show proof'],
  };

  const strategy = buildStrategyFromBrief(brief, { knowledgeContext });
  const profile = buildCampaignProfile(brief, {
    automationLevel: 'managed_autopilot',
    knowledgeContext,
  });
  const plan = buildCampaignPlan(brief, strategy, {
    campaignId: profile.campaignId,
    automationLevel: profile.automationLevel,
    knowledgeContext,
  });

  assert.match(plan.summary, /1 selected knowledge pack/i);
  assert.match(
    describeCampaignAutomationLevel(profile.automationLevel),
    /pauses for risky or low-confidence review/i,
  );
  assert.ok(
    plan.productionDecisions.some((item) => item.includes('Open on the reward reveal')),
  );
  assert.ok(
    buildCampaignPendingActions(brief, strategy, {
      automationLevel: profile.automationLevel,
      variantCount: 3,
    }).includes('Review claim and region guardrails before publish.'),
  );
});
