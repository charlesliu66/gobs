import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertCreativeQualityStatus,
  evaluateCreativeQuality,
} from './creativeQualityRubric.ts';
import { CREATIVE_QUALITY_STATUSES } from './creativeQualityTypes.ts';

test('creative quality statuses stay limited to three states', () => {
  assert.deepEqual([...CREATIVE_QUALITY_STATUSES], ['usable', 'needs_fix', 'unusable']);
  assert.equal(assertCreativeQualityStatus('usable'), 'usable');
  assert.throws(() => assertCreativeQualityStatus('approved'), /Unsupported creative quality status/);
});

test('usable banner requires brief fit, clear selling point, correct assets, and no blockers', () => {
  const decision = evaluateCreativeQuality({
    outputType: 'banner',
    briefAligned: true,
    sellingPointClear: true,
    sourceAssetsCorrect: true,
    hasBlockingPublishIssue: false,
  });

  assert.equal(decision.status, 'usable');
  assert.match(decision.suggestedNextAction, /Approve/);
  assert.deepEqual(decision.issueTags, []);
});

test('needs_fix keeps direction when only non-blocking issue tags are present', () => {
  const decision = evaluateCreativeQuality({
    outputType: 'story_video',
    briefAligned: true,
    sellingPointClear: true,
    sourceAssetsCorrect: true,
    hasBlockingPublishIssue: false,
    issueTags: ['weak_opening', 'slow_pacing'],
  });

  assert.equal(decision.status, 'needs_fix');
  assert.deepEqual(decision.issueTags, ['weak_opening', 'slow_pacing']);
  assert.match(decision.suggestedNextAction, /revised prompt/);
});

test('unusable wins when any blocking quality condition is present', async (t) => {
  const cases = [
    { name: 'brief mismatch', briefAligned: false, sellingPointClear: true, sourceAssetsCorrect: true, hasBlockingPublishIssue: false },
    { name: 'unclear selling point', briefAligned: true, sellingPointClear: false, sourceAssetsCorrect: true, hasBlockingPublishIssue: false },
    { name: 'wrong source asset', briefAligned: true, sellingPointClear: true, sourceAssetsCorrect: false, hasBlockingPublishIssue: false },
    { name: 'publish blocker', briefAligned: true, sellingPointClear: true, sourceAssetsCorrect: true, hasBlockingPublishIssue: true },
  ];

  for (const qualityCase of cases) {
    await t.test(qualityCase.name, () => {
      const decision = evaluateCreativeQuality({
        outputType: 'platform_copy',
        ...qualityCase,
        issueTags: ['copy_not_strong_enough'],
      });

      assert.equal(decision.status, 'unusable');
      assert.match(decision.suggestedNextAction, /Reject/);
    });
  }
});
