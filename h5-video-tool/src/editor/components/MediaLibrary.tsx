import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import {
  deleteEditorAsset,
  getEditorUploadConfig,
  listEditorAssets,
  uploadEditorAsset,
  uploadEditorAssetChunked,
  type EditorAssetDto,
} from '../../api/editor';
import { toast } from '../../components/Toast';
import { EDITOR_UPLOAD_MAX_MB_FALLBACK } from '../../config/editorUpload';
import { listAssets, buildAssetFileUrl } from '../../api/assetLibraryApi';
import type { LibraryAsset } from '../../api/assetLibraryApi';

interface BatchFileStatus {
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  progress: number;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function BatchUploadQueue({ files }: { files: BatchFileStatus[] }) {
  if (files.length === 0) return null;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const failedCount = files.filter((f) => f.status === 'failed').length;
  const totalProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + (f.status === 'done' ? 100 : f.status === 'failed' ? 0 : f.progress), 0) / files.length)
    : 0;
  return (
    <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <div className="mb-1.5 flex items-center justify-between text-[10px] text-[var(--color-text-muted)]">
        <span>批量上传 {doneCount}/{files.length} 完成{failedCount > 0 ? `，${failedCount} 失败` : ''}</span>
        <span>{totalProgress}%</span>
      </div>
      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${totalProgress}%` }}
        />
      </div>
      <ul className="max-h-32 space-y-1 overflow-y-auto">
        {files.map((f, i) => (
          <li key={i} className="flex items-center gap-1.5 text-[10px]">
            <span className="flex-shrink-0">
              {f.status === 'done' && <span className="text-green-400">✓</span>}
              {f.status === 'failed' && <span className="text-red-400">✗</span>}
              {f.status === 'uploading' && <span className="animate-pulse text-[var(--color-primary)]">↑</span>}
              {f.status === 'pending' && <span className="text-[var(--color-text-muted)]">○</span>}
            </span>
            <span className="min-w-0 flex-1 truncate text-[var(--color-text)]" title={f.name}>{f.name}</span>
            <span className="flex-shrink-0 text-[var(--color-text-muted)]">
              {f.status === 'uploading' ? `${f.progress}%` : formatFileSize(f.size)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 悬停 300ms 后自动播放的视频缩略图 */
function HoverVideoThumb({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => {
      videoRef.current?.play().catch(() => { /* autoplay may be blocked */ });
    }, 300);
  };

  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const v = videoRef.current;
    if (v) { v.pause(); v.currentTime = 0; }
  };

  return (
    <div
      className="relative aspect-video w-full bg-black"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <video
        ref={videoRef}
        src={src}
        className={className ?? 'h-full w-full object-cover'}
        muted
        playsInline
        loop
        preload="metadata"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      </div>
    </div>
  );
}

/** TASK-D: 项目资产库 tab — 展示用户资产中台的素材 */
function ProjectAssetLibrary({
  onAddToTimeline,
}: {
  onAddToTimeline: (asset: EditorAssetDto) => void;
}) {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAssets({ pageSize: '50' });
      setAssets(result.assets as LibraryAsset[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleAdd = useCallback(
    (asset: LibraryAsset) => {
      const mime = asset.mimetype ?? asset.mime_type ?? '';
      if (!mime.startsWith('video/')) return; // 仅支持视频
      const url = asset.file_url ?? buildAssetFileUrl(asset.id);
      const editorAsset: EditorAssetDto = {
        id: `lib-${asset.id}`,
        url,
        kind: 'video',
        originalName: asset.filename,
        durationSec: asset.duration ?? 10,
      };
      onAddToTimeline(editorAsset);
    },
    [onAddToTimeline],
  );

  if (loading) {
    return <p className="px-3 py-4 text-[10px] text-[var(--color-text-muted)]">加载中…</p>;
  }
  if (error) {
    return (
      <div className="px-3 py-4">
        <p className="text-[11px] text-red-500 mb-2">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-[11px] text-[var(--color-primary)] underline"
        >
          重试
        </button>
      </div>
    );
  }
  if (assets.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <p className="text-[10px] text-[var(--color-text-muted)] mb-2">资产库为空</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">请前往「素材中台」导入视频素材</p>
      </div>
    );
  }

  // 仅展示视频类资产
  const videoAssets = assets.filter((a) => {
    const m = a.mimetype ?? a.mime_type ?? '';
    return m.startsWith('video/');
  });

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)]">
        <p className="text-[10px] text-[var(--color-text-muted)]">共 {videoAssets.length} 个视频素材</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          刷新
        </button>
      </div>
      <ul className="space-y-2 p-2">
        {videoAssets.map((asset) => {
          const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
          return (
            <li
              key={asset.id}
              className="overflow-hidden rounded-lg ring-1 ring-[var(--color-border)] bg-[var(--color-surface-elevated)]"
            >
              <div className="relative aspect-video w-full bg-black">
                <HoverVideoThumb src={fileUrl} />
              </div>
              <div className="p-2">
                <p
                  className="truncate text-[11px] font-medium text-[var(--color-text)] mb-1"
                  title={asset.filename}
                >
                  {asset.filename}
                </p>
                <button
                  type="button"
                  onClick={() => handleAdd(asset)}
                  className="w-full rounded-md bg-[var(--color-primary)]/15 py-1.5 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25"
                >
                  加入时间轴
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface MediaLibraryProps {
  onLoadDemo: () => void;
  onLibraryItemsChange: (items: EditorAssetDto[]) => void;
  onAddToTimeline: (asset: EditorAssetDto) => void;
  /** 服务端删除成功后回调，用于从时间轴移除引用 */
  onAssetDeleted?: (assetId: string) => void;
  /** 多选：供剪辑 Agent 使用 */
  selectedAssetIds: string[];
  onToggleAsset: (id: string) => void;
  onClearSelection: () => void;
}

export function MediaLibrary({
  onLoadDemo,
  onLibraryItemsChange,
  onAddToTimeline,
  onAssetDeleted,
  selectedAssetIds,
  onToggleAsset,
  onClearSelection,
}: MediaLibraryProps) {
  const [items, setItems] = useState<EditorAssetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [batchFiles, setBatchFiles] = useState<BatchFileStatus[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxUploadMb, setMaxUploadMb] = useState(EDITOR_UPLOAD_MAX_MB_FALLBACK);
  const [maxUploadBytes, setMaxUploadBytes] = useState(EDITOR_UPLOAD_MAX_MB_FALLBACK * 1024 * 1024);
  const [activeTab, setActiveTab] = useState<'upload' | 'asset-library'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onLibraryItemsChange(items);
  }, [items, onLibraryItemsChange]);

  useEffect(() => {
    void getEditorUploadConfig().then((c) => {
      setMaxUploadMb(c.maxMb);
      setMaxUploadBytes(c.maxBytes);
    });
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const { assets } = await listEditorAssets();
      setItems(assets);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载素材列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pickFile = () => inputRef.current?.click();

  const processFiles = async (rawFiles: File[]) => {
    if (rawFiles.length === 0) return;

    const videoFiles = rawFiles.filter(
      (f) => f.type.startsWith('video/') || /\.(mp4|mov|mkv|avi|webm|ts|flv|wmv|m4v|3gp|ogv)$/i.test(f.name),
    );
    if (videoFiles.length === 0) {
      setError('所选文件中没有视频文件，请选择 mp4/mov/webm/mkv 等视频格式。');
      return;
    }

    const oversized = videoFiles.filter((f) => f.size > maxUploadBytes);
    if (oversized.length > 0) {
      const names = oversized.map((f) => `${f.name}（${formatFileSize(f.size)}）`);
      setError(`以下文件超过单文件上限 ${maxUploadMb} MB，已跳过：\n${names.join('、')}`);
    }

    const validFiles = videoFiles.filter((f) => f.size <= maxUploadBytes);
    if (validFiles.length === 0) return;

    setUploading(true);
    if (oversized.length === 0) setError(null);

    const initialStatuses: BatchFileStatus[] = validFiles.map((f) => ({
      name: f.name,
      size: f.size,
      status: 'pending' as const,
      progress: 0,
    }));
    setBatchFiles(initialStatuses);

    let successCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setBatchFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading', progress: 0 } : f)),
      );
      try {
        const onPct = (pct: number) => {
          setBatchFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress: pct } : f)),
          );
        };
        const uploadFn =
          file.size > 20 * 1024 * 1024
            ? uploadEditorAssetChunked(file, onPct)
            : uploadEditorAsset(file, onPct);
        const { asset } = await uploadFn;
        setItems((prev) => [asset, ...prev.filter((x) => x.id !== asset.id)]);
        setBatchFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'done', progress: 100 } : f)),
        );
        successCount++;
      } catch (err) {
        setBatchFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'failed', error: err instanceof Error ? err.message : '上传失败' }
              : f,
          ),
        );
      }
    }

    setUploading(false);

    const failedCount = validFiles.length - successCount;
    if (failedCount > 0) {
      setError((prev) => [prev, `${failedCount} 个文件上传失败`].filter(Boolean).join('\n'));
    }
    if (successCount > 0) {
      toast.success(
        validFiles.length === 1
          ? `已上传 ${validFiles[0].name}（${formatFileSize(validFiles[0].size)}）`
          : `批量上传完成：${successCount}/${validFiles.length} 个文件成功`,
      );
    }

    setTimeout(() => setBatchFiles([]), 3000);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    e.target.value = '';
    if (!fileList || fileList.length === 0) return;
    await processFiles(Array.from(fileList));
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setDragOver(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDeleteAsset = async (a: EditorAssetDto, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (
      !window.confirm(
        `确定从素材库删除「${a.originalName}」？\n删除后不可恢复；若时间轴上使用了该素材，对应片段也会被移除。`,
      )
    ) {
      return;
    }
    setDeletingId(a.id);
    setError(null);
    try {
      await deleteEditorAsset(a.id);
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      onAssetDeleted?.(a.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const selectedSet = new Set(selectedAssetIds);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* TASK-D: Tab 切换栏 */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] px-3 pt-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-2">素材</h2>
        <div className="flex gap-0.5 mb-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-t-lg transition-colors ${
              activeTab === 'upload'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            上传素材
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('asset-library')}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-t-lg transition-colors ${
              activeTab === 'asset-library'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            项目资产库
          </button>
        </div>
      </div>

      {/* TASK-D: 项目资产库 tab */}
      {activeTab === 'asset-library' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ProjectAssetLibrary onAddToTimeline={onAddToTimeline} />
        </div>
      ) : (
      <>
      <div className="flex-shrink-0 border-b border-[var(--color-border)] px-3 py-2">
        <p className="text-[10px] text-[var(--color-text-muted)]">
          单文件最大约 {maxUploadMb} MB，支持同时选择多个文件。
        </p>
        <p className="mt-1 text-[10px] font-medium text-[var(--color-primary)]">
          已选 {selectedAssetIds.length} 条
          {selectedAssetIds.length > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="ml-2 text-[var(--color-text-muted)] underline hover:text-[var(--color-text)]"
            >
              清空
            </button>
          )}
        </p>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-y-auto p-2"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {/* 拖拽覆盖提示 */}
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-primary)] bg-[var(--color-primary)]/10">
            <p className="text-sm font-medium text-[var(--color-primary)]">松开鼠标上传视频</p>
          </div>
        )}

        <h3 className="mb-2 px-1 text-[11px] font-semibold text-[var(--color-text)]">视频</h3>
        <div className="flex flex-wrap gap-2 px-1">
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={pickFile}
            disabled={uploading}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? '上传中…' : '上传视频'}
          </button>
          <button
            type="button"
            onClick={onLoadDemo}
            className="rounded-lg bg-[var(--color-primary)]/20 px-3 py-2 text-xs font-medium text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/30"
          >
            加载示例片段
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg px-3 py-2 text-xs text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
          >
            刷新列表
          </button>
        </div>

        {/* 拖拽上传区域提示 */}
        {!uploading && items.length === 0 && !loading && (
          <div className="mx-1 mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] py-6 text-center transition-colors hover:border-[var(--color-primary)]/50">
            <p className="text-[10px] text-[var(--color-text-muted)]">将视频文件拖拽到此处</p>
            <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">或点击「上传视频」按钮选择文件</p>
          </div>
        )}

        {/* 批量上传队列 */}
        {batchFiles.length > 0 && (
          <div className="px-1">
            <BatchUploadQueue files={batchFiles} />
          </div>
        )}

        {error && <p className="mt-2 px-1 text-[11px] leading-snug text-red-500 whitespace-pre-line">{error}</p>}
        <div className="mt-2 px-1">
          {loading && <p className="text-[10px] text-[var(--color-text-muted)]">加载中…</p>}
          {!loading && items.length === 0 && (
            <p className="text-[10px] text-[var(--color-text-muted)]">暂无素材，请上传或加载示例。</p>
          )}
          <ul className="space-y-2 pt-1">
            {items.map((a) => (
              <li
                key={a.id}
                className={`overflow-hidden rounded-lg ring-1 bg-[var(--color-surface-elevated)] ${
                  selectedSet.has(a.id)
                    ? 'ring-[var(--color-primary)] ring-2'
                    : 'ring-[var(--color-border)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleAsset(a.id)}
                  className="flex w-full text-left"
                >
                  <div className="flex w-9 flex-shrink-0 items-center justify-center border-r border-[var(--color-border)] bg-[var(--color-surface)] py-8">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        selectedSet.has(a.id)
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                          : 'border-[var(--color-border)]'
                      }`}
                      aria-hidden
                    >
                      {selectedSet.has(a.id) ? '✓' : ''}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <HoverVideoThumb src={a.url} />
                    <div className="p-2">
                      <p
                        className="truncate text-[11px] font-medium text-[var(--color-text)]"
                        title={a.originalName}
                      >
                        {a.originalName}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {(((a.size ?? 0) / 1024 / 1024).toFixed(1))} MB
                      </p>
                    </div>
                  </div>
                </button>
                <div className="flex gap-1.5 px-2 pb-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToTimeline(a);
                    }}
                    className="min-w-0 flex-1 rounded-md bg-[var(--color-primary)]/15 py-1.5 text-[11px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25"
                  >
                    加入时间轴
                  </button>
                  <button
                    type="button"
                    title="从素材库删除"
                    disabled={deletingId === a.id}
                    onClick={(e) => void handleDeleteAsset(a, e)}
                    className="flex-shrink-0 rounded-md border border-red-500/45 bg-red-500/10 px-2 py-1.5 text-[11px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deletingId === a.id ? '…' : '删除'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
    )}
    </div>
  );
}
