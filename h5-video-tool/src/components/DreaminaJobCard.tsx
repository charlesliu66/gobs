import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DreaminaTaskPollResponse } from '../api/video';

type Props = {
  taskId: string;
  submitId: string;
  /** 当前轮询状态 */
  status: DreaminaTaskPollResponse['status'];
  queueInfo?: DreaminaTaskPollResponse['queueInfo'];
  genStatus?: string;
  failReason?: string;
  videoUrl?: string;
  promptSnippet?: string;
  onDismiss?: () => void;
};

export function DreaminaJobCard({
  taskId,
  submitId,
  status,
  queueInfo,
  genStatus,
  failReason,
  videoUrl,
  promptSnippet,
  onDismiss,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const busy = status === 'pending';
  const failed = status === 'failed';
  const done = status === 'completed' && !!videoUrl;

  const qIdx = queueInfo?.queue_idx;
  const qLen = queueInfo?.queue_length;
  const queueLabel =
    qIdx != null && qLen != null ? `排队约 ${qIdx} / ${qLen}（即梦服务端队列，仅供参考）` : queueInfo?.queue_status || genStatus || '排队中';

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden text-left max-w-md">
      <div className="relative aspect-video bg-zinc-950">
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/85 z-10 p-3">
            <div className="w-8 h-8 border-2 border-white/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-xs text-center text-white/90 leading-snug">{queueLabel}</p>
            <p className="text-[10px] font-mono text-white/50 truncate max-w-full" title={submitId}>
              {submitId}
            </p>
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 z-10 p-3">
            <p className="text-sm text-red-300">生成失败</p>
            {failReason && <p className="text-xs text-red-200/90 text-center line-clamp-4">{failReason}</p>}
          </div>
        )}
        {done && videoUrl && playing && (
          <video src={videoUrl} controls autoPlay className="w-full h-full object-contain" />
        )}
        {done && videoUrl && !playing && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
            aria-label="播放预览"
          >
            <span className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/40">
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {promptSnippet && (
              <p className="text-xs text-[var(--color-text-muted)] line-clamp-2" title={promptSnippet}>
                {promptSnippet}
              </p>
            )}
            <p className="text-[10px] font-mono text-[var(--color-text-muted)] truncate mt-1" title={taskId}>
              {taskId}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onDismiss && (done || failed) && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-2 py-1 rounded-lg hover:bg-[var(--color-surface-hover)]"
              >
                关闭
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
            即梦 Seedance
          </span>
          {done && (
            <Link
              to={`/result?taskId=${encodeURIComponent(taskId)}`}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/40 hover:underline"
            >
              在结果页打开
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
