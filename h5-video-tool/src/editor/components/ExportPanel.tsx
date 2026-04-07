import { useState, useCallback, useEffect, useRef } from 'react';
import type { TimelineProject } from '../types/timeline';
import { startEditorExport, getEditorExportStatus } from '../../api/editor';
import { toast } from '../../components/Toast';

type ExportResolution = '720p' | '1080p' | '4K';
type ExportFormat = 'mp4' | 'mov';
type ExportQuality = 'fast' | 'balanced' | 'high';

interface ExportPanelProps {
  project: TimelineProject;
  aspectRatio: string;
  onPushLog: (msg: string) => void;
}

const QUALITY_LABELS: Record<ExportQuality, string> = {
  fast: '快速 (文件小)',
  balanced: '均衡 (推荐)',
  high: '高质量 (慢)',
};

export function ExportPanel({ project, aspectRatio, onPushLog }: ExportPanelProps) {
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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setBusy(true);
    setDownloadUrl(null);
    setOpen(false);
    toast.info('导出任务已提交，请稍候…');
    try {
      const { jobId } = await startEditorExport({ project, aspectRatio, resolution, format, quality });
      onPushLog(`导出任务 ${jobId} 已提交 (${resolution} ${format} ${quality})`);
      let tries = 0;
      while (tries < 90) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = await getEditorExportStatus(jobId);
        if (st.status === 'done') {
          if (st.downloadUrl) {
            setDownloadUrl(st.downloadUrl);
            toast.success('导出完成！点击下载');
            onPushLog(`导出完成：${st.downloadUrl}`);
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
  }, [project, aspectRatio, resolution, format, quality, onPushLog]);

  return (
    <div ref={panelRef} className="relative flex items-center gap-2">
      {downloadUrl && (
        <a
          href={downloadUrl}
          download
          className="rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-xs font-medium text-[var(--color-success)] hover:bg-[var(--color-success)]/20 transition-colors"
        >
          ⬇ 下载成品
        </a>
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
          className="rounded-r-lg border-l border-white/20 bg-[var(--color-primary)] px-2 py-2 text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          title="导出设置"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      {open && (
        <div className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4 shadow-2xl">
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
