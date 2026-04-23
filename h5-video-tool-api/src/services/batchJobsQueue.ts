import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { getApiDataDir, getDefaultVideoOutputDir } from '../config/apiDataDir.js';
import { pollDreaminaTask, submitDreaminaVideo } from './dreaminaVideo.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import { scheduleTick } from './dreaminaScheduler.js';
import {
  computeSnapshotFromJobs,
  deriveQueuePositionPatches,
  isActiveStatus,
} from './queueSnapshot.js';

export const batchJobEvents = new EventEmitter();
batchJobEvents.setMaxListeners(50);

export type BatchJobStatus =
  | 'awaiting_submit'
  | 'pending'
  | 'queuing'
  | 'processing'
  | 'done'
  | 'failed'
  | 'cancelled';

export interface BatchJobSubmitParams {
  storyboardText?: string;
  prompt?: string;
  aspectRatio: string;
  duration: number;
  model: string;
  imageBase64?: string;
  imageMimeType?: string;
  multimodalImages?: Array<{ base64: string; mimeType?: string }>;
  dreaminaModelVersion?: string;
}

export interface BatchJob {
  id: string;
  submitId: string;
  taskId: string;
  projectId: string;
  shotIndex: number;
  shotDescription: string;
  model: string;
  source?: 'production' | 'quickfilm';
  username?: string;
  status: BatchJobStatus;
  createdAt: string;
  updatedAt: string;
  lastPolledAt?: string;
  videoUrl?: string;
  videoFilePath?: string;
  failReason?: string;
  queueInfo?: {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
  };
  submitParams?: BatchJobSubmitParams;
  cancelReason?: 'user' | 'project_deleted' | 'admin';
  cancelledAt?: string;
  globalQueuePos?: number;
  etaSec?: number;
  submitAttempts?: number;
}

export interface CancelResult {
  ok: boolean;
  wasteCredit: boolean;
  note: string;
  reason?: 'not_found' | 'already_terminal' | 'forbidden';
}

export interface QueueSnapshot {
  totalActive: number;
  totalWaiting: number;
  avgSecPerJob: number;
}

export interface BatchJobPromptCandidate {
  submitId: string;
  text: string;
  priority: number;
}

const JOBS_FILE = path.join(getApiDataDir(), 'output', 'batch-jobs', 'jobs.json');
const TICK_INTERVAL_MS = 20_000;
const MAX_JOB_AGE_MS = 12 * 3600_000;

let jobs = new Map<string, BatchJob>();
let loaded = false;
let pollTimer: NodeJS.Timeout | null = null;
let schedulerRunning = false;
let schedulerPending = false;
let lastSnapshotKey = '';

async function ensureDir() {
  await fs.mkdir(path.dirname(JOBS_FILE), { recursive: true });
}

async function loadJobs(): Promise<void> {
  if (loaded) return;
  await ensureDir();
  try {
    if (fsSync.existsSync(JOBS_FILE)) {
      const raw = await fs.readFile(JOBS_FILE, 'utf8');
      const parsed = JSON.parse(raw) as BatchJob[];
      jobs = new Map(parsed.map((job) => [job.id, job]));
    }
  } catch (error) {
    console.warn('[batch-jobs] load failed', error);
  }
  loaded = true;
}

async function saveJobs(): Promise<void> {
  await ensureDir();
  await fs.writeFile(JOBS_FILE, JSON.stringify(Array.from(jobs.values()), null, 2), 'utf8');
}

function cloneJob(job: BatchJob): BatchJob {
  return { ...job };
}

async function applyJobPatch(
  id: string,
  patch: Partial<BatchJob>,
  options?: { save?: boolean; emit?: boolean; touchUpdatedAt?: boolean },
): Promise<BatchJob | null> {
  await loadJobs();
  const current = jobs.get(id);
  if (!current) return null;
  const updated: BatchJob = {
    ...current,
    ...patch,
    updatedAt: options?.touchUpdatedAt === false ? current.updatedAt : new Date().toISOString(),
  };
  jobs.set(id, updated);
  if (options?.save !== false) {
    await saveJobs();
  }
  if (options?.emit !== false) {
    batchJobEvents.emit('update', cloneJob(updated));
  }
  return cloneJob(updated);
}

function getCurrentJobs(): BatchJob[] {
  return Array.from(jobs.values()).map(cloneJob);
}

