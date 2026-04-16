import { Router, type Request, type Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import { getApiDataDir } from '../config/apiDataDir.js';
import { getDefaultVideoOutputDir } from '../config/apiDataDir.js';
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

router.patch('/projects/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!isSafeId(id)) {
    res.status(400).json({ success: false, error: '无效的项目 id' });
    return;
  }
  const body = req.body as { name?: unknown };
  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 120) : null;
  if (!name) {
    res.status(400).json({ success: false, error: '请提供有效的项目名称' });
    return;
  }
  const dir = getUserDir(req);
  const file = path.join(dir, `${id}.json`);
  try {
    const raw = JSON.parse(await fs.readFile(file, 'utf-8')) as EditorProjectDoc;
    raw.name = name;
    raw.updatedAt = new Date().toISOString();
    await fs.writeFile(file, JSON.stringify(raw, null, 2), 'utf-8');
    res.json({ success: true, data: raw });
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

// ─── 增量同步：制片 → 剪辑 ─────────────────────────────────────────────────

interface ProductionShotLike {
  shotIndex: number;
  durationSec?: number;
  previewVideoUrl?: string;
  previewVideoPath?: string;
  previewVideoVersions?: Array<{
    id: string;
    taskId: string;
    createdAt: number;
    videoUrl?: string;
    videoPath?: string;
  }>;
  selectedPreviewVideoVersionId?: string;
  shotScale?: string;
  cameraMove?: string;
  subject?: string;
  action?: string;
  sceneRef?: string;
  emotion?: string;
  lighting?: string;
  dialogue?: string;
}

interface SyncDiffItem {
  shotIndex: number;
  currentVersionId: string | null;
  latestVersionId: string;
  latestVideoUrl: string;
  latestDurationSec: number;
  hasUpdate: boolean;
}

function getProductionProjDir(username: string): string {
  return path.join(getDefaultVideoOutputDir(), 'production', 'projects', sanitizeUsername(username));
}

function resolveVideoSrc(shot: ProductionShotLike): string {
  if (shot.previewVideoPath?.trim()) return `/api/video/file?path=${encodeURIComponent(shot.previewVideoPath.trim())}`;
  if (shot.previewVideoUrl?.trim()) return shot.previewVideoUrl.trim();
  return '';
}

function getSelectedVersion(shot: ProductionShotLike) {
  const versions = shot.previewVideoVersions ?? [];
  if (versions.length === 0) return null;
  const selId = shot.selectedPreviewVideoVersionId;
  return versions.find((v) => v.id === selId) ?? versions[0] ?? null;
}

/** POST /api/editor/projects/:id/sync-production — 对比版本差异 */
router.post('/projects/:id/sync-production', async (req: Request, res: Response) => {
  const editorId = req.params.id;
  if (!isSafeId(editorId)) { res.status(400).json({ error: '无效的项目 id' }); return; }

  try {
    const editorDoc = JSON.parse(
      await fs.readFile(path.join(getUserDir(req), `${editorId}.json`), 'utf-8'),
    ) as EditorProjectDoc;

    const project = editorDoc.project as Record<string, unknown>;
    const prodProjectId = project.sourceProductionProjectId as string | undefined;
    if (!prodProjectId) {
      res.status(400).json({ error: '该剪辑项目不是从制片导入的，无法同步' });
      return;
    }

    const username = sanitizeUsername(req.user?.username);
    const prodFile = path.join(getProductionProjDir(username), `${prodProjectId}.json`);
    let prodData: Record<string, unknown>;
    try {
      prodData = JSON.parse(await fs.readFile(prodFile, 'utf-8')) as Record<string, unknown>;
    } catch {
      res.status(404).json({ error: '源制片项目已删除或不存在' });
      return;
    }

    const prodShots = (prodData.shots as ProductionShotLike[] | undefined) ?? [];
    const tracks = (project.tracks as Array<{ type: string; clips: Array<Record<string, unknown>> }>) ?? [];
    const videoTrack = tracks.find((t) => t.type === 'video');
    const editorClips = (videoTrack?.clips ?? []) as Array<Record<string, unknown>>;

    const diffs: SyncDiffItem[] = [];

    for (const shot of prodShots) {
      const latestVersion = getSelectedVersion(shot);
      if (!latestVersion) continue;

      const clip = editorClips.find((c) => c.shotIndex === shot.shotIndex);
      const clipMeta = (clip?.meta ?? {}) as Record<string, unknown>;
      const currentVersionId = (clipMeta.productionVersionId as string) ?? null;

      diffs.push({
        shotIndex: shot.shotIndex,
        currentVersionId,
        latestVersionId: latestVersion.id,
        latestVideoUrl: resolveVideoSrc({
          ...shot,
          previewVideoUrl: latestVersion.videoUrl,
          previewVideoPath: latestVersion.videoPath,
        }),
        latestDurationSec: shot.durationSec ?? 5,
        hasUpdate: currentVersionId !== latestVersion.id,
      });
    }

    res.json({
      success: true,
      productionTitle: (prodData.meta as Record<string, unknown>)?.title ?? prodData.title ?? '未命名',
      diffs,
    });
  } catch (err) {
    console.error('[sync-production]', err);
    res.status(500).json({ error: '同步对比失败' });
  }
});

/** PATCH /api/editor/projects/:id/apply-sync — 执行替换 */
router.patch('/projects/:id/apply-sync', async (req: Request, res: Response) => {
  const editorId = req.params.id;
  if (!isSafeId(editorId)) { res.status(400).json({ error: '无效的项目 id' }); return; }

  const replacements = req.body.replacements as Array<{
    shotIndex: number;
    newVersionId: string;
    newVideoUrl: string;
    newDurationSec: number;
    newMeta?: Record<string, unknown>;
  }> | undefined;

  if (!replacements?.length) {
    res.status(400).json({ error: '未指定替换内容' });
    return;
  }

  try {
    const dir = getUserDir(req);
    const file = path.join(dir, `${editorId}.json`);
    const doc = JSON.parse(await fs.readFile(file, 'utf-8')) as EditorProjectDoc;
    const project = doc.project as Record<string, unknown>;
    const tracks = (project.tracks as Array<{ type: string; clips: Array<Record<string, unknown>> }>) ?? [];
    const videoTrack = tracks.find((t) => t.type === 'video');
    if (!videoTrack) { res.status(400).json({ error: '时间轴无视频轨' }); return; }

    const clips = videoTrack.clips as Array<Record<string, unknown>>;
    const assets = doc.assets as Record<string, Record<string, unknown>>;
    let totalShift = 0;

    for (const rep of replacements) {
      const clipIdx = clips.findIndex((c) => c.shotIndex === rep.shotIndex);
      if (clipIdx < 0) continue;
      const clip = clips[clipIdx]!;

      const oldDur = ((clip.sourceEnd as number) ?? 5) - ((clip.sourceStart as number) ?? 0);
      const newDur = rep.newDurationSec;
      const durDelta = newDur - oldDur;

      // 更新素材 URL
      const assetId = clip.assetId as string;
      if (assets[assetId]) {
        assets[assetId]!.url = rep.newVideoUrl;
        assets[assetId]!.durationSec = newDur;
      }

      // 更新 clip：调整时间 + 记录版本
      clip.timelineStart = (clip.timelineStart as number) + totalShift;
      clip.sourceStart = 0;
      clip.sourceEnd = newDur;

      // 更新 meta
      const oldMeta = (clip.meta ?? {}) as Record<string, unknown>;
      clip.meta = {
        ...oldMeta,
        ...rep.newMeta,
        productionVersionId: rep.newVersionId,
        syncedAt: new Date().toISOString(),
      };

      // 后续 clip 全部位移
      totalShift += durDelta;
      if (durDelta !== 0) {
        for (let i = clipIdx + 1; i < clips.length; i++) {
          (clips[i] as Record<string, unknown>).timelineStart =
            ((clips[i] as Record<string, unknown>).timelineStart as number) + durDelta;
        }
      }
    }

    // 重算工程总时长
    let maxEnd = 0;
    for (const c of clips) {
      const end = (c.timelineStart as number) + ((c.sourceEnd as number) - (c.sourceStart as number));
      if (end > maxEnd) maxEnd = end;
    }
    project.durationSec = maxEnd;

    doc.updatedAt = new Date().toISOString();
    await fs.writeFile(file, JSON.stringify(doc, null, 2), 'utf-8');
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[apply-sync]', err);
    res.status(500).json({ error: '应用同步失败' });
  }
});

export default router;

