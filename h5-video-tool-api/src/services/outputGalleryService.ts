import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { getApiDataDir } from '../config/apiDataDir.js';
import { extractDreaminaSubmitKeyFromPath, type OutputRecentVideoEntry } from './dreaminaRecentSync.js';
import { sanitizeUsername } from '../utils/safeUsername.js';
import { listOwnedBatchJobPromptCandidates } from './batchJobsQueue.js';
import { listOwnedDreaminaIntentPromptCandidates } from './dreaminaRecovery.js';

export type OutputGallerySource = 'dreamina' | 'other';
export type OutputGalleryView = 'visible' | 'hidden';
const OUTPUT_PROMPT_SUMMARY_MAX_LENGTH = 280;

export interface OutputGalleryItem extends OutputRecentVideoEntry {
  source: OutputGallerySource;
  hiddenKey: string;
  promptSummary?: string;
}

export interface OutputPromptCandidate {
  submitId: string;
  text: string;
  priority: number;
}

export interface OutputGalleryFilterOptions {
  hiddenPaths: Set<string>;
  view: OutputGalleryView;
  q?: string;
  source?: 'all' | OutputGallerySource;
  minMtimeMs?: number;
}

interface OutputGalleryHiddenStore {
  version: 1;
  users: Record<string, string[] | undefined>;
}

const EMPTY_HIDDEN_STORE: OutputGalleryHiddenStore = {
  version: 1,
  users: {},
};

function hiddenStorePath(): string {
  return path.join(getApiDataDir(), 'output', '.gallery-hidden.json');
}

function normalizeStore(raw: unknown): OutputGalleryHiddenStore {
  if (!raw || typeof raw !== 'object') return EMPTY_HIDDEN_STORE;
  const usersRaw = (raw as { users?: unknown }).users;
  const users: Record<string, string[]> = {};
  if (usersRaw && typeof usersRaw === 'object') {
    for (const [key, value] of Object.entries(usersRaw as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      users[key] = value.map((item) => String(item || '').trim()).filter(Boolean);
    }
  }
  return {
    version: 1,
    users,
  };
}

async function readHiddenStore(): Promise<OutputGalleryHiddenStore> {
  try {
    const raw = await readFile(hiddenStorePath(), 'utf8');
    return normalizeStore(JSON.parse(raw));
  } catch {
    return EMPTY_HIDDEN_STORE;
  }
}

async function writeHiddenStore(store: OutputGalleryHiddenStore): Promise<void> {
  const filePath = hiddenStorePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2), 'utf8');
  await rename(tmp, filePath);
}

export function inferOutputGallerySource(videoPath: string): OutputGallerySource {
  return videoPath.toLowerCase().includes('dreamina') ? 'dreamina' : 'other';
}

export function toOutputGalleryHiddenKey(videoPath: string): string {
  const submitKey = extractDreaminaSubmitKeyFromPath(videoPath);
  if (submitKey) return `dreamina:${submitKey}`;
  return `path:${videoPath}`;
}

export function toOutputGalleryItem(item: OutputRecentVideoEntry): OutputGalleryItem {
  return {
    ...item,
    source: inferOutputGallerySource(item.path),
    hiddenKey: toOutputGalleryHiddenKey(item.path),
  };
}

function normalizeOutputPromptSummary(text: string): string | undefined {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  if (normalized.length <= OUTPUT_PROMPT_SUMMARY_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, OUTPUT_PROMPT_SUMMARY_MAX_LENGTH - 1).trimEnd()}…`;
}

function toSubmitPromptKey(submitId: string): string | undefined {
  const normalized = submitId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized ? normalized.slice(0, 12) : undefined;
}

function selectPreferredPromptCandidate(
  current: OutputPromptCandidate | undefined,
  next: OutputPromptCandidate,
): OutputPromptCandidate {
  if (!current) return next;
  if (next.priority !== current.priority) return next.priority > current.priority ? next : current;
  return next.text.length > current.text.length ? next : current;
}

export function buildOutputPromptSummaryMap(
  items: OutputRecentVideoEntry[],
  candidates: OutputPromptCandidate[],
): Map<string, string> {
  const preferredBySubmitKey = new Map<string, OutputPromptCandidate>();
  for (const candidate of candidates) {
    const promptSummary = normalizeOutputPromptSummary(candidate.text);
    const submitKey = toSubmitPromptKey(candidate.submitId);
    if (!promptSummary || !submitKey) continue;
    preferredBySubmitKey.set(
      submitKey,
      selectPreferredPromptCandidate(preferredBySubmitKey.get(submitKey), {
        ...candidate,
        text: promptSummary,
      }),
    );
  }

  const summaryByPath = new Map<string, string>();
  for (const item of items) {
    const submitKey = extractDreaminaSubmitKeyFromPath(item.path);
    if (!submitKey) continue;
    const preferred = preferredBySubmitKey.get(submitKey);
    if (preferred?.text) {
      summaryByPath.set(item.path, preferred.text);
    }
  }
  return summaryByPath;
}

export async function enrichOutputGalleryItemsForUser(
  username: string,
  items: OutputRecentVideoEntry[],
): Promise<OutputGalleryItem[]> {
  const [batchJobCandidates, intentCandidates] = await Promise.all([
    listOwnedBatchJobPromptCandidates(username),
    listOwnedDreaminaIntentPromptCandidates(username),
  ]);
  const promptSummaryMap = buildOutputPromptSummaryMap(items, [
    ...batchJobCandidates,
    ...intentCandidates,
  ]);

  return items.map((item) => ({
    ...toOutputGalleryItem(item),
    promptSummary: promptSummaryMap.get(item.path),
  }));
}

export function isOutputPathOwnedByUser(username: string, videoPath: string): boolean {
  const sanitized = sanitizeUsername(username);
  const normalized = videoPath.replace(/\\/g, '/');
  return normalized.startsWith(`output/${sanitized}/`);
}

export async function getHiddenOutputPathKeys(username: string): Promise<Set<string>> {
  const store = await readHiddenStore();
  const userKey = sanitizeUsername(username);
  return new Set(store.users[userKey] ?? []);
}

export async function hideOutputPathForUser(username: string, videoPath: string): Promise<number> {
  const store = await readHiddenStore();
  const userKey = sanitizeUsername(username);
  const next = new Set(store.users[userKey] ?? []);
  next.add(toOutputGalleryHiddenKey(videoPath));
  store.users[userKey] = [...next].sort();
  await writeHiddenStore(store);
  return next.size;
}

export async function restoreOutputPathForUser(username: string, videoPath: string): Promise<number> {
  const store = await readHiddenStore();
  const userKey = sanitizeUsername(username);
  const next = new Set(store.users[userKey] ?? []);
  next.delete(toOutputGalleryHiddenKey(videoPath));
  store.users[userKey] = [...next].sort();
  await writeHiddenStore(store);
  return next.size;
}

export function applyOutputGalleryFilters(
  items: OutputGalleryItem[],
  options: OutputGalleryFilterOptions,
): OutputGalleryItem[] {
  const q = options.q?.trim().toLowerCase() ?? '';
  return items.filter((item) => {
    const isHidden = options.hiddenPaths.has(item.hiddenKey);
    if (options.view === 'hidden' ? !isHidden : isHidden) {
      return false;
    }
    if (options.source && options.source !== 'all' && item.source !== options.source) {
      return false;
    }
    if (typeof options.minMtimeMs === 'number' && item.mtimeMs < options.minMtimeMs) {
      return false;
    }
    if (q && !item.path.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });
}
