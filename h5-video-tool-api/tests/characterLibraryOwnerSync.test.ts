import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

const previousApiDataDir = process.env.API_DATA_DIR;
const tempApiDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-character-library-'));
process.env.API_DATA_DIR = tempApiDataDir;

const ONE_BY_ONE_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1EAAAAASUVORK5CYII=';

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

async function loadRouters() {
  const [characterModule, assetModule] = await Promise.all([
    import('../src/routes/characterLibrary.ts').catch(() => undefined),
    import('../src/routes/assetLibrary.ts').catch(() => undefined),
  ]);
  assert.ok(characterModule?.default, 'character library router should exist');
  assert.ok(assetModule?.default, 'asset library router should exist');
  return {
    characterRouter: characterModule.default,
    assetRouter: assetModule.default,
  };
}

async function loadDbModule() {
  const dbModule = await import('../src/db/assetDb.ts').catch(() => undefined);
  assert.ok(dbModule?.default, 'asset db module should be importable');
  return dbModule.default as {
    prepare: (sql: string) => {
      all: (params?: Record<string, unknown>) => unknown[];
      get: (params?: Record<string, unknown>) => unknown;
    };
  };
}

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const { characterRouter, assetRouter } = await loadRouters();
  const app = express();
  app.use(express.json({ limit: '10mb' }));
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
  app.use('/api/character-library', characterRouter);
  app.use('/api/asset-library', assetRouter);

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

async function requestJson<T>(baseUrl: string, input: {
  method: 'GET' | 'POST';
  path: string;
  username: string;
  body?: unknown;
}): Promise<{ response: Response; json: T }> {
  const response = await fetch(`${baseUrl}${input.path}`, {
    method: input.method,
    headers: {
      'content-type': 'application/json',
      'x-test-user': input.username,
    },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const json = await response.json().catch(() => undefined);
  return { response, json: json as T };
}

function findCharacterJsonPath(characterId: string): string | undefined {
  const queue = [tempApiDataDir];
  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const nextPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(nextPath);
        continue;
      }
      if (entry.isFile() && entry.name === `${characterId}.json`) {
        return nextPath;
      }
    }
  }
  return undefined;
}

test('character library save stays owner-scoped and syncs assets into the same account library', async () => {
  const db = await loadDbModule();

  await withServer(async (baseUrl) => {
    const save = await requestJson<{ id: string; updatedAt: string; assetCount: number }>(baseUrl, {
      method: 'POST',
      path: '/api/character-library/save',
      username: 'owner_a',
      body: {
        name: '浪人甲',
        baseImageDataUrl: ONE_BY_ONE_PNG,
        baseConfirmed: true,
        states: [
          {
            id: 'state-battle',
            label: '战斗态',
            imageDataUrl: ONE_BY_ONE_PNG,
          },
        ],
        lookTree: [
          {
            id: 'look-root',
            parentId: null,
            label: '默认形象',
            imageDataUrl: ONE_BY_ONE_PNG,
          },
        ],
        activeLookId: 'look-root',
      },
    });

    assert.equal(save.response.status, 200);
    assert.ok(save.json.id);
    assert.equal(save.json.assetCount, 1);

    const characterPath = findCharacterJsonPath(save.json.id);
    assert.ok(characterPath, 'character json should be written to disk');
    assert.match(characterPath!, /character-library/);
    assert.match(characterPath!, /owner_a/);

    const savedCharacter = JSON.parse(fs.readFileSync(characterPath!, 'utf-8')) as {
      ownerId: string;
      assetBindings?: Record<string, { assetId: string }>;
    };
    assert.equal(savedCharacter.ownerId, 'owner_a');
    assert.ok(savedCharacter.assetBindings?.base?.assetId);
    assert.ok(savedCharacter.assetBindings?.['state:state-battle']?.assetId);
    assert.ok(savedCharacter.assetBindings?.['look:look-root']?.assetId);

    const ownerList = await requestJson<{ characters: Array<{ id: string }> }>(baseUrl, {
      method: 'GET',
      path: '/api/character-library/list',
      username: 'owner_a',
    });
    assert.equal(ownerList.response.status, 200);
    assert.equal(ownerList.json.characters.length, 1);
    assert.equal(ownerList.json.characters[0]?.id, save.json.id);

    const otherList = await requestJson<{ characters: Array<{ id: string }> }>(baseUrl, {
      method: 'GET',
      path: '/api/character-library/list',
      username: 'owner_b',
    });
    assert.equal(otherList.response.status, 200);
    assert.equal(otherList.json.characters.length, 0);

    const otherGet = await requestJson<{ error: string }>(baseUrl, {
      method: 'GET',
      path: `/api/character-library/${save.json.id}`,
      username: 'owner_b',
    });
    assert.equal(otherGet.response.status, 404);

    const ownerAssets = await requestJson<{ assets: Array<{ id: string; team_category?: string }>; total: number }>(
      baseUrl,
      {
        method: 'GET',
        path: '/api/asset-library/assets?pageSize=20',
        username: 'owner_a',
      },
    );
    assert.equal(ownerAssets.response.status, 200);
    assert.equal(ownerAssets.json.total, 1);
    assert.equal(ownerAssets.json.assets[0]?.team_category, 'character_image');

    const otherAssets = await requestJson<{ assets: unknown[]; total: number }>(baseUrl, {
      method: 'GET',
      path: '/api/asset-library/assets?pageSize=20',
      username: 'owner_b',
    });
    assert.equal(otherAssets.response.status, 200);
    assert.equal(otherAssets.json.total, 0);
  });

  const rows = db.prepare(`
    SELECT username, team_category, project_id
    FROM assets
    WHERE username = @username
  `).all({ username: 'owner_a' }) as Array<{
    username: string;
    team_category: string;
    project_id: string;
  }>;

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.username, 'owner_a');
  assert.equal(rows[0]?.team_category, 'character_image');
  assert.equal(rows[0]?.project_id, 'character-library');
});
