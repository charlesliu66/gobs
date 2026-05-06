import type {
  CharacterSheet,
  ProductionExecutionSegment,
  ProductionShot,
  ProductionShotVideoVersion,
  SceneSheet,
} from '../productionTypes';
import { useEffect, useRef, useState } from 'react';
import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { hasProductionShotPreviewMedia } from '../productionTypes';
import type { ShotReviewResult, ShotReviewSuggestion, ContinuityIssue } from '../../api/shotReview';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { autoMatchCharacterStateBySheet, computeShotRefTags } from '../productionAssets';
import { useProductionContext } from '../ProductionContext';
import { StepStoryboardAssetsSidebar } from './StepStoryboardAssetsSidebar';
import { StepStoryboardMainHeader } from './StepStoryboardMainHeader';
import { StepStoryboardMultimodalRefPanel } from './StepStoryboardMultimodalRefPanel';
import { StepStoryboardGenerateActions } from './StepStoryboardGenerateActions';
import { StepStoryboardFieldsEditor } from './StepStoryboardFieldsEditor';
import { StepStoryboardPreviewPanel } from './StepStoryboardPreviewPanel';
import { StepStoryboardShotStrip } from './StepStoryboardShotStrip';
import { StepStoryboardAiReview } from './StepStoryboardAiReview';
import { StepStoryboardQuickAdjust } from './StepStoryboardQuickAdjust';
import { StepStoryboardContinuityCheck } from './StepStoryboardContinuityCheck';
import { ShotExecutionSegmentsPanel } from '../components/ShotExecutionSegmentsPanel';
import { getSegmentsForShot } from '../executionSegments';
import { resolveShotAggregateStatus } from '../executionSegmentStatus';
import type { ShotActiveJobMap, ShotStatusMap } from '../exportStoryboardStatus';
import { getStoredExecutionSegmentsForShots } from '../productionWizardStorage';

type StorySceneCoverage = { hit: number; total: number; missingLabels: string[] } | null;
type MultimodalRefPack = {
  multimodalImages: Array<{ base64: string; mimeType?: string }>;
  labels: string[];
  narrativeWithInlineTags: string;
};

