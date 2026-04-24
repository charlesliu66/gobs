import { useMemo } from 'react';
import { CharacterPortraitEditorModal } from '../../components/production/CharacterPortraitEditorModal';
import { getPortraitJobKey, type PortraitJobState } from '../../components/production/portraitJobKey';
import { ScenePropImageModal } from '../../components/production/ScenePropImageModal';
import type { LibraryCharacter } from '../../api/characterLibrary';
import { getCharacterActiveNode } from '../productionAssets';
import { summarizeDesignAssetReadiness } from '../designAssetStatus.ts';
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
  batchAssetSummary,
  onGenerateMissingAssets,
  onCancelBatch,
  failedTaskCount,
  onRetryFailed,
  onDismissBatchSummary,
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
  onQuickGenerateCharacterMainLook,
  onConfirmCharacterMainLook,
  onOpenCharacterWardrobe,
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
  batchAssetSummary: { total: number; success: number; failed: number; cancelled?: boolean } | null;
  onGenerateMissingAssets: () => void;
  onCancelBatch: () => void;
  failedTaskCount: number;
  onRetryFailed: () => void;
  onDismissBatchSummary: () => void;
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
  onQuickGenerateCharacterMainLook: (sheet: CharacterSheet) => void;
  onConfirmCharacterMainLook: (sheetId: string, nodeId: string) => void;
  onOpenCharacterWardrobe: (sheet: CharacterSheet) => void;
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

  const readinessSummary = useMemo(() => summarizeDesignAssetReadiness({
    characters: chSheets.map((sheet) => {
      const activeNode = getCharacterActiveNode(sheet) ?? sheet.lookTree?.[0];
      const portraitJob = activeNode
        ? portraitJobs[getPortraitJobKey(sheet.id, { mode: 'replace', nodeId: activeNode.id })] ?? null
        : null;
      return { sheet, portraitJob };
    }),
    scenes: scSheets.map((sheet) => {
      const mainVariantId = sheet.variants[0]?.id;
      const isModalTarget = scenePropModal?.kind === 'scene'
        && scenePropModal.sheetId === sheet.id
        && scenePropModal.variantId === mainVariantId;
      return {
        sheet,
        isGenerating: genKey === `scene:${sheet.id}:${mainVariantId}` || (isModalTarget && scenePropGenBusy),
        hasPreview: Boolean(isModalTarget && scenePropPreview),
        hasError: Boolean(isModalTarget && scenePropError),
      };
    }),
    props: propSheets.map((sheet) => {
      const mainVariantId = sheet.variants[0]?.id;
      const isModalTarget = scenePropModal?.kind === 'prop'
        && scenePropModal.sheetId === sheet.id
        && scenePropModal.variantId === mainVariantId;
      return {
        sheet,
        isGenerating: genKey === `prop:${sheet.id}:${mainVariantId}` || (isModalTarget && scenePropGenBusy),
        hasPreview: Boolean(isModalTarget && scenePropPreview),
        hasError: Boolean(isModalTarget && scenePropError),
      };
    }),
  }), [chSheets, genKey, portraitJobs, propSheets, scSheets, scenePropError, scenePropGenBusy, scenePropModal, scenePropPreview]);

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
          readinessSummary={readinessSummary}
          batchAssetGen={batchAssetGen}
          batchAssetSummary={batchAssetSummary}
          onGenerateMissingAssets={onGenerateMissingAssets}
          onCancelBatch={onCancelBatch}
          failedTaskCount={failedTaskCount}
          onRetryFailed={onRetryFailed}
          onDismissBatchSummary={onDismissBatchSummary}
          onAddManualCharacter={onAddManualCharacter}
          onToggleLibraryImport={() => setShowLibraryImport((v) => !v)}
          styleRefSummary={styleRefSummary}
          styleRefImageDataUrl={styleRefImageDataUrl}
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
              onTreeRequestPortrait={(sheet, intent) => setPortraitEdit({ sheet, intent, initialTab: 'portrait' })}
              onOpenWardrobeManager={onOpenCharacterWardrobe}
              onQuickGenerateMainLook={onQuickGenerateCharacterMainLook}
              onConfirmMainLook={onConfirmCharacterMainLook}
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
              sceneModalState={scenePropModal?.kind === 'scene' ? scenePropModal : null}
              sceneModalPreview={scenePropModal?.kind === 'scene' ? scenePropPreview : null}
              sceneModalError={scenePropModal?.kind === 'scene' ? scenePropError : null}
              sceneModalBusy={scenePropModal?.kind === 'scene' ? scenePropGenBusy : false}
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
              propModalState={scenePropModal?.kind === 'prop' ? scenePropModal : null}
              propModalPreview={scenePropModal?.kind === 'prop' ? scenePropPreview : null}
              propModalError={scenePropModal?.kind === 'prop' ? scenePropError : null}
              propModalBusy={scenePropModal?.kind === 'prop' ? scenePropGenBusy : false}
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
          initialTab={portraitEdit.initialTab}
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
          onOpenLightbox={setLightboxSrc}
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
