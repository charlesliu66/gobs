import type {
  CampaignOutputPlan,
  GameSourceAssetRequirement,
  ProducedOutputDraft,
  ProductionItem,
} from './outputPlan.ts';
import type { CreativeFeedbackInput } from './feedback/creativeFeedbackTypes.ts';
import type { CreativeQualityStatus } from './quality/creativeQualityTypes.ts';
import { canOpenProductionItemInStudio } from './studioBridge.ts';
import { BannerOutputCard } from './BannerOutputCard.tsx';
import { CreativeQualityPanel } from './CreativeQualityPanel.tsx';
import { summarizeKnowledgeReferences } from './knowledgeTraceability.ts';
import {
  linkHealthStatusLabel,
  summarizeOutputPlanLinkHealth,
  type CampaignDataLinkHealthStatus,
} from './dataContractLinkHealth.ts';
import {
  buildProductionItemCoverageMap,
  summarizeCampaignOutputCoverage,
  type ProductionItemCoverageState,
  type ProductionReadiness,
} from './outputCoverageViewModel.ts';

type Copy = {
  emptyTitle: string;
  emptyBody: string;
  title: string;
  subtitle: string;
  badge: string;
  outputSummary: string;
  productionList: string;
  sourceAssetReadiness: string;
  capabilityGaps: string;
  confirmProduction: string;
  confirming: string;
  createPlan: string;
  createdPlan: string;
  totalItems: string;
  gobsReady: string;
  blocked: string;
  trueCoverage: string;
  assistiveCoverage: string;
  directCoverage: string;
  templateCoverage: string;
  needsSourceAsset: string;
  unsupportedCoverage: string;
  linkHealth: string;
  linkHealthy: string;
  linkWarning: string;
  linkBroken: string;
  requiredAssets: string;
  nextAction: string;
  readinessStatus: string;
  readinessAutoReady: string;
  readinessTemplateReady: string;
  readinessBriefReady: string;
  readinessNeedsSourceAsset: string;
  readinessUnsupported: string;
  missingAssetsToUnblock: string;
  unsupportedReason: string;
  unsupportedReasonDetail: string;
  knowledgeReferences: string;
  openAssetLibrary: string;
  openQuickFilm: string;
  openInStudio: string;
  createDistributionPackage: string;
  producedOutputs: string;
  error: string;
  gapWorkaround: string;
  matchedAssets: string;
  chooseAsset: string;
  uploadAsset: string;
  needsSelection: string;
  missingAsset: string;
  bannerSpecs: string;
  bannerMainVisual: string;
  bannerShortCopy: string;
  bannerCta: string;
  bannerPromptPlaceholder: string;
  bannerQuality: string;
  qualityUsable: string;
  qualityNeedsFix: string;
  qualityUnusable: string;
  qualityPanelTitle: string;
  qualityPanelSubtitle: string;
  currentQuality: string;
  feedbackSignals: string;
  issueTags: string;
  recommendation: string;
  feedbackTags: string;
  nextVersionNote: string;
  nextVersionNotePlaceholder: string;
  createNextVersion: string;
  nextVersionUnsupported: string;
  statusNotReviewed: string;
  feedbackSellingPoint: string;
  feedbackFirstThreeSeconds: string;
  feedbackSlowPacing: string;
  feedbackInaccurateCharacter: string;
  feedbackReferenceMotion: string;
  feedbackCopyStrength: string;
  feedbackBetterTikTok: string;
  feedbackBetterFacebook: string;
};

interface CampaignOutputWorkbenchProps {
  plan: CampaignOutputPlan | null;
  createdPlan: CampaignOutputPlan | null;
  isCreating: boolean;
  errorMessage: string | null;
  copy: Copy;
  onConfirmProduction: () => void;
  onOpenAssetLibrary: () => void;
  onOpenQuickFilm: () => void;
  onOpenInStudio?: (item: ProductionItem) => void;
  onCreateDistributionPackage: () => void;
  onChooseSourceAsset: (asset: GameSourceAssetRequirement) => void;
  onUploadSourceAsset: (asset: GameSourceAssetRequirement) => void;
  onMarkBannerQuality?: (item: ProductionItem, output: ProducedOutputDraft, status: CreativeQualityStatus) => void;
  onCreateNextVersion?: (item: ProductionItem, output: ProducedOutputDraft, feedback: CreativeFeedbackInput) => void;
  assetNamesById?: Record<string, string>;
}