async function emitQueueSnapshot(): Promise<void> {
  const snapshot = computeSnapshotFromJobs(getCurrentJobs());
  const key = JSON.stringify(snapshot);
  if (key === lastSnapshotKey) return;
  lastSnapshotKey = key;
  batchJobEvents.emit('queue-snapshot', snapshot);
}

async function recomputeQueuePositions(): Promise<void> {
  await loadJobs();
  const all = getCurrentJobs();
  const patches = deriveQueuePositionPatches(all);
  let dirty = false;
  const changedJobs: BatchJob[] = [];

  for (const current of all) {
    const patch = patches.get(current.id);
    const nextPos = patch?.globalQueuePos;
    const nextEta = patch?.etaSec;
    if (current.globalQueuePos === nextPos && current.etaSec === nextEta) {
      continue;
    }
    const updated = { ...current, globalQueuePos: nextPos, etaSec: nextEta };
    jobs.set(current.id, updated);
    dirty = true;
    changedJobs.push(updated);
  }

  if (dirty) {
    await saveJobs();
    for (const updated of changedJobs) {
      batchJobEvents.emit('update', cloneJob(updated));
    }
  }
  await emitQueueSnapshot();
}

async function requestScheduleTick(): Promise<void> {
  if (schedulerRunning) {
    schedulerPending = true;
    return;
  }
  schedulerRunning = true;
  try {
    do {
      schedulerPending = false;
      try {
        await scheduleTick({
          listJobs: async () => {
            await loadJobs();
            return getCurrentJobs();
          },
          getJob: async (id) => {
            await loadJobs();
            const job = jobs.get(id);
            return job ? cloneJob(job) : undefined;
          },
          markSubmitted: async (id, payload) =>
            applyJobPatch(id, {
              status: 'pending',
              submitId: payload.submitId,
              taskId: payload.taskId,
              submitParams: undefined,
              failReason: undefined,
            }),
          markRetry: async (id, attempts) =>
            applyJobPatch(id, { submitAttempts: attempts }),
          markFailed: async (id, failReason, attempts) => {
            const updated = await applyJobPatch(id, {
              status: 'failed',
              failReason,
              submitAttempts: attempts,
              submitParams: undefined,
              globalQueuePos: undefined,
              etaSec: undefined,
            });
            if (updated?.source === 'production' && updated.username) {
              await writeBackFailedToProject(updated, failReason);
            }
            return updated;
          },
          onProductionSubmitted: async (job) => {
            if (job.username) {
              await writeBackSubmittedToProject(job);
            }
          },
        });
      } catch (error) {
        console.warn('[batch-jobs] scheduleTick failed', error);
      }
    } while (schedulerPending);
  } finally {
    schedulerRunning = false;
  }
}

async function queueMaintenance(): Promise<void> {
  await recomputeQueuePositions();
  await requestScheduleTick();
  await recomputeQueuePositions();
}

