import test from 'node:test';
import assert from 'node:assert/strict';

import {
  creativeContractFixtures,
  isCampaignOutputContractGraphValid,
  validateCampaignOutputContractGraph,
  type CampaignOutputContractGraph,
} from './campaignOutputContracts.ts';

function cloneFixture(): CampaignOutputContractGraph {
  return structuredClone(creativeContractFixtures);
}

test('creative contract fixtures cover all required entities and validate cleanly', () => {
  const graph = cloneFixture();

  assert.equal(graph.campaigns.length, 1);
  assert.equal(graph.assets.length, 2);
  assert.equal(graph.outputs.length, 3);
  assert.equal(graph.reviews.length, 3);
  assert.equal(graph.packages.length, 1);
  assert.deepEqual(validateCampaignOutputContractGraph(graph), []);
  assert.equal(isCampaignOutputContractGraphValid(graph), true);
});

test('contract validation catches required output campaign and asset relationships', () => {
  const graph = cloneFixture();
  graph.outputs[0] = {
    ...graph.outputs[0],
    campaignId: 'missing_campaign',
    assetIds: ['missing_asset'],
  };

  const issues = validateCampaignOutputContractGraph(graph);

  assert.ok(issues.some((issue) => issue.relation === 'Output.campaignId'));
  assert.ok(issues.some((issue) => issue.relation === 'Output.assetIds'));
});

test('contract validation catches review and package output links', () => {
  const graph = cloneFixture();
  graph.reviews[0] = {
    ...graph.reviews[0],
    outputId: 'missing_output',
  };
  graph.packages[0] = {
    ...graph.packages[0],
    outputIds: ['missing_output'],
  };

  const issues = validateCampaignOutputContractGraph(graph);

  assert.ok(issues.some((issue) => issue.relation === 'Review.outputId'));
  assert.ok(issues.some((issue) => issue.relation === 'Package.outputIds'));
});

test('contract validation catches parent output and duplicate IDs deterministically', () => {
  const graph = cloneFixture();
  graph.outputs.push({
    ...graph.outputs[1],
    outputId: 'output_story_video_revision',
    parentOutputId: 'missing_parent_output',
  });
  graph.assets.push({ ...graph.assets[0] });

  const issues = validateCampaignOutputContractGraph(graph);

  assert.ok(issues.some((issue) => issue.relation === 'Output.parentOutputId'));
  assert.ok(issues.some((issue) => issue.entity === 'asset' && issue.relation === 'unique_id'));
});
