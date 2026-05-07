import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const previousApiDataDir = process.env.API_DATA_DIR;
const tempApiDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-campaign-distribution-package-'));
process.env.API_DATA_DIR = tempApiDataDir;

test.after(async () => {
  const dbModule = await import('../src/db/assetDb.ts').catch(() => undefined);
  if (dbModule?.default && typeof (dbModule.default as { close?: () => void }).close === 'function') {
    (dbModule.default as { close: () => void }).close();
  }
  if (previousApiDataDir === undefined) {
    delete process.env.API_DATA_DIR;
  } else {
    process.env.API_DATA_DIR = previousApiDataDir;
  }
  fs.rmSync(tempApiDataDir, { recursive: true, force: true });
});

function buildPackagePayload(seed: string, overrides: Record<string, unknown> = {}) {
  return {
    campaignId: `campaign_${seed}`,
    gameId: 'gold_and_glory',
    ownerId: 'client-should-not-win',
    createdBy: 'client-should-not-win',
    updatedBy: 'client-should-not-win',
    source: {
      type: 'campaign_variant',
      sourceId: `variant_source_${seed}`,
      createdFromRoute: 'campaign-creative',
    },
    campaign: {
      mission: `Ship campaign ${seed}`,
      briefId: `brief_${seed}`,
      mode: 'tiktok_ua',
      objective: 'Drive install intent with a fast payoff reveal',
      generationSource: 'llm',
      warnings: ['Keep claims honest'],
    },
    title: `Distribution package ${seed}`,
    variant: {
      id: `variant_${seed}`,
      angle: 'Fast payoff reveal',
      hook: 'Watch the gold explode in 3 seconds',
      audience: 'Reward-driven RPG players',
      proofPoint: 'Immediate gold payoff',
      cta: 'Download Gold and Glory now',
      riskNotes: ['Do not imply real-money earnings'],
    },
    assets: [
      {
        assetId: `asset_${seed}`,
        type: 'video',
        path: `output/campaign/${seed}.mp4`,
        status: 'ready',
      },
    ],
    assetReadiness: {
      state: 'publishable',
      primaryAssetId: `asset_${seed}`,
      publishableAsset: {
        type: 'video',
        source: 'server_path',
        path: `output/campaign/${seed}.mp4`,
      },
    },
    copy: {
      headline: 'Fast gold payoff',
      caption: 'Explode into rewards before the scroll moves on.',
      hashtags: ['#GoldAndGlory', '#MobileRPG'],
      language: 'en',
    },
    publishIntent: {
      platforms: ['tiktok'],
      markets: ['US'],
      accountGroupIds: ['acct_group_us'],
      scheduleHint: 'prime-time',
    },
    knowledgeContext: {
      packIds: [`routed_market_${seed}`, `routed_persona_${seed}`],
      marketTruth: ['Players need the payoff in the first three seconds.'],
      audienceTension: ['They want fast progress without grind.'],
      toneRules: ['Keep the promise concrete and punchy.'],
      forbiddenClaims: ['Do not promise real-money rewards.'],
      visualCues: ['Gold burst close-up'],
      approvedAngles: ['Reward reveal before explanation'],
      hookCandidates: ['POV: the chest finally explodes'],
    },
    review: {
      status: 'needs_review',
      notes: 'Ready for marketer QA.',
    },
    ...overrides,
  };
}

async function loadRouteModule() {
  const routeModule = await import('../src/routes/campaignDistribution.ts').catch(() => undefined);
  assert.ok(routeModule?.default, 'campaign distribution router should exist');
  return routeModule.default;
}

async function loadDbModule() {
  const dbModule = await import('../src/db/assetDb.ts').catch(() => undefined);
  assert.ok(dbModule?.default, 'asset db module should be importable');
  return dbModule.default as {
    prepare: (sql: string) => { get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] };
  };
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const router = await loadRouteModule();
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const header = req.headers['x-test-user'];
    if (typeof header === 'string') {
      req.user = {
        username: header,
        displayName: header,
      };
    }
    next();
  });
  app.use('/api/campaign-distribution', router);

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const nextServer = app.listen(0, '127.0.0.1', () => resolve(nextServer));
  });

  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

