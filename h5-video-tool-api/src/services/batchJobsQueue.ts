/**
 * 即梦批量任务队列服务
 * 负责：持久化任务列表、后台轮询、结果缓存
 *
 * 轮询策略（production 来源）：
 *   - 提交后前 10 分钟不轮询（即梦生成通常需要较长时间）
 *   - 10 分钟后每 5 分钟轮询一次
 *   - 超过 4 小时自动标记失败（防僵尸）
 *   - 用户可随时手动触发 pollJobNow() 立即查询
 * quickfilm 来源保持原 30 秒间隔。
 */
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { getApiDataDir } from '../config/apiDataDir.js';
import { pollDreaminaTask, submitDreaminaVideo } from './dreaminaVideo.js';

export const batchJobEvents = new EventEmitter();
batchJobEvents.setMaxListeners(50);

export type BatchJobStatus = 'pending' | 'queuing' | 'processing' | 'done' | 'failed' | 'cancelled' | 'awaiting_submit';

export interface BatchJobSubmitParams {
  prompt: string;
  aspectRatio: string;
  duration: number;
  model: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface BatchJob {
  id: string;              // 唯一 id，格式 bj_<timestamp>_<random>
  submitId: string;        // 即梦 submit_id（awaiting_submit 时为空字符串）
  taskId: string;          // dreamina-<submitId>（用于 History）
  projectId: string;       // 所属高级制片项目 id
  shotIndex: number;       // 分镜序号（0-based）
  shotDescription: string; // 分镜描述文案（展示用）
  model: string;           // 使用的模型（dreamina-text2video 等）
  source?: 'production' | 'quickfilm';
  username?: string;       // 提交者用户名（用于回写项目 JSON）
  status: BatchJobStatus;
  createdAt: string;       // ISO8601
  updatedAt: string;
  lastPolledAt?: string;   // 上次实际轮询时间
  videoUrl?: string;       // 成功后的 API 路径（/api/batch-jobs/video/xxx）
  videoFilePath?: string;  // 本地 MP4 绝对路径
  failReason?: string;
  queueInfo?: {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
  };
  submitParams?: BatchJobSubmitParams;  // awaiting_submit 时保存提交参数
}

const JOBS_FILE = path.join(getApiDataDir(), 'output', 'batch-jobs', 'jobs.json');

async function ensureDir() {
  await fs.mkdir(path.dirname(JOBS_FILE), { recursive: true });
}

// 内存缓存
let _jobs: Map<string, BatchJob> = new Map();
let _loaded = false;

async function loadJobs(): Promise<void> {
  if (_loaded) return;
  try {
    await ensureDir();
    if (fsSync.existsSync(JOBS_FILE)) {
      const raw = await fs.readFile(JOBS_FILE, 'utf8');
      const arr: BatchJob[] = JSON.parse(raw);
      _jobs = new Map(arr.map((j) => [j.id, j]));
    }
  } catch (e) {
    console.warn('[batch-jobs] load failed', e);
  }
  _loaded = true;
}

async function saveJobs(): Promise<void> {
  await ensureDir();
  const arr = Array.from(_jobs.values());
  await fs.writeFile(JOBS_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

export async function getAllJobs(): Promise<BatchJob[]> {
  await loadJobs();
  return Array.from(_jobs.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getJobsByProject(projectId: string): Promise<BatchJob[]> {
  const all = await getAllJobs();
  return all.filter((j) => j.projectId === projectId);
}

export async function getJobById(id: string): Promise<BatchJob | undefined> {
  await loadJobs();
  return _jobs.get(id);
}

export async function addJob(job: BatchJob): Promise<void> {
  await loadJobs();
  _jobs.set(job.id, job);
  await saveJobs();
}

export async function updateJob(id: string, patch: Partial<BatchJob>): Promise<BatchJob | null> {
  await loadJobs();
  const j = _jobs.get(id);
  if (!j) return null;
  const updated = { ...j, ...patch, updatedAt: new Date().toISOString() };
  _jobs.set(id, updated);
  await saveJobs();
  batchJobEvents.emit('update', updated);
  return updated;
}

export async function cancelJob(id: string): Promise<boolean> {
  const j = _jobs.get(id);
  if (!j || j.status === 'done') return false;
  await updateJob(id, { status: 'cancelled' });
  return true;
}

// ── 轮询策略常量 ─────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 20_000;              // 主循环 tick 间隔（20s，原 30s 太慢）
const MAX_JOB_AGE_MS = 12 * 3600_000;         // 12 小时 TTL（原 4 小时太激进——即梦偶尔会排队超过 4 小时）

/**
 * 高级制片任务的轮询间隔：指数退避（v0.63 加速）
 * - 0-5 分钟：每 20s 轮询一次（原 45s；即梦视频常 1-3 分钟完成，前期 poll 密一点能让 UI 更快拿到结果）
 * - 5-15 分钟：每 45s 轮询（原 90s）
 * - 15 分钟以上：每 90s 轮询（原 180s）
 * 不再设置 PRODUCTION_DELAY_MS 首轮延时——新 job 在下一个 tick（≤20s）就会被 poll。
 */
function getProductionPollInterval(ageMs: number): number {
  if (ageMs < 5 * 60_000) return 20_000;
  if (ageMs < 15 * 60_000) return 45_000;
  return 90_000;
}

/** 判断某个 job 在本次 tick 中是否应该轮询 */
function shouldPollJob(job: BatchJob): boolean {
  if (job.source === 'production') {
    const ageMs = Date.now() - new Date(job.createdAt).getTime();
    const lastPoll = job.lastPolledAt ? new Date(job.lastPolledAt).getTime() : 0;
    // lastPoll=0 代表从未轮询过，立即轮询（取消过去的 45s 首轮延时）
    if (!lastPoll) return true;
    return Date.now() - lastPoll >= getProductionPollInterval(ageMs);
  }
  // quickfilm / 其它来源：每次 tick 都轮询
  return true;
}

// ── QuickFilm 串行提交：当一个分镜完成/失败后自动提交同项目下一个 ──────────

async function submitNextQuickfilmShot(completedJob: BatchJob): Promise<void> {
  if (completedJob.source !== 'quickfilm') return;

  const all = Array.from(_jobs.values());
  const next = all
    .filter((j) => j.projectId === completedJob.projectId && j.status === 'awaiting_submit' && j.submitParams)
    .sort((a, b) => a.shotIndex - b.shotIndex)[0];
  if (!next) return;

  console.log(`[batch-jobs] quickfilm auto-submit: shot ${next.shotIndex} (${next.id}) for project ${next.projectId}`);
  const params = next.submitParams!;
  try {
    const { submitId, taskId } = await submitDreaminaVideo({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio as '9:16' | '16:9' | '1:1',
      duration: params.duration,
      model: params.model,
      imageBase64: params.imageBase64,
      imageMimeType: params.imageMimeType,
    });
    await updateJob(next.id, {
      status: 'pending',
      submitId,
      taskId: taskId || `dreamina-${submitId}`,
      submitParams: undefined,
    });
    console.log(`[batch-jobs] quickfilm shot ${next.shotIndex} submitted → submitId=${submitId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const is1310 = /ret[=:]\s*1310|ExceedConcurrencyLimit/i.test(msg);
    if (is1310) {
      console.warn(`[batch-jobs] quickfilm shot ${next.shotIndex}: still concurrency-limited, will retry next tick`);
      return;
    }
    console.error(`[batch-jobs] quickfilm shot ${next.shotIndex} submit failed:`, msg);
    await updateJob(next.id, { status: 'failed', failReason: msg, submitParams: undefined });
    void submitNextQuickfilmShot(next).catch(() => {});
  }
}

// ── 单任务轮询核心（供 poller 和 pollJobNow 共用）────────────────────────────

async function pollSingleJob(job: BatchJob): Promise<BatchJob | null> {
  const result = await pollDreaminaTask(job.submitId);
  if (result.phase === 'success' && result.videoUrl) {
    const videoDir = path.join(getApiDataDir(), 'output', 'batch-jobs', 'videos');
    await fs.mkdir(videoDir, { recursive: true });
    const filePath = path.join(videoDir, `${job.id}.mp4`);
    const base64 = result.videoUrl.replace(/^data:video\/mp4;base64,/, '');
    await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
    const updated = await updateJob(job.id, {
      status: 'done',
      videoFilePath: filePath,
      videoUrl: `/api/batch-jobs/video/${job.id}`,
      lastPolledAt: new Date().toISOString(),
    });
    console.log(`[batch-jobs] ${job.id} done → ${filePath}`);
    // 如果是高级制片任务，自动回写到项目 JSON
    if (job.source === 'production' && job.username && job.projectId) {
      void writeBackToProject(job, `/api/batch-jobs/video/${job.id}`).catch((e) =>
        console.warn(`[batch-jobs] write-back failed for ${job.id}:`, e),
      );
    }
    // QuickFilm 串行提交：完成后自动提交下一个分镜
    if (job.source === 'quickfilm') {
      void submitNextQuickfilmShot(job).catch((e) =>
        console.warn(`[batch-jobs] quickfilm auto-submit failed:`, e),
      );
    }
    return updated;
  }
  if (result.phase === 'failed') {
    const reason = result.failReason ?? '生成失败';
    const updated = await updateJob(job.id, {
      status: 'failed',
      failReason: reason,
      lastPolledAt: new Date().toISOString(),
    });
    // 高级制片：失败时也要清掉 production.json 的 pendingVideoSubmitId，
    // 否则 UI 会永远卡在"即梦生成中"——同时写入 lastVideoError 让前端展示失败原因与重试按钮
    if (job.source === 'production' && job.username && job.projectId) {
      void writeBackFailedToProject(job, reason).catch((e) =>
        console.warn(`[batch-jobs] write-back-failed for ${job.id}:`, e),
      );
    }
    // QuickFilm：即使前一个失败，也继续提交下一个
    if (job.source === 'quickfilm') {
      void submitNextQuickfilmShot(job).catch((e) =>
        console.warn(`[batch-jobs] quickfilm auto-submit after failure:`, e),
      );
    }
    return updated;
  }
  // 还在排队/生成中（包含 CLI 瞬时错误：result.transientError 有值时保持 queuing，不升级为 failed）
  if (result.transientError) {
    console.warn(`[batch-jobs] ${job.id} transient poll error: ${result.transientError}`);
  }
  return updateJob(job.id, {
    status: result.genStatus === 'generate' ? 'processing' : 'queuing',
    queueInfo: result.queueInfo,
    lastPolledAt: new Date().toISOString(),
  });
}

// ── 后台轮询循环 ─────────────────────────────────────────────────────────────

let _pollTimer: NodeJS.Timeout | null = null;

export function startBatchJobsPoller(): void {
  if (_pollTimer) return;
  console.log(`[batch-jobs] poller started, tick=${TICK_INTERVAL_MS / 1000}s`);
  const tick = async () => {
    try {
      await pollPendingJobs();
    } catch (e) {
      console.warn('[batch-jobs] poll tick error', e);
    }
    _pollTimer = setTimeout(tick, TICK_INTERVAL_MS);
  };
  _pollTimer = setTimeout(tick, 5000);
}

async function pollPendingJobs(): Promise<void> {
  await loadJobs();
  const active = Array.from(_jobs.values()).filter(
    (j) => j.status === 'pending' || j.status === 'queuing' || j.status === 'processing',
  );

  // If no active jobs but there are awaiting_submit quickfilm shots, kick off the next one.
  // This handles edge cases like server restart where the trigger chain was interrupted.
  if (active.length === 0) {
    const stalled = Array.from(_jobs.values()).filter(
      (j) => j.status === 'awaiting_submit' && j.source === 'quickfilm' && j.submitParams,
    );
    if (stalled.length > 0) {
      const next = stalled.sort((a, b) => a.shotIndex - b.shotIndex)[0]!;
      console.log(`[batch-jobs] recovering stalled quickfilm queue, submitting shot ${next.shotIndex}`);
      await submitNextQuickfilmShot({ ...next, status: 'done' });
    }
    return;
  }

  // 超龄任务直接标记失败
  const now = Date.now();
  for (const job of active) {
    const ageMs = now - new Date(job.createdAt).getTime();
    if (ageMs > MAX_JOB_AGE_MS) {
      await updateJob(job.id, {
        status: 'failed',
        failReason: `生成超时（超过 ${Math.round(MAX_JOB_AGE_MS / 3600_000)} 小时未完成）`,
      });
    }
  }

  // 筛选本次 tick 需要轮询的任务
  const toPoll = active.filter(
    (j) => j.status !== 'failed' && j.status !== 'done' && j.status !== 'cancelled' && shouldPollJob(j),
  );
  if (toPoll.length === 0) return;

  console.log(`[batch-jobs] polling ${toPoll.length}/${active.length} active jobs`);

  const CONCURRENCY = 3;
  for (let i = 0; i < toPoll.length; i += CONCURRENCY) {
    const batch = toPoll.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (job) => {
        try {
          await pollSingleJob(job);
        } catch (e) {
          console.warn(`[batch-jobs] poll error for ${job.id}:`, e);
        }
      }),
    );
  }
}

// ── 手动立即轮询（用户点"检查进度"时调用）──────────────────────────────────

export async function pollJobNow(jobId: string): Promise<BatchJob | null> {
  await loadJobs();
  const job = _jobs.get(jobId);
  if (!job) return null;
  if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
    return job;
  }
  try {
    return await pollSingleJob(job);
  } catch (e) {
    console.warn(`[batch-jobs] pollJobNow error for ${jobId}:`, e);
    return job;
  }
}

// ── 生产项目回写：视频完成后自动更新项目 JSON ────────────────────────────────

import { sanitizeUsername } from '../utils/safeUsername.js';
import { getDefaultVideoOutputDir } from '../config/apiDataDir.js';

async function writeBackToProject(job: BatchJob, videoApiUrl: string): Promise<void> {
  const username = sanitizeUsername(job.username);
  const projDir = path.join(getDefaultVideoOutputDir(), 'production', 'projects', username);
  const filePath = path.join(projDir, `${job.projectId}.json`);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    console.warn(`[batch-jobs] write-back: project file not found ${filePath}`);
    return;
  }

  const data = JSON.parse(raw) as Record<string, unknown>;
  const project = data.project as Record<string, unknown> | undefined;
  if (!project) return;

  const shots = project.shots as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(shots)) return;

  const shot = shots.find((s) => s.shotIndex === job.shotIndex);
  if (!shot) return;

  const versionId = `batch-${job.id}-${Date.now()}`;
  const newVersion = {
    id: versionId,
    taskId: job.taskId,
    createdAt: Date.now(),
    videoUrl: videoApiUrl,
  };

  const versions = Array.isArray(shot.previewVideoVersions)
    ? shot.previewVideoVersions as Array<Record<string, unknown>>
    : [];
  shot.previewVideoVersions = [newVersion, ...versions];
  shot.selectedPreviewVideoVersionId = versionId;
  shot.previewVideoUrl = videoApiUrl;
  shot.previewVideoPath = undefined;
  shot.pendingVideoSubmitId = undefined;

  data.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

  // 同步更新 sidecar meta
  const metaPath = path.join(projDir, `${job.projectId}.meta.json`);
  try {
    const metaRaw = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);
    meta.updatedAt = data.updatedAt;
    await fs.writeFile(metaPath, JSON.stringify(meta), 'utf8');
  } catch { /* sidecar missing is OK */ }

  console.log(`[batch-jobs] write-back: shot ${job.shotIndex} of project ${job.projectId} updated`);
}

/**
 * 失败回写：如果 production.json 里 shot 的 pendingVideoSubmitId 还是这个 job 的 submitId,
 * 则清掉 pending 并写入 lastVideoError,让 UI 显示"失败 + 可重试"而不是永远"提交中"。
 * 如果同 shot 还有别的 pending submitId（用户多次重试），不动——交给那条成功时再处理。
 */
async function writeBackFailedToProject(job: BatchJob, reason: string): Promise<void> {
  const username = sanitizeUsername(job.username);
  const projDir = path.join(getDefaultVideoOutputDir(), 'production', 'projects', username);
  const filePath = path.join(projDir, `${job.projectId}.json`);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch {
    return;
  }

  const data = JSON.parse(raw) as Record<string, unknown>;
  const project = data.project as Record<string, unknown> | undefined;
  if (!project) return;
  const shots = project.shots as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(shots)) return;

  const shot = shots.find((s) => s.shotIndex === job.shotIndex);
  if (!shot) return;

  // 幂等：shot 已经有视频了就不报错（成功优先）
  if (shot.previewVideoUrl || shot.previewVideoPath) return;

  // 只在 pending 仍然指向本 job 时清；否则可能用户已经在重试了
  if (shot.pendingVideoSubmitId && shot.pendingVideoSubmitId !== job.submitId) return;

  shot.pendingVideoSubmitId = undefined;
  (shot as Record<string, unknown>).lastVideoError = {
    submitId: job.submitId,
    jobId: job.id,
    reason,
    at: new Date().toISOString(),
  };

  data.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');

  const metaPath = path.join(projDir, `${job.projectId}.meta.json`);
  try {
    const metaRaw = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);
    meta.updatedAt = data.updatedAt;
    await fs.writeFile(metaPath, JSON.stringify(meta), 'utf8');
  } catch { /* ok */ }

  console.log(`[batch-jobs] write-back-failed: shot ${job.shotIndex} of project ${job.projectId} -> ${reason}`);
}
