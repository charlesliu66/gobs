import { useState } from 'react';
import {
  klingVideoProxyUrl,
  resolveKlingPlaybackUrl,
  type KlingPollPhase,
  type KlingVideoListRow,
} from '../api/video';

type Props = {
  taskId: string;
  phase: KlingPollPhase;
  row?: KlingVideoListRow;
  error?: string;
};

export function KlingJobCard({ taskId, phase, row, error }: Props) {
  const [playing, setPlaying] = useState(false);
  const remote = resolveKlingPlaybackUrl(row);
  const playUrl = remote ? klingVideoProxyUrl(remote) : undefined;
  const poster = row?.coverUrl?.trim() || undefined;
  const busy = phase === 'pending' || phase === 'processing';

  const handleDownload = () => {
    if (!remote) return;
    const a = document.createElement('a');
    a.href = klingVideoProxyUrl(remote);
    a.download = `kling-${taskId}.mp4`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden text-left max-w-md">
      <div className="relative aspect-video bg-black group">
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 z-10">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-sm text-white/90">正在生成中，请稍后</p>
          </div>
        )}
        {!busy && playUrl && playing ? (
          <video src={playUrl} controls autoPlay className="w-full h-full object-contain" poster={poster} />
        ) : (
          <>
            {poster ? (
              <img src={poster} alt="" className="w-full h-full object-cover opacity-90" />
            ) : (
              <div className="w-full h-full bg-zinc-900" />
            )}
            {!busy && playUrl && (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors"
                aria-label="播放预览"
              >
                <span className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/40">
                  <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </button>
            )}
          </>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-mono text-[var(--color-text)] truncate" title={taskId}>
              {taskId}
            </p>
            {row?.createdAt && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{row.createdAt}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {remote && (
              <button
                type="button"
                onClick={handleDownload}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]"
                title="下载"
                aria-label="下载"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Omni Agent
          </span>
          {row?.modelName && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {row.modelName}
            </span>
          )}
          {row?.aspectRatio && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {row.aspectRatio}
            </span>
          )}
          {row?.modeLabel && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {row.modeLabel}
            </span>
          )}
          {row?.soundLabel && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[var(--color-text-muted)] border border-[var(--color-border)]">
              {row.soundLabel}
            </span>
          )}
        </div>

        {error && <p className="text-xs text-[var(--color-error)]">{error}</p>}
      </div>
    </div>
  );
}
