/**
 * 生成视频历史 - localStorage 持久化
 * 仅存元数据（taskId、videoPath、prompt、createdAt），视频通过 API 获取
 */
const STORAGE_KEY = 'h5-video-history';
const MAX_ITEMS = 100;

export interface VideoHistoryItem {
  taskId: string;
  /** 本地 output 相对路径（有则优先；即梦/Veo 等写入本机文件时用它，避免把 base64 塞进 localStorage） */
  videoPath: string;
  /** 可灵等仅有云端/代理 URL、无本地文件时；勿存即梦 data: 大段 base64（易超配额导致整段历史写入失败） */
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

const MAX_INLINE_DATA_URL_CHARS = 120_000;

function sanitizeHistoryPayload(item: Omit<VideoHistoryItem, 'createdAt'>): Omit<VideoHistoryItem, 'createdAt'> {
  let videoUrl = item.videoUrl?.trim() || undefined;
  const videoPath = item.videoPath?.trim() || '';

  if (videoPath && videoUrl?.startsWith('data:')) {
    videoUrl = undefined;
  }
  if (videoUrl?.startsWith('data:') && videoUrl.length > MAX_INLINE_DATA_URL_CHARS) {
    videoUrl = undefined;
  }

  return {
    ...item,
    videoPath: videoPath || item.videoPath || '',
    videoUrl,
  };
}

export function saveVideoToHistory(item: Omit<VideoHistoryItem, 'createdAt'>) {
  try {
    const sanitized = sanitizeHistoryPayload(item);
    const list = loadVideoHistory();
    const prev = list.find((x) => x.taskId === sanitized.taskId);
    const starred = sanitized.starred ?? prev?.starred ?? false;
    const entry: VideoHistoryItem = {
      ...sanitized,
      createdAt: Date.now(),
      videoPath: sanitized.videoPath ?? '',
      starred,
    };
    const filtered = list.filter((x) => x.taskId !== entry.taskId);
    const next = [entry, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

/** 列表/预览：优先走本机文件（/api/video/file），避免 data URL 优先导致即梦条目无法展示 */
export function getLocalPlaybackSrc(item: VideoHistoryItem): string {
  const p = item.videoPath?.trim();
  if (p) return getVideoFileUrl(p);
  const u = item.videoUrl?.trim();
  if (u) return u;
  return '';
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
