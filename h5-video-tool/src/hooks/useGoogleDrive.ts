import { useCallback, useState } from 'react';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

const API_BASE = '/api';

/** 检查后端是否可达，用于验证前预检 */
export async function checkBackendHealth(timeoutMs = 5000): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) return { ok: true };
    return { ok: false, error: `后端返回 ${res.status}` };
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: '后端连接超时，请确认 h5-video-tool-api 已启动（在 h5-video-tool-api 目录运行 npm run dev）' };
    }
    return { ok: false, error: '无法连接后端，请确认 h5-video-tool-api 已启动在 localhost:3001' };
  }
}

export function useGoogleDrive(accessToken: string | null) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 安全解析 JSON，避免空响应导致 crash */
  const safeParseJson = async (res: Response): Promise<Record<string, unknown>> => {
    const text = await res.text();
    if (!text?.trim()) return {};
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  /** 验证对 folder 是否有权限 */
  const verifyFolder = useCallback(
    async (folderId: string): Promise<{ ok: boolean; folderName?: string; error?: string }> => {
      if (!accessToken) return { ok: false, error: '请先连接 Google Drive' };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 秒，略短于后端 15 秒
      try {
        const res = await fetch(`${API_BASE}/drive/verify-folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ folderId }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await safeParseJson(res);
        if (!res.ok) {
          let msg = (data.error as string) || res.statusText || '验证失败';
          if (res.status >= 500 && (!data.error || msg === 'Internal Server Error')) {
            msg = '后端异常。请确认在项目根目录已启动：cd h5-video-tool-api && npm run dev';
          }
          return { ok: false, error: msg };
        }
        return { ok: true, folderName: data.folderName as string };
      } catch (e) {
        clearTimeout(timeoutId);
        const msg = e instanceof Error ? e.message : '验证失败';
        if (e instanceof Error && e.name === 'AbortError') {
          return { ok: false, error: '验证超时，请检查网络或后端是否已启动 (localhost:3001)' };
        }
        return { ok: false, error: msg.includes('fetch') || msg.includes('Failed') ? '无法连接后端，请确认 h5-video-tool-api 已启动在 localhost:3001' : msg };
      }
    },
    [accessToken],
  );

  const search = useCallback(
    async (keywords: string[], folderId?: string, folderHints?: string[]): Promise<DriveFile[]> => {
      if (!accessToken) {
        setError('请先连接 Google Drive');
        return [];
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/drive/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ keywords, folderId, folderHints }),
        });
        const data = await safeParseJson(res);
        if (!res.ok) {
          throw new Error((data.error as string) || '搜索失败');
        }
        const list = (data.files as DriveFile[]) || [];
        setFiles(list);
        return list;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Drive 搜索失败');
        setFiles([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [accessToken]
  );

  /** 列出文件夹内直接子项：子文件夹 + 图片/视频 */
  const listFolder = useCallback(
    async (folderId: string): Promise<{ folders: DriveFile[]; files: DriveFile[] }> => {
      if (!accessToken) return { folders: [], files: [] };
      try {
        const res = await fetch(`${API_BASE}/drive/list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ folderId }),
        });
        const data = await safeParseJson(res);
        if (!res.ok) {
          throw new Error((data.error as string) || '加载失败');
        }
        const folders = (data.folders as DriveFile[]) || [];
        const files = (data.files as DriveFile[]) || [];
        return { folders, files };
      } catch (e) {
        console.error('[listFolder]', e);
        return { folders: [], files: [] };
      }
    },
    [accessToken]
  );

  const doCheckBackendHealth = useCallback(() => checkBackendHealth(5000), []);
  return { files, loading, error, search, verifyFolder, listFolder, checkBackendHealth: doCheckBackendHealth };
}
