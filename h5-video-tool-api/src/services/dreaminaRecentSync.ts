import {
  isDreaminaEnabled,
  listDreaminaTasks,
  pollDreaminaTask,
  type DreaminaListedTask,
} from './dreaminaVideo.js';
import { persistVideoUrlToOutput } from './videoUtils.js';
import { listOwnedDreaminaSubmitIds } from './dreaminaRecovery.js';
import fsSync from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

export const DREAMINA_RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_RECENT_LIST_LIMIT = 120;
const DEFAULT_MAX_SYNC = 24;
const DEFAULT_LIST_PAGE_SIZE = 20;
const ACTIVE_SYNC_BY_USER = new Map<string, Promise<{ synced: number; attempted: number }>>();

export interface OutputRecentVideoEntry {
  path: string;
  mtimeMs: number;
  size: number;
}

function toDreaminaSubmitKey(value: string): string | undefined {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized ? normalized.slice(0, 12) : undefined;
}

function toSyncUserKey(username?: string): string {
  const trimmed = username?.trim().toLowerCase();
  return trimmed || '_default';
}

function ensureDreaminaRuntimeHints(): void {
  if (process.platform === 'win32') return;

  if (!process.env.DREAMINA_BIN?.trim()) {
    const home = os.homedir();
    const candidates = [
      path.join(home, '.local', 'bin', 'dreamina'),
      path.join(home, '.dreamina_cli', 'dreamina'),
    ];
    const hit = candidates.find((item) => fsSync.existsSync(item));
    if (hit) {
      process.env.DREAMINA_BIN = hit;
      process.env.DREAMINA_PATH_PREFIX = `${path.dirname(hit)}${path.delimiter}${process.env.DREAMINA_PATH_PREFIX ?? ''}`;
    }
  }

  if (!process.env.DREAMINA_SCRIPTS_DIR?.trim()) {
    const scriptCandidates = [
      path.resolve(process.cwd(), '..', '.cursor', 'skills', 'dreamina-cli-skill', 'scripts'),
      path.resolve(process.cwd(), '.cursor', 'skills', 'dreamina-cli-skill', 'scripts'),
    ];
    const hit = scriptCandidates.find((item) => fsSync.existsSync(path.join(item, 'list_task.py')));
    if (hit) {
      process.env.DREAMINA_SCRIPTS_DIR = hit;
    }
  }
}

function getDreaminaScriptsDirForSync(): string {
  const env = process.env.DREAMINA_SCRIPTS_DIR?.trim();
  if (env) return path.resolve(env);
  return path.resolve(process.cwd(), '..', '.cursor', 'skills', 'dreamina-cli-skill', 'scripts');
}

function getPythonExecutableForSync(): string {
  const env = process.env.PYTHON_EXE?.trim();
  if (env) {
    return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  }
  if (process.platform === 'win32') return 'python';
  return 'python3';
}

function buildDreaminaSpawnEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const bin = process.env.DREAMINA_BIN?.trim();
  if (bin) {
    const abs = path.isAbsolute(bin) ? bin : path.resolve(process.cwd(), bin);
    const binDir = path.dirname(abs);
    if (fsSync.existsSync(binDir)) {
      env.PATH = `${binDir}${path.delimiter}${env.PATH ?? ''}`;
    }
  }
  const extra = process.env.DREAMINA_PATH_PREFIX?.trim();
  if (extra) {
    env.PATH = `${extra}${path.delimiter}${env.PATH ?? ''}`;
  }
  return env;
}

