/**
 * 高级制片持久化接口
 * POST /api/production/upload-image  — 上传单张图（base64），返回服务端路径
 * GET  /api/production/image?path=   — 读取图片文件（静态托管）
 * POST /api/production/project/save  — 保存整个项目 JSON
 * GET  /api/production/project/load?id= — 读取项目 JSON
 * GET  /api/production/project/list  — 列出所有项目
 * DELETE /api/production/project?id= — 删除项目
 */
import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

export const productionPersistRouter = Router();

const OUTPUT_BASE = getDefaultVideoOutputDir();

function getProductionImgDir(username: string): string {
  return path.join(OUTPUT_BASE, 'production', 'images', sanitizeUsername(username));
}

function getProductionProjDir(username: string): string {
  return path.join(OUTPUT_BASE, 'production', 'projects', sanitizeUsername(username));
}

function resolveReadableImagePath(rawPath: string, username: string): string | null {
  const safeUser = sanitizeUsername(username);
  const cleaned = rawPath.trim().replace(/\\/g, '/');
  if (!cleaned) return null;

  const allowedDirs = [
    path.resolve(getApiDataDir(), 'output', 'production', 'images', safeUser),
    path.resolve(process.cwd(), 'output', 'production', 'images', safeUser),
    path.resolve(getDefaultVideoOutputDir(), 'production', 'images', safeUser),
  ];

  const inAllowedDir = (p: string) =>
    allowedDirs.some((base) => p === base || p.startsWith(base + path.sep));

  // 1) 绝对路径（历史数据可能直接存了绝对路径）
  if (path.isAbsolute(cleaned)) {
    const abs = path.resolve(cleaned);
    return inAllowedDir(abs) ? abs : null;
  }

  // 2) 标准相对路径：output/production/images/xxx
  const normalized = path.normalize(cleaned);
  if (normalized.startsWith(`output/production/images/${safeUser}/`) || normalized.startsWith(`output\\production\\images\\${safeUser}\\`)) {
    const abs = path.resolve(getApiDataDir(), normalized);
    return inAllowedDir(abs) ? abs : null;
  }

  // 3) 旧相对路径：production/images/xxx
  if (normalized.startsWith(`production/images/${safeUser}/`) || normalized.startsWith(`production\\images\\${safeUser}\\`)) {
    const abs = path.resolve(getApiDataDir(), 'output', normalized);
    return inAllowedDir(abs) ? abs : null;
  }

  // 4) 仅文件名：默认落在 output/production/images
  if (!normalized.includes('/') && !normalized.includes('\\') && !normalized.includes('..')) {
    const abs = path.resolve(getApiDataDir(), 'output', 'production', 'images', safeUser, normalized);
    return inAllowedDir(abs) ? abs : null;
  }

  return null;
}

async function ensureDirs(username: string) {
  await fs.mkdir(getProductionImgDir(username), { recursive: true });
  await fs.mkdir(getProductionProjDir(username), { recursive: true });
}

/**
 * 递归将所有 data: URL 字符串替换为 null，防止 base64 图片撑大项目 JSON。
 * 被替换的字段在重新生成后会通过正常上传流程恢复为持久 URL。
 */
function stripBase64(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj.startsWith('data:') ? null : obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripBase64);
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = stripBase64(v);
    }
    return result;
  }
  return obj;
}

// ── 上传图片 ──────────────────────────────────────────────────────────────────

/**
 * POST /api/production/upload-image
 * Body: { base64: string, mimeType?: string, label?: string }
 * Returns: { path: string, url: string }
 */
productionPersistRouter.post('/upload-image', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const { base64, mimeType, label } = req.body as {
    base64?: string;
    mimeType?: string;
    label?: string;
  };

  if (!base64 || typeof base64 !== 'string') {
    res.status(400).json({ error: '请提供 base64 图片数据' });
    return;
  }

  // 去掉 data URL 前缀
  const raw = base64.replace(/^data:[^;]+;base64,/, '').trim();
  if (!raw) {
    res.status(400).json({ error: 'base64 数据为空' });
    return;
  }

  const ext = mimeType?.includes('png') ? 'png' : mimeType?.includes('webp') ? 'webp' : 'jpg';
  const slug = label
    ? label.replace(/[^\w\u4e00-\u9fff-]/g, '_').slice(0, 30)
    : randomBytes(4).toString('hex');
  const filename = `${slug}_${Date.now()}.${ext}`;

  try {
    await ensureDirs(username);
    const absPath = path.join(getProductionImgDir(username), filename);
    await fs.writeFile(absPath, Buffer.from(raw, 'base64'));

    const relPath = `output/production/images/${username}/${filename}`;
    const url = `/api/production/image?path=${encodeURIComponent(relPath)}`;

    res.json({ path: relPath, url, filename });
  } catch (err) {
    console.error('[production/upload-image]', err);
    res.status(500).json({ error: '图片保存失败' });
  }
});

// ── 读取图片 ──────────────────────────────────────────────────────────────────

/**
 * GET /api/production/image?path=output/production/images/xxx.png
 */
