import { useState, useEffect, useCallback } from 'react';
import {
  buildDriveThumbnailUrl,
  cacheDriveFile,
  connectDrive,
  disconnectDrive,
  getDriveStatus,
  listDriveFiles,
} from '../../api/googleDriveApi';
import type { DriveFile } from '../../api/googleDriveApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { toast } from '../../components/Toast';

function formatFileSize(size?: string): string | null {
  if (!size) return null;
  const numeric = Number(size);
  if (Number.isNaN(numeric)) return null;
  if (numeric > 1024 * 1024) return `${(numeric / 1024 / 1024).toFixed(1)} MB`;
  return `${(numeric / 1024).toFixed(1)} KB`;
}

export function DriveBrowser() {
  const { uiLocale } = useLocale();
  const isEnglish = uiLocale === 'en';
  const text = isEnglish
    ? {
        loadFailed: 'Load failed',
        connectFailed: 'Connect failed',
        cached: (name: string) => `${name} cached to the server`,
        cacheFailed: 'Caching failed',
        connectTitle: 'Connect Google Drive',
        connectHint: 'Authorize Drive once, then browse and cache materials directly from your Drive.',
        connectAction: 'Connect Google Drive',
        driveRoot: 'Drive',
        disconnect: 'Disconnect',
        folderEmpty: 'This folder is empty',
        downloading: 'Caching...',
        downloadToServer: 'Cache To Server',
      }
    : {
        loadFailed: '加载失败',
        connectFailed: '连接失败',
        cached: (name: string) => `${name} 已缓存到服务器`,
        cacheFailed: '缓存失败',
        connectTitle: '连接 Google Drive',
        connectHint: '授权一次后，就可以直接浏览 Drive 中的素材并缓存到服务器。',
        connectAction: '连接 Google Drive',
        driveRoot: 'Drive',
        disconnect: '断开连接',
        folderEmpty: '当前文件夹为空',
        downloading: '缓存中...',
        downloadToServer: '缓存到服务器',
      };

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
      const response = await getDriveStatus();
      setConnected(response.connected);
    } catch {
      // ignore
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    void checkStatus();
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'drive-connected') {
        setConnected(true);
        void loadFiles('root');
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [checkStatus]);

  const loadFiles = useCallback(
    async (folderId: string) => {
      setLoading(true);
      try {
        const response = await listDriveFiles(folderId);
        setFiles(response.files);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : text.loadFailed);
      }
      setLoading(false);
    },
    [text.loadFailed],
  );

  useEffect(() => {
    if (connected) void loadFiles(currentFolderId);
  }, [connected, currentFolderId, loadFiles]);

  async function handleConnect() {
    try {
      const response = await connectDrive();
      window.open(response.authUrl, 'google-auth', 'width=600,height=700');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.connectFailed);
    }
  }

  async function handleDisconnect() {
    await disconnectDrive();
    setConnected(false);
    setFiles([]);
    setFolderPath([]);
  }

  async function handleCache(file: DriveFile) {
    setCachingIds((previous) => new Set([...previous, file.id]));
    try {
      await cacheDriveFile(file.id, file.name);
      toast.success(text.cached(file.name));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.cacheFailed);
    }
    setCachingIds((previous) => {
      const next = new Set(previous);
      next.delete(file.id);
      return next;
    });
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">{text.connectTitle}</h3>
        <p className="mb-6 max-w-sm text-sm text-[var(--color-text-muted)]">{text.connectHint}</p>
        <button
          type="button"
          onClick={handleConnect}
          className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
        >
          {text.connectAction}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 overflow-x-auto text-sm text-[var(--color-text-muted)]">
          <button
            type="button"
            onClick={() => setFolderPath([])}
            className="whitespace-nowrap transition hover:text-[var(--color-primary)]"
          >
            {text.driveRoot}
          </button>
          {folderPath.map((folder, index) => (
            <span key={folder.id} className="flex items-center gap-1">
              <span className="opacity-40">/</span>
              <button
                type="button"
                onClick={() => setFolderPath((previous) => previous.slice(0, index + 1))}
                className="whitespace-nowrap transition hover:text-[var(--color-primary)]"
              >
                {folder.name}
              </button>
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void handleDisconnect()}
          className="text-xs text-[var(--color-text-muted)] transition hover:text-red-400"
        >
          {text.disconnect}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="animate-pulse overflow-hidden rounded-xl">
              <div className="aspect-square bg-[var(--color-surface-hover)]" />
              <div className="bg-[var(--color-surface-elevated)] p-2">
                <div className="h-2.5 w-full rounded bg-[var(--color-surface-hover)]" />
              </div>
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">{text.folderEmpty}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative cursor-pointer overflow-hidden rounded-xl transition-all hover:ring-2 hover:ring-[var(--color-primary)]/40"
              onClick={() => {
                if (file.isFolder) setFolderPath((previous) => [...previous, { id: file.id, name: file.name }]);
              }}
            >
              <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[var(--color-surface-hover)]">
                {file.isFolder ? (
                  <span className="text-xs text-[var(--color-text-muted)]">FOLDER</span>
                ) : file.thumbnailLink ? (
                  <img
                    src={buildDriveThumbnailUrl(file.thumbnailLink)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-[var(--color-text-muted)]">{file.mimeType.startsWith('video/') ? 'VIDEO' : 'IMAGE'}</span>
                )}

                {!file.isFolder && (
                  <div className="absolute bottom-0 left-0 right-0 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCache(file);
                      }}
                      disabled={cachingIds.has(file.id)}
                      className="w-full bg-gradient-to-t from-black/85 via-black/60 to-transparent pb-2 pt-6 text-center text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {cachingIds.has(file.id) ? text.downloading : text.downloadToServer}
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-[var(--color-surface-elevated)] px-2 py-2">
                <p className="truncate text-xs font-medium text-[var(--color-text)]" title={file.name}>
                  {file.name}
                </p>
                {formatFileSize(file.size) && (
                  <p className="mt-0.5 text-[10px] text-[var(--color-text-subtle)]">{formatFileSize(file.size)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