export async function getAllJobs(): Promise<BatchJob[]> {
  await loadJobs();
  return getCurrentJobs().sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export async function listOwnedBatchJobPromptCandidates(username?: string): Promise<BatchJobPromptCandidate[]> {
  const trimmed = username?.trim();
  if (!trimmed) return [];

  const jobsForUser = (await getAllJobs()).filter((job) => job.submitId && (job.username ?? '').trim() === trimmed);
  const candidates: BatchJobPromptCandidate[] = [];

  for (const job of jobsForUser) {
    const promptText = job.submitParams?.storyboardText?.trim() || job.submitParams?.prompt?.trim();
    if (promptText) {
      candidates.push({
        submitId: job.submitId,
        text: promptText,
        priority: 40,
      });
    }

    const shotDescription = job.shotDescription?.trim();
    if (shotDescription) {
      candidates.push({
        submitId: job.submitId,
        text: shotDescription,
        priority: 10,
      });
    }
  }

  return candidates;
}

export async function getJobsByProject(projectId: string): Promise<BatchJob[]> {
  const all = await getAllJobs();
  return all.filter((job) => job.projectId === projectId);
}

export async function getJobById(id: string): Promise<BatchJob | undefined> {
  await loadJobs();
  const job = jobs.get(id);
  return job ? cloneJob(job) : undefined;
}

export async function addJob(job: BatchJob): Promise<void> {
  await loadJobs();
  jobs.set(job.id, job);
  await saveJobs();
  batchJobEvents.emit('update', cloneJob(job));
  await queueMaintenance();
}

export async function updateJob(id: string, patch: Partial<BatchJob>): Promise<BatchJob | null> {
  const updated = await applyJobPatch(id, patch);
  if (updated) {
    await queueMaintenance();
  }
  return updated;
}

function buildCancelResult(status: BatchJobStatus): CancelResult {
  if (status === 'awaiting_submit') {
    return { ok: true, wasteCredit: false, note: '已从队列移除，未消耗积分' };
  }
  if (status === 'processing') {
    return { ok: true, wasteCredit: true, note: '任务已在即梦 GPU 渲染中，本次积分无法退回' };
  }
  return {
    ok: true,
    wasteCredit: false,
    note: '已通知平台不再跟进，即梦侧一般不会扣积分（无保证）',
  };
}

export async function cancelJob(
  id: string,
  reason: BatchJob['cancelReason'] = 'user',
): Promise<CancelResult> {
  await loadJobs();
  const job = jobs.get(id);
  if (!job) {
    return { ok: false, wasteCredit: false, note: '任务不存在', reason: 'not_found' };
  }
  if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
    return { ok: false, wasteCredit: false, note: '任务已是终态', reason: 'already_terminal' };
  }

  const result = buildCancelResult(job.status);
  const updated = await applyJobPatch(id, {
    status: 'cancelled',
    cancelReason: reason,
    cancelledAt: new Date().toISOString(),
    submitParams: undefined,
    globalQueuePos: undefined,
    etaSec: undefined,
  });
  if (updated?.source === 'production' && updated.username) {
    await writeBackCancelledToProject(updated, result.note);
  }
  await queueMaintenance();
  return result;
}

function getProductionPollInterval(ageMs: number): number {
  if (ageMs < 5 * 60_000) return 20_000;
  if (ageMs < 15 * 60_000) return 45_000;
  return 90_000;
}

function shouldPollJob(job: BatchJob): boolean {
  if (job.source === 'production') {
    const ageMs = Date.now() - new Date(job.createdAt).getTime();
    const lastPollAt = job.lastPolledAt ? new Date(job.lastPolledAt).getTime() : 0;
    if (!lastPollAt) return true;
    return Date.now() - lastPollAt >= getProductionPollInterval(ageMs);
  }
  return true;
}

async function submitNextQuickfilmShot(completedJob: BatchJob): Promise<void> {
  if (completedJob.source !== 'quickfilm') return;
  await loadJobs();
  const next = getCurrentJobs()
    .filter((job) => job.projectId === completedJob.projectId && job.status === 'awaiting_submit' && job.submitParams)
    .sort((a, b) => a.shotIndex - b.shotIndex)[0];
  if (!next?.submitParams) return;

  try {
    const prompt = next.submitParams.storyboardText ?? next.submitParams.prompt ?? '';
    const { submitId, taskId } = await submitDreaminaVideo({
      prompt,
      aspectRatio: next.submitParams.aspectRatio as '9:16' | '16:9' | '1:1',
      duration: next.submitParams.duration,
      model: next.submitParams.model,
      imageBase64: next.submitParams.imageBase64,
      imageMimeType: next.submitParams.imageMimeType,
      modelVersion: next.submitParams.dreaminaModelVersion,
    });
    await applyJobPatch(next.id, {
      status: 'pending',
      submitId,
      taskId: taskId || `dreamina-${submitId}`,
      submitParams: undefined,
    });
    await queueMaintenance();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/ret[=:]\s*1310|ExceedConcurrencyLimit/i.test(message)) {
      return;
    }
    await applyJobPatch(next.id, {
      status: 'failed',
      failReason: message,
      submitParams: undefined,
    });
    void submitNextQuickfilmShot(next).catch(() => {});
  }
}

async function shouldAcceptPollResult(id: string): Promise<boolean> {
  await loadJobs();
  const latest = jobs.get(id);
  if (!latest) return false;
  return latest.status !== 'cancelled' && latest.status !== 'failed' && latest.status !== 'done';
}

