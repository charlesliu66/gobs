import type { ProductionShot, SceneSheet } from '../productionTypes';
import { useProductionContext } from '../ProductionContext';
import { StepExportStoryboardOverview } from './StepExportStoryboardOverview';
import { StepExportPromptConsistency } from './StepExportPromptConsistency';

type AssembledShot = {
  shotIndex: number;
  seedanceBlock: string;
};

export function StepExportWorkspace({
  shots,
  scSheets,
  buildStoryLine,
  resolveVideoSrc,
  busyVis,
  busyAsm,
  consistencySnippet,
  assembledShots,
  onPickReferenceImage,
  onAssemblePrompts,
  onCopyAllSeedance,
  projectTitle,
  aspectRatio,
  bgmPromptHint,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  buildStoryLine: (shot: ProductionShot) => string;
  resolveVideoSrc: (shot: ProductionShot) => string | null;
  busyVis: boolean;
  busyAsm: boolean;
  consistencySnippet: string | null;
  assembledShots: AssembledShot[] | null;
  onPickReferenceImage: (file: File | null) => void;
  onAssemblePrompts: () => void;
  onCopyAllSeedance: () => void;
  projectTitle?: string;
  aspectRatio?: string;
  bgmPromptHint?: string;
}) {
  const { setStep } = useProductionContext();
  return (
    <div className="space-y-6">
      <StepExportStoryboardOverview
        shots={shots}
        scSheets={scSheets}
        onBackToStoryboard={() => setStep(3)}
        buildStoryLine={buildStoryLine}
        resolveVideoSrc={resolveVideoSrc}
        projectTitle={projectTitle}
        aspectRatio={aspectRatio}
        bgmPromptHint={bgmPromptHint}
      />

      <StepExportPromptConsistency
        busyVis={busyVis}
        busyAsm={busyAsm}
        hasShots={shots.length > 0}
        consistencySnippet={consistencySnippet}
        assembledShots={assembledShots}
        onPickReferenceImage={onPickReferenceImage}
        onAssemblePrompts={onAssemblePrompts}
        onCopyAllSeedance={onCopyAllSeedance}
      />
    </div>
  );
}

