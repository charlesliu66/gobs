import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import path from 'path';
import { getApiDataDir } from '../config/apiDataDir.js';
import { extractDreaminaSubmitKeyFromPath, type OutputRecentVideoEntry } from './dreaminaRecentSync.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

export type OutputGallerySource = 'dreamina' | 'other';
export type OutputGalleryView = 'visible' | 'hidden';

export interface OutputGalleryItem extends OutputRecentVideoEntry {
  source: OutputGallerySource;
  hiddenKey: string;
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
