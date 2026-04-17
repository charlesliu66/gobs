/**
 * 形象库 API — 单用户，支持分享链接
 * POST   /api/character-library/save         保存/更新角色到形象库
 * GET    /api/character-library/list          列出所有角色
 * GET    /api/character-library/:id           获取单个角色详情
 * DELETE /api/character-library/:id           删除角色
 * POST   /api/character-library/:id/share     生成分享 token
 * GET    /api/character-library/share/:token  通过分享 token 读取角色（只读）
 * POST   /api/character-library/import        从分享 token 导入到本地形象库
 */
import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { resolvePath } from '../infra/storage/resolver.js';

export const characterLibraryRouter = Router();

const LIB_DIR = resolvePath('character-library');
const SHARE_DIR = resolvePath('character-library', '_shares');

async function ensureDirs() {
  await fs.mkdir(LIB_DIR, { recursive: true });
  await fs.mkdir(SHARE_DIR, { recursive: true });
}

// ── 数据结构 ─────────────────────────────────────────────────────────────────

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
  name: string;
  isProtagonist?: boolean;
  description?: string;
  /** 基础形象 */
  baseImageDataUrl?: string;
  baseConfirmed?: boolean;
  /** 各状态 */
  states: LibraryCharacterState[];
  /** 形象演化树 */
  lookTree?: LibraryCharacterLookNode[];
  /** 当前定稿形象 id */
  activeLookId?: string;
  /** 来源项目名（可选） */
  sourceProject?: string;
  createdAt: string;
  updatedAt: string;
  /** 标签，用于搜索 */
  tags?: string[];
}

function charFilePath(id: string): string {
  return path.join(LIB_DIR, `${id}.json`);
}

// ── 保存/更新角色 ─────────────────────────────────────────────────────────────

characterLibraryRouter.post('/save', async (req: Request, res: Response) => {
  const body = req.body as Partial<LibraryCharacter> & { id?: string };
  if (!body.name?.trim()) {
    res.status(400).json({ error: '请提供角色名称' });
    return;
  }
  await ensureDirs();

  const now = new Date().toISOString();
  const id = body.id?.trim() && /^[\w-]+$/.test(body.id.trim())
    ? body.id.trim()
    : `char_${Date.now()}_${randomBytes(4).toString('hex')}`;

  // 若已存在，保留 createdAt
  let createdAt = now;
  try {
    const existing = JSON.parse(await fs.readFile(charFilePath(id), 'utf-8')) as LibraryCharacter;
    createdAt = existing.createdAt;
  } catch { /* new */ }

  const char: LibraryCharacter = {
    id,
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

  await fs.writeFile(charFilePath(id), JSON.stringify(char, null, 2), 'utf-8');
  res.json({ id, updatedAt: now });
});

// ── 列出所有角色 ──────────────────────────────────────────────────────────────

characterLibraryRouter.get('/list', async (_req: Request, res: Response) => {
  await ensureDirs();
  const files = (await fs.readdir(LIB_DIR))
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'));

  const list: Array<Pick<LibraryCharacter, 'id' | 'name' | 'isProtagonist' | 'baseImageDataUrl' | 'sourceProject' | 'tags' | 'updatedAt' | 'createdAt'> & { stateCount: number }> = [];

  for (const f of files) {
    try {
      const char = JSON.parse(await fs.readFile(path.join(LIB_DIR, f), 'utf-8')) as LibraryCharacter;
      list.push({
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
    } catch { /* skip */ }
  }

  list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({ characters: list });
});

// ── 获取单个角色 ──────────────────────────────────────────────────────────────

characterLibraryRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[\w-]+$/.test(id)) { res.status(400).json({ error: '无效 id' }); return; }
  try {
    const char = JSON.parse(await fs.readFile(charFilePath(id), 'utf-8'));
    res.json(char);
  } catch {
    res.status(404).json({ error: '角色不存在' });
  }
});

// ── 删除角色 ─────────────────────────────────────────────────────────────────

characterLibraryRouter.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[\w-]+$/.test(id)) { res.status(400).json({ error: '无效 id' }); return; }
  try {
    await fs.unlink(charFilePath(id));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: '角色不存在' });
  }
});

// ── 生成分享 token ────────────────────────────────────────────────────────────

characterLibraryRouter.post('/:id/share', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!/^[\w-]+$/.test(id)) { res.status(400).json({ error: '无效 id' }); return; }
  await ensureDirs();

  let char: LibraryCharacter;
  try {
    char = JSON.parse(await fs.readFile(charFilePath(id), 'utf-8'));
  } catch {
    res.status(404).json({ error: '角色不存在' }); return;
  }

  const token = randomBytes(16).toString('hex');
  const expireMs = 7 * 24 * 60 * 60 * 1000; // 7天
  const sharePayload = { token, charId: id, char, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + expireMs).toISOString() };
  await fs.writeFile(path.join(SHARE_DIR, `${token}.json`), JSON.stringify(sharePayload, null, 2), 'utf-8');

  const baseUrl = process.env.API_PUBLIC_BASE_URL || process.env.API_SELF_BASE_URL || '';
  res.json({ token, shareUrl: `${baseUrl}/api/character-library/share/${token}`, expiresAt: sharePayload.expiresAt });
});

// ── 通过分享 token 读取（只读） ────────────────────────────────────────────────

characterLibraryRouter.get('/share/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!/^[0-9a-f]{32}$/.test(token)) { res.status(400).json({ error: '无效 token' }); return; }
  try {
    const payload = JSON.parse(await fs.readFile(path.join(SHARE_DIR, `${token}.json`), 'utf-8')) as { expiresAt: string; char: LibraryCharacter };
    if (new Date(payload.expiresAt) < new Date()) {
      res.status(410).json({ error: '分享链接已过期（7天有效）' }); return;
    }
    res.json({ char: payload.char, expiresAt: payload.expiresAt });
  } catch {
    res.status(404).json({ error: '分享不存在或已过期' });
  }
});

// ── 通过分享 token 导入到本地形象库 ──────────────────────────────────────────

characterLibraryRouter.post('/import', async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token || !/^[0-9a-f]{32}$/.test(token)) { res.status(400).json({ error: '无效 token' }); return; }
  await ensureDirs();
  try {
    const payload = JSON.parse(await fs.readFile(path.join(SHARE_DIR, `${token}.json`), 'utf-8')) as { expiresAt: string; char: LibraryCharacter };
    if (new Date(payload.expiresAt) < new Date()) {
      res.status(410).json({ error: '分享链接已过期' }); return;
    }
    const now = new Date().toISOString();
    const newId = `char_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const imported: LibraryCharacter = { ...payload.char, id: newId, createdAt: now, updatedAt: now };
    await fs.writeFile(charFilePath(newId), JSON.stringify(imported, null, 2), 'utf-8');
    res.json({ id: newId, name: imported.name });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : '导入失败' });
  }
});

export default characterLibraryRouter;
