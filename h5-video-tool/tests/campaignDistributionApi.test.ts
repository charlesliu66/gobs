import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campaignDistributionPackagePath,
  campaignDistributionPackagesPath,
} from '../src/api/campaignDistribution.ts';

test('campaign distribution API helpers build package endpoints', () => {
  assert.equal(campaignDistributionPackagesPath(), '/api/campaign-distribution/packages');
  assert.equal(
    campaignDistributionPackagePath('pkg_123'),
    '/api/campaign-distribution/packages/pkg_123',
  );
});