function normalizeDreaminaListedTasks(rawData: unknown): DreaminaListedTask[] {
  let raws: unknown[] = [];
  if (Array.isArray(rawData)) raws = rawData;
  else if (rawData && typeof rawData === 'object') {
    const data = rawData as Record<string, unknown>;
    for (const key of ['list', 'tasks', 'data', 'items', 'result']) {
      const value = data[key];
      if (Array.isArray(value)) {
        raws = value;
        break;
      }
    }
  }

  const out: DreaminaListedTask[] = [];
  for (const raw of raws) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>;
    const submitId = String(record.submit_id ?? record.submitId ?? '').trim();
    if (!submitId) continue;
    const genStatus = String(record.gen_status ?? record.genStatus ?? '').trim().toLowerCase();
    const taskType = String(record.gen_task_type ?? record.genTaskType ?? record.task_type ?? '').trim();
    const prompt = String(record.prompt ?? record.text_prompt ?? record.user_prompt ?? '').trim();
    const createTime = record.create_time ?? record.createTime ?? record.created_at ?? record.createdAt;

    let createMs: number | undefined;
    if (typeof createTime === 'number' && Number.isFinite(createTime)) {
      createMs = createTime < 1e12 ? createTime * 1000 : createTime;
    } else if (typeof createTime === 'string' && createTime.trim()) {
      const parsed = Date.parse(createTime);
      createMs = Number.isFinite(parsed) ? parsed : undefined;
    }

    out.push({
      submitId,
      genStatus: genStatus || undefined,
      taskType: taskType || undefined,
      prompt: prompt || undefined,
      createMs,
      raw: record,
    });
  }
  return out;
}

