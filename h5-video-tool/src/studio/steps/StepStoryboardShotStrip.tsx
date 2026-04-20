import type { ProductionShot, SceneSheet } from '../productionTypes';

/**
 * 每个分镜根据 batch-job 的实时状态映射成下列 UI 态（值越靠后优先级越高）。
 * 由 ProductionWizard 从 useGlobalJobs 生成后传入。
 *  - 'queuing'   即梦队列排队（绿色慢转）
 *  - 'processing' 即梦正在生成
 *  - 'failed'    该镜 pending 的 batch-job 失败（红色，可重试）
 */
export type ShotJobStatus = 'queuing' | 'processing' | 'failed';

export function StepStoryboardShotStrip({
  shots,
  scSheets,
  selectedShotIdx,
  shotBusyMap,
  shotQueuedMap,
  shotJobStatusMap,
  shotJobQueueInfoMap,
  onSelectShot,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  selectedShotIdx: number;
  shotBusyMap: Record<string, 'frame' | 'video'>;
  shotQueuedMap?: Record<string, boolean>;
  shotJobStatusMap?: Record<string, ShotJobStatus>;
  /** 即梦队列位置，用于 tooltip 展示"即梦队列 #N/M" */
  shotJobQueueInfoMap?: Record<string, { queue_idx?: number; queue_length?: number; queue_status?: string }>;
  onSelectShot: (idx: number) => void;
}) {
  const formatQueueTip = (key: string, base: string): string => {
    const q = shotJobQueueInfoMap?.[key];
    if (!q) return base;
    const idx = typeof q.queue_idx === 'number' ? q.queue_idx + 1 : null;
    const len = typeof q.queue_length === 'number' ? q.queue_length : null;
    if (idx && len) return `${base}（即梦队列 #${idx}/${len}）`;
    if (idx) return `${base}（即梦队列 #${idx}）`;
    if (q.queue_status) return `${base}（${q.queue_status}）`;
    return base;
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="flex min-w-min gap-2">
        {shots.map((s, idx) => {
          const shotKey = String(s.shotIndex);
          const isThisShotBusy = shotBusyMap[shotKey];
          const isQueued = shotQueuedMap?.[shotKey] ?? false;
          const jobStatus = shotJobStatusMap?.[shotKey];
          const hasVideo = !!(s.previewVideoUrl || s.previewVideoPath || (s.previewVideoVersions && s.previewVideoVersions.length > 0));
          // 仅当无视频时才展示失败，避免"已有视频但最近一次失败"误导
          const showFailed = !hasVideo && (jobStatus === 'failed' || (!jobStatus && !s.pendingVideoSubmitId && !!s.lastVideoError));
          return (
          <button
            key={s.shotIndex}
            type="button"
            onClick={() => onSelectShot(idx)}
            className={`w-24 shrink-0 rounded-lg border p-1 text-left transition-colors ${
              selectedShotIdx === idx
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded bg-[var(--color-surface-hover)]">
              {s.previewStillDataUrl ? (
                <img src={s.previewStillDataUrl} alt="" className="h-full w-full object-cover" />
              ) : scSheets.find((sc) => sc.sceneRef === s.sceneRef)?.variants[0]?.imageDataUrl ? (
                <img
                  src={scSheets.find((sc) => sc.sceneRef === s.sceneRef)!.variants[0].imageDataUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : null}
              {showFailed ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-red-950/60 backdrop-blur-[1px]"
                  title={s.lastVideoError?.reason || '生成失败，点击可重试'}
                >
                  <span className="text-base leading-none text-red-300">✕</span>
                  <span className="px-1 text-[8px] font-medium text-red-200">生成失败</span>
                </div>
              ) : isQueued ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 backdrop-blur-[1px]">
                  <span className="h-4 w-4 rounded-full border-2 border-white/25 border-t-amber-400 animate-pulse" />
                  <span className="px-1 text-[8px] font-medium text-amber-200">排队中</span>
                </div>
              ) : isThisShotBusy === 'video' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/65 backdrop-blur-[1px]">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-amber-400" />
                  <span className="px-1 text-[8px] font-medium text-amber-100">提交中</span>
                </div>
              ) : jobStatus === 'processing' ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50"
                  title={formatQueueTip(shotKey, '即梦正在生成')}
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-green-400" />
                  <span className="px-1 text-[8px] font-medium text-green-200">即梦生成</span>
                </div>
              ) : jobStatus === 'queuing' ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/45"
                  title={formatQueueTip(shotKey, '即梦服务端队列排队中')}
                >
                  <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-sky-400 animate-pulse" />
                  <span className="px-1 text-[8px] font-medium text-sky-200">即梦排队</span>
                </div>
              ) : s.pendingVideoSubmitId ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50"
                  title={formatQueueTip(shotKey, '已提交即梦，等待最新状态')}
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-green-400" style={{ animationDuration: '2s' }} />
                  <span className="px-1 text-[8px] font-medium text-green-200">即梦生成</span>
                </div>
              ) : null}

              {isThisShotBusy === 'frame' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/60">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-cyan-400" />
                  <span className="px-1 text-[8px] font-medium text-cyan-100">静帧中</span>
                </div>
              ) : null}
            </div>
            <div className="mt-1 truncate px-1 text-[10px] text-[var(--color-text)]">
              #{s.shotIndex} {s.durationSec}s
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}

