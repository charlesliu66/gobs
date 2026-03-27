import { useCallback } from 'react';
import type { DriveFile } from '../hooks/useGoogleDrive';
import { AuthThumbnail } from './AuthThumbnail';

interface DriveMaterialPickerProps {
  keywords: string[];
  accessToken: string | null;
  onLogin: () => void;
  files: DriveFile[];
  loading: boolean;
  error: string | null;
  onSearch: (keywords: string[]) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  selectedOrder: DriveFile[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  folderId?: string;
}

export function DriveMaterialPicker({
  keywords,
  accessToken,
  onLogin,
  files,
  loading,
  error,
  onSearch,
  selectedIds,
  onToggleSelect,
  selectedOrder,
  onReorder: _onReorder,
  folderId,
}: DriveMaterialPickerProps) {
  const handleSearch = useCallback(() => {
    onSearch(keywords.length > 0 ? keywords : []);
  }, [keywords, onSearch]);

  return (
    <div className="space-y-4">
      {!accessToken ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--color-text-muted)]">
            连接 Google Drive 后，可从你的 Drive 中检索匹配的图片/视频素材
          </p>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text)]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M7.635 10.909v2.619h4.335c-.175 1.032-.675 1.893-1.453 2.488a4.5 4.5 0 01-2.882.968 4.575 4.575 0 01-4.509-4.509 4.575 4.575 0 014.509-4.509c1.288 0 2.449.493 3.361 1.275l1.829-1.828a7.566 7.566 0 00-5.19-2.037 7.635 7.635 0 000 15.27 7.618 7.618 0 005.189-2.069 7.574 7.574 0 002.393-5.627h-7.577z"
              />
              <path
                fill="currentColor"
                d="M24 12.571c0-.214-.009-.428-.025-.639H12.75v2.694h6.32a2.89 2.89 0 01-1.27 1.9v1.604h2.048c1.198-1.104 1.89-2.73 1.89-4.659z"
              />
            </svg>
            连接 Google Drive
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? '匹配中…'
                : keywords.length > 0
                  ? `搜索素材 (${keywords.length} 个关键词)`
                  : '浏览 Drive 中的图片/视频'}
            </button>
            {folderId && (
              <span className="text-sm text-[var(--color-text-muted)]">限定于指定文件夹（仅检索该文件夹内的素材）</span>
            )}
          </div>

          {error && (
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          )}

          {files.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                匹配到的素材：点击勾选确认，将按选择顺序作为 @图片1、@图片2… 映射
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {files.map((f) => (
                  <MaterialCard
                    key={f.id}
                    file={f}
                    accessToken={accessToken}
                    selected={selectedIds.has(f.id)}
                    orderIndex={
                      selectedOrder.findIndex((s) => s.id === f.id) + 1
                    }
                    onToggle={() => onToggleSelect(f.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {!loading && files.length === 0 && !error && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {keywords.length > 0
                ? '未找到匹配素材，可调整关键词后再搜索，或点「在 Drive 文件夹中勾选」手动选择'
                : '点击「一键匹配素材」或上方按钮加载素材'}
            </p>
          )}

          {selectedOrder.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)]">
                已选素材（点击可取消）：按顺序作为 @图片1、@图片2…
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectedOrder.map((f, idx) => (
                  <MaterialCard
                    key={f.id}
                    file={f}
                    accessToken={accessToken}
                    selected
                    orderIndex={idx + 1}
                    onToggle={() => onToggleSelect(f.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MaterialCard({
  file,
  accessToken,
  selected,
  orderIndex,
  onToggle,
}: {
  file: DriveFile;
  accessToken: string | null;
  selected: boolean;
  orderIndex: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative block w-full aspect-square rounded-lg border-2 overflow-hidden transition text-left ${
        selected
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
          : 'border-[var(--color-border)] hover:border-[var(--color-text-subtle)]'
      }`}
    >
      <div className="absolute inset-0">
        <AuthThumbnail
          fileId={file.id}
          accessToken={accessToken}
          name={file.name}
          mimeType={file.mimeType}
          className="w-full h-full"
        />
      </div>
      {selected && orderIndex > 0 && (
        <span className="absolute top-1 left-1 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">
          {orderIndex}
        </span>
      )}
      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs truncate px-1 py-0.5">
        {file.name}
      </span>
    </button>
  );
}
