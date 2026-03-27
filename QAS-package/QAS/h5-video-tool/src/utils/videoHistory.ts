/**
 * 生成视频历史 - localStorage 持久化
 * 仅存元数据（taskId、videoPath、prompt、createdAt），视频通过 API 获取
 */
const STORAGE_KEY = 'h5-video-history';
const MAX_ITEMS = 100;

export interface VideoHistoryItem {
  taskId: string;
  videoPath: string;
  prompt: string;
  createdAt: number;
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
    const entry: VideoHistoryItem = { ...item, createdAt: Date.now() };
    const filtered = list.filter((x) => x.taskId !== item.taskId);
    const next = [entry, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function removeVideoFromHistory(taskId: string) {
  try {
    const list = loadVideoHistory().filter((x) => x.taskId !== taskId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/** 构建视频播放 URL（通过 API 获取文件） */
export function getVideoFileUrl(videoPath: string): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/video/file?path=${encodeURIComponent(videoPath)}`;
}
