import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const previousApiDataDir = process.env.API_DATA_DIR;
const tempApiDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-campaign-output-plan-'));
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

function buildPlanPayload(seed: string, overrides: Record<string, unknown> = {}) {
  return {
    campaignId: `campaign_${seed}`,
    gameId: 'gold_and_glory',
    ownerId: 'client-owner-ignored',
    createdBy: 'client-created-ignored',
    updatedBy: 'client-updated-ignored',
    mission: `Produce campaign outputs for ${seed}`,
    briefId: `brief_${seed}`,
    status: 'needs_confirmation',
    items: [
      {
        id: `item_${seed}_video`,
        type: 'short_video',
        quantity: 2,
        platform: 'tiktok',
        title: 'Short video pack',
        contentBrief: 'Show the hero skill payoff.',
        requiredSourceAssetIds: [`src_${seed}_gameplay`, `src_${seed}_logo`],
        productionCapability: 'supported_with_source_assets',
        status: 'blocked',
        gobsCanProduce: false,
        outputAssetIds: [],
        distributionPackageIds: [],
        producedOutputs: [],
        humanAction: {
          type: 'provide_source_asset',
          label: 'Provide source assets',
          detail: 'Gameplay recording and logo are required.',
        },
      },
    ],
    sourceAssetRequirements: [
      {
        id: `src_${seed}_gameplay`,
        assetType: 'gameplay_recording',
        label: 'Gameplay recording',
        neededForProductionItemIds: [`item_${seed}_video`],
        status: 'missing',
        matchedAssetIds: [],
        guidance: 'Provide real gameplay footage.',
        rightsNote: 'Use approved game-owned material.',
      },
      {
        id: `src_${seed}_logo`,
        assetType: 'game_logo',
        label: 'Game logo',
        neededForProductionItemIds: [`item_${seed}_video`],
        status: 'available',
        matchedAssetIds: [`asset_${seed}_logo`],
        guidance: 'Use the approved game logo.',
      },
    ],
    capabilityGaps: [
      {
        id: `gap_${seed}_gameplay`,
        gapType: 'source_asset_missing',
        title: 'Gameplay recording is missing',
        affectedProductionItemIds: [`item_${seed}_video`],
        currentWorkaround: 'Upload or select gameplay footage.',
        priorityHint: 'high',
      },
    ],
    ...overrides,
  };
}

