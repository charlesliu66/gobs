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
 * 只删除已知的「大体积可再生成缓存」字段里的 data: URL，
 * 保留 imageDataUrl（角色/场景头像）、previewVideoUrl/videoUrl（视频 URL）等用户数据。
 *
 * 目前只有 previewStillDataUrl（分镜静帧预览，每张 ~2 MB）属于可安全删除的缓存。
 * 其余 data: URL 字段属于用户资产，不做删除。
 */
const STRIP_BASE64_FIELDS = new Set(['previewStillDataUrl']);

function stripBase64(obj: unknown, fieldName?: string): unknown {
  if (typeof obj === 'string') {
    if (obj.startsWith('data:') && fieldName && STRIP_BASE64_FIELDS.has(fieldName)) {
      return null;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripBase64(item, fieldName));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      result[k] = stripBase64(v, k);
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

    // P1-13：注释修正。实际只对 STRIP_BASE64_FIELDS 白名单（目前仅 previewStillDataUrl）
    // 中的字段做置 null；其他 data: URL（如角色头像 imageDataUrl）照常保留，
    // 以防止 feedback.md Rule 6 提到的「保存后整项目变灰」回退。
    const payload = stripBase64({
      ...body,
      id,
      updatedAt,
    }) as Record<string, unknown>;

    const projDir = getProductionProjDir(username);
    const filePath = path.join(projDir, `${id}.json`);

    // Merge video versions: writeBackToProject may have added versions
    // that the frontend hasn't seen yet; don't lose them on overwrite.
    try {
      const existingRaw = await fs.readFile(filePath, 'utf-8');
      const existing = JSON.parse(existingRaw) as Record<string, unknown>;
      const existingProject = existing.project as Record<string, unknown> | undefined;
      const existingShots = existingProject?.shots as Array<Record<string, unknown>> | undefined;
      const incomingProject = payload.project as Record<string, unknown> | undefined;
      const incomingShots = incomingProject?.shots as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(existingShots) && Array.isArray(incomingShots)) {
        for (const iShot of incomingShots) {
          const eShot = existingShots.find((e) => e.shotIndex === iShot.shotIndex);
          if (!eShot) continue;
          const eVersions = Array.isArray(eShot.previewVideoVersions) ? eShot.previewVideoVersions as Array<Record<string, unknown>> : [];
          const iVersions = Array.isArray(iShot.previewVideoVersions) ? iShot.previewVideoVersions as Array<Record<string, unknown>> : [];
          if (!eVersions.length) continue;
          const merged = new Map<string, Record<string, unknown>>();
          for (const v of eVersions) if (v.id) merged.set(v.id as string, v);
          for (const v of iVersions) if (v.id) merged.set(v.id as string, v);
          iShot.previewVideoVersions = [...merged.values()].sort(
            (a, b) => ((b.createdAt as number) || 0) - ((a.createdAt as number) || 0),
          );
        }
      }
    } catch { /* first save or file missing — no merge needed */ }

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

// ── 镜头版本切换 ──────────────────────────────────────────────────────────────

/**
 * PATCH /api/production/project/:id/shots/:shotIndex/version
 * Body: { versionId: string }
 * 即时持久化版本选择（不等 auto-save）
 */
productionPersistRouter.patch('/project/:id/shots/:shotIndex/version', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const { id, shotIndex: shotIdxStr } = req.params;
  const { versionId } = req.body as { versionId?: string };

  if (!id || !/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }
  const shotIndex = Number(shotIdxStr);
  if (!Number.isFinite(shotIndex) || shotIndex < 0) {
    res.status(400).json({ error: '无效的 shotIndex' });
    return;
  }
  if (!versionId || typeof versionId !== 'string') {
    res.status(400).json({ error: '请提供 versionId' });
    return;
  }

  const filePath = path.join(getProductionProjDir(username), `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const project = data.project as Record<string, unknown> | undefined;
    const shots = project?.shots as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(shots)) {
      res.status(404).json({ error: '项目无 shots 数据' });
      return;
    }
    const shot = shots.find((s) => s.shotIndex === shotIndex);
    if (!shot) {
      res.status(404).json({ error: `未找到 shotIndex=${shotIndex}` });
      return;
    }
    const versions = Array.isArray(shot.previewVideoVersions)
      ? (shot.previewVideoVersions as Array<Record<string, unknown>>)
      : [];
    const picked = versions.find((v) => v.id === versionId);
    if (!picked) {
      res.status(400).json({ error: `版本 ${versionId} 不存在` });
      return;
    }
    shot.selectedPreviewVideoVersionId = versionId;
    shot.previewVideoPath = picked.videoPath;
    shot.previewVideoUrl = picked.videoUrl;
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ ok: true, shotIndex, versionId });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    console.error('[production/patch-version]', err);
    res.status(500).json({ error: '版本切换失败' });
  }
});

// ── 镜头版本清理 ──────────────────────────────────────────────────────────────

/**
 * DELETE /api/production/project/:id/shots/:shotIndex/versions
 * Body: { keepVersionId: string }
 * 只保留 keepVersionId 对应的版本，删除其他版本的视频文件
 */
productionPersistRouter.delete('/project/:id/shots/:shotIndex/versions', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const { id, shotIndex: shotIdxStr } = req.params;
  const keepVersionId = (req.query.keepVersionId as string | undefined) || (req.body as Record<string, unknown>)?.keepVersionId as string | undefined;

  if (!id || !/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }
  const shotIndex = Number(shotIdxStr);
  if (!Number.isFinite(shotIndex) || shotIndex < 0) {
    res.status(400).json({ error: '无效的 shotIndex' });
    return;
  }
  if (!keepVersionId || typeof keepVersionId !== 'string') {
    res.status(400).json({ error: '请提供 keepVersionId' });
    return;
  }

  const filePath = path.join(getProductionProjDir(username), `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const project = data.project as Record<string, unknown> | undefined;
    const shots = project?.shots as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(shots)) {
      res.status(404).json({ error: '项目无 shots 数据' });
      return;
    }
    const shot = shots.find((s) => s.shotIndex === shotIndex);
    if (!shot) {
      res.status(404).json({ error: `未找到 shotIndex=${shotIndex}` });
      return;
    }
    const versions = Array.isArray(shot.previewVideoVersions)
      ? (shot.previewVideoVersions as Array<Record<string, unknown>>)
      : [];
    const keep = versions.find((v) => v.id === keepVersionId);
    if (!keep) {
      res.status(400).json({ error: `版本 ${keepVersionId} 不存在` });
      return;
    }

    const outputBase = path.resolve(getApiDataDir());
    let deletedCount = 0;
    for (const v of versions) {
      if (v.id === keepVersionId) continue;
      const vPath = (v.videoPath as string | undefined)?.trim();
      if (!vPath) continue;
      const abs = path.isAbsolute(vPath)
        ? path.resolve(vPath)
        : path.resolve(getApiDataDir(), vPath);
      if (!abs.startsWith(outputBase)) continue;
      try {
        await fs.unlink(abs);
        deletedCount++;
      } catch { /* file may already be gone */ }
    }

    shot.previewVideoVersions = [keep];
    shot.selectedPreviewVideoVersionId = keepVersionId;
    shot.previewVideoPath = keep.videoPath;
    shot.previewVideoUrl = keep.videoUrl;
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json({ ok: true, shotIndex, kept: keepVersionId, deletedFiles: deletedCount });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      res.status(404).json({ error: '项目不存在' });
      return;
    }
    console.error('[production/delete-versions]', err);
    res.status(500).json({ error: '版本清理失败' });
  }
});

export default productionPersistRouter;
