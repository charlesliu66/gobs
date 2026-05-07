import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignMissionBriefPath } from '../src/api/campaignCreative.ts';

test('campaign creative mission brief API helper builds the expected endpoint path', () => {
  assert.equal(campaignMissionBriefPath(), '/api/campaign-creative/mission-brief');
});
