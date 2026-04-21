import {
  isDreaminaEnabled,
  listDreaminaTasks,
  pollDreaminaTask,
  type DreaminaListedTask,
} from './dreaminaVideo.js';
import { persistVideoUrlToOutput } from './videoUtils.js';

export const DREAMINA_RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_RECENT_LIST_LIMIT = 120;
const DEFAULT_MAX_SYNC = 24;

function toDreaminaSubmitKey(value: string): string | undefined {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized ? normalized.slice(0, 12) : undefined;
}

export function extractDreaminaSubmitKeyFromPath(videoPath: string): string | undefined {
  const base = videoPath.split('/').pop() || videoPath;
  const match = base.match(/dreamina[_-]([a-z0-9]+)(?:[_-]\d{10,13})?\.(mp4|mov|webm|mkv)$/i);
  return match?.[1]?.toLowerCase();
}

export function selectDreaminaTasksForBackfill(
  tasks: DreaminaListedTask[],
  existingPaths: string[],
  options: {
    nowMs?: number;
    maxAgeMs?: number;
    maxTasks?: number;
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

  for (const task of tasks) {
    if ((task.genStatus ?? '').toLowerCase() !== 'success') continue;
    if (typeof task.createMs === 'number' && Number.isFinite(task.createMs) && nowMs - task.createMs > maxAgeMs) {
      continue;
    }
    const submitKey = toDreaminaSubmitKey(task.submitId);
    if (!submitKey) continue;
    if (existingKeys.has(submitKey) || seenKeys.has(submitKey)) continue;
    seenKeys.add(submitKey);
    out.push(task);
    if (out.length >= maxTasks) break;
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
  if (!isDreaminaEnabled()) {
    return { synced: 0, attempted: 0 };
  }

  let listed: DreaminaListedTask[] = [];
  try {
    listed = await listDreaminaTasks({
      limit: Math.max(1, Math.min(options.listLimit ?? DEFAULT_RECENT_LIST_LIMIT, DEFAULT_RECENT_LIST_LIMIT)),
    });
  } catch (error) {
    console.warn('[dreaminaRecentSync] list_task failed:', error instanceof Error ? error.message : String(error));
    return { synced: 0, attempted: 0 };
  }

  const candidates = selectDreaminaTasksForBackfill(listed, options.existingPaths, {
    nowMs: options.nowMs,
    maxTasks: options.maxSync ?? DEFAULT_MAX_SYNC,
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
}
