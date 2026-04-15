/**
 * 可灵云端列表的本地偏好：从界面移除（非调用远端删除）、星标
 * key 按账号分桶，避免多账号偏好混用
 */
function getCurrentUsername(): string {
  try {
    const raw = localStorage.getItem('gobs_user');
    if (!raw) return 'default';
    const user = JSON.parse(raw) as { username?: string };
    return user.username?.trim() || 'default';
  } catch {
    return 'default';
  }
}

function getStarredKey(): string {
  return `h5-kling-cloud-starred-ids-${getCurrentUsername()}`;
}

function getHiddenKey(): string {
  return `h5-kling-cloud-hidden-ids-${getCurrentUsername()}`;
}

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
  return parseIdSet(localStorage.getItem(getStarredKey()));
}

export function loadCloudHiddenIds(): Set<string> {
  return parseIdSet(localStorage.getItem(getHiddenKey()));
}

/** 切换星标，返回当前是否已星标 */
export function toggleCloudStarred(taskId: string): boolean {
  const s = loadCloudStarredIds();
  if (s.has(taskId)) {
    s.delete(taskId);
    saveIdSet(getStarredKey(), s);
    return false;
  }
  s.add(taskId);
  saveIdSet(getStarredKey(), s);
  return true;
}

export function hideCloudTask(taskId: string): void {
  const s = loadCloudHiddenIds();
  s.add(taskId);
  saveIdSet(getHiddenKey(), s);
}
