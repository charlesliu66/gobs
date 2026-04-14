import { CharacterPortraitEditorModal } from '../../components/production/CharacterPortraitEditorModal';
import { getPortraitJobKey, type PortraitJobState } from '../../components/production/portraitJobKey';
import { ScenePropImageModal } from '../../components/production/ScenePropImageModal';
import type { LibraryCharacter } from '../../api/characterLibrary';
import type { CharacterSheet, ProductionDesignLayer, PropSheet, SceneSheet, StoryArcLayer } from '../productionTypes';
import { useProductionContext } from '../ProductionContext';
import { StepDesignHeader } from './StepDesignHeader';
import { StepDesignCharactersPanel } from './StepDesignCharactersPanel';
import { StepDesignScenesPanel } from './StepDesignScenesPanel';
import { StepDesignPropsPanel } from './StepDesignPropsPanel';
import { StepDesignChecklistPanel } from './StepDesignChecklistPanel';
import { StepDesignActions } from './StepDesignActions';

export function StepDesignWorkspace({
  story,
  patchStory,
  onSyncAssetsFromStory,
  characterCount,
  sceneCount,
  propCount,
  batchAssetGen,
  onGenerateMissingAssets,
  onCancelBatch,
  failedTaskCount,
  onRetryFailed,
  onAddManualCharacter,
  onImportFromLibrary,
  chSheets,
  scSheets,
  propSheets,
  treeFocusCharacterId,
  onTreeFocusChange,
  portraitJobs,
  onTreeSheetChange,
  onUploadCharacterVariant,
  onUploadSceneVariant,
  onUploadPropVariant,
  genKey,
  styleRefSummary,
  styleRefImageDataUrl,
  productionDesign,
  onGenerateCharacterFrame,
  onRemoveCharacterVariant,
  onAddCharacterVariant,
  onGenerateSceneFrame,
  onAddSceneVariant,
  onGeneratePropFrame,
  onAddPropVariant,
  characterStoryBio,
  wardrobeSupplementForCharacter,
  productionAspectRatio,
  portraitJobByKey,
  onStartPortraitGenerate,
  onPortraitSheetUpdate,
  onConfirmPortrait,
  onGenerateScenePropImage,
  onConfirmScenePropImage,
  onResetScenePropImage,
  busyL3,
  maxTotalDurationSec,
  onMaxTotalDurationSecChange,
  onGenerateStoryboard,
}: {
  story: StoryArcLayer | null;
  patchStory: (fn: (s: StoryArcLayer) => StoryArcLayer) => void;
  onSyncAssetsFromStory: () => void;
  characterCount: number;
  sceneCount: number;
  propCount: number;
  batchAssetGen: { current: number; total: number; success: number; failed: number; startedAt: number; currentLabel?: string } | null;
  onGenerateMissingAssets: () => void;
  onCancelBatch: () => void;
  failedTaskCount: number;
  onRetryFailed: () => void;
  onAddManualCharacter: () => void;
  onImportFromLibrary: (char: LibraryCharacter) => void;
  chSheets: CharacterSheet[];
  scSheets: SceneSheet[];
  propSheets: PropSheet[];
  treeFocusCharacterId: string | null;
  onTreeFocusChange: (id: string) => void;
  portraitJobs: Record<string, PortraitJobState>;
  onTreeSheetChange: (next: CharacterSheet) => void;
  onUploadCharacterVariant: (file: File | null, sheetId: string, variantId: string) => void;
  onUploadSceneVariant: (file: File | null, sheetId: string, variantId: string) => void;
  onUploadPropVariant: (file: File | null, sheetId: string, variantId: string) => void;
  genKey: string | null;
  styleRefSummary: string;
  styleRefImageDataUrl?: string;
  productionDesign: ProductionDesignLayer;
  onGenerateCharacterFrame: (prompt: string, sheetId: string, variantId: string) => void;
  onRemoveCharacterVariant: (sheetId: string, variantId: string) => void;
  onAddCharacterVariant: (sheetId: string) => void;
  onGenerateSceneFrame: (prompt: string, sheetId: string, variantId: string) => void;
  onAddSceneVariant: (sheetId: string) => void;
  onGeneratePropFrame: (prompt: string, sheetId: string, variantId: string) => void;
  onAddPropVariant: (sheetId: string) => void;
  characterStoryBio: (name: string) => string | undefined;
  wardrobeSupplementForCharacter: (name: string) => string | undefined;
  productionAspectRatio: string;
  portraitJobByKey: (key: string) => PortraitJobState | null | undefined;
  onStartPortraitGenerate: (jobKey: string, req: import('../../api/storyboard').GenerateCharacterPortraitRequest) => void;
  onPortraitSheetUpdate: (updated: CharacterSheet) => void;
  onConfirmPortrait: (imageDataUrl: string) => void;
  onGenerateScenePropImage: (extraPrompt: string) => void;
  onConfirmScenePropImage: () => void;
  onResetScenePropImage: () => void;
  busyL3: boolean;
  maxTotalDurationSec: number;
  onMaxTotalDurationSecChange: (n: number) => void;
  onGenerateStoryboard: () => void;
}) {
  const {
    l2Tab,
    setL2Tab,
    checklistSubTab,
    setChecklistSubTab,
    showLibraryImport,
    setShowLibraryImport,
    portraitEdit,
    setPortraitEdit,
    scenePropModal,
    setScenePropModal,
    scenePropPreview,
    setScenePropPreview,
    scenePropError,
    setScenePropError,
    scenePropGenBusy,
    setLightboxSrc,
  } = useProductionContext();

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <StepDesignHeader
          story={story}
          patchStory={patchStory}
          onSyncAssetsFromStory={onSyncAssetsFromStory}
          l2Tab={l2Tab}
          onL2TabChange={setL2Tab}
          characterCount={characterCount}
          sceneCount={sceneCount}
          propCount={propCount}
          batchAssetGen={batchAssetGen}
          onGenerateMissingAssets={onGenerateMissingAssets}
          onCancelBatch={onCancelBatch}
          failedTaskCount={failedTaskCount}
          onRetryFailed={onRetryFailed}
          onAddManualCharacter={onAddManualCharacter}
          onToggleLibraryImport={() => setShowLibraryImport((v) => !v)}
        />

        <div className="p-4 sm:p-6">
          {l2Tab === 'characters' && (
            <StepDesignCharactersPanel
              showLibraryImport={showLibraryImport}
              onImportFromLibrary={onImportFromLibrary}
              chSheets={chSheets}
              treeFocusCharacterId={treeFocusCharacterId}
              onTreeFocusChange={onTreeFocusChange}
              portraitJobs={portraitJobs}
              onTreeSheetChange={onTreeSheetChange}
              onTreeRequestPortrait={(sheet, intent) => setPortraitEdit({ sheet, intent })}
              onOpenLightbox={setLightboxSrc}
              onUploadVariant={onUploadCharacterVariant}
              genKey={genKey}
              styleRefSummary={styleRefSummary}
              styleRefImageDataUrl={styleRefImageDataUrl}
              productionDesign={productionDesign}
              onGenerateCharacterFrame={onGenerateCharacterFrame}
              onRemoveCharacterVariant={onRemoveCharacterVariant}
              onAddCharacterVariant={onAddCharacterVariant}
            />
          )}

          {l2Tab === 'scenes' && (
            <StepDesignScenesPanel
              scSheets={scSheets}
              styleRefSummary={styleRefSummary}
              styleRefImageDataUrl={styleRefImageDataUrl}
              productionDesign={productionDesign}
              onOpenSceneModal={(args) => {
                setScenePropModal({
                  kind: 'scene',
                  sheetId: args.sheetId,
                  variantId: args.variantId,
                  name: args.name,
                  basePrompt: args.basePrompt,
                  currentImageDataUrl: args.currentImageDataUrl,
                });
                setScenePropPreview(null);
                setScenePropError(null);
              }}
              onOpenLightbox={setLightboxSrc}
              onUploadVariant={onUploadSceneVariant}
              genKey={genKey}
              onGenerateSceneFrame={onGenerateSceneFrame}
              onAddSceneVariant={onAddSceneVariant}
            />
          )}

          {l2Tab === 'props' && (
            <StepDesignPropsPanel
              propSheets={propSheets}
              styleRefSummary={styleRefSummary}
              styleRefImageDataUrl={styleRefImageDataUrl}
              productionDesign={productionDesign}
              onOpenPropModal={(args) => {
                setScenePropModal({
                  kind: 'prop',
                  sheetId: args.sheetId,
                  variantId: args.variantId,
                  name: args.name,
                  basePrompt: args.basePrompt,
                  currentImageDataUrl: args.currentImageDataUrl,
                });
                setScenePropPreview(null);
                setScenePropError(null);
              }}
              onOpenLightbox={setLightboxSrc}
              onUploadVariant={onUploadPropVariant}
              genKey={genKey}
              onGeneratePropFrame={onGeneratePropFrame}
              onAddPropVariant={onAddPropVariant}
            />
          )}

          {l2Tab === 'checklist' && (
            <StepDesignChecklistPanel
              checklistSubTab={checklistSubTab}
              onChecklistSubTabChange={setChecklistSubTab}
              productionDesign={productionDesign}
            />
          )}
        </div>
      </div>

      {portraitEdit ? (
        <CharacterPortraitEditorModal
          onClose={() => setPortraitEdit(null)}
          characterSheet={portraitEdit.sheet}
          editIntent={portraitEdit.intent}
          storyBio={characterStoryBio(portraitEdit.sheet.name)}
          wardrobeSupplementDefault={wardrobeSupplementForCharacter(portraitEdit.sheet.name)}
          styleRef={styleRefSummary}
          productionDesign={productionDesign}
          globalStyleReferenceFrame={styleRefImageDataUrl}
          aspectRatio="9:16"
          portraitJob={portraitJobByKey(getPortraitJobKey(portraitEdit.sheet.id, portraitEdit.intent))}
          onStartPortraitGenerate={onStartPortraitGenerate}
          onSheetUpdate={onPortraitSheetUpdate}
          styleRefImage={styleRefImageDataUrl}
          productionAspectRatio={productionAspectRatio}
          onConfirm={onConfirmPortrait}
        />
      ) : null}

      {scenePropModal && (
        <ScenePropImageModal
          kind={scenePropModal.kind}
          name={scenePropModal.name}
          basePrompt={scenePropModal.basePrompt}
          currentImageDataUrl={scenePropModal.currentImageDataUrl}
          aspectRatio={scenePropModal.kind === 'scene' ? '16:9' : '1:1'}
          busy={scenePropGenBusy}
          previewDataUrl={scenePropPreview}
          error={scenePropError}
          onClose={() => {
            setScenePropModal(null);
            setScenePropPreview(null);
          }}
          onGenerate={onGenerateScenePropImage}
          onConfirm={onConfirmScenePropImage}
          onReset={onResetScenePropImage}
        />
      )}

      <StepDesignActions
        busyL3={busyL3}
        maxTotalDurationSec={maxTotalDurationSec}
        onMaxTotalDurationSecChange={onMaxTotalDurationSecChange}
        onGenerateStoryboard={onGenerateStoryboard}
      />
    </div>
  );
}

