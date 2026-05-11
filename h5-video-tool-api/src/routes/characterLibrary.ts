/**
 * Character Library API
 * POST   /api/character-library/save
 * GET    /api/character-library/list
 * GET    /api/character-library/:id
 * DELETE /api/character-library/:id
 * POST   /api/character-library/:id/share
 * GET    /api/character-library/share/:token
 * POST   /api/character-library/import
 */
import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { resolvePath } from '../infra/storage/resolver.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import {
  syncCharacterLibraryAssets,
  type CharacterLibraryAssetBinding,
} from '../services/characterLibraryAssetSync.js';

export const characterLibraryRouter = Router();

const SHARE_DIR = resolvePath('character-library', '_shares');

interface LibraryCharacterState {
  id: string;
  label: string;
  imageDataUrl?: string;
  statePrompt?: string;
  notes?: string;
}

interface LibraryCharacterLookNode {
  id: string;
  parentId: string | null;
  label: string;
  imageDataUrl?: string;
  note?: string;
}

interface LibraryCharacter {
  id: string;
  ownerId: string;
  name: string;
  isProtagonist?: boolean;
  description?: string;
  baseImageDataUrl?: string;
  baseConfirmed?: boolean;
  states: LibraryCharacterState[];
  lookTree?: LibraryCharacterLookNode[];
  activeLookId?: string;
  sourceProject?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  assetBindings?: Record<string, CharacterLibraryAssetBinding>;
}

function getLibraryDir(username: string): string {
  return resolvePath('character-library', sanitizeUsername(username));
}

function charFilePath(username: string, id: string): string {
  return path.join(getLibraryDir(username), `${id}.json`);
}

async function ensureDirs(username?: string) {
  await fs.mkdir(SHARE_DIR, { recursive: true });
  if (username) {
    await fs.mkdir(getLibraryDir(username), { recursive: true });
  }
}

function requireUser(req: Request, res: Response): string | null {
  const rawUsername = req.user?.username?.trim();
  if (!rawUsername) {
    res.status(401).json({ error: '未鉴权' });
    return null;
  }
  return sanitizeUsername(rawUsername);
}

async function readCharacter(username: string, id: string): Promise<LibraryCharacter | null> {
  try {
    const raw = await fs.readFile(charFilePath(username, id), 'utf-8');
    return JSON.parse(raw) as LibraryCharacter;
  } catch {
    return null;
  }
}

characterLibraryRouter.post('/save', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const body = req.body as Partial<LibraryCharacter> & { id?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: '请提供角色名称' });
    return;
  }

  await ensureDirs(username);

  const now = new Date().toISOString();
  const id = body.id?.trim() && /^[\w-]+$/.test(body.id.trim())
    ? body.id.trim()
    : `char_${Date.now()}_${randomBytes(4).toString('hex')}`;

  const existing = await readCharacter(username, id);
  const createdAt = existing?.createdAt ?? now;

  const char: LibraryCharacter = {
    id,
    ownerId: username,
    name: body.name.trim(),
    isProtagonist: body.isProtagonist,
    description: body.description?.trim(),
    baseImageDataUrl: body.baseImageDataUrl,
    baseConfirmed: body.baseConfirmed,
    states: Array.isArray(body.states) ? body.states : [],
    lookTree: Array.isArray(body.lookTree) ? body.lookTree : undefined,
    activeLookId: body.activeLookId?.trim() || undefined,
    sourceProject: body.sourceProject?.trim(),
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdAt,
    updatedAt: now,
  };

  const syncResult = syncCharacterLibraryAssets({
    username,
    characterId: id,
    characterName: char.name,
    sourceProject: char.sourceProject,
    baseImageDataUrl: char.baseImageDataUrl,
    states: char.states,
    lookTree: char.lookTree,
    existingBindings: existing?.assetBindings ?? null,
  });
  char.assetBindings = syncResult.bindings;

  await fs.writeFile(charFilePath(username, id), JSON.stringify(char, null, 2), 'utf-8');
  res.json({ id, updatedAt: now, assetCount: syncResult.assetCount });
});

