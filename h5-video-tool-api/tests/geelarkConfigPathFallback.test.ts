import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { listAccounts } from '../src/services/geelark.ts';
import { loadPublishAccountsFromConfig } from '../src/gobs/gobsPublishCatalog.ts';

function withTempQasLayout<T>(fn: (layout: { root: string; apiCwd: string; sharedConfigDir: string }) => Promise<T> | T) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-geelark-paths-'));
  const root = path.join(tempRoot, 'qas-h5');
  const apiCwd = path.join(root, 'prod', 'api');
  const sharedConfigDir = path.join(root, 'config');
  fs.mkdirSync(apiCwd, { recursive: true });
  fs.mkdirSync(sharedConfigDir, { recursive: true });

  const previousCwd = process.cwd();
  process.chdir(apiCwd);

  const run = async () => fn({ root, apiCwd, sharedConfigDir });
  return run().finally(() => {
    process.chdir(previousCwd);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
}

test('listAccounts can read shared geelark-accounts.json from ../../config after dual-env split', async () => {
  await withTempQasLayout(async ({ sharedConfigDir }) => {
    fs.writeFileSync(
      path.join(sharedConfigDir, 'geelark-accounts.json'),
      JSON.stringify({
        accounts: [
          {
            id: 'acc-1',
            username: 'web-th-tt',
            envId: 'env-1',
            platform: 'tiktok',
            region: 'TH',
          },
        ],
      }),
      'utf8',
    );

    assert.deepEqual(listAccounts(), [
      {
        id: 'acc-1',
        username: 'web-th-tt',
        platform: 'tiktok',
        region: 'TH',
        remark: undefined,
        profileUrl: undefined,
        canPost: true,
      },
    ]);
  });
});

test('loadPublishAccountsFromConfig can read shared geelark-accounts.json from ../../config after dual-env split', async () => {
  await withTempQasLayout(async ({ sharedConfigDir }) => {
    fs.writeFileSync(
      path.join(sharedConfigDir, 'geelark-accounts.json'),
      JSON.stringify({
        accounts: [
          {
            id: 'acc-1',
            username: 'web-th-tt',
            platform: 'tiktok',
            remark: 'group:web TH',
          },
        ],
      }),
      'utf8',
    );

    assert.deepEqual(await loadPublishAccountsFromConfig(), [
      {
        id: 'acc-1',
        username: 'web-th-tt',
        platform: 'tiktok',
        remark: 'group:web TH',
      },
    ]);
  });
});
