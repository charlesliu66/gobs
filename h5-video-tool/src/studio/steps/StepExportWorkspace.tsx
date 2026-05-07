import { useState } from 'react';
import type { ProductionShot, SceneSheet } from '../productionTypes';
import { useProductionContext } from '../ProductionContext';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { StepExportStoryboardOverview } from './StepExportStoryboardOverview';
import { StepExportPromptConsistency } from './StepExportPromptConsistency';
import type { ShotActiveJobMap, ShotStatusMap } from '../exportStoryboardStatus';
import type { QueueSnapshotDto } from '../../api/batchJobs';

type AssembledShot = {
  shotIndex: number;
  seedanceBlock: string;
};

type ExportTab = 'quick' | 'advanced';

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
  productionProjectId,
  shotActiveJobMap,
  shotJobStatusMap,
  queueSnapshot,
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
  productionProjectId?: string;
  shotActiveJobMap?: ShotActiveJobMap;
  shotJobStatusMap?: ShotStatusMap;
  queueSnapshot?: QueueSnapshotDto | null;
}) {
  const { setStep } = useProductionContext();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<ExportTab>('quick');

  const TABS: { id: ExportTab; label: string; desc: string }[] = [
    {
      id: 'quick',
      label: t('productionWizard.exportWorkspace.reviewAndEditLabel'),
      desc: t('productionWizard.exportWorkspace.reviewAndEditDescription'),
    },
    {
      id: 'advanced',
      label: t('productionWizard.exportWorkspace.aiVideoPromptsLabel'),
      desc: t('productionWizard.exportWorkspace.aiVideoPromptsDescription'),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Tab 切换 */}
      <div className="flex gap-3">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl border-2 p-3 text-left transition-all ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/30'
            }`}
          >
            <p className={`text-sm font-semibold ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
              {tab.label}
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{tab.desc}</p>
          </button>
        ))}
      </div>

      {activeTab === 'quick' && (
        <StepExportStoryboardOverview
          shots={shots}
          scSheets={scSheets}
          onBackToStoryboard={() => setStep(3)}
          buildStoryLine={buildStoryLine}
          resolveVideoSrc={resolveVideoSrc}
          projectTitle={projectTitle}
          aspectRatio={aspectRatio}
          bgmPromptHint={bgmPromptHint}
          productionProjectId={productionProjectId}
          shotActiveJobMap={shotActiveJobMap}
          shotJobStatusMap={shotJobStatusMap}
          queueSnapshot={queueSnapshot}
        />
      )}

      {activeTab === 'advanced' && (
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
      )}
    </div>
  );
}

