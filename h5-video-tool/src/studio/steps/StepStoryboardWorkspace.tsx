import type {
  CharacterSheet,
  ProductionShot,
  ProductionShotVideoVersion,
  SceneSheet,
  StructuredPromptStill,
  StructuredPromptMotion,
} from '../productionTypes';
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
  shotQueuedMap,
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
  projectTitle: _projectTitle,
}: {
  shot?: ProductionShot;
  shots: ProductionShot[];
  busyL3?: boolean;
  chSheets: CharacterSheet[];
  scSheets: SceneSheet[];
  shotMediaBusy: 'frame' | 'video' | null;
  shotBusyMap: Record<string, 'frame' | 'video'>;
  shotQueuedMap?: Record<string, boolean>;
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
  projectTitle?: string;
}) {
  const { selectedShotIdx, setSelectedShotIdx, setLightboxSrc, patchShot, setStep } = useProductionContext();

  if (busyL3 && (!shots || shots.length === 0)) {
    return (
      <div className="space-y-3 p-4">
        <p className="text-sm text-[var(--color-text-muted)] animate-pulse">正在生成分镜表…</p>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--color-surface-elevated)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!shot) return null;

  return (
    <div className="flex flex-col gap-4">
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
              isQueued={shotQueuedMap?.[String(shot?.shotIndex ?? '')] ?? false}
              queueDepth={Object.keys(shotQueuedMap ?? {}).length}
              pendingVideoSubmitId={shot?.pendingVideoSubmitId}
              checkingProgress={checkingProgress}
              onGenerateShotFrame={onGenerateShotFrame}
              onGenerateShotVideo={onGenerateShotVideo}
              onCheckVideoProgress={onCheckVideoProgress}
            />
            <StepStoryboardFieldsEditor
              shot={shot}
              scSheets={scSheets}
              onPatchShot={(patch) => patchShot(selectedShotIdx, patch)}
              onOpenLightbox={setLightboxSrc}
            />

            {/* P1: Quick adjust presets */}
            <StepStoryboardQuickAdjust
              shot={shot}
              onPatchStructured={(patch) => {
                const stillKeys = ['sp_subject','sp_environment','sp_style','sp_lighting','sp_camera','sp_composition','sp_continuity','sp_negative'] as const;
                const motionKeys = ['mp_motion','mp_camera','mp_tempo','mp_transition','mp_audio'] as const;
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

            {/* P0: AI review panel */}
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

      {/* Toolbar row: batch generate, continuous play, AB compare */}
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
      </div>

      <StepStoryboardShotStrip
        shots={shots}
        scSheets={scSheets}
        selectedShotIdx={selectedShotIdx}
        shotBusyMap={shotBusyMap}
        shotQueuedMap={shotQueuedMap}
        onSelectShot={setSelectedShotIdx}
      />

      {/* P2: Continuity check */}
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

