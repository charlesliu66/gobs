import { useCallback, useEffect, useState } from 'react';
import { AuthThumbnail } from './AuthThumbnail';

export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
}

interface DriveExplorerProps {
  rootFolderId: string;
  rootFolderName: string;
  accessToken: string | null;
  onLogin: () => void;
  /** 已选文件（用于视频生成流程） */
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, item: DriveItem) => void;
  /** 是否显示选择功能 */
  selectable?: boolean;
}

const API_BASE = '/api';

export function DriveExplorer({
  rootFolderId,
  rootFolderName,
  accessToken,
  onLogin,
  selectedIds = new Set(),
  onToggleSelect,
  selectable = false,
}: DriveExplorerProps) {
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([
    { id: rootFolderId, name: rootFolderName },
  ]);
  const [folders, setFolders] = useState<DriveItem[]>([]);
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFolderId = breadcrumb[breadcrumb.length - 1]?.id ?? rootFolderId;

  const fetchList = useCallback(
    async (folderId: string) => {
      if (!accessToken) {
        setError('请先连接 Google Drive');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/drive/list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ folderId }),
        });
        const text = await res.text();
        const data = text?.trim() ? JSON.parse(text) : {};
        if (!res.ok) {
          throw new Error((data.error as string) || '加载失败');
        }
        setFolders((data.folders as DriveItem[]) || []);
        setFiles((data.files as DriveItem[]) || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
        setFolders([]);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (accessToken && currentFolderId) {
      fetchList(currentFolderId);
    } else if (!accessToken) {
      setFolders([]);
      setFiles([]);
      setError(null);
    }
  }, [accessToken, currentFolderId, fetchList]);

  const handleFolderClick = useCallback((id: string, name: string) => {
    setBreadcrumb((prev) => [...prev, { id, name }]);
  }, []);

  const handleBreadcrumbClick = useCallback((index: number) => {
    setBreadcrumb((prev) => prev.slice(0, index + 1));
  }, []);

  const handleBack = useCallback(() => {
    setBreadcrumb((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  if (!accessToken) {
    return (
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <p className="text-sm text-[var(--color-text-muted)] mb-3">
          连接 Google Drive 后即可浏览素材库内容
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text)]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.635 10.909v2.619h4.335c-.175 1.032-.675 1.893-1.453 2.488a4.5 4.5 0 01-2.882.968 4.575 4.575 0 01-4.509-4.509 4.575 4.575 0 014.509-4.509c1.288 0 2.449.493 3.361 1.275l1.829-1.828a7.566 7.566 0 00-5.19-2.037 7.635 7.635 0 000 15.27 7.618 7.618 0 005.189-2.069 7.574 7.574 0 002.393-5.627h-7.577z" />
            <path d="M24 12.571c0-.214-.009-.428-.025-.639H12.75v2.694h6.32a2.89 2.89 0 01-1.27 1.9v1.604h2.048c1.198-1.104 1.89-2.73 1.89-4.659z" />
          </svg>
          连接 Google Drive
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={handleBack}
          disabled={breadcrumb.length <= 1}
          className="p-1.5 rounded hover:bg-[var(--color-surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--color-text-muted)]"
          aria-label="返回上一级"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <nav className="flex items-center gap-1.5 text-sm overflow-x-auto min-w-0">
          {breadcrumb.map((item, i) => (
            <span key={item.id} className="flex items-center gap-1.5 shrink-0">
              {i > 0 && (
                <span className="text-[var(--color-text-subtle)]">/</span>
              )}
              <button
                type="button"
                onClick={() => handleBreadcrumbClick(i)}
                className="text-[var(--color-text)] hover:text-[var(--color-primary)] truncate max-w-[120px]"
              >
                {item.name}
              </button>
            </span>
          ))}
        </nav>
      </div>

      {/* 内容区 */}
      <div className="p-4 min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center py-12 text-[var(--color-text-muted)]">
            加载中…
          </div>
        )}
        {error && (
          <p className="text-sm text-[var(--color-error)] py-4">{error}</p>
        )}
        {!loading && !error && (
          <div className="space-y-6">
            {/* 子文件夹 */}
            {folders.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                  文件夹
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFolderClick(f.id, f.name)}
                      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-focus)] transition-colors text-left w-full group"
                    >
                      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-[var(--color-primary)]/20 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/30">
                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-[var(--color-text)] truncate w-full text-center">
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 图片/视频文件 */}
            {files.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                  图片与视频
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className={`relative rounded-lg border-2 overflow-hidden transition-colors ${
                        selectable && selectedIds.has(f.id)
                          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                          : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          selectable && onToggleSelect
                            ? onToggleSelect(f.id, f)
                            : undefined
                        }
                        className={`block w-full aspect-square ${!selectable ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <AuthThumbnail
                          fileId={f.id}
                          accessToken={accessToken}
                          name={f.name}
                          mimeType={f.mimeType}
                          className="w-full h-full"
                        />
                        {selectable && selectedIds.has(f.id) && (
                          <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">
                            ✓
                          </span>
                        )}
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs truncate px-2 py-1">
                        {f.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && folders.length === 0 && files.length === 0 && !error && (
              <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">
                此文件夹为空
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
