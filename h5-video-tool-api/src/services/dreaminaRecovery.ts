/**
 * 即梦孤儿任务恢复：
 *   场景：H5 发起 Dreamina 提交，即梦后台实际已经创建了任务（有 submit_id），
 *         但由于 stdout 回传失败 / 服务器重启 / 1310 返错前已立案等原因，
 *         前端永远拿不到 submit_id，视频就会在即梦后台成功却永远飞不回 H5。
 *
 *   思路：提交意图在进入 CLI 前本地持久化（intent）；任何路径失败都保留 intent；
 *         后台定时通过 list_task.py 拉近 50 条任务，按 prompt/时间窗反向匹配，
 *         命中后自动注册进 batch-jobs，现有 poller 会把成片落盘并通过 SSE 推给 H5。
 *
 *   intent 文件：<API_DATA_DIR>/output/batch-jobs/dreamina-intents.json（与 jobs.json 同级，便于排障）
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getApiDataDir } from '../config/apiDataDir.js';
import { listDreaminaTasks, type DreaminaListedTask } from './dreaminaVideo.js';
import { addJob, getAllJobs, type BatchJob } from './batchJobsQueue.js';

// ── 数据结构 ───────────────────────────────────────────────────────────────

export type IntentStatus = 'pending' | 'resolved' | 'expired' | 'error';

export interface DreaminaSubmitIntent {
  id: string;
  username?: string;
  projectId?: string;
  shotIndex?: number;
  shotDescription?: string;
  model: string;
  taskType?: 'video' | 'image' | string;
  /** 最终发给 dreamina 的 prompt（composeDreaminaPrompt 之后的值） */
  prompt: string;
  /** prompt 归一化后的 sha256 前 16 位，用于快速对比 */
  promptFingerprint: string;
  /** prompt 归一化前 80 字符，用于子串匹配兜底 */
  promptPrefix: string;
  /** 用户在 H5 点击提交的时刻（用于时间窗匹配） */
  submittedAt: string;
  /** CLI 失败时的原因，仅诊断用 */
  error?: string;
  status: IntentStatus;
  /** 命中后回填 */
  submitId?: string;
  resolvedAt?: string;
  /** 已经生成的 batch-job id（成功注册后回填，防止重复注册） */
  batchJobId?: string;
}

interface IntentFile {
  version: 1;
  intents: DreaminaSubmitIntent[];
  updatedAt?: string;
}

export interface DreaminaIntentPromptCandidate {
  submitId: string;
  text: string;
  priority: number;
}

// ── 常量 ────────────────────────────────────────────────────────────────────

const INTENT_FILE = path.join(getApiDataDir(), 'output', 'batch-jobs', 'dreamina-intents.json');
/** 超过此时长未命中即标 expired（30min 与即梦排队上限一致） */
const MAX_INTENT_AGE_MS = 30 * 60_000;
/** 匹配时允许的时间窗：提交后 -30s ~ +10min */
const MATCH_WINDOW_BEFORE_MS = 30_000;
const MATCH_WINDOW_AFTER_MS = 10 * 60_000;
/** 每次扫描最多拉多少条最近任务 */
const SCAN_LIST_LIMIT = 50;
/** scanner 轮询间隔（v0.63 从 120s 缩到 45s，让孤儿 submitId 更快被捞回） */
const SCAN_INTERVAL_MS = 45_000;

// ── 内存缓存 & IO ──────────────────────────────────────────────────────────

let _cache: DreaminaSubmitIntent[] | null = null;
let _saveQueue: Promise<void> = Promise.resolve();

function normalizePrompt(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

function fingerprintPrompt(raw: string): { fp: string; prefix: string } {
  const norm = normalizePrompt(raw);
  const fp = crypto.createHash('sha256').update(norm).digest('hex').slice(0, 16);
  return { fp, prefix: norm.slice(0, 80) };
}

async function ensureDir(): Promise<void> {
  await fs.promises.mkdir(path.dirname(INTENT_FILE), { recursive: true });
}

async function loadIntents(): Promise<DreaminaSubmitIntent[]> {
  if (_cache) return _cache;
  try {
    await ensureDir();
    const text = await fs.promises.readFile(INTENT_FILE, 'utf8');
    const parsed = JSON.parse(text) as IntentFile | DreaminaSubmitIntent[];
    const arr = Array.isArray(parsed) ? parsed : parsed?.intents ?? [];
    _cache = Array.isArray(arr) ? arr.filter((x) => x && typeof x === 'object' && x.id) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn('[dreaminaRecovery] load failed:', (e as Error).message);
    }
    _cache = [];
  }
  return _cache;
}