async function listDreaminaTasksPageViaWrapper(params: {
  limit: number;
  offset: number;
  genStatus?: 'querying' | 'success' | 'fail';
  genTaskType?: string;
}): Promise<DreaminaListedTask[]> {
  const scriptsDir = getDreaminaScriptsDirForSync();
  const scriptPath = path.join(scriptsDir, 'list_task.py');
  if (!fsSync.existsSync(scriptPath)) {
    throw new Error(`Dreamina list_task wrapper not found: ${scriptPath}`);
  }

  const args = [scriptPath];
  const dreaminaBin = process.env.DREAMINA_BIN?.trim();
  if (dreaminaBin) {
    args.push('--dreamina-bin', dreaminaBin);
  }
  if (params.genStatus) {
    args.push('--gen-status', params.genStatus);
  }
  if (params.genTaskType?.trim()) {
    args.push('--gen-task-type', params.genTaskType.trim());
  }
  args.push('--limit', String(params.limit));
  args.push('--offset', String(params.offset));

  const { stdout, stderr, code } = await new Promise<{ stdout: string; stderr: string; code: number | null }>(
    (resolve, reject) => {
      const outChunks: Buffer[] = [];
      const errChunks: Buffer[] = [];
      const proc = spawn(getPythonExecutableForSync(), args, {
        cwd: scriptsDir,
        env: buildDreaminaSpawnEnv(),
        windowsHide: true,
      });
      proc.stdout?.on('data', (chunk) => outChunks.push(chunk as Buffer));
      proc.stderr?.on('data', (chunk) => errChunks.push(chunk as Buffer));
      proc.on('error', reject);
      proc.on('close', (exitCode) => {
        resolve({
          stdout: Buffer.concat(outChunks).toString('utf8'),
          stderr: Buffer.concat(errChunks).toString('utf8'),
          code: exitCode,
        });
      });
    },
  );

  if (code !== 0 && !stdout.trim()) {
    throw new Error(stderr.trim() || `Dreamina list_task exited with code ${code ?? 'unknown'}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new Error(`Dreamina list_task returned non-JSON stdout: ${stdout.slice(0, 500)}`);
  }

  const wrap = parsed as { ok?: boolean; error?: string; data?: unknown };
  if (!wrap.ok) {
    throw new Error(wrap.error || 'Dreamina list_task failed');
  }

  return normalizeDreaminaListedTasks(wrap.data);
}

function pushDreaminaBackfillTasks(
  target: DreaminaListedTask[],
  tasks: DreaminaListedTask[],
  options: {
    nowMs: number;
    maxAgeMs: number;
    maxTasks: number;
    existingKeys: Set<string>;
    seenKeys: Set<string>;
    allowedSubmitKeys?: Set<string>;
  },
): void {
  for (const task of tasks) {
    if (target.length >= options.maxTasks) return;
    if ((task.genStatus ?? '').toLowerCase() !== 'success') continue;
    if (typeof task.createMs === 'number' && Number.isFinite(task.createMs) && options.nowMs - task.createMs > options.maxAgeMs) {
      continue;
    }
    const submitKey = toDreaminaSubmitKey(task.submitId);
    if (!submitKey) continue;
    if (options.allowedSubmitKeys && !options.allowedSubmitKeys.has(submitKey)) continue;
    if (options.existingKeys.has(submitKey) || options.seenKeys.has(submitKey)) continue;
    options.seenKeys.add(submitKey);
    target.push(task);
  }
}

export function extractDreaminaSubmitKeyFromPath(videoPath: string): string | undefined {
  const base = videoPath.split('/').pop() || videoPath;
  const match = base.match(/dreamina[_-]([a-z0-9]+)(?:[_-]\d{10,13})?\.(mp4|mov|webm|mkv)$/i);
  return match?.[1]?.toLowerCase();
}

export function dedupeOutputRecentVideoItems(items: OutputRecentVideoEntry[]): {
  items: OutputRecentVideoEntry[];
  collapsedCount: number;
} {
  const byDreaminaSubmitKey = new Map<string, OutputRecentVideoEntry>();
  const passthrough: OutputRecentVideoEntry[] = [];
  let collapsedCount = 0;

  for (const item of items) {
    const submitKey = extractDreaminaSubmitKeyFromPath(item.path);
    if (!submitKey) {
      passthrough.push(item);
      continue;
    }
    const previous = byDreaminaSubmitKey.get(submitKey);
    if (!previous) {
      byDreaminaSubmitKey.set(submitKey, item);
      continue;
    }
    collapsedCount++;
    const shouldReplace =
      item.size > previous.size || (item.size === previous.size && item.mtimeMs > previous.mtimeMs);
    if (shouldReplace) {
      byDreaminaSubmitKey.set(submitKey, item);
    }
  }

  const dedupedItems = [...passthrough, ...byDreaminaSubmitKey.values()].sort((a, b) => b.mtimeMs - a.mtimeMs);
  return { items: dedupedItems, collapsedCount };
}

export function selectDreaminaTasksForBackfill(
  tasks: DreaminaListedTask[],
  existingPaths: string[],
  options: {
    nowMs?: number;
    maxAgeMs?: number;
    maxTasks?: number;
    allowedSubmitKeys?: Set<string>;
  } = {},
): DreaminaListedTask[] {
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? DREAMINA_RECENT_WINDOW_MS;
  const maxTasks = Math.max(1, options.maxTasks ?? DEFAULT_MAX_SYNC);
  const existingKeys = new Set(
    existingPaths
      .map((item) => extractDreaminaSubmitKeyFromPath(item))
      .filter((item): item is string => !!item),
  );
  const seenKeys = new Set<string>();
  const out: DreaminaListedTask[] = [];
  pushDreaminaBackfillTasks(out, tasks, { nowMs, maxAgeMs, maxTasks, existingKeys, seenKeys, allowedSubmitKeys: options.allowedSubmitKeys });
  return out;
}

export async function collectDreaminaBackfillCandidates(options: {
  existingPaths: string[];
  listPage: (params: { limit: number; offset: number }) => Promise<DreaminaListedTask[]>;
  nowMs?: number;
  maxAgeMs?: number;
  maxTasks?: number;
  pageSize?: number;
  maxPages?: number;
  allowedSubmitKeys?: Set<string>;
}): Promise<DreaminaListedTask[]> {
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? DREAMINA_RECENT_WINDOW_MS;
  const maxTasks = Math.max(1, options.maxTasks ?? DEFAULT_MAX_SYNC);
  const pageSize = Math.max(1, Math.min(options.pageSize ?? DEFAULT_LIST_PAGE_SIZE, 200));
  const maxPages = Math.max(1, options.maxPages ?? Math.ceil(DEFAULT_RECENT_LIST_LIMIT / pageSize));
  const existingKeys = new Set(
    options.existingPaths
      .map((item) => extractDreaminaSubmitKeyFromPath(item))
      .filter((item): item is string => !!item),
  );
  const seenKeys = new Set<string>();
  const out: DreaminaListedTask[] = [];

  for (let pageIndex = 0; pageIndex < maxPages && out.length < maxTasks; pageIndex++) {
    const offset = pageIndex * pageSize;
    const tasks = await options.listPage({ limit: pageSize, offset });
    if (!tasks.length) break;
    pushDreaminaBackfillTasks(out, tasks, {
      nowMs,
      maxAgeMs,
      maxTasks,
      existingKeys,
      seenKeys,
      allowedSubmitKeys: options.allowedSubmitKeys,
    });
    if (tasks.length < pageSize) break;
  }

  return out;
}

export async function syncRecentDreaminaOutputs(options: {
  username?: string;
  existingPaths: string[];
  nowMs?: number;
  listLimit?: number;
  maxSync?: number;
}): Promise<{ synced: number; attempted: number }> {
  ensureDreaminaRuntimeHints();
  if (!isDreaminaEnabled()) {
    return { synced: 0, attempted: 0 };
  }

  try {
    const allowedSubmitKeys = new Set(
      (await listOwnedDreaminaSubmitIds(options.username))
        .map((item) => toDreaminaSubmitKey(item))
        .filter((item): item is string => !!item),
    );
    if (options.username?.trim() && allowedSubmitKeys.size === 0) {
      return { synced: 0, attempted: 0 };
    }

    const requestedLimit = Math.max(1, Math.min(options.listLimit ?? DEFAULT_RECENT_LIST_LIMIT, DEFAULT_RECENT_LIST_LIMIT));
    const pageSize = Math.min(DEFAULT_LIST_PAGE_SIZE, requestedLimit);
    const maxPages = Math.max(1, Math.ceil(requestedLimit / pageSize));
    const candidates = await collectDreaminaBackfillCandidates({
      existingPaths: options.existingPaths,
      nowMs: options.nowMs,
      maxTasks: options.maxSync ?? DEFAULT_MAX_SYNC,
      pageSize,
      maxPages,
      allowedSubmitKeys,
      listPage: async ({ limit, offset }) => {
        try {
          return await listDreaminaTasksPageViaWrapper({ limit, offset, genStatus: 'success' });
        } catch (error) {
          if (offset > 0) throw error;
          console.warn(
            '[dreaminaRecentSync] direct paged list_task failed, falling back to base helper:',
            error instanceof Error ? error.message : String(error),
          );
          return listDreaminaTasks({ limit, genStatus: 'success' });
        }
      },
    });

    let synced = 0;
    let attempted = 0;
    for (const task of candidates) {
      attempted++;
      try {
        const polled = await pollDreaminaTask(task.submitId);
        if (polled.phase !== 'success' || !polled.videoUrl) continue;
        const submitKey = toDreaminaSubmitKey(task.submitId) ?? 'dreamina';
        const savedPath = await persistVideoUrlToOutput(polled.videoUrl, `dreamina_${submitKey}`, options.username);
        if (savedPath) synced++;
      } catch (error) {
        console.warn(
          `[dreaminaRecentSync] backfill failed for ${task.submitId}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return { synced, attempted };
  } catch (error) {
    console.warn('[dreaminaRecentSync] list_task failed:', error instanceof Error ? error.message : String(error));
    return { synced: 0, attempted: 0 };
  }
}

export async function runRecentDreaminaSyncLocked(options: {
  username?: string;
  existingPaths: string[];
  nowMs?: number;
  listLimit?: number;
  maxSync?: number;
}): Promise<{ synced: number; attempted: number; joinedExisting: boolean }> {
  const userKey = toSyncUserKey(options.username);
  const active = ACTIVE_SYNC_BY_USER.get(userKey);
  if (active) {
    const result = await active;
    return { ...result, joinedExisting: true };
  }

  const task = syncRecentDreaminaOutputs(options).finally(() => {
    ACTIVE_SYNC_BY_USER.delete(userKey);
  });
  ACTIVE_SYNC_BY_USER.set(userKey, task);
  const result = await task;
  return { ...result, joinedExisting: false };
}
