/**
 * AssetImportPanel — 导入面板
 * 支持：多文件选择、整个文件夹选择、拖拽文件/文件夹
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { importAssets, getJobStatus } from '../../api/assetLibraryApi';
import type { ImportJob } from '../../api/assetLibraryApi';
import { toast } from '../../components/Toast';
import { RunningStatus } from '../../components/RunningStatus';

const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
]);

function isMediaFile(file: File): boolean {
  if (ACCEPTED_TYPES.has(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg','jpeg','png','gif','webp','bmp','svg','mp4','webm','mov','avi','mkv'].includes(ext);
}

async function extractFilesFromDrop(dataTransfer: DataTransfer): Promise<File[]> {
  const files: File[] = [];

  async function readEntryRecursive(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      if (isMediaFile(file)) files.push(file);
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
      for (const e of entries) {
        await readEntryRecursive(e);
      }
    }
  }

  const items = dataTransfer.items;
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }

  for (const entry of entries) {
    await readEntryRecursive(entry);
  }
  return files;
}

interface AssetImportPanelProps {
  onImportComplete?: () => void;
}

export function AssetImportPanel({ onImportComplete }: AssetImportPanelProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  const startUpload = useCallback(async (files: File[] | FileList) => {
    const list = files instanceof FileList ? Array.from(files) : files;
    const mediaFiles = list.filter(isMediaFile);
    if (mediaFiles.length === 0) {
      toast.error('没有找到支持的图片或视频文件');
      return;
    }
    setUploading(true);
    stopPoll();
    try {
      const { jobId, total } = await importAssets(mediaFiles);
      setJob({ jobId, username: '', total, processed: 0, failed: 0, skipped: 0, status: 'running' });
      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          setJob(status);
          if (status.status === 'done' || status.status === 'error') {
            stopPoll();
            if (status.status === 'done') {
              toast.success(`导入完成：${status.processed} 个素材`);
              onImportComplete?.();
            } else {
              toast.error('导入出现错误，请检查详情');
            }
          }
        } catch {
          stopPoll();
        }
      }, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }, [stopPoll, onImportComplete]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    void startUpload(files);
    e.target.value = '';
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    try {
      const files = await extractFilesFromDrop(e.dataTransfer);
      if (files.length > 0) {
        void startUpload(files);
      } else {
        toast.error('拖入的内容中没有支持的图片或视频文件');
      }
    } catch {
      toast.error('读取拖入内容失败');
    }
  }

  const progressPct = job && job.total > 0
    ? Math.round(((job.processed + job.failed + job.skipped) / job.total) * 100)
    : 0;

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">导入素材</h2>
        <p className="text-sm text-[var(--color-text-muted)]">支持批量导入图片和视频文件，可选择文件或整个文件夹</p>
      </div>

      {/* 拖拽区域 */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition ${
          dragOver
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
        } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-4xl mb-3">{dragOver ? '📥' : '📂'}</div>
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          {dragOver ? '松开即可导入' : '拖入文件或文件夹'}
        </p>
        <p className="text-xs text-[var(--color-text-subtle)]">
          支持图片（JPG/PNG/GIF/WebP）和视频（MP4/WebM/MOV），自动递归扫描子文件夹
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          {...{ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
        />
      </div>

      {/* 双按钮 */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition flex items-center justify-center gap-2"
        >
          {uploading && (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {uploading ? '上传中...' : '选择文件'}
        </button>
        <button
          type="button"
          disabled={uploading}
          onClick={() => folderInputRef.current?.click()}
          className="flex-1 py-3 border-2 border-[var(--color-primary)] text-[var(--color-primary)] rounded-xl font-semibold hover:bg-[var(--color-primary)]/10 disabled:opacity-60 transition flex items-center justify-center gap-2"
        >
          📁 选择文件夹
        </button>
      </div>

      <RunningStatus active={uploading} label="正在上传素材" stallAfterSec={20} scene="props-room" />

      {/* 进度卡片 */}
      {job && (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text)]">
              任务 <span className="font-mono text-xs text-[var(--color-text-subtle)]">{(job.jobId ?? '').slice(0, 8)}…</span>
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              job.status === 'done'
                ? 'bg-green-500/15 text-green-500'
                : job.status === 'error'
                ? 'bg-red-500/15 text-red-500'
                : 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
            }`}>
              {job.status === 'done' ? '完成' : job.status === 'error' ? '出错' : '处理中'}
            </span>
          </div>

          <div className="w-full h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--color-primary)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex gap-4 text-sm">
            <span className="text-[var(--color-text-subtle)]">总计 <strong className="text-[var(--color-text)]">{job.total}</strong></span>
            <span className="text-[var(--color-text-subtle)]">已处理 <strong className="text-green-500">{job.processed}</strong></span>
            {job.failed > 0 && (
              <span className="text-[var(--color-text-subtle)]">失败 <strong className="text-red-500">{job.failed}</strong></span>
            )}
            {job.skipped > 0 && (
              <span className="text-[var(--color-text-subtle)]">跳过 <strong className="text-amber-500">{job.skipped}</strong></span>
            )}
            <span className="ml-auto font-medium text-[var(--color-text)]">{progressPct}%</span>
          </div>

          {job.errors && job.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-32 overflow-y-auto">
              {job.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-500">{e}</p>
              ))}
            </div>
          )}

          {job.status === 'error' && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-sm hover:bg-[var(--color-primary)]/10 transition"
            >
              重新上传
            </button>
          )}
        </div>
      )}
    </div>
  );
}
