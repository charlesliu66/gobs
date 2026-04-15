import type {
  CharacterSheet,
  ProductionShot,
  ProductionShotVideoVersion,
  SceneSheet,
} from '../productionTypes';
import { autoMatchCharacterStateBySheet, computeShotRefTags } from '../productionAssets';
import { useProductionContext } from '../ProductionContext';
import { StepStoryboardAssetsSidebar } from './StepStoryboardAssetsSidebar';
import { StepStoryboardMainHeader } from './StepStoryboardMainHeader';
import { StepStoryboardMultimodalRefPanel } from './StepStoryboardMultimodalRefPanel';
import { StepStoryboardGenerateActions } from './StepStoryboardGenerateActions';
import { StepStoryboardFieldsEditor } from './StepStoryboardFieldsEditor';
import { StepStoryboardPreviewPanel } from './StepStoryboardPreviewPanel';
import { StepStoryboardShotStrip } from './StepStoryboardShotStrip';

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
  onKeepOnlyCurrentVersion: (id: string) => void;
  onSelectVideoVersion: (id: string) => void;
  onCheckVideoProgress?: () => void;
  checkingProgress?: boolean;
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

      <StepStoryboardShotStrip
        shots={shots}
        scSheets={scSheets}
        selectedShotIdx={selectedShotIdx}
        shotBusyMap={shotBusyMap}
        shotQueuedMap={shotQueuedMap}
        onSelectShot={setSelectedShotIdx}
      />

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

