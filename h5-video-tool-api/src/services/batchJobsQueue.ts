/**
 * 即梦批量任务队列服务
 * 负责：持久化任务列表、后台轮询、结果缓存
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
  status: BatchJobStatus;
  createdAt: string;       // ISO8601
  updatedAt: string;
  videoUrl?: string;       // 成功后的 data URL 或文件路径
  videoFilePath?: string;  // 本地 MP4 路径
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

// ── 后台轮询循环 ────────────────────────────────────────────────────────────

let _pollTimer: NodeJS.Timeout | null = null;
const POLL_INTERVAL_MS = 30_000; // 每 30 秒检查一次

export function startBatchJobsPoller(): void {
  if (_pollTimer) return;
  console.log('[batch-jobs] poller started, interval=30s');
  const tick = async () => {
    try {
      await pollPendingJobs();
    } catch (e) {
      console.warn('[batch-jobs] poll tick error', e);
    }
    _pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
  };
  _pollTimer = setTimeout(tick, 5000); // 启动后 5s 开始第一次
}

async function pollPendingJobs(): Promise<void> {
  await loadJobs();
  const pending = Array.from(_jobs.values()).filter(
    (j) => j.status === 'pending' || j.status === 'queuing' || j.status === 'processing',
  );
  if (pending.length === 0) return;

  console.log(`[batch-jobs] polling ${pending.length} active jobs`);

  // 每次最多并发轮询 3 个，避免占满 CLI 资源
  const CONCURRENCY = 3;
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (job) => {
        try {
          const result = await pollDreaminaTask(job.submitId);
          if (result.phase === 'success' && result.videoUrl) {
            // 把视频保存到本地文件，避免大 JSON
            const videoDir = path.join(getApiDataDir(), 'output', 'batch-jobs', 'videos');
            await fs.mkdir(videoDir, { recursive: true });
            const filePath = path.join(videoDir, `${job.id}.mp4`);
            const base64 = result.videoUrl.replace(/^data:video\/mp4;base64,/, '');
            await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
            await updateJob(job.id, {
              status: 'done',
              videoFilePath: filePath,
              videoUrl: `/api/batch-jobs/video/${job.id}`,
            });
            console.log(`[batch-jobs] ${job.id} done → ${filePath}`);
          } else if (result.phase === 'failed') {
            await updateJob(job.id, {
              status: 'failed',
              failReason: result.failReason ?? '生成失败',
            });
          } else {
            // 还在排队/生成中
            await updateJob(job.id, {
              status: result.genStatus === 'generate' ? 'processing' : 'queuing',
              queueInfo: result.queueInfo,
            });
          }
        } catch (e) {
          console.warn(`[batch-jobs] poll error for ${job.id}:`, e);
        }
      }),
    );
  }
}