async function saveIntents(): Promise<void> {
  // 串行化，防止并发写坏文件
  _saveQueue = _saveQueue.then(async () => {
    if (!_cache) return;
    await ensureDir();
    const payload: IntentFile = {
      version: 1,
      intents: _cache,
      updatedAt: new Date().toISOString(),
    };
    const tmp = `${INTENT_FILE}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(payload, null, 2), 'utf8');
    await fs.promises.rename(tmp, INTENT_FILE);
  });
  await _saveQueue;
}

// ── 对外 API ───────────────────────────────────────────────────────────────

/** 在即梦 CLI 提交前调用：落一个 pending intent。返回 intentId。 */
export async function recordSubmitIntent(input: {
  username?: string;
  projectId?: string;
  shotIndex?: number;
  shotDescription?: string;
  model: string;
  taskType?: 'video' | 'image' | string;
  prompt: string;
}): Promise<string> {
  const arr = await loadIntents();
  const id = `int_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const { fp, prefix } = fingerprintPrompt(input.prompt);
  const intent: DreaminaSubmitIntent = {
    id,
    username: input.username,
    projectId: input.projectId,
    shotIndex: input.shotIndex,
    shotDescription: input.shotDescription,
    model: input.model,
    taskType: input.taskType ?? 'video',
    prompt: input.prompt.slice(0, 2000),
    promptFingerprint: fp,
    promptPrefix: prefix,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };
  arr.push(intent);
  // 保留最近 200 条，过多的截掉
  if (arr.length > 200) arr.splice(0, arr.length - 200);
  await saveIntents();
  return id;
}

/** CLI 成功返回 submit_id 时调用：立即关闭 intent（不需要扫描介入）。 */
export async function resolveIntentWithSubmitId(intentId: string, submitId: string): Promise<void> {
  const arr = await loadIntents();
  const i = arr.findIndex((x) => x.id === intentId);
  if (i < 0) return;
  arr[i] = {
    ...arr[i],
    status: 'resolved',
    submitId,
    resolvedAt: new Date().toISOString(),
  };
  await saveIntents();
}

/** CLI 抛错时调用：保留 intent 为 pending（允许 scanner 兜底），记录错误仅供排查。 */
export async function markIntentFailed(intentId: string, reason: string): Promise<void> {
  const arr = await loadIntents();
  const i = arr.findIndex((x) => x.id === intentId);
  if (i < 0) return;
  // 保持 pending 让 scanner 有机会恢复；error 字段仅作诊断
  arr[i] = { ...arr[i], error: reason.slice(0, 300) };
  await saveIntents();
}

/** 主要用途：GET /recover/pending */
export async function listPendingIntents(username?: string): Promise<DreaminaSubmitIntent[]> {
  const arr = await loadIntents();
  const now = Date.now();
  return arr.filter((x) => {
    if (x.status !== 'pending') return false;
    if (username && x.username && x.username !== username) return false;
    return now - Date.parse(x.submittedAt) < MAX_INTENT_AGE_MS;
  });
}

export async function listOwnedDreaminaSubmitIds(username?: string): Promise<string[]> {
  const trimmed = username?.trim();
  if (!trimmed) return [];
  const intents = await loadIntents();
  const allJobs = await getAllJobs();
  const out = new Set<string>();

  for (const intent of intents) {
    if (!intent.submitId) continue;
    if ((intent.username ?? '').trim() !== trimmed) continue;
    out.add(intent.submitId);
  }

  for (const job of allJobs) {
    if (!job.submitId) continue;
    if ((job.username ?? '').trim() !== trimmed) continue;
    out.add(job.submitId);
  }

  return [...out];
}

export async function listOwnedDreaminaIntentPromptCandidates(username?: string): Promise<DreaminaIntentPromptCandidate[]> {
  const trimmed = username?.trim();
  if (!trimmed) return [];

  const intents = await loadIntents();
  return intents
    .filter((intent) => intent.submitId && (intent.username ?? '').trim() === trimmed && intent.prompt?.trim())
    .map((intent) => ({
      submitId: intent.submitId!,
      text: intent.prompt.trim(),
      priority: 30,
    }));
}

// ── 匹配逻辑 ───────────────────────────────────────────────────────────────

function tasksToCandidates(
  tasks: DreaminaListedTask[],
  occupiedSubmitIds: Set<string>,
): DreaminaListedTask[] {
  return tasks.filter((t) => t.submitId && !occupiedSubmitIds.has(t.submitId));
}

function findBestMatch(
  intent: DreaminaSubmitIntent,
  candidates: DreaminaListedTask[],
): DreaminaListedTask | null {
  const submittedMs = Date.parse(intent.submittedAt);
  if (!Number.isFinite(submittedMs)) return null;

  const inWindow = candidates.filter((t) => {
    if (t.createMs == null) return true; // 没有时间信息时不作硬过滤
    return (
      t.createMs >= submittedMs - MATCH_WINDOW_BEFORE_MS &&
      t.createMs <= submittedMs + MATCH_WINDOW_AFTER_MS
    );
  });
  if (inWindow.length === 0) return null;

  // 1) 精确 fingerprint 匹配
  for (const c of inWindow) {
    if (!c.prompt) continue;
    const { fp } = fingerprintPrompt(c.prompt);
    if (fp === intent.promptFingerprint) return c;
  }

  // 2) 归一化 prompt 前缀双向包含（dreamina 可能截断或做了微调）
  const prefix = intent.promptPrefix;
  if (prefix.length >= 12) {
    const hits = inWindow.filter((c) => {
      if (!c.prompt) return false;
      const n = normalizePrompt(c.prompt);
      return n.includes(prefix) || prefix.includes(n.slice(0, 80));
    });
    if (hits.length === 1) return hits[0];
    if (hits.length > 1) {
      // 多个 prefix 命中：选时间最近的
      hits.sort((a, b) => Math.abs((a.createMs ?? 0) - submittedMs) - Math.abs((b.createMs ?? 0) - submittedMs));
      return hits[0];
    }
  }

  // 3) 没有 prompt 时的兜底：如果时间窗内只有一个同类型任务，直接绑定
  if (intent.taskType) {
    const typeHits = inWindow.filter((c) => !c.taskType || c.taskType === intent.taskType || c.taskType.includes(intent.taskType!));
    if (typeHits.length === 1) return typeHits[0];
  }

  return null;
}

// ── 扫描 & 注册 ────────────────────────────────────────────────────────────

let _scanRunning = false;

/**
 * 执行一次恢复扫描。返回命中的 intentId 列表。
 * 既可由 scanner 定时调用，也可由手动接口触发。
 */
export async function runRecoveryScan(): Promise<{ matched: string[]; expired: string[]; skipped: number }> {
  if (_scanRunning) return { matched: [], expired: [], skipped: 0 };
  _scanRunning = true;
  try {
    const intents = await loadIntents();
    const now = Date.now();

    // 先把超时的标 expired
    const expired: string[] = [];
    for (const it of intents) {
      if (it.status === 'pending' && now - Date.parse(it.submittedAt) >= MAX_INTENT_AGE_MS) {
        it.status = 'expired';
        expired.push(it.id);
      }
    }

    const pending = intents.filter((x) => x.status === 'pending');
    if (pending.length === 0) {
      if (expired.length) await saveIntents();
      return { matched: [], expired, skipped: 0 };
    }

    // 拉近 50 条任务 + 已存在的 batch-jobs（排除已被占用的 submitId）
    let tasks: DreaminaListedTask[] = [];
    try {
      tasks = await listDreaminaTasks({ limit: SCAN_LIST_LIMIT });
    } catch (e) {
      console.warn('[dreaminaRecovery] list_task failed, skip this round:', (e as Error).message);
      if (expired.length) await saveIntents();
      return { matched: [], expired, skipped: pending.length };
    }

    const allJobs = await getAllJobs();
    const occupied = new Set<string>();
    for (const j of allJobs) if (j.submitId) occupied.add(j.submitId);
    for (const it of intents) if (it.submitId) occupied.add(it.submitId);

    const matched: string[] = [];
    for (const intent of pending) {
      const owner = intent.username?.trim();
      const projectId = intent.projectId?.trim();
      const shotIndex = typeof intent.shotIndex === 'number' && Number.isFinite(intent.shotIndex)
        ? intent.shotIndex
        : null;
      if (!owner || !projectId || shotIndex == null) {
        continue;
      }
      const cands = tasksToCandidates(tasks, occupied);
      if (cands.length === 0) break;
      const hit = findBestMatch(intent, cands);
      if (!hit) continue;

      // 注册 batch-job（复用现有队列逻辑）
      const jobId = `bj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const ts = new Date().toISOString();
      const job: BatchJob = {
        id: jobId,
        submitId: hit.submitId,
        taskId: `dreamina-${hit.submitId}`,
        projectId,
        shotIndex,
        shotDescription: intent.shotDescription ?? '',
        model: intent.model,
        source: 'production',
        username: owner,
        status: 'pending',
        createdAt: ts,
        updatedAt: ts,
      };
      await addJob(job);
      occupied.add(hit.submitId);

      intent.status = 'resolved';
      intent.submitId = hit.submitId;
      intent.resolvedAt = ts;
      intent.batchJobId = jobId;
      matched.push(intent.id);

      console.log(
        `[dreaminaRecovery] 恢复孤儿任务: intent=${intent.id} project=${intent.projectId} shot=${intent.shotIndex} submitId=${hit.submitId}`,
      );
    }

    if (matched.length || expired.length) await saveIntents();
    return { matched, expired, skipped: pending.length - matched.length };
  } finally {
    _scanRunning = false;
  }
}

// ── scanner 生命周期 ──────────────────────────────────────────────────────

let _timer: ReturnType<typeof setInterval> | null = null;

export function startRecoveryScanner(): void {
  if (_timer) return;
  console.log(`[dreaminaRecovery] scanner started (interval=${Math.round(SCAN_INTERVAL_MS / 1000)}s)`);
  _timer = setInterval(() => {
    runRecoveryScan().catch((e) => {
      console.warn('[dreaminaRecovery] scan crashed:', (e as Error).message);
    });
  }, SCAN_INTERVAL_MS);
  // 启动时若已有 pending intent，5s 后立刻跑一次
  setTimeout(() => {
    loadIntents()
      .then((arr) => {
        const hasPending = arr.some((x) => x.status === 'pending');
        if (hasPending) runRecoveryScan().catch(() => void 0);
      })
      .catch(() => void 0);
  }, 5_000);
}

export function stopRecoveryScanner(): void {
  if (_timer) { clearInterval(_timer); _timer = null; }
}
