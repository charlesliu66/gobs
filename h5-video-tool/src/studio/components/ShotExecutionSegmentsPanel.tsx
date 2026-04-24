import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import type { BatchJobDto } from '../../api/batchJobs';
import type { ProductionExecutionSegment, ProductionShot } from '../productionTypes';
import {
  type ExecutionSegmentActiveJobMap,
  resolveExecutionSegmentRuntimeState,
  type ExecutionSegmentJobStatusMap,
} from '../executionSegmentStatus';

function resolveSegmentVideoSrc(segment: ProductionExecutionSegment): string | null {
  if (segment.videoUrl?.trim()) return segment.videoUrl;
  if (segment.videoPath?.trim()) return `/api/video/file?path=${encodeURIComponent(segment.videoPath)}`;
  const selected = segment.previewVideoVersions?.find((version) => version.id === segment.selectedPreviewVideoVersionId)
    ?? segment.previewVideoVersions?.[0];
  if (selected?.videoUrl?.trim()) return selected.videoUrl;
  if (selected?.videoPath?.trim()) return `/api/video/file?path=${encodeURIComponent(selected.videoPath)}`;
  return null;
}

export function ShotExecutionSegmentsPanel({
  shot,
  segments,
  segmentJobsMap,
  shotActiveJobMap,
  shotJobStatusMap,
  shotBusyMap,
}: {
  shot: ProductionShot;
  segments: ProductionExecutionSegment[];
  segmentJobsMap?: Record<string, BatchJobDto[]>;
  shotActiveJobMap?: ExecutionSegmentActiveJobMap;
  shotJobStatusMap?: ExecutionSegmentJobStatusMap;
  shotBusyMap?: Record<string, 'frame' | 'video'>;
}) {
  const { t, uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  if (!segments.length) return null;

  const runtimeSegments = segments.map((segment) => resolveExecutionSegmentRuntimeState(shot, segment, {
    segmentJobsMap,
    shotActiveJobMap,
    shotJobStatusMap,
    shotBusyMap,
  }));

  const modeLabel = (segment: ProductionExecutionSegment) => {
    if (segment.mode === 'merged_short') return uiText('短镜合并', 'Merged short');
    if (segment.mode === 'split_long') return uiText('长镜拆分', 'Split long');
    return uiText('直接执行', 'Direct');
  };

  const statusClass = (status: string) => {
    if (status === 'completed') return 'border-green-500/30 bg-green-500/10 text-green-200';
    if (status === 'generating') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    if (status === 'platform_queueing') return 'border-sky-500/30 bg-sky-500/10 text-sky-200';
    if (status === 'waiting_submit') return 'border-violet-500/30 bg-violet-500/10 text-violet-200';
    if (status === 'failed') return 'border-red-500/30 bg-red-500/10 text-red-200';
    if (status === 'cancelled') return 'border-slate-500/30 bg-slate-500/10 text-slate-200';
    return 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]';
  };

  return (
    <section className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="mb-3">
        <div className="text-xs font-semibold text-[var(--color-text)]">
          {uiText('执行分段', 'Execution segments')}
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)]">
          {uiText(
            '保留原始分镜作为主视图，下面展示实际提交给 Dreamina 的执行分段。',
            'Original shots stay primary; these are the executable Dreamina segments underneath.',
          )}
        </div>
      </div>

      <div className="space-y-2">
        {runtimeSegments.map((runtime) => {
          const { segment } = runtime;
          const videoSrc = runtime.activeJob?.videoUrl?.trim() || resolveSegmentVideoSrc(segment);
          return (
            <article
              key={segment.id}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text)]">
                    {segment.segmentLabel || `Segment ${segment.segmentOrder + 1}`}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                    <span>{modeLabel(segment)}</span>
                    <span>•</span>
                    <span>{uiText(`时长 ${segment.durationSec}s`, `${segment.durationSec}s`)}</span>
                    <span>•</span>
                    <span>{uiText(`来源 ${segment.sourceShotIndexes.map((index) => `#${index}`).join(', ')}`, `Sources ${segment.sourceShotIndexes.map((index) => `#${index}`).join(', ')}`)}</span>
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(runtime.userStatus)}`}>
                  {t(runtime.labelKey)}
                </span>
              </div>

              {segment.storyboardText && (
                <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-text)]/80">
                  {segment.storyboardText}
                </p>
              )}

              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                {runtime.platformQueuePosition != null && (
                  <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-sky-200">
                    {uiText(`平台队列 #${runtime.platformQueuePosition}`, `Platform #${runtime.platformQueuePosition}`)}
                  </span>
                )}
                {runtime.dreaminaQueuePosition != null && (
                  <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-sky-200">
                    {uiText(
                      `即梦队列 #${runtime.dreaminaQueuePosition}${runtime.dreaminaQueueSize ? `/${runtime.dreaminaQueueSize}` : ''}`,
                      `Dreamina #${runtime.dreaminaQueuePosition}${runtime.dreaminaQueueSize ? `/${runtime.dreaminaQueueSize}` : ''}`,
                    )}
                  </span>
                )}
                {runtime.pendingSubmitId && (
                  <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-violet-200">
                    {uiText('已记录 submit', 'Submit tracked')}
                  </span>
                )}
                {videoSrc && (
                  <a
                    href={videoSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-green-500/25 bg-green-500/10 px-2 py-1 text-green-200 hover:bg-green-500/15"
                  >
                    {uiText('打开结果', 'Open result')}
                  </a>
                )}
              </div>

              {runtime.failReason && (
                <div className="mt-2 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-red-200">
                  {runtime.failReason}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
