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
import { getJobById } from '../services/batchJobsQueue.js';
import { resolveProductionProjectSaveTitle } from '../services/projectPersistenceGuards.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

export const productionPersistRouter = Router();

const OUTPUT_BASE = getDefaultVideoOutputDir();

function getProductionImgDir(username: string): string {
  return path.join(OUTPUT_BASE, 'production', 'images', sanitizeUsername(username));
}

function getProductionProjDir(username: string): string {
  return path.join(OUTPUT_BASE, 'production', 'projects', sanitizeUsername(username));
}

function getLegacyProductionProjDirs(username: string): string[] {
  const safeUser = sanitizeUsername(username);
  const candidates = [
    path.resolve(process.cwd(), 'output', 'production', 'projects', safeUser),
    path.resolve(process.cwd(), '..', '..', 'api', 'output', 'production', 'projects', safeUser),
  ];
  return [...new Set(candidates.map((item) => path.normalize(item)))].filter(
    (item) => item !== path.normalize(getProductionProjDir(username)),
  );
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(sourcePath: string, targetPath: string): Promise<boolean> {
  if (!(await pathExists(sourcePath))) return false;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return true;
}

async function rehomeLegacyProductionProject(username: string, projectId: string): Promise<boolean> {
  const targetDir = getProductionProjDir(username);
  const targetFile = path.join(targetDir, `${projectId}.json`);
  const targetMeta = path.join(targetDir, `${projectId}.meta.json`);
  if (await pathExists(targetFile)) return true;

  for (const legacyDir of getLegacyProductionProjDirs(username)) {
    const legacyFile = path.join(legacyDir, `${projectId}.json`);
    if (!(await pathExists(legacyFile))) continue;
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(legacyFile, targetFile);
    await copyIfExists(path.join(legacyDir, `${projectId}.meta.json`), targetMeta);
    console.warn('[production/project] rehomed legacy project', { username, projectId, legacyDir, targetDir });
    return true;
  }

  return false;
}

async function rehomeAllLegacyProductionProjects(username: string): Promise<void> {
  const targetDir = getProductionProjDir(username);
  await fs.mkdir(targetDir, { recursive: true });

  for (const legacyDir of getLegacyProductionProjDirs(username)) {
    let files: string[] = [];
    try {
      files = await fs.readdir(legacyDir);
    } catch {
      continue;
    }

    for (const fileName of files) {
      if (!fileName.endsWith('.json')) continue;
      const sourcePath = path.join(legacyDir, fileName);
      const targetPath = path.join(targetDir, fileName);
      if (!(await pathExists(targetPath))) {
        await fs.copyFile(sourcePath, targetPath);
      }
    }
  }
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

function extractBatchJobId(version: Record<string, unknown>): string | undefined {
  const explicit = typeof version.batchJobId === 'string' ? version.batchJobId.trim() : '';
  if (explicit) return explicit;

  const videoUrl = typeof version.videoUrl === 'string' ? version.videoUrl.trim() : '';
  const fromUrl = videoUrl.match(/\/api\/batch-jobs\/video\/([^/?#]+)/)?.[1]?.trim();
  if (fromUrl) return fromUrl;

  const versionId = typeof version.id === 'string' ? version.id.trim() : '';
  const fromId = versionId.match(/^batch-(.+)-\d{10,}$/)?.[1]?.trim();
  if (fromId) return fromId;

  return undefined;
}

type ProjectVideoOwner = {
  projectId: string;
  shotIndex: number;
};

type LoadedProjectDoc = {
  projectId: string;
  data: Record<string, unknown>;
  shots: Array<Record<string, unknown>>;
  filePath: string;
  metaPath: string;
  dirty: boolean;
};

type ProjectVideoReconcileContext = {
  projectDir?: string;
  projectCache: Map<string, LoadedProjectDoc | null>;
  projectIdsCache?: string[];
  jobOwnerCache: Map<string, ProjectVideoOwner | null>;
  versionOwnerCandidatesCache: Map<string, ProjectVideoOwner[]>;
};

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readShotIndex(value: unknown): number | null {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function hasVideoPayload(version: Record<string, unknown>): boolean {
  return Boolean(readTrimmedString(version.videoUrl) || readTrimmedString(version.videoPath));
}

function getVersionSortTime(version: Record<string, unknown>): number {
  return Number(version.createdAt) || 0;
}

function readVersionCreatedAt(version: Record<string, unknown>): number | null {
  const createdAt = Number(version.createdAt);
  if (Number.isFinite(createdAt) && createdAt > 0) return createdAt;

  const versionId = readTrimmedString(version.id);
  const fromId = versionId.match(/(\d{10,})$/)?.[1];
  if (!fromId) return null;

  const normalized = Number(fromId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function readProjectCreatedAt(projectId: string, projectDoc?: LoadedProjectDoc | null): number | null {
  const fromId = projectId.match(/^proj_(\d+)_/)?.[1];
  if (fromId) {
    const normalized = Number(fromId);
    if (Number.isFinite(normalized) && normalized > 0) return normalized;
  }

  const rawCreatedAt = projectDoc?.data.createdAt;
  if (typeof rawCreatedAt === 'string') {
    const parsed = Date.parse(rawCreatedAt);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

function getVersionIdentityKey(version: Record<string, unknown>): string | null {
  const versionId = readTrimmedString(version.id);
  if (versionId) return `id:${versionId}`;

  const batchJobId = extractBatchJobId(version);
  if (batchJobId) return `batch:${batchJobId}`;

  const videoUrl = readTrimmedString(version.videoUrl);
  if (videoUrl) return `url:${videoUrl}`;

  const videoPath = readTrimmedString(version.videoPath);
  if (videoPath) return `path:${videoPath}`;

  return null;
}

function normalizeVersionOwnership(
  version: Record<string, unknown>,
  owner: ProjectVideoOwner | null,
): Record<string, unknown> {
  let changed = false;
  const next: Record<string, unknown> = { ...version };

  const batchJobId = extractBatchJobId(version);
  if (batchJobId && readTrimmedString(version.batchJobId) !== batchJobId) {
    next.batchJobId = batchJobId;
    changed = true;
  }

  if (owner) {
    if (readTrimmedString(version.sourceProjectId) !== owner.projectId) {
      next.sourceProjectId = owner.projectId;
      changed = true;
    }
    if (readShotIndex(version.sourceShotIndex) !== owner.shotIndex) {
      next.sourceShotIndex = owner.shotIndex;
      changed = true;
    }
  }

  return changed ? next : version;
}

function normalizeShotVideoVersionList(
  shot: Record<string, unknown>,
  versions: Array<Record<string, unknown>>,
  preferredSelectedId?: string,
): boolean {
  const previousVersions = Array.isArray(shot.previewVideoVersions)
    ? shot.previewVideoVersions as Array<Record<string, unknown>>
    : [];
  const previousSerialized = JSON.stringify(previousVersions);
  const previousSelectedId = readTrimmedString(shot.selectedPreviewVideoVersionId);
  const previousVideoPath = readTrimmedString(shot.previewVideoPath);
  const previousVideoUrl = readTrimmedString(shot.previewVideoUrl);

  const deduped = new Map<string, Record<string, unknown>>();
  const anonymous: Array<Record<string, unknown>> = [];
  for (const version of [...versions].sort((a, b) => getVersionSortTime(b) - getVersionSortTime(a))) {
    if (!hasVideoPayload(version)) continue;
    const key = getVersionIdentityKey(version);
    if (!key) {
      anonymous.push(version);
      continue;
    }
    if (!deduped.has(key)) deduped.set(key, version);
  }

  const normalized = [...deduped.values(), ...anonymous].sort(
    (a, b) => getVersionSortTime(b) - getVersionSortTime(a),
  );

  const selectedId = preferredSelectedId?.trim() || previousSelectedId;
  const selected = normalized.find((version) => readTrimmedString(version.id) === selectedId) ?? normalized[0];
  const nextSelectedId = readTrimmedString(selected?.id);
  const nextVideoPath = readTrimmedString(selected?.videoPath);
  const nextVideoUrl = readTrimmedString(selected?.videoUrl);

  shot.previewVideoVersions = normalized;
  shot.selectedPreviewVideoVersionId = nextSelectedId || undefined;
  shot.previewVideoPath = nextVideoPath || undefined;
  shot.previewVideoUrl = nextVideoUrl || undefined;

  return (
    previousSerialized !== JSON.stringify(normalized)
    || previousSelectedId !== nextSelectedId
    || previousVideoPath !== nextVideoPath
    || previousVideoUrl !== nextVideoUrl
  );
}

async function loadProjectDoc(
  projectId: string,
  context: ProjectVideoReconcileContext,
): Promise<LoadedProjectDoc | null> {
  if (!projectId || !context.projectDir) return null;
  if (context.projectCache.has(projectId)) {
    return context.projectCache.get(projectId) ?? null;
  }

  const filePath = path.join(context.projectDir, `${projectId}.json`);
  const metaPath = path.join(context.projectDir, `${projectId}.meta.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const project = data.project as Record<string, unknown> | undefined;
    const shots = Array.isArray(project?.shots) ? project.shots as Array<Record<string, unknown>> : [];
    const loaded: LoadedProjectDoc = {
      projectId,
      data,
      shots,
      filePath,
      metaPath,
      dirty: false,
    };
    context.projectCache.set(projectId, loaded);
    return loaded;
  } catch {
    context.projectCache.set(projectId, null);
    return null;
  }
}

async function listProjectIds(context: ProjectVideoReconcileContext): Promise<string[]> {
  if (context.projectIdsCache) return context.projectIdsCache;
  if (!context.projectDir) {
    context.projectIdsCache = [];
    return context.projectIdsCache;
  }

  try {
    const files = await fs.readdir(context.projectDir);
    context.projectIdsCache = files
      .filter((name) => name.endsWith('.json') && !name.endsWith('.meta.json'))
      .map((name) => name.slice(0, -5));
  } catch {
    context.projectIdsCache = [];
  }
  return context.projectIdsCache;
}

async function findVersionOwnerCandidates(
  versionId: string,
  context: ProjectVideoReconcileContext,
): Promise<ProjectVideoOwner[]> {
  if (!versionId || !context.projectDir) return [];
  if (context.versionOwnerCandidatesCache.has(versionId)) {
    return context.versionOwnerCandidatesCache.get(versionId) ?? [];
  }

  const matches: ProjectVideoOwner[] = [];
  const seen = new Set<string>();
  for (const projectId of await listProjectIds(context)) {
    const doc = await loadProjectDoc(projectId, context);
    if (!doc) continue;

    for (const shot of doc.shots) {
      const shotIndex = readShotIndex(shot.shotIndex);
      if (shotIndex == null) continue;
      const versions = Array.isArray(shot.previewVideoVersions)
        ? shot.previewVideoVersions as Array<Record<string, unknown>>
        : [];
      if (!versions.some((version) => readTrimmedString(version.id) === versionId)) continue;

      const key = `${projectId}:${shotIndex}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ projectId, shotIndex });
    }
  }

  context.versionOwnerCandidatesCache.set(versionId, matches);
  return matches;
}

async function resolveJobOwner(
  jobId: string,
  context: ProjectVideoReconcileContext,
): Promise<ProjectVideoOwner | null> {
  if (!jobId) return null;
  if (context.jobOwnerCache.has(jobId)) {
    return context.jobOwnerCache.get(jobId) ?? null;
  }

  const job = await getJobById(jobId);
  const owner = job ? { projectId: job.projectId, shotIndex: job.shotIndex } : null;
  context.jobOwnerCache.set(jobId, owner);
  return owner;
}

async function narrowOwnerCandidates(
  version: Record<string, unknown>,
  candidates: ProjectVideoOwner[],
  context: ProjectVideoReconcileContext,
): Promise<ProjectVideoOwner[]> {
  if (candidates.length <= 1) return candidates;

  const versionCreatedAt = readVersionCreatedAt(version);
  let refined = candidates;

  if (versionCreatedAt != null) {
    const eligible: ProjectVideoOwner[] = [];
    for (const candidate of candidates) {
      const projectDoc = await loadProjectDoc(candidate.projectId, context);
      const projectCreatedAt = readProjectCreatedAt(candidate.projectId, projectDoc);
      if (projectCreatedAt == null || projectCreatedAt <= versionCreatedAt + 60_000) {
        eligible.push(candidate);
      }
    }
    if (eligible.length > 0) refined = eligible;
  }

  if (refined.length <= 1) return refined;

  const decorated = await Promise.all(refined.map(async (candidate) => {
    const projectDoc = await loadProjectDoc(candidate.projectId, context);
    return {
      candidate,
      projectCreatedAt: readProjectCreatedAt(candidate.projectId, projectDoc),
    };
  }));

  const sortable = decorated
    .filter((item) => item.projectCreatedAt != null)
    .sort((a, b) => (a.projectCreatedAt as number) - (b.projectCreatedAt as number));
  if (sortable.length === 0) return refined;

  const earliest = sortable[0];
  const earliestAt = earliest.projectCreatedAt as number;
  const sameEarliest = sortable.filter((item) => item.projectCreatedAt === earliestAt);
  return sameEarliest.length === 1 ? [earliest.candidate] : refined;
}

async function resolveVersionOwner(
  version: Record<string, unknown>,
  currentProjectId: string,
  currentShotIndex: number,
  context: ProjectVideoReconcileContext,
): Promise<ProjectVideoOwner | null> {
  const batchJobId = extractBatchJobId(version);
  if (batchJobId) {
    const batchOwner = await resolveJobOwner(batchJobId, context);
    if (batchOwner) return batchOwner;
  }

  const explicitProjectId = readTrimmedString(version.sourceProjectId);
  const explicitShotIndex = readShotIndex(version.sourceShotIndex);
  if (explicitProjectId && explicitShotIndex != null) {
    return { projectId: explicitProjectId, shotIndex: explicitShotIndex };
  }
  if (explicitProjectId) {
    return { projectId: explicitProjectId, shotIndex: currentShotIndex };
  }
  if (explicitShotIndex != null) {
    return { projectId: currentProjectId, shotIndex: explicitShotIndex };
  }

  const versionId = readTrimmedString(version.id);
  if (!versionId) return null;

  const candidates = await narrowOwnerCandidates(
    version,
    await findVersionOwnerCandidates(versionId, context),
    context,
  );
  const foreignCandidates = candidates.filter(
    (candidate) => candidate.projectId !== currentProjectId || candidate.shotIndex !== currentShotIndex,
  );

  if (foreignCandidates.length === 1) return foreignCandidates[0];
  if (foreignCandidates.length === 0 && candidates.length === 1) return candidates[0];
  return null;
}

async function attachVersionToOwnerShot(
  version: Record<string, unknown>,
  owner: ProjectVideoOwner,
  context: ProjectVideoReconcileContext,
): Promise<boolean> {
  const ownerDoc = await loadProjectDoc(owner.projectId, context);
  if (!ownerDoc) return false;

  const ownerShot = ownerDoc.shots.find((shot) => readShotIndex(shot.shotIndex) === owner.shotIndex);
  if (!ownerShot) return false;

  const ownerVersions = Array.isArray(ownerShot.previewVideoVersions)
    ? ownerShot.previewVideoVersions as Array<Record<string, unknown>>
    : [];
  const normalizedVersion = normalizeVersionOwnership(version, owner);
  const preferredSelectedId = readTrimmedString(ownerShot.selectedPreviewVideoVersionId);
  const ownerChanged = normalizeShotVideoVersionList(
    ownerShot,
    [normalizedVersion, ...ownerVersions],
    preferredSelectedId || undefined,
  );
  if (ownerChanged) ownerDoc.dirty = true;
  return true;
}

async function reconcileShotVideoVersionsForProject(
  projectDoc: LoadedProjectDoc,
  context: ProjectVideoReconcileContext,
): Promise<boolean> {
  let changed = false;

  for (const shot of projectDoc.shots) {
    const shotIndex = readShotIndex(shot.shotIndex);
    if (shotIndex == null) continue;

    const rawVersions = Array.isArray(shot.previewVideoVersions)
      ? shot.previewVideoVersions as Array<Record<string, unknown>>
      : [];
    const nextVersions: Array<Record<string, unknown>> = [];

    for (const rawVersion of rawVersions) {
      if (!hasVideoPayload(rawVersion)) {
        changed = true;
        continue;
      }

      const owner = await resolveVersionOwner(rawVersion, projectDoc.projectId, shotIndex, context);
      const normalizedVersion = normalizeVersionOwnership(rawVersion, owner);
      if (normalizedVersion !== rawVersion) changed = true;

      if (owner && (owner.projectId !== projectDoc.projectId || owner.shotIndex !== shotIndex)) {
        const moved = await attachVersionToOwnerShot(normalizedVersion, owner, context);
        if (moved) {
          changed = true;
          continue;
        }
      }

      nextVersions.push(normalizedVersion);
    }

    if (normalizeShotVideoVersionList(shot, nextVersions)) {
      changed = true;
    }
  }

  if (changed) projectDoc.dirty = true;
  return changed;
}

async function persistLoadedProjectDoc(
  projectDoc: LoadedProjectDoc,
  options: { touchUpdatedAt?: boolean } = {},
): Promise<void> {
  if (options.touchUpdatedAt) {
    projectDoc.data.updatedAt = new Date().toISOString();
  }

  await fs.writeFile(projectDoc.filePath, JSON.stringify(projectDoc.data, null, 2), 'utf-8');

  const project = projectDoc.data.project as Record<string, unknown> | undefined;
  const meta = project?.meta as Record<string, unknown> | undefined;
  const step = typeof projectDoc.data.step === 'number' ? projectDoc.data.step : Number(projectDoc.data.step) || 0;
  await fs.writeFile(
    projectDoc.metaPath,
    JSON.stringify({
      id: projectDoc.projectId,
      title: typeof meta?.title === 'string' && meta.title.trim() ? meta.title : '未命名项目',
      updatedAt: typeof projectDoc.data.updatedAt === 'string' ? projectDoc.data.updatedAt : '',
      step,
    }),
    'utf-8',
  );
  projectDoc.dirty = false;
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
    const incomingProject = payload.project as Record<string, unknown> | undefined;
    const incomingShots = incomingProject?.shots as Array<Record<string, unknown>> | undefined;

    const projDir = getProductionProjDir(username);
    const filePath = path.join(projDir, `${id}.json`);
    const metaPath = path.join(projDir, `${id}.meta.json`);
    let existingTitle: string | undefined;
    let isNewProject = true;

    // Merge video versions: writeBackToProject may have added versions
    // that the frontend hasn't seen yet; don't lose them on overwrite.
    try {
      const existingRaw = await fs.readFile(filePath, 'utf-8');
      const existing = JSON.parse(existingRaw) as Record<string, unknown>;
      isNewProject = false;
      existingTitle = ((existing.project as Record<string, unknown> | undefined)?.meta as Record<string, unknown> | undefined)?.title as string | undefined;
      const existingProject = existing.project as Record<string, unknown> | undefined;
      const existingShots = existingProject?.shots as Array<Record<string, unknown>> | undefined;
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

    const resolvedTitle = resolveProductionProjectSaveTitle({
      incomingTitle: (projectData.meta as Record<string, unknown> | undefined)?.title as string | undefined,
      existingTitle,
      isNewProject,
    });
    if (!resolvedTitle.ok) {
      res.status(400).json({ error: '请先命名高级制片项目，再保存到项目列表' });
      return;
    }
    const resolvedProject: Record<string, unknown> = {
      ...(incomingProject ?? {}),
      meta: {
        ...(((incomingProject?.meta as Record<string, unknown> | undefined) ?? {})),
        title: resolvedTitle.title,
      },
    };
    payload.project = resolvedProject;
    const resolvedIncomingShots = resolvedProject.shots as Array<Record<string, unknown>> | undefined;

    const currentProjectDoc: LoadedProjectDoc = {
      projectId: id,
      data: payload,
      shots: Array.isArray(resolvedIncomingShots) ? resolvedIncomingShots : [],
      filePath,
      metaPath,
      dirty: true,
    };
    const reconcileContext: ProjectVideoReconcileContext = {
      projectDir: projDir,
      projectCache: new Map([[id, currentProjectDoc]]),
      jobOwnerCache: new Map(),
      versionOwnerCandidatesCache: new Map(),
    };

    await reconcileShotVideoVersionsForProject(currentProjectDoc, reconcileContext);
    await persistLoadedProjectDoc(currentProjectDoc);
    for (const [projectKey, doc] of reconcileContext.projectCache) {
      if (!doc || projectKey === id || !doc.dirty) continue;
      await persistLoadedProjectDoc(doc);
    }

    res.json({ id, updatedAt, title: resolvedTitle.title });
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

  const projectDir = getProductionProjDir(username);
  const filePath = path.join(projectDir, `${id}.json`);
  try {
    await rehomeLegacyProductionProject(username, id);
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const project = data.project as Record<string, unknown> | undefined;
    const shots = Array.isArray(project?.shots) ? project.shots as Array<Record<string, unknown>> : [];
    const currentProjectDoc: LoadedProjectDoc = {
      projectId: id,
      data,
      shots,
      filePath,
      metaPath: path.join(projectDir, `${id}.meta.json`),
      dirty: false,
    };
    const reconcileContext: ProjectVideoReconcileContext = {
      projectDir,
      projectCache: new Map([[id, currentProjectDoc]]),
      jobOwnerCache: new Map(),
      versionOwnerCandidatesCache: new Map(),
    };

    const changed = await reconcileShotVideoVersionsForProject(currentProjectDoc, reconcileContext);
    if (changed) {
      await persistLoadedProjectDoc(currentProjectDoc);
    }
    for (const [projectKey, doc] of reconcileContext.projectCache) {
      if (!doc || projectKey === id || !doc.dirty) continue;
      await persistLoadedProjectDoc(doc);
    }
    res.json(data);
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
    await rehomeAllLegacyProductionProjects(username);
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

productionPersistRouter.patch('/project/title', async (req: Request, res: Response) => {
  const username = sanitizeUsername(req.user?.username);
  const body = req.body as { id?: string; title?: string };
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (!id || !/^[\w-]+$/.test(id)) {
    res.status(400).json({ error: '无效的项目 id' });
    return;
  }

  const filePath = path.join(getProductionProjDir(username), `${id}.json`);
  const metaPath = path.join(getProductionProjDir(username), `${id}.meta.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const project = data.project as Record<string, unknown> | undefined;
    const existingTitle = ((project?.meta as Record<string, unknown> | undefined)?.title as string | undefined);
    const resolvedTitle = resolveProductionProjectSaveTitle({
      incomingTitle: body.title,
      existingTitle,
      isNewProject: false,
    });
    if (!resolvedTitle.ok) {
      res.status(400).json({ error: '请输入有效的项目名称' });
      return;
    }

    const nextProject = {
      ...(project ?? {}),
      meta: {
        ...(((project?.meta as Record<string, unknown> | undefined) ?? {})),
        title: resolvedTitle.title,
      },
    };
    data.project = nextProject;
    data.updatedAt = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    await fs.writeFile(
      metaPath,
      JSON.stringify({
        id,
        title: resolvedTitle.title,
        updatedAt: data.updatedAt,
        step: typeof data.step === 'number' ? data.step : Number(data.step ?? 0) || 0,
      }),
      'utf-8',
    );
    res.json({ ok: true, title: resolvedTitle.title });
  } catch {
    res.status(404).json({ error: '项目不存在' });
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
