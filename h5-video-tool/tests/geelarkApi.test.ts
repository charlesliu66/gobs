import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTaskHistoryQuery } from '../src/api/geelark.ts';

test('buildTaskHistoryQuery keeps default history calls compact', () => {
  assert.equal(buildTaskHistoryQuery(), '');
  assert.equal(buildTaskHistoryQuery({ size: 20 }), '?size=20');
});

test('buildTaskHistoryQuery serializes backend filter pagination options', () => {
  assert.equal(
    buildTaskHistoryQuery({
      size: 100,
      limit: 20,
      offset: 40,
      status: 'success',
      platform: 'TikTok',
      query: 'gold launch',
      from: '2026-05-01',
      to: '2026-05-09',
    }),
    '?size=100&limit=20&offset=40&status=success&platform=TikTok&q=gold+launch&from=2026-05-01&to=2026-05-09',
  );
});
