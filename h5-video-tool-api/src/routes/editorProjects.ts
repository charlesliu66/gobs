import { Router, type Request, type Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { getApiDataDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

const router = Router();

type EditorProjectDoc = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  aspectRatio: string;
  project: unknown;
  assets: Record<string, unknown>;
};

function getUserDir(req: Request): string {
  const username = sanitizeUsername(req.user?.username);
  return path.join(getApiDataDir(), 'editor-projects', username);
}

function isSafeId(id: string): boolean {
  return /^[\w-]{1,64}$/.test(id);
}

function makeDefaultName(): string {
  const d = new Date();
  return `剪辑项目-${d.getMonth() + 1}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}

router.post('/projects', async (req: Request, res: Response) => {
  const body = req.body as Partial<EditorProjectDoc> & { id?: string };
  const id = typeof body.id === 'string' && isSafeId(body.id) ? body.id : `ep_${nanoid(10)}`;
  const now = new Date().toISOString();
  const dir = getUserDir(req);
  const file = path.join(dir, `${id}.json`);

  let createdAt = now;
  try {
    const old = JSON.parse(await fs.readFile(file, 'utf-8')) as Partial<EditorProjectDoc>;
    if (old.createdAt) createdAt = old.createdAt;
  } catch {
    // new project
  }

  const doc: EditorProjectDoc = {
    id,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : makeDefaultName(),
    createdAt,
    updatedAt: now,
    aspectRatio: typeof body.aspectRatio === 'string' ? body.aspectRatio : '9:16',
    project: body.project ?? {},
    assets: (body.assets && typeof body.assets === 'object' ? body.assets : {}) as Record<string, unknown>,
  };

  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file, JSON.stringify(doc, null, 2), 'utf-8');
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[editor/projects save]', err);
    res.status(500).json({ success: false, error: '保存剪辑项目失败' });
  }
});

router.get('/projects', async (req: Request, res: Response) => {
  const dir = getUserDir(req);
  try {
    await fs.mkdir(dir, { recursive: true });
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json'));
    const list: Array<Pick<EditorProjectDoc, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'aspectRatio'>> = [];
    for (const file of files) {
      try {
        const raw = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8')) as Partial<EditorProjectDoc>;
        list.push({
          id: String(raw.id ?? file.replace(/\.json$/, '')),
          name: String(raw.name ?? '未命名剪辑项目'),
          createdAt: String(raw.createdAt ?? ''),
          updatedAt: String(raw.updatedAt ?? ''),
          aspectRatio: String(raw.aspectRatio ?? '9:16'),
        });
      } catch {
        // ignore broken file
      }
    }
    list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    res.json({ success: true, projects: list });
  } catch (err) {
    console.error('[editor/projects list]', err);
    res.status(500).json({ success: false, error: '读取剪辑项目失败' });
  }
});

router.get('/projects/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!isSafeId(id)) {
    res.status(400).json({ success: false, error: '无效的项目 id' });
    return;
  }
  try {
    const raw = await fs.readFile(path.join(getUserDir(req), `${id}.json`), 'utf-8');
    res.json({ success: true, data: JSON.parse(raw) as EditorProjectDoc });
  } catch {
    res.status(404).json({ success: false, error: '剪辑项目不存在' });
  }
});

router.delete('/projects/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!isSafeId(id)) {
    res.status(400).json({ success: false, error: '无效的项目 id' });
    return;
  }
  try {
    await fs.unlink(path.join(getUserDir(req), `${id}.json`));
    res.json({ success: true });
  } catch {
    res.status(404).json({ success: false, error: '剪辑项目不存在' });
  }
});

export default router;