export function StepStoryboardWorkspace({
  shot,
  shots,
  chSheets,
  scSheets,
  shotMediaBusy,
  shotBusyMap,
  shotActiveJobMap,
  shotJobStatusMap,
  shotJobQueueInfoMap,
  segmentJobsMap,
  executionSegments,
  selectedShotJob,
  queueSnapshot,
  storySceneCoverage,
  styleRefSummary,
  shotVideoDreaminaModel,
  dreaminaModelVersion,
  dreaminaAsync,
  hasProductionDesign,
  multimodalRefPack,
  multimodalAutoPrompt,
  shotBlob,
  shotPreviewPlaySrc,
  shotVideoVersions,
  selectedShotVideoVersion,
  busyL3,
  onSetShotVideoDreaminaModel,
  onSetDreaminaModelVersion,
  onGenerateShotFrame,
  onGenerateShotVideo,
  onCancelActiveJob,
  onCancelShotJob,
  cancelBusy,
  onCancelProjectQueue,
  bulkCancelling,
  onKeepOnlyCurrentVersion,
  onSelectVideoVersion,
  onCheckVideoProgress,
  checkingProgress,
  aiReviewResult,
  aiReviewing,
  onAiReview,
  onApplySuggestion,
  onApplyAllAndRegenerate,
  continuityIssues,
  continuityChecking,
  onContinuityCheck,
  onShowContinuousPlay,
  onShowAbCompare,
  onBatchGenerateAllVideos,
  onSyncBatchJobs,
  syncingBatchJobs,
  projectTitle: _projectTitle,
}: {
  shot?: ProductionShot;
  shots: ProductionShot[];
  busyL3?: boolean;
  chSheets: CharacterSheet[];
  scSheets: SceneSheet[];
  shotMediaBusy: 'frame' | 'video' | null;
  shotBusyMap: Record<string, 'frame' | 'video'>;
  shotActiveJobMap?: ShotActiveJobMap;
  shotJobStatusMap?: ShotStatusMap;
  segmentJobsMap?: Record<string, BatchJobDto[]>;
  executionSegments?: ProductionExecutionSegment[];
  shotJobQueueInfoMap?: Record<string, {
    queue_idx?: number;
    queue_length?: number;
    queue_status?: string;
    globalQueuePos?: number;
    etaSec?: number;
  }>;
  selectedShotJob?: BatchJobDto | null;
  queueSnapshot: QueueSnapshotDto;
  storySceneCoverage: StorySceneCoverage;
  styleRefSummary: string;
  shotVideoDreaminaModel?: string;
  dreaminaModelVersion?: string;
  dreaminaAsync: boolean;
  hasProductionDesign: boolean;
  multimodalRefPack: MultimodalRefPack | null;
  multimodalAutoPrompt: string;
  shotBlob: string;
  shotPreviewPlaySrc: string | null;
  shotVideoVersions: ProductionShotVideoVersion[];
  selectedShotVideoVersion: ProductionShotVideoVersion | null;
  onSetShotVideoDreaminaModel: (next: string) => void;
  onSetDreaminaModelVersion: (next: string) => void;
  onGenerateShotFrame: () => void;
  onGenerateShotVideo: () => void;
  onCancelActiveJob?: () => void;
  onCancelShotJob?: (job: BatchJobDto) => void;
  cancelBusy?: boolean;
  onCancelProjectQueue?: () => void;
  bulkCancelling?: boolean;
  onBatchGenerateAllVideos?: () => void;
  onKeepOnlyCurrentVersion: (id: string) => void;
  onSelectVideoVersion: (id: string) => void;
  onCheckVideoProgress?: () => void;
  checkingProgress?: boolean;
  aiReviewResult?: ShotReviewResult | null;
  aiReviewing?: boolean;
  onAiReview?: () => void;
  onApplySuggestion?: (s: ShotReviewSuggestion) => void;
  onApplyAllAndRegenerate?: () => void;
  continuityIssues?: ContinuityIssue[] | null;
  continuityChecking?: boolean;
  onContinuityCheck?: () => void;
  onShowContinuousPlay?: () => void;
  onShowAbCompare?: () => void;
  onSyncBatchJobs?: () => void;
  syncingBatchJobs?: boolean;
  projectTitle?: string;
}) {
  const { selectedShotIdx, setSelectedShotIdx, setLightboxSrc, patchShot, setStep } = useProductionContext();
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const maxConcurrent = queueSnapshot.maxConcurrent ?? 3;
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const shotActionRef = useRef<HTMLDivElement | null>(null);
  const currentShotNumber = shots.length > 0 ? selectedShotIdx + 1 : 0;
  const canGoPreviousShot = selectedShotIdx > 0;
  const canGoNextShot = selectedShotIdx < shots.length - 1;

  const goToShot = (idx: number) => {
    if (idx < 0 || idx >= shots.length) return;
    setSelectedShotIdx(idx);
  };
  const revealShotAction = () => {
    window.requestAnimationFrame(() => {
      shotActionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };
  const selectShotAndRevealAction = (idx: number) => {
    goToShot(idx);
    revealShotAction();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;
      }
      if (event.key === '[' && canGoPreviousShot) {
        event.preventDefault();
        setSelectedShotIdx((idx) => Math.max(0, idx - 1));
      }
      if (event.key === ']' && canGoNextShot) {
        event.preventDefault();
        setSelectedShotIdx((idx) => Math.min(shots.length - 1, idx + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoNextShot, canGoPreviousShot, setSelectedShotIdx, shots.length]);

  if (busyL3 && (!shots || shots.length === 0)) {
    return (
      <div className="space-y-3 p-4">
        <p className="animate-pulse text-sm text-[var(--color-text-muted)]">{uiText('正在生成分镜表...', 'Generating storyboard...')}</p>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-elevated)]" />
        ))}
      </div>
    );
  }

  if (!shot) return null;

  const projectQueuedCount = Object.values(shotActiveJobMap ?? {}).filter((job): job is BatchJobDto => !!job).filter((job) =>
    job.status === 'awaiting_submit' || job.status === 'pending' || job.status === 'queuing',
  ).length;

  const platformSummary = (() => {
    const avgSec = Math.max(1, Math.round(queueSnapshot.avgSecPerJob || 120));
    const recentAvgSec = Math.max(1, Math.round(queueSnapshot.recentSuccessAvgSec || avgSec));
    const recentSampleCount = Math.max(0, Math.round(queueSnapshot.recentSuccessSampleCount || 0));
    const recentAvgLabel = recentSampleCount > 0
      ? uiText(
          `最近 ${recentSampleCount} 条成功视频平均 ${recentAvgSec} 秒/个`,
          `Recent ${recentSampleCount} successful videos average ${recentAvgSec} sec/job`,
        )
      : uiText(
          `暂无成功样本，先按 ${recentAvgSec} 秒/个估算`,
          `No completed sample yet, so the platform is estimating with ${recentAvgSec} sec/job for now`,
        );
    if (queueSnapshot.totalActive === 0 && queueSnapshot.totalWaiting === 0) {
      return {
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        title: uiText('平台空闲', 'Platform idle'),
        detail: uiText(
          `当前没有任务占用 Ark 槽位。平台支持最多 ${maxConcurrent} 并发，${recentAvgLabel}。`,
          `No jobs are using Ark slots right now. The platform supports up to ${maxConcurrent} concurrent jobs, and ${recentAvgLabel.toLowerCase()}.`,
        ),
      };
    }
    if (queueSnapshot.totalWaiting >= 4) {
      const etaMin = Math.max(1, Math.round((queueSnapshot.totalWaiting * avgSec) / Math.max(1, maxConcurrent) / 60));
      return {
        className: 'border-red-500/30 bg-red-500/10 text-red-200',
        title: uiText('平台繁忙', 'Platform busy'),
        detail: uiText(
          `平台排队 ${queueSnapshot.totalWaiting} 个，Ark 占用 ${queueSnapshot.totalActive}/${maxConcurrent} 个槽位，${recentAvgLabel}，预计约 ${etaMin} 分钟后轮到新任务。`,
          `${queueSnapshot.totalWaiting} jobs are waiting and ${queueSnapshot.totalActive}/${maxConcurrent} Ark slots are busy. ${recentAvgLabel} and a newly queued job should start in about ${etaMin} minutes.`,
        ),
      };
    }
    return {
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      title: uiText('平台使用中', 'Platform in use'),
      detail: uiText(
        `Ark 占用 ${queueSnapshot.totalActive}/${maxConcurrent} 个槽位，平台排队 ${queueSnapshot.totalWaiting} 个，${recentAvgLabel}。`,
        `${queueSnapshot.totalActive}/${maxConcurrent} Ark slots are busy, ${queueSnapshot.totalWaiting} jobs are in the platform queue, and ${recentAvgLabel.toLowerCase()}.`,
      ),
    };
  })();

  const selectedShotSummary = (() => {
    if (selectedShotJob?.status === 'awaiting_submit' && typeof selectedShotJob.globalQueuePos === 'number') {
      return uiText(
        `当前选中分镜排在平台第 ${selectedShotJob.globalQueuePos + 1} 位，轮到后会自动占用 Ark 槽位并开始生成。`,
        `The selected shot is currently #${selectedShotJob.globalQueuePos + 1} in the platform queue. It will automatically take an Ark slot and begin rendering when its turn arrives.`,
      );
    }
    if (selectedShotJob?.status === 'pending') {
      return uiText(
        '当前选中分镜已经提交到 Ark，正在等待 Ark 受理。',
        'The selected shot has already been submitted to Ark and is waiting for Ark acceptance.',
      );
    }
    if (selectedShotJob?.status === 'queuing') {
      return uiText(
        '当前选中分镜已经被 Ark 接收，正在 Ark 队列中等待渲染。',
        'The selected shot has been accepted by Ark and is waiting in the Ark queue.',
      );
    }
    if (selectedShotJob?.status === 'processing') {
      return uiText(
        '当前选中分镜已经进入 Ark 渲染阶段，完成后会自动回写。',
        'The selected shot is already rendering in Ark and will sync back automatically when complete.',
      );
    }
    return null;
  })();

  const shotStateSummary = chSheets
    .map((ch) => {
      const manualStateId = shot.characterStateOverrides?.[ch.id] ?? '';
      const stateId = manualStateId || ch.activeStateId || '';
      if (!stateId) return null;
      const state = ch.states?.find((item) => item.id === stateId);
      if (!state) return null;
      return {
        id: ch.id,
        name: ch.name,
        label: state.label,
        manual: !!manualStateId,
      };
    })
    .filter((item): item is { id: string; name: string; label: string; manual: boolean } => !!item);
  const effectiveExecutionSegments = executionSegments ?? getStoredExecutionSegmentsForShots(shots) ?? [];
  const relatedExecutionSegments = getSegmentsForShot(
    { executionSegments: effectiveExecutionSegments },
    shot,
  );
  const selectedShotAggregate = resolveShotAggregateStatus(shot, relatedExecutionSegments, {
    segmentJobsMap,
    shotBusyMap,
    shotActiveJobMap,
    shotJobStatusMap,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl border px-4 py-3 ${platformSummary.className}`}>
        <div className="text-sm font-semibold">{platformSummary.title}</div>
        <div className="mt-1 text-xs opacity-90">{platformSummary.detail}</div>
        {selectedShotSummary && (
          <div className="mt-2 text-xs font-semibold opacity-95">{selectedShotSummary}</div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
          <div className="min-w-[220px] flex-1">
            <div className="text-xs font-semibold text-[var(--color-text)]">
              {uiText('先选镜头，再生成视频', 'Pick a shot, then generate')}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)]">
              {uiText('先定位未生成、排队或失败的镜头，再使用下方主按钮生成或重试。', 'Find pending, queued, or failed shots first, then use the primary action below to generate or retry.')}
            </div>
          </div>
          {onBatchGenerateAllVideos && (
            <button
              type="button"
              onClick={onBatchGenerateAllVideos}
              className="rounded-lg border border-amber-500/40 bg-amber-600/15 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-600/25"
            >
              {uiText('一键生成所有缺失视频', 'Generate all missing videos')}
            </button>
          )}
          {onCancelProjectQueue && (
            <button
              type="button"
              onClick={onCancelProjectQueue}
              disabled={bulkCancelling || projectQueuedCount === 0}
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {bulkCancelling
                ? uiText('取消中...', 'Cancelling...')
                : uiText(`停止本项目任务（${projectQueuedCount}）`, `Stop project jobs (${projectQueuedCount})`)}
            </button>
          )}
          {onSyncBatchJobs && (
            <button
              type="button"
              onClick={onSyncBatchJobs}
              disabled={syncingBatchJobs}
              title={uiText(
                '立即拉取所有 Ark 任务最新状态，并兜底恢复丢失的 submitId。',
                'Fetch the latest Ark job states now and try to recover any missing submitId values.',
              )}
              className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {syncingBatchJobs ? uiText('同步中...', 'Syncing...') : uiText('同步 Ark 状态', 'Sync Ark status')}
            </button>
          )}
        </div>

        <StepStoryboardShotStrip
          shots={shots}
          scSheets={scSheets}
          selectedShotIdx={selectedShotIdx}
          shotBusyMap={shotBusyMap}
          shotActiveJobMap={shotActiveJobMap}
          shotJobStatusMap={shotJobStatusMap}
          shotJobQueueInfoMap={shotJobQueueInfoMap}
          snapshot={queueSnapshot}
          cancellingJobId={cancelBusy && selectedShotJob ? selectedShotJob.id : null}
          onSelectShot={selectShotAndRevealAction}
          onCancelShotJob={onCancelShotJob}
        />
      </div>

      <div className="flex min-h-[480px] flex-col gap-4 lg:flex-row">
        <StepStoryboardAssetsSidebar
          chSheets={chSheets}
          scSheets={scSheets}
          shot={shot}
          onOpenLightbox={setLightboxSrc}
          getAutoMatchStateId={(ch, s) =>
            autoMatchCharacterStateBySheet(
              ch,
              [s.action, s.subject, s.emotion, s.notes].filter(Boolean).join(' '),
            )
          }
          onChangeCharacterStateOverride={(characterId, stateId) => {
            const newOverrides = { ...(shot.characterStateOverrides ?? {}), [characterId]: stateId };
            if (!stateId) delete newOverrides[characterId];
            patchShot(selectedShotIdx, { characterStateOverrides: newOverrides });
          }}
        />

        <main className="min-w-0 flex-1 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <div>
              <div className="text-sm font-semibold text-[var(--color-text)]">
                {uiText(`第 ${currentShotNumber} / ${shots.length} 镜`, `Shot ${currentShotNumber} / ${shots.length}`)}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)]">
                {uiText('当前分镜详情与预览会随切换同步更新', 'Shot details and preview update with navigation')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToShot(selectedShotIdx - 1)}
                disabled={!canGoPreviousShot}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {uiText('上一镜', 'Previous')}
              </button>
              <button
                type="button"
                onClick={() => goToShot(selectedShotIdx + 1)}
                disabled={!canGoNextShot}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {uiText('下一镜', 'Next')}
              </button>
            </div>
          </div>
          {shotStateSummary.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                {uiText('当前状态参考', 'Current state refs')}
              </span>
              {shotStateSummary.map((item) => (
                <span
                  key={item.id}
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    item.manual
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'bg-emerald-500/12 text-emerald-300'
                  }`}
                >
                  {item.name}：{item.label}（{item.manual ? uiText('手动', 'Manual') : uiText('默认', 'Default')}）
                </span>
              ))}
            </div>
          )}
          {selectedShotAggregate.summary.totalSegments > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                {uiText('执行分段摘要', 'Execution summary')}
              </span>
              <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] text-[var(--color-text)]">
                {uiText(
                  `${selectedShotAggregate.summary.totalSegments} 段 / 已完成 ${selectedShotAggregate.summary.completedSegments}`,
                  `${selectedShotAggregate.summary.totalSegments} segments / ${selectedShotAggregate.summary.completedSegments} done`,
                )}
              </span>
              {selectedShotAggregate.summary.mergedSegments > 0 && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-200">
                  {uiText(`合并 ${selectedShotAggregate.summary.mergedSegments}`, `Merged ${selectedShotAggregate.summary.mergedSegments}`)}
                </span>
              )}
              {selectedShotAggregate.summary.splitSegments > 0 && (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[10px] text-sky-200">
                  {uiText(`拆分 ${selectedShotAggregate.summary.splitSegments}`, `Split ${selectedShotAggregate.summary.splitSegments}`)}
                </span>
              )}
              {selectedShotAggregate.summary.sharedSegments > 0 && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-200">
                  {uiText(`共享 ${selectedShotAggregate.summary.sharedSegments}`, `Shared ${selectedShotAggregate.summary.sharedSegments}`)}
                </span>
              )}
            </div>
          )}
          <StepStoryboardMainHeader
            styleRefSummary={styleRefSummary}
            storySceneCoverage={storySceneCoverage}
            shotIndex={shot.shotIndex}
            shotRefTagsText={computeShotRefTags(shot, chSheets, scSheets).join(' ')}
            shotVideoDreaminaModel={shotVideoDreaminaModel}
            dreaminaModelVersion={dreaminaModelVersion}
            onShotVideoDreaminaModelChange={onSetShotVideoDreaminaModel}
            onDreaminaModelVersionChange={onSetDreaminaModelVersion}
          />
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            {shotVideoDreaminaModel === 'dreamina-multimodal' && multimodalRefPack ? (
              <StepStoryboardMultimodalRefPanel
                shot={shot}
                chSheets={chSheets}
                scSheets={scSheets}
                multimodalRefPack={multimodalRefPack}
                multimodalAutoPrompt={multimodalAutoPrompt}
                shotBlob={shotBlob}
                onPatchShot={(patch) => patchShot(selectedShotIdx, patch)}
                onOpenLightbox={setLightboxSrc}
              />
            ) : null}

            <div ref={shotActionRef} className="scroll-mt-24">
              <StepStoryboardGenerateActions
                shotMediaBusy={shotMediaBusy}
                dreaminaAsync={dreaminaAsync}
                hasProductionDesign={hasProductionDesign}
                hasVideo={hasProductionShotPreviewMedia(shot)}
                activeJob={selectedShotJob}
                cancelBusy={cancelBusy}
                pendingVideoSubmitId={shot.pendingVideoSubmitId}
                checkingProgress={checkingProgress}
                hasStill={!!shot.previewStillDataUrl}
                showAdvancedTools={showAdvancedTools}
                shotVideoDreaminaModel={shotVideoDreaminaModel}
                onGenerateShotFrame={onGenerateShotFrame}
                onGenerateShotVideo={onGenerateShotVideo}
                onCheckVideoProgress={onCheckVideoProgress}
                onCancelActiveJob={onCancelActiveJob}
              />
            </div>
            <ShotExecutionSegmentsPanel
              shot={shot}
              segments={relatedExecutionSegments}
              segmentJobsMap={segmentJobsMap}
              shotBusyMap={shotBusyMap}
              shotActiveJobMap={shotActiveJobMap}
              shotJobStatusMap={shotJobStatusMap}
            />
            <StepStoryboardFieldsEditor
              shot={shot}
              scSheets={scSheets}
              onPatchShot={(patch) => patchShot(selectedShotIdx, patch)}
              onOpenLightbox={setLightboxSrc}
            />

            <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
              <button
                type="button"
                onClick={() => setShowAdvancedTools((visible) => !visible)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                aria-expanded={showAdvancedTools}
              >
                <span>{uiText('高级工具', 'Advanced tools')}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {showAdvancedTools
                    ? uiText('收起', 'Collapse')
                    : uiText('首帧、AI 审片、快速调整', 'First frame, AI review, quick adjust')}
                </span>
              </button>
              {showAdvancedTools && (
                <div className="space-y-3 border-t border-[var(--color-border)] p-3">
                  <StepStoryboardQuickAdjust
                    shot={shot}
                    onPatchStructured={(patch) => {
                      const stillKeys = ['sp_subject', 'sp_environment', 'sp_style', 'sp_lighting', 'sp_camera', 'sp_composition', 'sp_continuity', 'sp_negative'] as const;
                      const motionKeys = ['mp_motion', 'mp_camera', 'mp_tempo', 'mp_transition', 'mp_audio'] as const;
                      const stillPatch: Record<string, string> = {};
                      const motionPatch: Record<string, string> = {};
                      for (const [k, v] of Object.entries(patch)) {
                        if ((stillKeys as readonly string[]).includes(k)) stillPatch[k] = v;
                        if ((motionKeys as readonly string[]).includes(k)) motionPatch[k] = v;
                      }
                      const shotPatch: Partial<typeof shot> = {};
                      if (Object.keys(stillPatch).length) {
                        shotPatch.structuredStill = { ...shot.structuredStill, ...stillPatch };
                      }
                      if (Object.keys(motionPatch).length) {
                        shotPatch.structuredMotion = { ...shot.structuredMotion, ...motionPatch };
                      }
                      patchShot(selectedShotIdx, shotPatch);
                    }}
                  />

                  {onAiReview && onApplySuggestion && onApplyAllAndRegenerate && (
                    <StepStoryboardAiReview
                      shot={shot}
                      reviewResult={aiReviewResult ?? null}
                      reviewing={aiReviewing ?? false}
                      onReview={onAiReview}
                      onApplySuggestion={onApplySuggestion}
                      onApplyAllAndRegenerate={onApplyAllAndRegenerate}
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    {onShowContinuousPlay && (
                      <button
                        type="button"
                        onClick={onShowContinuousPlay}
                        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                      >
                        {uiText('连续播放', 'Continuous play')}
                      </button>
                    )}
                    {onShowAbCompare && shotVideoVersions.length >= 2 && (
                      <button
                        type="button"
                        onClick={onShowAbCompare}
                        className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                      >
                        {uiText('版本 A/B 对比', 'Compare versions A/B')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <StepStoryboardPreviewPanel
          shot={shot}
          shotMediaBusy={shotMediaBusy}
          dreaminaAsync={dreaminaAsync}
          activeJob={selectedShotJob}
          shotPreviewPlaySrc={shotPreviewPlaySrc}
          shotVideoVersions={shotVideoVersions}
          selectedShotVideoVersion={selectedShotVideoVersion}
          onOpenLightbox={setLightboxSrc}
          onKeepOnlyCurrentVersion={onKeepOnlyCurrentVersion}
          onSelectVideoVersion={onSelectVideoVersion}
        />
      </div>

      {showAdvancedTools && onContinuityCheck && (
        <StepStoryboardContinuityCheck
          issues={continuityIssues ?? null}
          checking={continuityChecking ?? false}
          onCheck={onContinuityCheck}
          onJumpToShot={(idx) => {
            const shotArrayIdx = shots.findIndex((s) => s.shotIndex === idx);
            if (shotArrayIdx >= 0) setSelectedShotIdx(shotArrayIdx);
          }}
        />
      )}

      <button
        type="button"
        onClick={() => setStep(4)}
        className="self-start rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white"
      >
        {uiText('进入导出', 'Go to export')}
      </button>
    </div>
  );
}
