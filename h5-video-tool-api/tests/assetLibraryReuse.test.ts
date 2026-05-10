import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';

import {
  aspectRatioLabel,
  buildAssetReuseFields,
  resolveTeamAssetCategory,
} from '../src/services/assetReuseService.ts';

const previousApiDataDir = process.env.API_DATA_DIR;
const tempApiDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qas-asset-reuse-'));
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

function baseAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset_01',
    username: 'asset_owner',
    project_id: 'default',
    filename: 'hero-art.png',
    filepath: path.join(tempApiDataDir, 'hero-art.png'),
    mimetype: 'image/png',
    filesize: 1024,
    sha256: 'hash-asset-01',
    width: 1200,
    height: 1200,
    duration: null,
    fps: null,
    orientation: 'square',
    has_audio: 0,
    status: 'ready',
    ai_category: '角色',
    ai_description: null,
    team_category: null,
    folder_id: null,
    created_at: '2026-05-10T00:00:00.000Z',
    updated_at: '2026-05-10T00:00:00.000Z',
    ...overrides,
  };
}

test('asset reuse category fallback prefers manual, then AI, filename, mime, fallback', () => {
  assert.deepEqual(
    resolveTeamAssetCategory(baseAsset({ team_category: 'logo', ai_category: '角色' }) as never),
    { category: 'logo', source: 'manual' },
  );
  assert.deepEqual(
    resolveTeamAssetCategory(baseAsset({ team_category: null, ai_category: '场景' }) as never),
    { category: 'scene_image', source: 'ai_category' },
  );
  assert.deepEqual(
    resolveTeamAssetCategory(baseAsset({ ai_category: '未分类', filename: 'gold-glory-logo.png' }) as never),
    { category: 'logo', source: 'filename' },
  );
  assert.deepEqual(
    resolveTeamAssetCategory(baseAsset({ ai_category: '未分类', filename: 'raw-upload.bin', mimetype: 'video/mp4' }) as never),
    { category: 'video_clip', source: 'mime' },
  );
});

test('asset reuse preprocessing exposes dimensions, aspect ratio, thumbnail state, and video duration', () => {
  assert.equal(aspectRatioLabel(1080, 1920), '9:16');
  assert.equal(aspectRatioLabel(1200, 1500), '4:5');

  const fields = buildAssetReuseFields(
    baseAsset({
      filename: 'gameplay-battle.mp4',
      mimetype: 'video/mp4',
      width: 1080,
      height: 1920,
      duration: 7.4,
      orientation: 'portrait',
      has_audio: 1,
      ai_category: '未分类',
    }) as never,
    { thumbnailReady: true },
  );

  assert.equal(fields.team_category, 'video_clip');
  assert.equal(fields.preprocess.file_type, 'video');
  assert.equal(fields.preprocess.aspect_ratio, '9:16');
  assert.equal(fields.preprocess.thumbnail_ready, true);
  assert.equal(fields.preprocess.duration_sec, 7.4);
  assert.equal(fields.preprocess.has_audio, true);
});

async function loadRouteModule() {
  const routeModule = await import('../src/routes/assetLibrary.ts').catch(() => undefined);
  assert.ok(routeModule?.default, 'asset library router should exist');
  return routeModule.default;
}

async function loadDbModule() {
  const dbModule = await import('../src/db/assetDb.ts').catch(() => undefined);
  assert.ok(dbModule?.default, 'asset db module should be importable');
  return dbModule.default as {
    prepare: (sql: string) => {
      run: (params: Record<string, unknown>) => unknown;
      get: (params: Record<string, unknown>) => unknown;
    };
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
  app.use('/api/asset-library', router);

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
  method: 'PATCH';
  path: string;
  username: string;
  body?: unknown;
}) {
  const response = await fetch(`${baseUrl}/api/asset-library${input.path}`, {
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

test('PATCH /assets/:id/category validates ownership and persists manual category', async () => {
  const db = await loadDbModule();
  const now = '2026-05-10T00:00:00.000Z';
  const filepath = path.join(tempApiDataDir, 'logo.png');
  fs.writeFileSync(filepath, 'fake image bytes');

  db.prepare(`
    INSERT INTO assets (id, username, project_id, filename, filepath, mimetype, filesize, sha256,
      width, height, duration, fps, orientation, has_audio, status, ai_category, ai_description,
      team_category, folder_id, created_at, updated_at)
    VALUES (@id, @username, 'default', @filename, @filepath, @mimetype, @filesize, @sha256,
      @width, @height, NULL, NULL, @orientation, 0, 'ready', @ai_category, NULL,
      NULL, NULL, @now, @now)
  `).run({
    id: 'asset_route_logo',
    username: 'route_owner',
    filename: 'logo.png',
    filepath,
    mimetype: 'image/png',
    filesize: 16,
    sha256: 'route-hash',
    width: 800,
    height: 800,
    orientation: 'square',
    ai_category: '未分类',
    now,
  });

  await withServer(async (baseUrl) => {
    const invalid = await requestJson(baseUrl, {
      method: 'PATCH',
      path: '/assets/asset_route_logo/category',
      username: 'route_owner',
      body: { teamCategory: 'not_a_category' },
    });
    assert.equal(invalid.response.status, 400);

    const forbidden = await requestJson(baseUrl, {
      method: 'PATCH',
      path: '/assets/asset_route_logo/category',
      username: 'other_user',
      body: { teamCategory: 'logo' },
    });
    assert.equal(forbidden.response.status, 403);

    const updated = await requestJson(baseUrl, {
      method: 'PATCH',
      path: '/assets/asset_route_logo/category',
      username: 'route_owner',
      body: { teamCategory: 'logo' },
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.json.asset.team_category, 'logo');
    assert.equal(updated.json.asset.team_category_source, 'manual');
    assert.equal(updated.json.asset.preprocess.aspect_ratio, '1:1');
  });

  const row = db.prepare(`SELECT team_category FROM assets WHERE id = @id`)
    .get({ id: 'asset_route_logo' }) as { team_category: string };
  assert.equal(row.team_category, 'logo');
});
