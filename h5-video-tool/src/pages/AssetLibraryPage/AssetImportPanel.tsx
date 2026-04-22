import { useEffect, useMemo, useState } from 'react';
import { getJobStatus, importAssets, type ImportJob } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';

interface AssetImportPanelProps {
  onImportComplete?: () => void;
}

const POLL_INTERVAL_MS = 1500;

export function AssetImportPanel({ onImportComplete }: AssetImportPanelProps) {
  const { uiLocale } = useLocale();
  const isEnglish = uiLocale === 'en';
  const text = isEnglish
    ? {
        importFailed: 'Import failed',
        pickerTitle: 'Select videos or images to import',
        pickerHint: 'Multiple files are supported. They will be uploaded and indexed in the asset library.',
        selectedCount: (count: number) => `${count} file(s) selected`,
        chooseFiles: 'Click to choose files',
        selectedFiles: 'Selected files',
        moreFiles: (count: number) => `+${count} more`,
        importStatus: 'Import status',
        progress: (summary: string) => `Progress ${summary}`,
        preparing: 'Preparing import job',
        uploading: 'Uploading...',
        startImport: 'Start Import',
      }
    : {
        importFailed: '导入失败',
        pickerTitle: '选择要导入的视频或图片',
        pickerHint: '支持多文件上传，导入后会自动进入素材库并建立索引。',
        selectedCount: (count: number) => `已选择 ${count} 个文件`,
        chooseFiles: '点击选择文件',
        selectedFiles: '已选文件',
        moreFiles: (count: number) => `还有 ${count} 个`,
        importStatus: '导入状态',
        progress: (summary: string) => `进度 ${summary}`,
        preparing: '正在准备导入任务',
        uploading: '上传中...',
        startImport: '开始导入',
      };

  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;
    const tick = async () => {
      try {
        const nextJob = await getJobStatus(jobId);
        if (cancelled) return;
        setJob(nextJob);
        if (nextJob.status === 'done') {
          onImportComplete?.();
          return;
        }
        if (nextJob.status === 'error') {
          setError(nextJob.errors?.[0] ?? text.importFailed);
          return;
        }
        window.setTimeout(() => {
          void tick();
        }, POLL_INTERVAL_MS);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : text.importFailed);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [jobId, onImportComplete, text.importFailed]);

  const summary = useMemo(() => {
    if (!job) return null;
    const processed = job.processed + job.failed + job.skipped;
    return `${processed}/${job.total}`;
  }, [job]);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setSubmitting(true);
    setError(null);
    setJob(null);
    try {
      const result = await importAssets(files);
      setJobId(result.jobId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : text.importFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-6 py-8 text-center">
        <span className="text-sm font-semibold text-[var(--color-text)]">{text.pickerTitle}</span>
        <span className="mt-2 text-xs text-[var(--color-text-muted)]">{text.pickerHint}</span>
        <input
          type="file"
          multiple
          accept="video/*,image/*"
          className="sr-only"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        />
        <span className="mt-4 rounded-lg bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
          {files.length > 0 ? text.selectedCount(files.length) : text.chooseFiles}
        </span>
      </label>

      {files.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
          <div className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">{text.selectedFiles}</div>
          <div className="space-y-1 text-sm text-[var(--color-text)]">
            {files.slice(0, 6).map((file) => (
              <div key={`${file.name}-${file.size}`} className="truncate">
                {file.name}
              </div>
            ))}
            {files.length > 6 && <div className="text-xs text-[var(--color-text-muted)]">{text.moreFiles(files.length - 6)}</div>}
          </div>
        </div>
      )}

      {job && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-sm text-[var(--color-text)]">
          <div className="font-medium">
            {text.importStatus}: {job.status}
          </div>
          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
            {summary ? text.progress(summary) : text.preparing}
          </div>
        </div>
      )}

      {error && <div className="text-sm text-[var(--color-error)]">{error}</div>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleUpload()}
          disabled={files.length === 0 || submitting}
          className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? text.uploading : text.startImport}
        </button>
      </div>
    </div>
  );
}