async function pollSingleJob(job: BatchJob): Promise<BatchJob | null> {
  if (!job.submitId) return job;
  const result = await pollDreaminaTask(job.submitId);

  if (result.phase === 'success' && result.videoUrl) {
    if (!(await shouldAcceptPollResult(job.id))) return null;
    const videoDir = path.join(getApiDataDir(), 'output', 'batch-jobs', 'videos');
    await fs.mkdir(videoDir, { recursive: true });
    const filePath = path.join(videoDir, `${job.id}.mp4`);
    const base64 = result.videoUrl.replace(/^data:video\/mp4;base64,/, '');
    await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
    if (!(await shouldAcceptPollResult(job.id))) {
      await fs.rm(filePath, { force: true });
      return null;
    }
    const updated = await applyJobPatch(job.id, {
      status: 'done',
      videoFilePath: filePath,
      videoUrl: `/api/batch-jobs/video/${job.id}`,
      lastPolledAt: new Date().toISOString(),
      globalQueuePos: undefined,
      etaSec: undefined,
    });
    if (updated?.source === 'production' && updated.username) {
      await writeBackToProject(updated, `/api/batch-jobs/video/${updated.id}`);
    }
    if (updated?.source === 'quickfilm') {
      void submitNextQuickfilmShot(updated).catch((error) =>
        console.warn('[batch-jobs] quickfilm auto-submit failed', error),
      );
    }
    await queueMaintenance();
    return updated;
  }

  if (result.phase === 'failed') {
    if (!(await shouldAcceptPollResult(job.id))) return null;
    const reason = result.failReason ?? '生成失败';
    const updated = await applyJobPatch(job.id, {
      status: 'failed',
      failReason: reason,
      lastPolledAt: new Date().toISOString(),
      globalQueuePos: undefined,
      etaSec: undefined,
    });
    if (updated?.source === 'production' && updated.username) {
      await writeBackFailedToProject(updated, reason);
    }
    if (updated?.source === 'quickfilm') {
      void submitNextQuickfilmShot(updated).catch((error) =>
        console.warn('[batch-jobs] quickfilm auto-submit after failure failed', error),
      );
    }
    await queueMaintenance();
    return updated;
  }

  if (result.transientError) {
    console.warn(`[batch-jobs] transient poll error for ${job.id}: ${result.transientError}`);
  }
  if (!(await shouldAcceptPollResult(job.id))) return null;
  const updated = await applyJobPatch(job.id, {
    status: result.genStatus === 'generate' ? 'processing' : 'queuing',
    queueInfo: result.queueInfo,
    lastPolledAt: new Date().toISOString(),
  });
  await queueMaintenance();
  return updated;
}

async function pollPendingJobs(): Promise<void> {
  await loadJobs();
  const active = getCurrentJobs().filter((job) => isActiveStatus(job.status));

  if (active.length === 0) {
    const stalledQuickfilm = getCurrentJobs().filter(
      (job) => job.status === 'awaiting_submit' && job.source === 'quickfilm' && job.submitParams,
    );
    if (stalledQuickfilm.length > 0) {
      const next = stalledQuickfilm.sort((a, b) => a.shotIndex - b.shotIndex)[0];
      if (next) {
        await submitNextQuickfilmShot({ ...next, status: 'done' });
      }
    }
    await queueMaintenance();
    return;
  }

  const now = Date.now();
  for (const job of active) {
    const ageMs = now - new Date(job.createdAt).getTime();
    if (ageMs <= MAX_JOB_AGE_MS) continue;
    const updated = await applyJobPatch(job.id, {
      status: 'failed',
      failReason: `生成超时（超过 ${Math.round(MAX_JOB_AGE_MS / 3600_000)} 小时未完成）`,
      globalQueuePos: undefined,
      etaSec: undefined,
    });
    if (updated?.source === 'production' && updated.username) {
      await writeBackFailedToProject(updated, updated.failReason ?? '生成超时');
    }
  }

  const toPoll = active.filter((job) => shouldPollJob(job));
  const concurrency = 3;
  for (let index = 0; index < toPoll.length; index += concurrency) {
    const batch = toPoll.slice(index, index + concurrency);
    await Promise.all(
      batch.map(async (job) => {
        try {
          await pollSingleJob(job);
        } catch (error) {
          console.warn(`[batch-jobs] poll error for ${job.id}`, error);
        }
      }),
    );
  }

  await queueMaintenance();
}

