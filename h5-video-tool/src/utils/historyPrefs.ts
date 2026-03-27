/**
 * 可灵云端列表的本地偏好：从界面移除（非调用远端删除）、星标
 */
const KEY_CLOUD_STARRED = 'h5-kling-cloud-starred-ids';
const KEY_CLOUD_HIDDEN = 'h5-kling-cloud-hidden-ids';

function parseIdSet(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.map((x) => String(x))) : new Set();
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, s: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

export function loadCloudStarredIds(): Set<string> {
  return parseIdSet(localStorage.getItem(KEY_CLOUD_STARRED));
}

export function loadCloudHiddenIds(): Set<string> {
  return parseIdSet(localStorage.getItem(KEY_CLOUD_HIDDEN));
}

/** 切换星标，返回当前是否已星标 */
export function toggleCloudStarred(taskId: string): boolean {
  const s = loadCloudStarredIds();
  if (s.has(taskId)) {
    s.delete(taskId);
    saveIdSet(KEY_CLOUD_STARRED, s);
    return false;
  }
  s.add(taskId);
  saveIdSet(KEY_CLOUD_STARRED, s);
  return true;
}

export function hideCloudTask(taskId: string): void {
  const s = loadCloudHiddenIds();
  s.add(taskId);
  saveIdSet(KEY_CLOUD_HIDDEN, s);
}
