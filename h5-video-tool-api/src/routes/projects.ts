/**
 * 项目持久化路由（按用户隔离）
 * GET    /api/projects        — 列出当前用户所有项目
 * POST   /api/projects        — 创建项目，返回 project_id
 * GET    /api/projects/:id    — 读取项目完整数据
 * PUT    /api/projects/:id    — 保存/更新项目数据
 * DELETE /api/projects/:id    — 删除项目
 *
 * 存储路径: {API_DATA_DIR}/projects/{username}/{project_id}.json
 */
import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

const router = Router();

function isSafeUsername(username: string): boolean {
  // Only allow alphanumeric, underscore, hyphen — no path separators
  return /^[\w-]{1,64}$/.test(username);
}

function getProjectsDir(username: string): string {
  if (!isSafeUsername(username)) {
    throw new Error('非法用户名');
  }
  const dataDir = process.env.API_DATA_DIR
    ? path.resolve(process.env.API_DATA_DIR)
    : path.resolve(process.cwd(), 'data');
  return path.join(dataDir, 'projects', username);
}

function getProjectPath(username: string, projectId: string): string {
  return path.join(getProjectsDir(username), `${projectId}.json`);
}

function isSafeProjectId(id: string): boolean {
  return /^[\w-]+$/.test(id) && id.length <= 64;
}

interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

/**
 * GET /api/projects
 * 列出当前用户的所有项目
 */
router.get('/', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const dir = getProjectsDir(username);

  try {
    await fs.mkdir(dir, { recursive: true });
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const metas: ProjectMeta[] = [];
    for (const f of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(dir, f), 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        metas.push({
          id: String(data.id ?? f.replace('.json', '')),
          name: String(data.name ?? '未命名项目'),
          updatedAt: String(data.updatedAt ?? ''),
          createdAt: String(data.createdAt ?? ''),
        });
      } catch {
        /* skip corrupt files */
      }
    }

    // 按更新时间倒序
    metas.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    res.json({ projects: metas });
  } catch (err) {
    console.error('[projects] list error', err);
    res.status(500).json({ error: '读取项目列表失败' });
  }
});

/**
 * POST /api/projects
 * Body: { name?: string, ...data }
 * 创建项目，返回 project_id
 */
router.post('/', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const body = req.body as Record<string, unknown>;

  const id = nanoid(12);
  const now = new Date().toISOString();
  const project = {
    id,
    name: String(body.name ?? '未命名项目'),
    createdAt: now,
    updatedAt: now,
    username,
    data: body.data ?? {},
  };

  const dir = getProjectsDir(username);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(getProjectPath(username, id), JSON.stringify(project, null, 2), 'utf-8');
    res.json({ id, name: project.name, createdAt: now, updatedAt: now });
  } catch (err) {
    console.error('[projects] create error', err);
    res.status(500).json({ error: '创建项目失败' });
  }
});

/**
 * GET /api/projects/:id
 * 读取项目完整数据
 */
router.get('/:id', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const { id } = req.params;

  if (!isSafeProjectId(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }

  try {
    const raw = await fs.readFile(getProjectPath(username, id), 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ error: '项目不存在' });
  }
});

/**
 * PUT /api/projects/:id
 * 更新项目数据
 */
router.put('/:id', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const { id } = req.params;
  const body = req.body as Record<string, unknown>;

  if (!isSafeProjectId(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }

  const filePath = getProjectPath(username, id);
  try {
    // 读取现有数据以保留 createdAt
    let existing: Record<string, unknown> = {};
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* file might not exist yet */
    }

    const now = new Date().toISOString();
    const updated: Record<string, unknown> = {
      ...existing,
      ...body,
      id,
      username,
      updatedAt: now,
      createdAt: existing.createdAt ?? now,
    };

    await fs.mkdir(getProjectsDir(username), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8');
    const updatedName = String(body.name ?? existing.name ?? '未命名项目');
    res.json({ id, updatedAt: now, name: updatedName });
  } catch (err) {
    console.error('[projects] update error', err);
    res.status(500).json({ error: '保存项目失败' });
  }
});

/**
 * DELETE /api/projects/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const username = req.user!.username;
  const { id } = req.params;

  if (!isSafeProjectId(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }

  try {
    await fs.unlink(getProjectPath(username, id));
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: '项目不存在' });
  }
});

export default router;
