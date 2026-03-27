/**
 * 生成视频历史 - localStorage 持久化
 * 仅存元数据（taskId、videoPath、prompt、createdAt），视频通过 API 获取
 */
const STORAGE_KEY = 'h5-video-history';
const MAX_ITEMS = 100;

export interface VideoHistoryItem {
  taskId: string;
  /** 本地 output 相对路径（有则优先） */
  videoPath: string;
  /** 可灵等仅有云端/代理 URL、无本地文件时 */
  videoUrl?: string;
  prompt: string;
  createdAt: number;
  /** 星标：排序靠前 */
  starred?: boolean;
}

export function loadVideoHistory(): VideoHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveVideoToHistory(item: Omit<VideoHistoryItem, 'createdAt'>) {
  try {
    const list = loadVideoHistory();
    const prev = list.find((x) => x.taskId === item.taskId);
    const starred = item.starred ?? prev?.starred ?? false;
    const entry: VideoHistoryItem = {
      ...item,
      createdAt: Date.now(),
      videoPath: item.videoPath ?? '',
      starred,
    };
    const filtered = list.filter((x) => x.taskId !== item.taskId);
    const next = [entry, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

/** 本机历史条目的星标 */
export function setVideoHistoryStarred(taskId: string, starred: boolean): void {
  try {
    const list = loadVideoHistory();
    const idx = list.findIndex((x) => x.taskId === taskId);
    if (idx < 0) return;
    const next = [...list];
    next[idx] = { ...next[idx], starred };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function toggleVideoHistoryStarred(taskId: string): boolean {
  const list = loadVideoHistory();
  const found = list.find((x) => x.taskId === taskId);
  const nextStarred = !found?.starred;
  setVideoHistoryStarred(taskId, nextStarred);
  return nextStarred;
}

export function removeVideoFromHistory(taskId: string) {
  try {
    const list = loadVideoHistory().filter((x) => x.taskId !== taskId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * 获取与当前视频关联的 prompt，供文案生成使用
 * 优先级：指定 taskId 的历史记录 > 最新一条历史记录的 prompt
 */
export function getRecentPromptForVideo(taskId?: string | null): string {
  const list = loadVideoHistory();
  if (!list.length) return '';
  if (taskId?.trim()) {
    const found = list.find((x) => x.taskId === taskId);
    if (found?.prompt?.trim()) return found.prompt.trim();
  }
  return list[0]?.prompt?.trim() ?? '';
}

/** 构建视频播放 URL（通过 API 获取文件） */
export function getVideoFileUrl(videoPath: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/video/file?path=${encodeURIComponent(videoPath)}`;
}