export function CampaignOutputWorkbench({
  plan,
  createdPlan,
  isCreating,
  errorMessage,
  copy,
  onConfirmProduction,
  onOpenAssetLibrary,
  onOpenQuickFilm,
  onOpenInStudio,
  onCreateDistributionPackage,
  onChooseSourceAsset,
  onUploadSourceAsset,
  onMarkBannerQuality,
  onCreateNextVersion,
  assetNamesById = {},
}: CampaignOutputWorkbenchProps) {
  const activePlan = createdPlan ?? plan;
  if (!activePlan) {
    return (
      <section className="rounded-3xl border border-dashed border-[var(--color-border)]/65 bg-[var(--color-surface-elevated)]/70 p-6">
        <div className="text-lg font-semibold text-[var(--color-text)]">{copy.emptyTitle}</div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.emptyBody}</p>
      </section>
    );
  }

  const coverageSummary = summarizeCampaignOutputCoverage(activePlan);
  const readinessByItemId = buildProductionItemCoverageMap(activePlan);
  const trueCoverageCount = coverageSummary.autoReady + coverageSummary.templateReady;
  const blockedCount = coverageSummary.needsSourceAsset + coverageSummary.unsupported;
  const linkHealth = summarizeOutputPlanLinkHealth(activePlan);
  const linkHealthLabels: Record<CampaignDataLinkHealthStatus, string> = {
    healthy: copy.linkHealthy,
    warning: copy.linkWarning,
    broken: copy.linkBroken,
  };

  return (
    <section className="rounded-3xl border border-[#d5b56a]/25 bg-[linear-gradient(145deg,rgba(18,24,44,0.98),rgba(21,29,56,0.94))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip">{copy.badge}</span>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{copy.subtitle}</p>

      <div className="mt-6" data-section="outputSummary">
        <SectionTitle title={copy.outputSummary} />
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryBlock label={copy.totalItems} value={String(coverageSummary.total)} />
          <SummaryBlock
            label={copy.trueCoverage}
            value={formatCoverageValue(trueCoverageCount, coverageSummary.total)}
          />
          <SummaryBlock
            label={copy.assistiveCoverage}
            value={formatCoverageValue(coverageSummary.briefReady, coverageSummary.total)}
          />
          <SummaryBlock
            label={copy.blocked}
            value={formatCoverageValue(blockedCount, coverageSummary.total)}
          />
          <SummaryBlock
            label={copy.linkHealth}
            value={linkHealthStatusLabel(linkHealth.status, linkHealthLabels)}
          />
        </div>
        <div
          className="mt-4 rounded-2xl border border-[var(--color-border)]/45 bg-black/12 p-4"
          data-section="coverageBreakdown"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CoverageBreakdownRow
              label={copy.directCoverage}
              value={formatCoverageValue(coverageSummary.autoReady, coverageSummary.total)}
            />
            <CoverageBreakdownRow
              label={copy.templateCoverage}
              value={formatCoverageValue(coverageSummary.templateReady, coverageSummary.total)}
            />
            <CoverageBreakdownRow
              label={copy.needsSourceAsset}
              value={formatCoverageValue(coverageSummary.needsSourceAsset, coverageSummary.total)}
            />
            <CoverageBreakdownRow
              label={copy.unsupportedCoverage}
              value={formatCoverageValue(coverageSummary.unsupported, coverageSummary.total)}
            />
          </div>
        </div>
      </div>
      {linkHealth.issues.length > 0 ? (
        <div
          className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/8 px-4 py-3 text-xs leading-5 text-amber-50"
          data-section="linkHealth"
        >
          <div className="font-semibold uppercase tracking-[0.14em] text-amber-100">{copy.linkHealth}</div>
          <div className="mt-2">{linkHealth.issues.slice(0, 3).join(' ')}</div>
        </div>
      ) : null}

      <div className="mt-6" data-section="productionList">
        <SectionTitle title={copy.productionList} />
        <div className="mt-4 grid gap-3">
          {activePlan.items.map((item) => (
            <ProductionItemCard
              key={item.id}
              item={item}
              coverageState={readinessByItemId[item.id]}
              requirements={activePlan.sourceAssetRequirements}
              copy={copy}
              assetNamesById={assetNamesById}
              onChooseSourceAsset={onChooseSourceAsset}
              onOpenInStudio={onOpenInStudio}
              onMarkBannerQuality={onMarkBannerQuality}
              onCreateNextVersion={onCreateNextVersion}
            />
          ))}
        </div>
      </div>

      <div className="mt-6" data-section="sourceAssetReadiness">
        <SectionTitle title={copy.sourceAssetReadiness} />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {activePlan.sourceAssetRequirements.map((asset) => (
            <SourceAssetCard
              key={asset.id}
              asset={asset}
              copy={copy}
              assetNamesById={assetNamesById}
              onChooseSourceAsset={onChooseSourceAsset}
              onUploadSourceAsset={onUploadSourceAsset}
            />
          ))}
        </div>
      </div>

      {activePlan.capabilityGaps.length > 0 ? (
        <div className="mt-6" data-section="capabilityGaps">
          <SectionTitle title={copy.capabilityGaps} />
          <div className="mt-4 grid gap-3">
            {activePlan.capabilityGaps.map((gap) => (
              <div
                key={gap.id}
                className="rounded-2xl border border-amber-400/30 bg-amber-400/8 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{gap.title}</div>
                  <span className="rounded-full border border-amber-300/30 px-3 py-1 text-xs uppercase tracking-[0.14em] text-amber-100">
                    {gap.priorityHint}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                  {copy.gapWorkaround}: {gap.currentWorkaround}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-rose-400/35 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-[var(--color-text)]">
          {copy.error}: {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3" data-section="confirmProduction">
        <button type="button" onClick={onConfirmProduction} className="btn-primary" disabled={isCreating}>
          {isCreating ? copy.confirming : copy.confirmProduction}
        </button>
        <button type="button" onClick={onOpenAssetLibrary} className="btn-secondary">
          {copy.openAssetLibrary}
        </button>
        <button type="button" onClick={onOpenQuickFilm} className="btn-secondary">
          {copy.openQuickFilm}
        </button>
        <button type="button" onClick={onCreateDistributionPackage} className="btn-secondary">
          {copy.createDistributionPackage}
        </button>
      </div>
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e6c66e]">
      {title}
    </div>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/45 bg-black/12 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{value}</div>
    </div>
  );
}

function CoverageBreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)]/35 bg-[var(--color-surface)]/70 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-[var(--color-text)]">{value}</div>
    </div>
  );
}

