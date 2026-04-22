import { useState } from 'react';
import type { ProductionShot, SceneSheet } from '../productionTypes';
import { useProductionContext } from '../ProductionContext';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';
import { StepExportStoryboardOverview } from './StepExportStoryboardOverview';
import { StepExportPromptConsistency } from './StepExportPromptConsistency';

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
}) {
  const { setStep } = useProductionContext();
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
  const [activeTab, setActiveTab] = useState<ExportTab>('quick');

  const TABS: { id: ExportTab; label: string; desc: string }[] = [
    {
      id: 'quick',
      label: uiText('审片与剪辑', 'Review & edit'),
      desc: uiText('预览分镜视频，一键导入剪辑器精修', 'Preview storyboard videos and send them into the editor for polish'),
    },
    {
      id: 'advanced',
      label: uiText('AI 视频描述', 'AI video prompts'),
      desc: uiText('组装和导出各镜头的 AI 视频描述文本', 'Assemble and export AI video prompt text for each shot'),
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

