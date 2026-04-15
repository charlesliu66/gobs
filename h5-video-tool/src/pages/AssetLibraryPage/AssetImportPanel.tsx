/**
 * TASK-C: AssetImportPanel — 导入面板
 * 多文件选择 → POST /import → 轮询进度
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { importAssets, getJobStatus } from '../../api/assetLibraryApi';
import type { ImportJob } from '../../api/assetLibraryApi';
import { toast } from '../../components/Toast';

interface AssetImportPanelProps {
  onImportComplete?: () => void;
}

export function AssetImportPanel({ onImportComplete }: AssetImportPanelProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<ImportJob | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPoll(), [stopPoll]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    stopPoll();
    try {
      const { jobId, total } = await importAssets(files);
      setJob({ jobId, username: '', total, processed: 0, failed: 0, status: 'running' });
      // 开始轮询
      pollRef.current = setInterval(async () => {
        try {
          const status = await getJobStatus(jobId);
          setJob(status);
          // 终态：done / error（已由 getJobStatus 归一化，包含 failed/interrupted）
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
      e.target.value = '';
    }
  }

  const progressPct = job && job.total > 0
    ? Math.round((job.processed / job.total) * 100)
    : 0;

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">导入素材</h2>
        <p className="text-sm text-[var(--color-text-muted)]">支持批量导入图片和视频文件</p>
      </div>

      {/* 上传区域 */}
      <div
        className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-10 text-center cursor-pointer hover:border-[var(--color-primary)] transition"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="text-4xl mb-3">📂</div>
        <p className="text-sm text-[var(--color-text-muted)] mb-3">点击选择或拖入文件</p>
        <p className="text-xs text-[var(--color-text-subtle)]">支持 image/*、video/*，单次最多 500 个</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition flex items-center justify-center gap-2"
      >
        {uploading && (
          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {uploading ? '上传中...' : '选择文件并上传'}
      </button>

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

          {/* 进度条 */}
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
            <span className="ml-auto font-medium text-[var(--color-text)]">{progressPct}%</span>
          </div>

          {/* 错误列表 */}
          {job.errors && job.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 max-h-32 overflow-y-auto">
              {job.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-500">{e}</p>
              ))}
            </div>
          )}

          {/* 重试按钮 */}
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