characterLibraryRouter.get('/list', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  await ensureDirs(username);

  const files = (await fs.readdir(getLibraryDir(username)))
    .filter((file) => file.endsWith('.json') && !file.startsWith('_'));

  const characters: Array<
    Pick<LibraryCharacter, 'id' | 'name' | 'isProtagonist' | 'baseImageDataUrl' | 'sourceProject' | 'tags' | 'updatedAt' | 'createdAt'> & {
      stateCount: number;
    }
  > = [];

  for (const fileName of files) {
    try {
      const raw = await fs.readFile(path.join(getLibraryDir(username), fileName), 'utf-8');
      const char = JSON.parse(raw) as LibraryCharacter;
      characters.push({
        id: char.id,
        name: char.name,
        isProtagonist: char.isProtagonist,
        baseImageDataUrl: char.baseImageDataUrl,
        sourceProject: char.sourceProject,
        tags: char.tags,
        updatedAt: char.updatedAt,
        createdAt: char.createdAt,
        stateCount: char.states?.length ?? 0,
      });
    } catch {
      // ignore broken files
    }
  }

  characters.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({ characters });
});

characterLibraryRouter.get('/:id', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id } = req.params;
  if (!/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效 id' });
    return;
  }

  const char = await readCharacter(username, id);
  if (!char) {
    res.status(404).json({ error: '角色不存在' });
    return;
  }

  res.json(char);
});

characterLibraryRouter.delete('/:id', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id } = req.params;
  if (!/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效 id' });
    return;
  }

  try {
    await fs.unlink(charFilePath(username, id));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: '角色不存在' });
  }
});

characterLibraryRouter.post('/:id/share', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { id } = req.params;
  if (!/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效 id' });
    return;
  }

  await ensureDirs(username);
  const char = await readCharacter(username, id);
  if (!char) {
    res.status(404).json({ error: '角色不存在' });
    return;
  }

  const token = randomBytes(16).toString('hex');
  const expireMs = 7 * 24 * 60 * 60 * 1000;
  const sharePayload = {
    token,
    ownerId: username,
    charId: id,
    char,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expireMs).toISOString(),
  };

  await fs.writeFile(path.join(SHARE_DIR, `${token}.json`), JSON.stringify(sharePayload, null, 2), 'utf-8');

  const baseUrl = process.env.API_PUBLIC_BASE_URL || process.env.API_SELF_BASE_URL || '';
  res.json({
    token,
    shareUrl: `${baseUrl}/api/character-library/share/${token}`,
    expiresAt: sharePayload.expiresAt,
  });
});

characterLibraryRouter.get('/share/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!/^[0-9a-f]{32}$/.test(token)) {
    res.status(400).json({ error: '无效 token' });
    return;
  }

  try {
    const payload = JSON.parse(await fs.readFile(path.join(SHARE_DIR, `${token}.json`), 'utf-8')) as {
      expiresAt: string;
      char: LibraryCharacter;
    };
    if (new Date(payload.expiresAt) < new Date()) {
      res.status(410).json({ error: '分享链接已过期（7天有效）' });
      return;
    }
    res.json({ char: payload.char, expiresAt: payload.expiresAt });
  } catch {
    res.status(404).json({ error: '分享不存在或已过期' });
  }
});

characterLibraryRouter.post('/import', async (req: Request, res: Response) => {
  const username = requireUser(req, res);
  if (!username) return;

  const { token } = req.body as { token?: string };
  if (!token || !/^[0-9a-f]{32}$/.test(token)) {
    res.status(400).json({ error: '无效 token' });
    return;
  }

  await ensureDirs(username);

  try {
    const payload = JSON.parse(await fs.readFile(path.join(SHARE_DIR, `${token}.json`), 'utf-8')) as {
      expiresAt: string;
      char: LibraryCharacter;
    };

    if (new Date(payload.expiresAt) < new Date()) {
      res.status(410).json({ error: '分享链接已过期' });
      return;
    }

    const now = new Date().toISOString();
    const newId = `char_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const imported: LibraryCharacter = {
      ...payload.char,
      id: newId,
      ownerId: username,
      createdAt: now,
      updatedAt: now,
    };

    const syncResult = syncCharacterLibraryAssets({
      username,
      characterId: imported.id,
      characterName: imported.name,
      sourceProject: imported.sourceProject,
      baseImageDataUrl: imported.baseImageDataUrl,
      states: imported.states,
      lookTree: imported.lookTree,
      existingBindings: null,
    });
    imported.assetBindings = syncResult.bindings;

    await fs.writeFile(charFilePath(username, newId), JSON.stringify(imported, null, 2), 'utf-8');
    res.json({ id: newId, name: imported.name, assetCount: syncResult.assetCount });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : '导入失败' });
  }
});

export default characterLibraryRouter;