async function loadRouteModule() {
  const routeModule = await import('../src/routes/campaignOutputPlan.ts').catch(() => undefined);
  assert.ok(routeModule?.default, 'campaign output plan router should exist');
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
  app.use('/api/campaign-output', router);

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
        if (error) reject(error);
        else resolve();
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
  const response = await fetch(`${baseUrl}/api/campaign-output${input.path}`, {
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

test('POST /plans creates a plan with server-owned identity and round-trips capability gaps', async () => {
  await withServer(async (baseUrl) => {
    const { response, json } = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'output_owner',
      body: buildPlanPayload('create'),
    });

    assert.equal(response.status, 201);
    assert.equal(json.ownerId, 'output_owner');
    assert.equal(json.createdBy, 'output_owner');
    assert.equal(json.updatedBy, 'output_owner');
    assert.equal(json.status, 'needs_confirmation');
    assert.equal(json.capabilityGaps[0].gapType, 'source_asset_missing');
    assert.equal(json.sourceAssetRequirements[1].matchedAssetIds[0], 'asset_create_logo');
  });
});

test('GET list/read and PATCH remain scoped to current owner', async () => {
  await withServer(async (baseUrl) => {
    const createA = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'owner_a',
      body: buildPlanPayload('owner_a'),
    });
    const createB = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'owner_b',
      body: buildPlanPayload('owner_b'),
    });

    assert.equal(createA.response.status, 201);
    assert.equal(createB.response.status, 201);

    const listA = await requestJson(baseUrl, {
      method: 'GET',
      path: '/plans',
      username: 'owner_a',
    });
    assert.equal(listA.response.status, 200);
    assert.equal(listA.json.items.length, 1);
    assert.equal(listA.json.items[0].id, createA.json.id);

    const readOther = await requestJson(baseUrl, {
      method: 'GET',
      path: `/plans/${createA.json.id}`,
      username: 'owner_b',
    });
    assert.equal(readOther.response.status, 404);

    const patchOther = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/plans/${createA.json.id}`,
      username: 'owner_b',
      body: { status: 'confirmed' },
    });
    assert.equal(patchOther.response.status, 404);
  });
});

test('PATCH /plans/:id updates allowed fields and preserves audit fields', async () => {
  await withServer(async (baseUrl) => {
    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'owner_patch',
      body: buildPlanPayload('patch'),
    });
    assert.equal(created.response.status, 201);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const patched = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/plans/${created.json.id}`,
      username: 'owner_patch',
      body: {
        ownerId: 'malicious',
        createdBy: 'malicious',
        updatedBy: 'malicious',
        status: 'confirmed',
        items: [
          {
            ...created.json.items[0],
            status: 'ready_to_produce',
            gobsCanProduce: true,
          },
        ],
        sourceAssetRequirements: [
          {
            ...created.json.sourceAssetRequirements[0],
            status: 'available',
            matchedAssetIds: ['asset_patch_gameplay'],
          },
          created.json.sourceAssetRequirements[1],
        ],
        capabilityGaps: [],
      },
    });

    assert.equal(patched.response.status, 200);
    assert.equal(patched.json.ownerId, 'owner_patch');
    assert.equal(patched.json.createdBy, 'owner_patch');
    assert.equal(patched.json.updatedBy, 'owner_patch');
    assert.equal(patched.json.status, 'confirmed');
    assert.equal(patched.json.items[0].status, 'ready_to_produce');
    assert.equal(patched.json.capabilityGaps.length, 0);
    assert.notEqual(patched.json.updatedAt, created.json.updatedAt);
    assert.equal(patched.json.createdAt, created.json.createdAt);
  });
});

test('POST and PATCH /plans round-trip produced output drafts', async () => {
  await withServer(async (baseUrl) => {
    const payload = buildPlanPayload('produced', {
      items: [
        {
          ...buildPlanPayload('produced').items[0],
          id: 'item_produced_caption',
          type: 'caption_set',
          platform: 'cross_platform',
          title: 'Caption set',
          status: 'produced',
          gobsCanProduce: true,
          requiredSourceAssetIds: [],
          outputAssetIds: ['copy_item_produced_caption_1'],
          producedOutputs: [
            {
              id: 'copy_item_produced_caption_1',
              kind: 'caption',
              title: 'Caption 1',
              body: 'One run, one mistake, one comeback.',
              variants: ['One run, one mistake, one comeback.'],
              platform: 'cross_platform',
              createdAt: '2026-05-08T00:00:00.000Z',
            },
          ],
        },
      ],
      sourceAssetRequirements: [],
      capabilityGaps: [],
    });

    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'produced_owner',
      body: payload,
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.json.items[0].producedOutputs[0].kind, 'caption');
    assert.equal(created.json.items[0].producedOutputs[0].body, 'One run, one mistake, one comeback.');

    const patched = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/plans/${created.json.id}`,
      username: 'produced_owner',
      body: {
        items: [
          {
            ...created.json.items[0],
            producedOutputs: [
              {
                ...created.json.items[0].producedOutputs[0],
                body: 'One squad, one comeback, one story worth sharing.',
              },
            ],
          },
        ],
      },
    });

    assert.equal(patched.response.status, 200);
    assert.equal(patched.json.items[0].producedOutputs[0].body, 'One squad, one comeback, one story worth sharing.');
  });
});

test('PATCH /plans persists Studio video outputAssetIds and distributionPackageIds', async () => {
  await withServer(async (baseUrl) => {
    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'studio_writeback_owner',
      body: buildPlanPayload('studio_writeback', {
        status: 'producing',
        sourceAssetRequirements: [],
        capabilityGaps: [],
        items: [
          {
            ...buildPlanPayload('studio_writeback').items[0],
            id: 'item_studio_video',
            requiredSourceAssetIds: [],
            productionCapability: 'supported',
            status: 'producing',
            gobsCanProduce: true,
            humanAction: undefined,
          },
        ],
      }),
    });

    assert.equal(created.response.status, 201);

    const patched = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/plans/${created.json.id}`,
      username: 'studio_writeback_owner',
      body: {
        status: 'ready_for_distribution',
        items: [
          {
            ...created.json.items[0],
            status: 'produced',
            outputAssetIds: ['dreamina_task_abc_123'],
            distributionPackageIds: ['pkg_reward'],
          },
        ],
      },
    });

    assert.equal(patched.response.status, 200);
    assert.equal(patched.json.status, 'ready_for_distribution');
    assert.deepEqual(patched.json.items[0].outputAssetIds, ['dreamina_task_abc_123']);
    assert.deepEqual(patched.json.items[0].distributionPackageIds, ['pkg_reward']);
    assert.equal(patched.json.items[0].status, 'produced');
  });
});