export function startBatchJobsPoller(): void {
  if (pollTimer) return;
  console.log(`[batch-jobs] poller started, tick=${TICK_INTERVAL_MS / 1000}s`);
  void queueMaintenance();
  const tick = async () => {
    try {
      await pollPendingJobs();
    } catch (error) {
      console.warn('[batch-jobs] poll tick error', error);
    }
    pollTimer = setTimeout(tick, TICK_INTERVAL_MS);
  };
  pollTimer = setTimeout(tick, 5000);
}

export async function pollJobNow(jobId: string): Promise<BatchJob | null> {
  await loadJobs();
  const job = jobs.get(jobId);
  if (!job) return null;
  if (!isActiveStatus(job.status)) {
    return cloneJob(job);
  }
  try {
    return await pollSingleJob(cloneJob(job));
  } catch (error) {
    console.warn(`[batch-jobs] pollJobNow error for ${jobId}`, error);
    return cloneJob(job);
  }
}

async function loadProjectShot(job: BatchJob): Promise<{
  data: Record<string, unknown>;
  shot: Record<string, unknown>;
  filePath: string;
  metaPath: string;
} | null> {
  if (!job.username) return null;
  const username = sanitizeUsername(job.username);
  const projectDir = path.join(getDefaultVideoOutputDir(), 'production', 'projects', username);
  const filePath = path.join(projectDir, `${job.projectId}.json`);
  const metaPath = path.join(projectDir, `${job.projectId}.meta.json`);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const project = data.project as Record<string, unknown> | undefined;
    const shots = project?.shots as Array<Record<string, unknown>> | undefined;
    if (!project || !Array.isArray(shots)) return null;
    const shot = shots.find((item) => item.shotIndex === job.shotIndex);
    if (!shot) return null;
    return { data, shot, filePath, metaPath };
  } catch {
    return null;
  }
}

async function persistProjectWriteback(
  data: Record<string, unknown>,
  filePath: string,
  metaPath: string,
): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  try {
    const metaRaw = await fs.readFile(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw) as Record<string, unknown>;
    meta.updatedAt = data.updatedAt;
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  } catch {
    // Missing sidecar is fine.
  }
}

async function writeBackSubmittedToProject(job: BatchJob): Promise<void> {
  const loadedProject = await loadProjectShot(job);
  if (!loadedProject) return;
  const { data, shot, filePath, metaPath } = loadedProject;
  shot.pendingVideoSubmitId = job.submitId;
  shot.lastVideoError = undefined;
  await persistProjectWriteback(data, filePath, metaPath);
}

async function writeBackToProject(job: BatchJob, videoApiUrl: string): Promise<void> {
  const loadedProject = await loadProjectShot(job);
  if (!loadedProject) return;
  const { data, shot, filePath, metaPath } = loadedProject;
  const versionId = `batch-${job.id}-${Date.now()}`;
  const version = {
    id: versionId,
    taskId: job.taskId,
    createdAt: Date.now(),
    videoUrl: videoApiUrl,
    sourceProjectId: job.projectId,
    sourceShotIndex: job.shotIndex,
    batchJobId: job.id,
  };
  const versions = Array.isArray(shot.previewVideoVersions)
    ? shot.previewVideoVersions as Array<Record<string, unknown>>
    : [];
  shot.previewVideoVersions = [version, ...versions];
  shot.selectedPreviewVideoVersionId = versionId;
  shot.previewVideoUrl = videoApiUrl;
  shot.previewVideoPath = undefined;
  shot.pendingVideoSubmitId = undefined;
  shot.lastVideoError = undefined;
  await persistProjectWriteback(data, filePath, metaPath);
}

async function writeBackFailedToProject(job: BatchJob, reason: string, cancelled = false): Promise<void> {
  const loadedProject = await loadProjectShot(job);
  if (!loadedProject) return;
  const { data, shot, filePath, metaPath } = loadedProject;
  if (shot.previewVideoUrl || shot.previewVideoPath) return;
  if (job.submitId && shot.pendingVideoSubmitId && shot.pendingVideoSubmitId !== job.submitId) return;
  shot.pendingVideoSubmitId = undefined;
  shot.lastVideoError = {
    submitId: job.submitId || undefined,
    jobId: job.id,
    reason,
    at: new Date().toISOString(),
    cancelled,
  };
  await persistProjectWriteback(data, filePath, metaPath);
}

async function writeBackCancelledToProject(job: BatchJob, reason: string): Promise<void> {
  await writeBackFailedToProject(job, reason, true);
}
