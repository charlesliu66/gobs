import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeCaptionCampaignContextInput } from '../src/routes/prompt.ts';
import { buildCaptionContextBlock } from '../src/services/promptPolish.ts';

test('normalizeCaptionCampaignContextInput merges nested and top-level campaign fields into a stable shape', () => {
  const context = normalizeCaptionCampaignContextInput({
    targetAudience: 'anime fight fans',
    callToAction: 'Watch until the last reveal',
    complianceNotes: 'Avoid guaranteed performance claims',
    bannedPhrases: [' guaranteed win ', '', 3, 'zero risk'],
    campaignContext: {
      objective: 'Drive trailer saves',
      market: 'Indonesia',
    },
  });

  assert.deepEqual(context, {
    objective: 'Drive trailer saves',
    targetAudience: 'anime fight fans',
    callToAction: 'Watch until the last reveal',
    targetMarket: 'Indonesia',
    complianceNotes: 'Avoid guaranteed performance claims',
    bannedPhrases: ['guaranteed win', 'zero risk'],
  });
});

test('buildCaptionContextBlock includes campaign framing lines for caption generation', () => {
  const block = buildCaptionContextBlock({
    prompt: 'Hero reveal with a fast beat drop',
    language: 'EN',
    platforms: ['tiktok', 'instagram'],
    campaignContext: {
      objective: 'Boost launch-day clicks',
      targetAudience: 'Mobile RPG fans',
      callToAction: 'Install now',
      targetMarket: 'Thailand',
      complianceNotes: 'No exaggerated gameplay promises',
      bannedPhrases: ['best ever', 'guaranteed rewards'],
    },
  });

  assert.match(block, /Requested language: EN/);
  assert.match(block, /Target platforms: tiktok, instagram/);
  assert.match(block, /Campaign objective: Boost launch-day clicks/);
  assert.match(block, /Target audience: Mobile RPG fans/);
  assert.match(block, /Desired CTA: Install now/);
  assert.match(block, /Target market: Thailand/);
  assert.match(block, /Compliance notes: No exaggerated gameplay promises/);
  assert.match(block, /Avoid phrases: best ever, guaranteed rewards/);
});

test('normalizeCaptionCampaignContextInput returns undefined when all campaign framing fields are blank', () => {
  assert.equal(
    normalizeCaptionCampaignContextInput({
      campaignObjective: '   ',
      targetAudience: '',
      bannedPhrases: [' ', ''],
    }),
    undefined,
  );
});
