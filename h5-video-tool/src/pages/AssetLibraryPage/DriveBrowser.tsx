import { useState, useEffect, useCallback } from 'react';
import {
  getDriveStatus, connectDrive, disconnectDrive,
  listDriveFiles, cacheDriveFile, buildDriveThumbnailUrl,
} from '../../api/googleDriveApi';
import type { DriveFile } from '../../api/googleDriveApi';
import { toast } from '../../components/Toast';

export function DriveBrowser() {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [folderPath, setFolderPath] = useState<Array<{ id: string; name: string }>>([]);
  const [cachingIds, setCachingIds] = useState<Set<string>>(new Set());

  const currentFolderId = folderPath.length > 0 ? folderPath[folderPath.length - 1].id : 'root';

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await getDriveStatus();
      setConnected(res.connected);
    } catch { /* ignore */ }
    setChecking(false);
  }, []);

  useEffect(() => {
    void checkStatus();

    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'drive-connected') {
        setConnected(true);
        void loadFiles('root');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkStatus]);

  const loadFiles = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const res = await listDriveFiles(folderId);
      setFiles(res.files);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (connected) void loadFiles(currentFolderId);
  }, [connected, currentFolderId, loadFiles]);

  async function handleConnect() {
    try {
      const res = await connectDrive();
      window.open(res.authUrl, 'google-auth', 'width=600,height=700');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '连接失败');
    }
  }

  async function handleDisconnect() {
    await disconnectDrive();
    setConnected(false);
    setFiles([]);
    setFolderPath([]);
  }

  function openFolder(file: DriveFile) {
    setFolderPath((prev) => [...prev, { id: file.id, name: file.name }]);
  }

  function goToPathIndex(index: number) {
    if (index < 0) {
      setFolderPath([]);
    } else {
      setFolderPath((prev) => prev.slice(0, index + 1));
    }
  }

  async function handleCache(file: DriveFile) {
    setCachingIds((prev) => new Set([...prev, file.id]));
    try {
      await cacheDriveFile(file.id, file.name);
      toast.success(`${file.name} 已缓存到服务器`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '缓存失败');
    }
    setCachingIds((prev) => { const n = new Set(prev); n.delete(file.id); return n; });
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4 opacity-50">☁️</div>
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">连接 Google Drive</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6 max-w-sm">
          授权后可直接浏览 Drive 中的素材，使用时自动下载到服务器
        </p>
        <button
          type="button"
          onClick={handleConnect}
          className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition"
        >
          连接 Google Drive
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb + disconnect */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] overflow-x-auto">
          <button
            type="button"
            onClick={() => goToPathIndex(-1)}
            className="hover:text-[var(--color-primary)] transition whitespace-nowrap"
          >
            Drive
          </button>
          {folderPath.map((folder, i) => (
            <span key={folder.id} className="flex items-center gap-1">
              <span className="opacity-40">/</span>
              <button
                type="button"
                onClick={() => goToPathIndex(i)}
                className="hover:text-[var(--color-primary)] transition whitespace-nowrap"
              >
                {folder.name}
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDisconnect}
          className="text-xs text-[var(--color-text-muted)] hover:text-red-400 transition"
        >
          断开连接
        </button>
      </div>

      {/* File list */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-[var(--color-surface-hover)]" />
              <div className="p-2 bg-[var(--color-surface-elevated)]">
                <div className="h-2.5 bg-[var(--color-surface-hover)] rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-5xl mb-3 opacity-40">📂</div>
          <p className="text-sm text-[var(--color-text-muted)]">此文件夹为空</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative rounded-xl overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-[var(--color-primary)]/40"
              onClick={() => file.isFolder ? openFolder(file) : undefined}
            >
              <div className="aspect-square bg-[var(--color-surface-hover)] relative overflow-hidden flex items-center justify-center">
                {file.isFolder ? (
                  <span className="text-5xl opacity-60">📁</span>
                ) : file.thumbnailLink ? (
                  <img
                    src={buildDriveThumbnailUrl(file.thumbnailLink)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-4xl opacity-40">
                    {file.mimeType.startsWith('video/') ? '🎬' : '🖼'}
                  </span>
                )}

                {/* Cache button for non-folder files */}
                {!file.isFolder && (
                  <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void handleCache(file); }}
                      disabled={cachingIds.has(file.id)}
                      className="w-full py-2 bg-gradient-to-t from-black/85 via-black/60 to-transparent text-white text-xs font-semibold text-center pt-6 disabled:opacity-60"
                    >
                      {cachingIds.has(file.id) ? '下载中...' : '下载到服务器'}
                    </button>
                  </div>
                )}
              </div>

              <div className="px-2 py-2 bg-[var(--color-surface-elevated)]">
                <p className="text-xs font-medium text-[var(--color-text)] truncate" title={file.name}>
                  {file.name}
                </p>
                {file.size && (
                  <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
                    {Number(file.size) > 1024 * 1024
                      ? `${(Number(file.size) / 1024 / 1024).toFixed(1)} MB`
                      : `${(Number(file.size) / 1024).toFixed(1)} KB`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
