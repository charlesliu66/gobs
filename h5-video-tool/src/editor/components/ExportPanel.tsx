import { useState, useCallback, useEffect, useRef } from 'react';
import type { AspectRatioPreset, MediaAsset, TimelineProject } from '../types/timeline';
import { startEditorExport, getEditorExportStatus, listExportFiles, deleteExportFile } from '../../api/editor';
import type { ExportFileRecord } from '../../api/editor';
import { apiDownload } from '../../api/client';
import { toast } from '../../components/Toast';

type ExportResolution = '720p' | '1080p' | '4K';
type ExportFormat = 'mp4' | 'mov';
type ExportQuality = 'fast' | 'balanced' | 'high';

interface ExportPanelProps {
  project: TimelineProject;
  assets?: Record<string, MediaAsset>;
  aspectRatio: AspectRatioPreset;
  onPushLog: (msg: string) => void;
}

const QUALITY_LABELS: Record<ExportQuality, string> = {
  fast: '快速 (文件小)',
  balanced: '均衡 (推荐)',
  high: '高质量 (慢)',
};

export function ExportPanel({ project, assets, aspectRatio, onPushLog }: ExportPanelProps) {
  const [open, setOpen] = useState(false);
  const [resolution, setResolution] = useState<ExportResolution>('1080p');
  const panelRef = useRef<HTMLDivElement>(null);

  // 点击面板外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [quality, setQuality] = useState<ExportQuality>('balanced');
  const [busy, setBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMsg, setExportMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // 历史导出面板
  const [showHistory, setShowHistory] = useState(false);
  const [historyFiles, setHistoryFiles] = useState<ExportFileRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { files } = await listExportFiles();
      setHistoryFiles(files);
    } catch {
      toast.error('加载导出历史失败');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showHistory) return;
    void loadHistory();
  }, [showHistory, loadHistory]);

  // 点击历史面板外部关闭
  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showHistory]);

  const handleDeleteFile = useCallback(async (filename: string) => {
    if (!confirm(`确认删除 ${filename}？此操作不可恢复。`)) return;
    try {
      await deleteExportFile(filename);
      setHistoryFiles((prev) => prev.filter((f) => f.filename !== filename));
      toast.success('已删除');
    } catch (e) {
      toast.error(`删除失败：${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const handleExport = useCallback(async () => {
    setBusy(true);
    setDownloadUrl(null);
    setExportProgress(0);
    setExportMsg('提交中…');
    setOpen(false);
    toast.info('导出任务已提交，请稍候…');
    try {
      const { jobId } = await startEditorExport({ project, assets, aspectRatio, resolution, format, quality });
      onPushLog(`导出任务 ${jobId} 已提交 (${resolution} ${format} ${quality})`);
      let tries = 0;
      while (tries < 90) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = await getEditorExportStatus(jobId);
        setExportProgress(st.progress ?? 0);
        setExportMsg(st.progressMsg ?? (st.status === 'processing' ? '合成中…' : ''));
        if (st.status === 'done') {
          if (st.downloadUrl) {
            setDownloadUrl(st.downloadUrl);
            toast.success('导出完成！点击下载');
            onPushLog(`导出完成：${st.downloadUrl}`);
            // 自动刷新历史列表，使新文件立即出现
            void listExportFiles().then(({ files }) => setHistoryFiles(files)).catch(() => {});
          } else {
            toast.info('导出完成（Mock 模式，暂无真实文件）');
            onPushLog('导出完成（Mock）');
          }
          break;
        }
        if (st.status === 'error') {
          toast.error(`导出失败：${st.error || '未知错误'}`);
          onPushLog(`导出失败：${st.error}`);
          break;
        }
        tries += 1;
      }
      if (tries >= 90) toast.error('导出超时，请检查后端状态');
    } catch (e) {
      toast.error(`导出请求失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [project, assets, aspectRatio, resolution, format, quality, onPushLog]);

  /** 从文件名中解析可读时间，格式：exp_<timestamp>_xxx.mp4 → "04-15 14:30" */
  function formatExportTime(record: ExportFileRecord): string {
    const d = new Date(record.createdAt);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${mm}-${dd} ${hh}:${min}`;
  }

  return (
    <div ref={panelRef} className="relative flex items-center gap-2">
      {busy && (
        <div className="flex flex-col gap-1 min-w-[120px]">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-[var(--color-text-muted)] truncate max-w-[100px]">{exportMsg || '合成中…'}</span>
            <span className="text-[9px] text-[var(--color-text-muted)]">{exportProgress}%</span>
          </div>
          <div className="h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}
      {downloadUrl && (
        <button
          type="button"
          onClick={() => {
            const filename = downloadUrl.split('/').pop() || 'export.mp4';
            void apiDownload(downloadUrl, filename).catch((e: unknown) => {
              toast.error(`下载失败：${e instanceof Error ? e.message : String(e)}`);
            });
          }}
          className="rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-xs font-medium text-[var(--color-success)] hover:bg-[var(--color-success)]/20 transition-colors"
        >
          ⬇ 下载成品
        </button>
      )}
      <div className="flex">
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExport()}
          className="rounded-l-lg bg-[var(--color-primary)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {busy ? '导出中…' : '导出 MP4'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen((o) => !o)}
          className="border-l border-white/20 bg-[var(--color-primary)] px-2 py-2 text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          title="导出设置"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {/* 历史导出按钮 */}
        <button
          type="button"
          onClick={() => setShowHistory((s) => !s)}
          className="rounded-r-lg border-l border-white/20 bg-[var(--color-primary)] px-2 py-2 text-white hover:opacity-90 transition-opacity"
          title="历史导出"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      </div>

      {/* 历史导出面板 */}
      {showHistory && (
        <div
          ref={historyRef}
          className="absolute top-full right-0 z-50 mt-1 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              历史导出
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadHistory()}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                title="刷新列表"
              >
                ↻ 刷新
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8 text-[11px] text-[var(--color-text-muted)]">
                加载中…
              </div>
            ) : historyFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 py-8 text-[11px] text-[var(--color-text-muted)]">
                <span>暂无导出记录</span>
                <span className="text-[10px] opacity-60">完成导出后文件将显示在此处</span>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {historyFiles.map((file) => (
                  <li key={file.filename} className="flex items-center gap-2 px-4 py-2.5 hover:bg-[var(--color-surface-hover)] transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-[var(--color-text)]">
                        {formatExportTime(file)}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">{file.sizeLabel}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const fn = file.filename;
                        void apiDownload(file.downloadUrl, fn).catch((e: unknown) => {
                          toast.error(`下载失败：${e instanceof Error ? e.message : String(e)}`);
                        });
                      }}
                      className="shrink-0 rounded px-2 py-1 text-[10px] font-medium text-[var(--color-success)] hover:bg-[var(--color-success)]/10 transition-colors"
                      title="下载"
                    >
                      ⬇
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteFile(file.filename)}
                      className="shrink-0 rounded px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      🗑
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-2xl">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">导出设置</p>

          {/* 分辨率 */}
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] text-[var(--color-text-muted)]">分辨率</p>
            <div className="flex gap-1">
              {(['720p', '1080p', '4K'] as ExportResolution[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResolution(r)}
                  className={`flex-1 rounded py-1.5 text-[10px] font-medium transition-colors ${
                    resolution === r
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 格式 */}
          <div className="mb-3">
            <p className="mb-1.5 text-[10px] text-[var(--color-text-muted)]">格式</p>
            <div className="flex gap-1">
              {(['mp4', 'mov'] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 rounded py-1.5 text-[10px] font-medium uppercase transition-colors ${
                    format === f
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* 质量 */}
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] text-[var(--color-text-muted)]">质量</p>
            <div className="space-y-1">
              {(['fast', 'balanced', 'high'] as ExportQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`w-full flex items-center justify-between rounded px-3 py-1.5 text-[10px] transition-colors ${
                    quality === q
                      ? 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 text-[var(--color-primary)]'
                      : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  <span className="font-medium">{QUALITY_LABELS[q].split(' ')[0]}</span>
                  <span className="opacity-60">{QUALITY_LABELS[q].split(' ').slice(1).join(' ')}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleExport()}
            className="w-full rounded-lg bg-[var(--color-primary)] py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            开始导出
          </button>
        </div>
      )}
    </div>
  );
}