function formatCoverageValue(count: number, total: number): string {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  return `${count}/${total} (${percentage}%)`;
}

function readinessLabel(readiness: ProductionReadiness, copy: Copy): string {
  switch (readiness) {
    case 'auto_ready':
      return copy.readinessAutoReady;
    case 'template_ready':
      return copy.readinessTemplateReady;
    case 'brief_ready':
      return copy.readinessBriefReady;
    case 'needs_source_asset':
      return copy.readinessNeedsSourceAsset;
    default:
      return copy.readinessUnsupported;
  }
}

function readinessTone(readiness: ProductionReadiness): string {
  switch (readiness) {
    case 'auto_ready':
      return 'border-emerald-400/35 bg-emerald-400/12 text-emerald-100';
    case 'template_ready':
      return 'border-sky-400/35 bg-sky-400/12 text-sky-100';
    case 'brief_ready':
      return 'border-violet-400/35 bg-violet-400/12 text-violet-100';
    case 'needs_source_asset':
      return 'border-amber-400/35 bg-amber-400/12 text-amber-100';
    default:
      return 'border-rose-400/35 bg-rose-400/12 text-rose-100';
  }
}

function ReadinessBadge({ readiness, copy }: { readiness: ProductionReadiness; copy: Copy }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${readinessTone(readiness)}`}
      data-section="productionReadiness"
    >
      {readinessLabel(readiness, copy)}
    </span>
  );
}

function ReadinessNotice({
  tone,
  label,
  value,
}: {
  tone: 'amber' | 'rose';
  label: string;
  value: string;
}) {
  const className =
    tone === 'amber'
      ? 'border-amber-400/30 bg-amber-400/8 text-amber-50'
      : 'border-rose-400/30 bg-rose-400/8 text-rose-50';

  return (
    <div className={`mt-4 rounded-xl border px-3 py-3 text-xs leading-5 ${className}`} data-section="readinessNotice">
      <div className="font-semibold uppercase tracking-[0.12em]">{label}</div>
      <div className="mt-2">{value}</div>
    </div>
  );
}

function ProductionItemCard({
  item,
  coverageState,
  requirements,
  copy,
  assetNamesById,
  onChooseSourceAsset,
  onOpenInStudio,
  onMarkBannerQuality,
  onCreateNextVersion,
}: {
  item: ProductionItem;
  coverageState?: ProductionItemCoverageState;
  requirements: GameSourceAssetRequirement[];
  copy: Copy;
  assetNamesById: Record<string, string>;
  onChooseSourceAsset: (asset: GameSourceAssetRequirement) => void;
  onOpenInStudio?: (item: ProductionItem) => void;
  onMarkBannerQuality?: (item: ProductionItem, output: ProducedOutputDraft, status: CreativeQualityStatus) => void;
  onCreateNextVersion?: (item: ProductionItem, output: ProducedOutputDraft, feedback: CreativeFeedbackInput) => void;
}) {
  const itemRequirements = requirements.filter((asset) => item.requiredSourceAssetIds.includes(asset.id));
  const studioReady = canOpenProductionItemInStudio(item);
  const knowledgeReferenceSummaries = summarizeKnowledgeReferences(item.knowledgeReferences);
  return (
    <article className="rounded-2xl border border-[var(--color-border)]/45 bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[var(--color-text)]">
            {item.quantity} x {item.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.contentBrief}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {coverageState ? <ReadinessBadge readiness={coverageState.readiness} copy={copy} /> : null}
          <span className="rounded-full border border-[var(--color-border)]/50 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            {item.status}
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoLine
          label={copy.readinessStatus}
          value={coverageState ? readinessLabel(coverageState.readiness, copy) : '-'}
        />
        <InfoLine label={copy.requiredAssets} value={itemRequirements.map((asset) => asset.label).join(', ') || '-'} />
        <InfoLine label={copy.nextAction} value={item.humanAction?.label ?? (item.gobsCanProduce ? copy.confirmProduction : '-')} />
      </div>
      {coverageState?.missingRequirementLabels.length ? (
        <ReadinessNotice
          tone="amber"
          label={copy.missingAssetsToUnblock}
          value={coverageState.missingRequirementLabels.join(', ')}
        />
      ) : null}
      {coverageState?.readiness === 'unsupported' ? (
        <ReadinessNotice
          tone="rose"
          label={copy.unsupportedReason}
          value={copy.unsupportedReasonDetail}
        />
      ) : null}
      {knowledgeReferenceSummaries.length > 0 ? (
        <KnowledgeReferenceList title={copy.knowledgeReferences} items={knowledgeReferenceSummaries} />
      ) : null}
      {item.type === 'banner' ? (
        <BannerOutputCard
          item={item}
          requirements={itemRequirements}
          assetNamesById={assetNamesById}
          copy={copy}
          onChooseSourceAsset={onChooseSourceAsset}
          onMarkQuality={onMarkBannerQuality}
        />
      ) : null}
      {studioReady && onOpenInStudio ? (
        <div className="mt-4 flex flex-wrap gap-2" data-section="studioBridgeActions">
          <button type="button" className="btn-secondary" data-action="openInStudio" onClick={() => onOpenInStudio(item)}>
            {copy.openInStudio}
          </button>
        </div>
      ) : null}
      {(item.producedOutputs?.length ?? 0) > 0 ? (
        <div className="mt-4 rounded-2xl border border-[#d5b56a]/20 bg-[#d5b56a]/8 p-4" data-section="producedOutputs">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6c66e]">
            {copy.producedOutputs}
          </div>
          <div className="mt-3 grid gap-3">
            {item.producedOutputs?.map((output) => (
              <div key={output.id} className="rounded-xl border border-[var(--color-border)]/35 bg-black/12 px-3 py-3">
                <div className="text-sm font-semibold text-[var(--color-text)]">{output.title}</div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{output.body}</p>
                {output.variants.length > 1 ? (
                  <div className="mt-2 text-xs leading-5 text-[var(--color-text-subtle)]">
                    {output.variants.join(' / ')}
                  </div>
                ) : null}
                {summarizeKnowledgeReferences(output.knowledgeReferences).length > 0 ? (
                  <KnowledgeReferenceList
                    title={copy.knowledgeReferences}
                    items={summarizeKnowledgeReferences(output.knowledgeReferences)}
                  />
                ) : null}
                <CreativeQualityPanel
                  item={item}
                  output={output}
                  copy={{
                    qualityPanelTitle: copy.qualityPanelTitle,
                    qualityPanelSubtitle: copy.qualityPanelSubtitle,
                    currentQuality: copy.currentQuality,
                    feedbackSignals: copy.feedbackSignals,
                    issueTags: copy.issueTags,
                    recommendation: copy.recommendation,
                    feedbackTags: copy.feedbackTags,
                    nextVersionNote: copy.nextVersionNote,
                    nextVersionNotePlaceholder: copy.nextVersionNotePlaceholder,
                    createNextVersion: copy.createNextVersion,
                    nextVersionUnsupported: copy.nextVersionUnsupported,
                    statusNotReviewed: copy.statusNotReviewed,
                    statusUsable: copy.qualityUsable,
                    statusNeedsFix: copy.qualityNeedsFix,
                    statusUnusable: copy.qualityUnusable,
                    feedbackTagLabels: {
                      selling_point_not_prominent: copy.feedbackSellingPoint,
                      first_three_seconds_weak: copy.feedbackFirstThreeSeconds,
                      slow_pacing: copy.feedbackSlowPacing,
                      inaccurate_character: copy.feedbackInaccurateCharacter,
                      reference_motion_mismatch: copy.feedbackReferenceMotion,
                      copy_not_strong_enough: copy.feedbackCopyStrength,
                      better_for_tiktok: copy.feedbackBetterTikTok,
                      better_for_facebook: copy.feedbackBetterFacebook,
                    },
                  }}
                  onCreateNextVersion={onCreateNextVersion}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function KnowledgeReferenceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-3 py-3" data-section="knowledgeReferences">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
        {title}
      </div>
      <ul className="mt-2 grid gap-1.5">
        {items.map((item) => (
          <li key={item} className="text-xs leading-5 text-[var(--color-text-muted)]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourceAssetCard({
  asset,
  copy,
  assetNamesById,
  onChooseSourceAsset,
  onUploadSourceAsset,
}: {
  asset: GameSourceAssetRequirement;
  copy: Copy;
  assetNamesById: Record<string, string>;
  onChooseSourceAsset: (asset: GameSourceAssetRequirement) => void;
  onUploadSourceAsset: (asset: GameSourceAssetRequirement) => void;
}) {
  const matchedNames = asset.matchedAssetIds.map((id) => assetNamesById[id] ?? id);
  const statusLabel =
    asset.status === 'needs_selection'
      ? copy.needsSelection
      : asset.status === 'missing' || asset.status === 'needs_upload'
        ? copy.missingAsset
        : asset.status;
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/45 bg-[var(--color-surface)] p-4" data-section="sourceAssetCard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--color-text)]">{asset.label}</div>
        <span className="rounded-full border border-[var(--color-border)]/50 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{asset.guidance}</p>
      <div className="mt-3 rounded-xl border border-[var(--color-border)]/35 bg-black/10 px-3 py-2" data-section="sourceAssetMatches">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
          {copy.matchedAssets}
        </div>
        <div className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
          {matchedNames.length > 0 ? matchedNames.join(', ') : '-'}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2" data-section="sourceAssetActions">
        <button type="button" className="btn-secondary" onClick={() => onChooseSourceAsset(asset)}>
          {copy.chooseAsset}
        </button>
        <button type="button" className="btn-secondary" onClick={() => onUploadSourceAsset(asset)}>
          {copy.uploadAsset}
        </button>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <div className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">{value}</div>
    </div>
  );
}