productionPersistRouter.get('/image', async (req: Request, res: Response) => {
  const rawPath = req.query.path as string | undefined;
  // Auth is bypassed for <img src> usage (browser img tags can't send Bearer tokens).
  // Extract username from the path when req.user is unavailable.
  let rawUsername = req.user?.username;
  if (!rawUsername) {
    const m = String(rawPath || '').match(/^output[/\\]production[/\\]images[/\\]([^/\\]+)[/\\]/);
    rawUsername = m?.[1] ?? '';
  }
  const username = sanitizeUsername(rawUsername);
  if (!rawPath) {
    res.status(400).json({ error: '请提供 path 参数' });
    return;
  }

  const absPath = resolveReadableImagePath(rawPath, username);
  if (!absPath) {
    res.status(403).json({ error: '无权访问该路径' });
    return;
  }
  try {
    await fs.access(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const mime =
      ext === '.png' ? 'image/png'
      : ext === '.webp' ? 'image/webp'
      : 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(absPath);
  } catch {
    res.status(404).json({ error: '图片不存在' });
  }
});

// ── 项目持久化 ────────────────────────────────────────────────────────────────

interface ProjectMeta {
  id: string;
  title: string;
  updatedAt: string;
  step: number;
}

/**
 * POST /api/production/project/save
 * Body: { id?: string, project: object, characterBible, synopsis, structureTemplate, maxTotalDurationSec, step, storyGenre }
 * Returns: { id: string, updatedAt: string }
 */
productionPersistRouter.post('/project/save', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const body = req.body as Record<string, unknown>;
  const projectData = body.project as Record<string, unknown> | undefined;

  if (!projectData || typeof projectData !== 'object') {
    res.status(400).json({ error: '请提供 project 数据' });
    return;
  }

  try {
    await ensureDirs(username);

    // 用现有 id 或生成新 id
    const id: string = (typeof body.id === 'string' && body.id.trim())
      ? body.id.trim()
      : `proj_${Date.now()}_${randomBytes(4).toString('hex')}`;

    const updatedAt = new Date().toISOString();
    const title = (projectData.meta as Record<string, unknown> | undefined)?.title as string || '未命名项目';
    const step = typeof body.step === 'number' ? body.step : 0;

    // 保存前去掉所有 data: URL，避免 base64 图片撑大 JSON（base64→null）
    const payload = stripBase64({
      ...body,
      id,
      updatedAt,
    }) as Record<string, unknown>;

    const projDir = getProductionProjDir(username);
    const filePath = path.join(projDir, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

    // 写 sidecar 元数据（供 /list 快速读取，无需解析全量 JSON）
    const metaPath = path.join(projDir, `${id}.meta.json`);
    await fs.writeFile(metaPath, JSON.stringify({ id, title, updatedAt, step }), 'utf-8');

    res.json({ id, updatedAt, title });
  } catch (err) {
    console.error('[production/project/save]', err);
    res.status(500).json({ error: '项目保存失败' });
  }
});

/**
 * GET /api/production/project/load?id=xxx
 */
productionPersistRouter.get('/project/load', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const id = req.query.id as string | undefined;
  if (!id || !/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }

  const filePath = path.join(getProductionProjDir(username), `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(raw));
  } catch {
    res.status(404).json({ error: '项目不存在' });
  }
});

/**
 * GET /api/production/project/list
 * Returns: { projects: ProjectMeta[] }
 */
productionPersistRouter.get('/project/list', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  try {
    await ensureDirs(username);
    const userProjDir = getProductionProjDir(username);
    const files = await fs.readdir(userProjDir);

    // 优先读取轻量 sidecar 文件（几十字节），不存在时回退解析全量 JSON
    const metaFiles = files.filter((f) => f.endsWith('.meta.json'));
    const fullJsonIds = new Set(
      files.filter((f) => f.endsWith('.json') && !f.endsWith('.meta.json'))
        .map((f) => f.replace('.json', ''))
    );

    const metas: ProjectMeta[] = [];
    const seen = new Set<string>();

    // 1. 读 sidecar（快速路径）
    for (const f of metaFiles) {
      try {
        const raw = await fs.readFile(path.join(userProjDir, f), 'utf-8');
        const data = JSON.parse(raw) as ProjectMeta;
        if (data.id && !seen.has(data.id)) {
          seen.add(data.id);
          metas.push({
            id: String(data.id),
            title: String(data.title ?? '未命名项目'),
            updatedAt: String(data.updatedAt ?? ''),
            step: Number(data.step ?? 0),
          });
        }
      } catch { /* skip */ }
    }

    // 2. 回退：没有 sidecar 的旧项目，解析全量 JSON（向后兼容）
    for (const id of fullJsonIds) {
      if (seen.has(id)) continue; // 已有 sidecar
      try {
        const raw = await fs.readFile(path.join(userProjDir, `${id}.json`), 'utf-8');
        const data = JSON.parse(raw) as Record<string, unknown>;
        const proj = data.project as Record<string, unknown> | undefined;
        const meta = proj?.meta as Record<string, unknown> | undefined;
        const parsedId = String(data.id ?? id);
        if (!seen.has(parsedId)) {
          seen.add(parsedId);
          metas.push({
            id: parsedId,
            title: String(meta?.title ?? '未命名项目'),
            updatedAt: String(data.updatedAt ?? ''),
            step: Number(data.step ?? 0),
          });
        }
      } catch { /* skip corrupt */ }
    }

    // 按更新时间倒序，最多返回 50 个
    metas.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
    res.json({ projects: metas.slice(0, 50) });
  } catch (err) {
    console.error('[production/project/list]', err);
    res.status(500).json({ error: '读取项目列表失败' });
  }
});

/**
 * DELETE /api/production/project?id=xxx
 */
productionPersistRouter.delete('/project', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const id = req.query.id as string | undefined;
  if (!id || !/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }

  const projDir = getProductionProjDir(username);
  const filePath = path.join(projDir, `${id}.json`);
  try {
    await fs.unlink(filePath);
    // 同步删除 sidecar（忽略不存在的情况）
    await fs.unlink(path.join(projDir, `${id}.meta.json`)).catch(() => {});
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: '项目不存在' });
  }
});

export default productionPersistRouter;