async function requestJson(baseUrl: string, input: {
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  username: string;
  body?: unknown;
}) {
  const response = await fetch(`${baseUrl}/api/campaign-distribution${input.path}`, {
    method: input.method,
    headers: {
      'content-type': 'application/json',
      'x-test-user': input.username,
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const json = await response.json().catch(() => undefined);
  return { response, json };
}

test('POST /packages creates a package with server-owned identity and separated asset readiness state', async () => {
  await withServer(async (baseUrl) => {
    const payload = buildPackagePayload('needs-asset', {
      assets: [
        {
          type: 'caption_only',
          status: 'missing',
        },
      ],
      assetReadiness: {
        state: 'needs_asset',
        reason: 'No publishable asset yet',
      },
      review: {
        status: 'draft',
        notes: 'Waiting for a render.',
      },
    });

    const { response, json } = await requestJson(baseUrl, {
      method: 'POST',
      path: '/packages',
      username: 'ops lead!',
      body: payload,
    });

    assert.equal(response.status, 201);
    assert.equal(json.ownerId, '_default');
    assert.equal(json.createdBy, '_default');
    assert.equal(json.updatedBy, '_default');
    assert.equal(json.assetReadiness.state, 'needs_asset');
    assert.equal(json.review.status, 'draft');
    assert.deepEqual(json.knowledgeContext.packIds, [
      'routed_market_needs-asset',
      'routed_persona_needs-asset',
    ]);
    assert.equal(json.title, 'Distribution package needs-asset');
    assert.equal(json.campaign.mission, 'Ship campaign needs-asset');
  });
});

test('GET list/read and PATCH remain scoped to the current owner', async () => {
  await withServer(async (baseUrl) => {
    const createA = await requestJson(baseUrl, {
      method: 'POST',
      path: '/packages',
      username: 'owner_a',
      body: buildPackagePayload('owner-a'),
    });
    const createB = await requestJson(baseUrl, {
      method: 'POST',
      path: '/packages',
      username: 'owner_b',
      body: buildPackagePayload('owner-b'),
    });

    assert.equal(createA.response.status, 201);
    assert.equal(createB.response.status, 201);

    const listA = await requestJson(baseUrl, {
      method: 'GET',
      path: '/packages',
      username: 'owner_a',
    });
    assert.equal(listA.response.status, 200);
    assert.equal(Array.isArray(listA.json.packages), true);
    assert.equal(listA.json.packages.length, 1);
    assert.equal(listA.json.packages[0].id, createA.json.id);

    const readOther = await requestJson(baseUrl, {
      method: 'GET',
      path: `/packages/${createA.json.id}`,
      username: 'owner_b',
    });
    assert.equal(readOther.response.status, 404);

    const patchOther = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/packages/${createA.json.id}`,
      username: 'owner_b',
      body: { title: 'Should not win' },
    });
    assert.equal(patchOther.response.status, 404);
  });
});

test('PATCH /packages/:id updates allowed fields, ignores client ownership, and refreshes audit fields', async () => {
  await withServer(async (baseUrl) => {
    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/packages',
      username: 'owner_patch',
      body: buildPackagePayload('patch-me'),
    });
    assert.equal(created.response.status, 201);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const patched = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/packages/${created.json.id}`,
      username: 'owner_patch',
      body: {
        title: 'Updated package title',
        ownerId: 'malicious-owner',
        createdBy: 'malicious-owner',
        updatedBy: 'malicious-owner',
        copy: {
          headline: 'Sharper headline',
          caption: 'Now with a publishable asset.',
          hashtags: ['#Updated'],
          language: 'en',
        },
        assetReadiness: {
          state: 'publishable',
          primaryAssetId: 'asset_patch-me',
          publishableAsset: {
            type: 'video',
            source: 'server_path',
            path: 'output/campaign/patch-me-v2.mp4',
          },
        },
        review: {
          status: 'approved',
          notes: 'Ship it.',
          updatedBy: 'ignored',
        },
      },
    });

    assert.equal(patched.response.status, 200);
    assert.equal(patched.json.title, 'Updated package title');
    assert.equal(patched.json.ownerId, 'owner_patch');
    assert.equal(patched.json.createdBy, 'owner_patch');
    assert.equal(patched.json.updatedBy, 'owner_patch');
    assert.equal(patched.json.review.status, 'approved');
    assert.equal(patched.json.review.updatedBy, 'owner_patch');
    assert.equal(patched.json.copy.caption, 'Now with a publishable asset.');
    assert.equal(patched.json.assetReadiness.publishableAsset.path, 'output/campaign/patch-me-v2.mp4');
    assert.notEqual(patched.json.updatedAt, created.json.updatedAt);
    assert.equal(patched.json.createdAt, created.json.createdAt);
  });
});

test('routes reject malformed package payloads with 400-level errors', async () => {
  await withServer(async (baseUrl) => {
    const invalidCreate = await requestJson(baseUrl, {
      method: 'POST',
      path: '/packages',
      username: 'validator',
      body: buildPackagePayload('bad-review', {
        review: {
          status: 'needs_asset',
        },
      }),
    });
    assert.equal(invalidCreate.response.status, 400);
    assert.match(String(invalidCreate.json?.error ?? ''), /review\.status/i);

    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/packages',
      username: 'validator',
      body: buildPackagePayload('valid'),
    });
    assert.equal(created.response.status, 201);

    const invalidPatch = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/packages/${created.json.id}`,
      username: 'validator',
      body: {
        assetReadiness: {
          state: 'approved',
        },
      },
    });
    assert.equal(invalidPatch.response.status, 400);
    assert.match(String(invalidPatch.json?.error ?? ''), /assetReadiness\.state/i);
  });
});

test('package persistence creates the dedicated SQLite table and indexes', async () => {
  await withServer(async (baseUrl) => {
    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/packages',
      username: 'db_owner',
      body: buildPackagePayload('db-check'),
    });
    assert.equal(created.response.status, 201);

    const db = await loadDbModule();
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'campaign_distribution_packages'")
      .get() as { name?: string } | undefined;
    const indexNames = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'campaign_distribution_packages' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    assert.equal(table?.name, 'campaign_distribution_packages');
    assert.deepEqual(
      indexNames.map((row) => row.name),
      [
        'idx_campaign_distribution_packages_owner_asset_readiness',
        'idx_campaign_distribution_packages_owner_review_status',
        'idx_campaign_distribution_packages_owner_updated_at',
      ],
    );
  });
});
