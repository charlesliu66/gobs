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
import { pollDreaminaTask } from './dreaminaVideo.js';

export const batchJobEvents = new EventEmitter();
batchJobEvents.setMaxListeners(50);

export type BatchJobStatus = 'pending' | 'queuing' | 'processing' | 'done' | 'failed' | 'cancelled';

export interface BatchJob {
  id: string;              // 唯一 id，格式 bj_<timestamp>_<random>
  submitId: string;        // 即梦 submit_id
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

const TICK_INTERVAL_MS = 30_000;              // 主循环 tick 间隔（30s）
const PRODUCTION_DELAY_MS = 10 * 60_000;      // production: 提交后 10 分钟内不轮询
const PRODUCTION_POLL_INTERVAL_MS = 5 * 60_000; // production: 10 分钟后每 5 分钟轮询
const MAX_JOB_AGE_MS = 4 * 3600_000;          // 4 小时 TTL，超过标记失败

/** 判断某个 job 在本次 tick 中是否应该轮询 */
function shouldPollJob(job: BatchJob): boolean {
  const ageMs = Date.now() - new Date(job.createdAt).getTime();
  if (job.source === 'production') {
    if (ageMs < PRODUCTION_DELAY_MS) return false;
    const lastPoll = job.lastPolledAt ? new Date(job.lastPolledAt).getTime() : 0;
    return Date.now() - lastPoll >= PRODUCTION_POLL_INTERVAL_MS;
  }
  // quickfilm / 其它来源：每次 tick 都轮询（30s 间隔由主循环保证）
  return true;
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
    return updated;
  }
  if (result.phase === 'failed') {
    return updateJob(job.id, {
      status: 'failed',
      failReason: result.failReason ?? '生成失败',
      lastPolledAt: new Date().toISOString(),
    });
  }
  // 还在排队/生成中
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
  if (active.length === 0) return;

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
