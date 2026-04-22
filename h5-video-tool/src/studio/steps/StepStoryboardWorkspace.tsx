import type {
  CharacterSheet,
  ProductionShot,
  ProductionShotVideoVersion,
  SceneSheet,
} from '../productionTypes';
import type { BatchJobDto, QueueSnapshotDto } from '../../api/batchJobs';
import { hasProductionShotPreviewMedia } from '../productionTypes';
import type { ShotReviewResult, ShotReviewSuggestion, ContinuityIssue } from '../../api/shotReview';
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
  shotActiveJobMap?: Record<string, BatchJobDto>;
  shotJobStatusMap?: Record<string, 'awaiting_submit' | 'queuing' | 'processing' | 'failed' | 'cancelled'>;
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

  if (busyL3 && (!shots || shots.length === 0)) {
    return (
      <div className="space-y-3 p-4">
        <p className="animate-pulse text-sm text-[var(--color-text-muted)]">正在生成分镜表...</p>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-elevated)]" />
        ))}
      </div>
    );
  }

  if (!shot) return null;

  const projectQueuedCount = Object.values(shotActiveJobMap ?? {}).filter((job) =>
    job.status === 'awaiting_submit' || job.status === 'pending' || job.status === 'queuing',
  ).length;

  const platformSummary = (() => {
    const avgSec = Math.max(1, Math.round(queueSnapshot.avgSecPerJob || 120));
    if (queueSnapshot.totalActive === 0 && queueSnapshot.totalWaiting === 0) {
      return {
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        title: '平台空闲',
        detail: `当前没有任务占用即梦配额，平均 ${avgSec} 秒/个。`,
      };
    }
    if (queueSnapshot.totalWaiting >= 4) {
      const etaMin = Math.max(1, Math.round((queueSnapshot.totalWaiting * avgSec) / 60));
      return {
        className: 'border-red-500/30 bg-red-500/10 text-red-200',
        title: '平台繁忙',
        detail: `队列 ${queueSnapshot.totalWaiting} 个，活跃 ${queueSnapshot.totalActive} 个，预计需要等待约 ${etaMin} 分钟。`,
      };
    }
    return {
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      title: '平台使用中',
      detail: `生成 ${queueSnapshot.totalActive} 个，排队 ${queueSnapshot.totalWaiting} 个，平均 ${avgSec} 秒/个。`,
    };
  })();

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl border px-4 py-3 ${platformSummary.className}`}>
        <div className="text-sm font-semibold">{platformSummary.title}</div>
        <div className="mt-1 text-xs opacity-90">{platformSummary.detail}</div>
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

            <StepStoryboardGenerateActions
              shotMediaBusy={shotMediaBusy}
              dreaminaAsync={dreaminaAsync}
              hasProductionDesign={hasProductionDesign}
              hasVideo={hasProductionShotPreviewMedia(shot)}
              activeJob={selectedShotJob}
              cancelBusy={cancelBusy}
              pendingVideoSubmitId={shot.pendingVideoSubmitId}
              checkingProgress={checkingProgress}
              onGenerateShotFrame={onGenerateShotFrame}
              onGenerateShotVideo={onGenerateShotVideo}
              onCheckVideoProgress={onCheckVideoProgress}
              onCancelActiveJob={onCancelActiveJob}
            />
            <StepStoryboardFieldsEditor
              shot={shot}
              scSheets={scSheets}
              onPatchShot={(patch) => patchShot(selectedShotIdx, patch)}
              onOpenLightbox={setLightboxSrc}
            />

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
          </div>
        </main>

        <StepStoryboardPreviewPanel
          shot={shot}
          shotMediaBusy={shotMediaBusy}
          dreaminaAsync={dreaminaAsync}
          shotPreviewPlaySrc={shotPreviewPlaySrc}
          shotVideoVersions={shotVideoVersions}
          selectedShotVideoVersion={selectedShotVideoVersion}
          onOpenLightbox={setLightboxSrc}
          onKeepOnlyCurrentVersion={onKeepOnlyCurrentVersion}
          onSelectVideoVersion={onSelectVideoVersion}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onBatchGenerateAllVideos && (
          <button
            type="button"
            onClick={onBatchGenerateAllVideos}
            className="rounded-lg border border-amber-500/40 bg-amber-600/15 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-600/25"
          >
            一键生成所有缺失视频
          </button>
        )}
        {onCancelProjectQueue && (
          <button
            type="button"
            onClick={onCancelProjectQueue}
            disabled={bulkCancelling || projectQueuedCount === 0}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bulkCancelling ? '取消中...' : `取消本项目排队（${projectQueuedCount}）`}
          </button>
        )}
        {onShowContinuousPlay && (
          <button
            type="button"
            onClick={onShowContinuousPlay}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            连续播放
          </button>
        )}
        {onShowAbCompare && shotVideoVersions.length >= 2 && (
          <button
            type="button"
            onClick={onShowAbCompare}
            className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
          >
            版本 A/B 对比
          </button>
        )}
        {onSyncBatchJobs && (
          <button
            type="button"
            onClick={onSyncBatchJobs}
            disabled={syncingBatchJobs}
            title="立即拉取所有即梦任务最新状态，并兜底恢复丢失的 submitId。"
            className="ml-auto rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncingBatchJobs ? '同步中...' : '同步即梦状态'}
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
        onSelectShot={setSelectedShotIdx}
        onCancelShotJob={onCancelShotJob}
      />

      {onContinuityCheck && (
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
        进入导出
      </button>
    </div>
  );
}
