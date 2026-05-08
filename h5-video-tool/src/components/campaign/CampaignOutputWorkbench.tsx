import type {
  CampaignOutputPlan,
  GameSourceAssetRequirement,
  ProductionItem,
} from './outputPlan.ts';

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
  requiredAssets: string;
  nextAction: string;
  openAssetLibrary: string;
  openQuickFilm: string;
  createDistributionPackage: string;
  error: string;
  gapWorkaround: string;
};

interface CampaignOutputWorkbenchProps {
  plan: CampaignOutputPlan | null;
  createdPlan: CampaignOutputPlan | null;
  isCreating: boolean;
  errorMessage: string | null;
  copy: Copy;
  onCreatePlan: () => void;
  onConfirmProduction: () => void;
  onOpenAssetLibrary: () => void;
  onOpenQuickFilm: () => void;
  onCreateDistributionPackage: () => void;
}

export function CampaignOutputWorkbench({
  plan,
  createdPlan,
  isCreating,
  errorMessage,
  copy,
  onCreatePlan,
  onConfirmProduction,
  onOpenAssetLibrary,
  onOpenQuickFilm,
  onCreateDistributionPackage,
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

  const readyCount = activePlan.items.filter((item) => item.gobsCanProduce).length;
  const blockedCount = activePlan.items.filter((item) => item.status === 'blocked').length;

  return (
    <section className="rounded-3xl border border-[#d5b56a]/25 bg-[linear-gradient(145deg,rgba(18,24,44,0.98),rgba(21,29,56,0.94))] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip">{copy.badge}</span>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{copy.subtitle}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-3" data-section="outputSummary">
        <SummaryBlock label={copy.totalItems} value={String(sumQuantities(activePlan.items))} />
        <SummaryBlock label={copy.gobsReady} value={String(readyCount)} />
        <SummaryBlock label={copy.blocked} value={String(blockedCount)} />
      </div>

      <div className="mt-6" data-section="productionList">
        <SectionTitle title={copy.productionList} />
        <div className="mt-4 grid gap-3">
          {activePlan.items.map((item) => (
            <ProductionItemCard
              key={item.id}
              item={item}
              requirements={activePlan.sourceAssetRequirements}
              copy={copy}
            />
          ))}
        </div>
      </div>

      <div className="mt-6" data-section="sourceAssetReadiness">
        <SectionTitle title={copy.sourceAssetReadiness} />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {activePlan.sourceAssetRequirements.map((asset) => (
            <SourceAssetCard key={asset.id} asset={asset} />
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
        <button type="button" onClick={createdPlan ? onConfirmProduction : onCreatePlan} className="btn-primary" disabled={isCreating}>
          {createdPlan ? copy.confirmProduction : (isCreating ? copy.confirming : copy.createPlan)}
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

function sumQuantities(items: ProductionItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
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

function ProductionItemCard({
  item,
  requirements,
  copy,
}: {
  item: ProductionItem;
  requirements: GameSourceAssetRequirement[];
  copy: Copy;
}) {
  const itemRequirements = requirements.filter((asset) => item.requiredSourceAssetIds.includes(asset.id));
  return (
    <article className="rounded-2xl border border-[var(--color-border)]/45 bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-[var(--color-text)]">
            {item.quantity} x {item.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{item.contentBrief}</p>
        </div>
        <span className="rounded-full border border-[var(--color-border)]/50 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {item.status}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoLine label={copy.requiredAssets} value={itemRequirements.map((asset) => asset.label).join(', ') || '-'} />
        <InfoLine label={copy.nextAction} value={item.humanAction?.label ?? (item.gobsCanProduce ? copy.confirmProduction : '-')} />
      </div>
    </article>
  );
}

function SourceAssetCard({ asset }: { asset: GameSourceAssetRequirement }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/45 bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--color-text)]">{asset.label}</div>
        <span className="rounded-full border border-[var(--color-border)]/50 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          {asset.status}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{asset.guidance}</p>
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