test('routes reject malformed output plan payloads with 400-level errors', async () => {
  await withServer(async (baseUrl) => {
    const invalidCreate = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'validator',
      body: buildPlanPayload('bad_status', {
        status: 'approved',
      }),
    });
    assert.equal(invalidCreate.response.status, 400);
    assert.match(String(invalidCreate.json?.error ?? ''), /status/i);

    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'validator',
      body: buildPlanPayload('valid'),
    });
    assert.equal(created.response.status, 201);

    const invalidPatch = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/plans/${created.json.id}`,
      username: 'validator',
      body: {
        items: [
          {
            ...created.json.items[0],
            type: 'unknown_asset',
          },
        ],
      },
    });
    assert.equal(invalidPatch.response.status, 400);
    assert.match(String(invalidPatch.json?.error ?? ''), /items\[0\]\.type/i);

    const invalidProducedOutput = await requestJson(baseUrl, {
      method: 'PATCH',
      path: `/plans/${created.json.id}`,
      username: 'validator',
      body: {
        items: [
          {
            ...created.json.items[0],
            producedOutputs: [
              {
                id: 'copy_bad',
                kind: 'video',
                title: 'Bad output',
                body: 'This should not validate.',
                variants: ['This should not validate.'],
                platform: 'tiktok',
                createdAt: '2026-05-08T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    });
    assert.equal(invalidProducedOutput.response.status, 400);
    assert.match(String(invalidProducedOutput.json?.error ?? ''), /producedOutputs\[0\]\.kind/i);
  });
});

test('output plan persistence creates the dedicated SQLite table and indexes', async () => {
  await withServer(async (baseUrl) => {
    const created = await requestJson(baseUrl, {
      method: 'POST',
      path: '/plans',
      username: 'db_owner',
      body: buildPlanPayload('db'),
    });
    assert.equal(created.response.status, 201);

    const db = await loadDbModule();
    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'campaign_output_plans'")
      .get() as { name?: string } | undefined;
    const row = db
      .prepare('SELECT payload_json FROM campaign_output_plans WHERE id = ?')
      .get(created.json.id) as { payload_json?: string } | undefined;
    const indexNames = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'campaign_output_plans' AND name NOT LIKE 'sqlite_autoindex_%' ORDER BY name",
      )
      .all() as Array<{ name: string }>;

    assert.equal(table?.name, 'campaign_output_plans');
    assert.match(row?.payload_json ?? '', /Gameplay recording is missing/);
    assert.deepEqual(
      indexNames.map((item) => item.name),
      [
        'idx_campaign_output_plans_owner_game',
        'idx_campaign_output_plans_owner_status',
        'idx_campaign_output_plans_owner_updated_at',
      ],
    );
  });
});
