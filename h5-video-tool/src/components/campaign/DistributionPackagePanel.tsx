import type {
  CampaignDistributionCreateInput,
  CampaignDistributionPackage,
  CampaignDistributionPackageAssetReadinessState,
  CampaignDistributionPackageReviewStatus,
} from './distributionPackage.ts';

type Copy = {
  emptyTitle: string;
  emptyBody: string;
  title: string;
  subtitle: string;
  badge: string;
  selectedVariant: string;
  objective: string;
  caption: string;
  platforms: string;
  markets: string;
  assetState: string;
  reviewStatus: string;
  warnings: string;
  packageId: string;
  create: string;
  creating: string;
  continue: string;
  error: string;
  createdTitle: string;
  createdReadyBody: string;
  createdNeedsAssetBody: string;
  nextActionsTitle: string;
  openAssetLibrary: string;
  openQuickFilm: string;
  fineTuneEditor: string;
  knowledge: {
    title: string;
    marketTruth: string;
    toneRules: string;
    forbiddenClaims: string;
  };
  assetStateLabels: {
    publishable: string;
    needsAsset: string;
    generating: string;
    failed: string;
  };
  reviewStatusLabels: {
    draft: string;
    needsReview: string;
    approved: string;
    readyToDistribute: string;
    rejected: string;
  };
};

interface DistributionPackagePanelProps {
  draft: CampaignDistributionCreateInput | null;
  createdPackage: CampaignDistributionPackage | null;
  isCreating: boolean;
  errorMessage: string | null;
  copy: Copy;
  onCreate: () => void;
  onContinue: () => void;
  onOpenAssetLibrary: () => void;
  onOpenQuickFilm: () => void;
  onOpenEditor: () => void;
}

export function DistributionPackagePanel({
  draft,
  createdPackage,
  isCreating,
  errorMessage,
  copy,
  onCreate,
  onContinue,
  onOpenAssetLibrary,
  onOpenQuickFilm,
  onOpenEditor,
}: DistributionPackagePanelProps) {
  if (!draft) {
    return (
      <section className="rounded-3xl border border-dashed border-[var(--color-border)]/65 bg-[var(--color-surface-elevated)]/70 p-6">
        <div className="text-lg font-semibold text-[var(--color-text)]">{copy.emptyTitle}</div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.emptyBody}</p>
      </section>
    );
  }

  const createdMessage = createdPackage
    ? (draft.assetReadiness.state === 'publishable' ? copy.createdReadyBody : copy.createdNeedsAssetBody)
    : null;

  return (
    <section className="rounded-3xl border border-[var(--color-primary)]/25 bg-[var(--color-surface-elevated)] p-6 shadow-[0_20px_70px_rgba(124,141,255,0.1)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip">{copy.badge}</span>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h2>
      </div>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">{copy.subtitle}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoBlock label={copy.selectedVariant} value={draft.variant.title || draft.variant.angle} />
        <InfoBlock label={copy.objective} value={draft.campaign.objective || '-'} />
        <InfoBlock label={copy.platforms} value={formatList(draft.publishIntent.platforms)} />
        <InfoBlock label={copy.markets} value={formatList(draft.publishIntent.markets)} />
        <InfoBlock label={copy.assetState} value={resolveAssetStateLabel(draft.assetReadiness.state, copy)} />
        <InfoBlock label={copy.reviewStatus} value={resolveReviewStatusLabel(draft.review.status, copy)} />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
          {copy.caption}
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{draft.copy.caption || '-'}</p>
      </div>

      {draft.campaign.warnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-400/8 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">{copy.warnings}</div>
          <ul className="mt-3 grid gap-2">
            {draft.campaign.warnings.map((warning) => (
              <li
                key={warning}
                className="rounded-2xl border border-amber-400/20 bg-black/10 px-4 py-3 text-sm leading-6 text-[var(--color-text)]"
              >
                {warning}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 rounded-3xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] p-4">
        <div className="text-sm font-semibold text-[var(--color-text)]">{copy.knowledge.title}</div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ListBlock label={copy.knowledge.marketTruth} items={draft.knowledgeContext.marketTruth} />
          <ListBlock label={copy.knowledge.toneRules} items={draft.knowledgeContext.toneRules} />
          <ListBlock label={copy.knowledge.forbiddenClaims} items={draft.knowledgeContext.forbiddenClaims} />
        </div>
      </div>

      {createdPackage && createdMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-400/35 bg-emerald-400/10 p-4">
          <div className="text-sm font-semibold text-[var(--color-text)]">{copy.createdTitle}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{createdMessage}</p>
          <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
            {copy.packageId}: {createdPackage.id}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-400/35 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-[var(--color-text)]">
          {copy.error}: {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={createdPackage ? onContinue : onCreate}
          className="btn-primary"
          disabled={isCreating}
        >
          {createdPackage ? copy.continue : (isCreating ? copy.creating : copy.create)}
        </button>
        <button type="button" onClick={onOpenEditor} className="btn-secondary">
          {copy.fineTuneEditor}
        </button>
      </div>

      {draft.assetReadiness.state === 'needs_asset' ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/70 p-4">
          <div className="text-sm font-semibold text-[var(--color-text)]">{copy.nextActionsTitle}</div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" onClick={onOpenAssetLibrary} className="btn-secondary">
              {copy.openAssetLibrary}
            </button>
            <button type="button" onClick={onOpenQuickFilm} className="btn-secondary">
              {copy.openQuickFilm}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{value}</p>
    </div>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return <InfoBlock label={label} value="-" />;
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '-';
}

function resolveAssetStateLabel(
  state: CampaignDistributionPackageAssetReadinessState,
  copy: Copy,
): string {
  if (state === 'publishable') return copy.assetStateLabels.publishable;
  if (state === 'needs_asset') return copy.assetStateLabels.needsAsset;
  if (state === 'generating') return copy.assetStateLabels.generating;
  return copy.assetStateLabels.failed;
}

function resolveReviewStatusLabel(
  status: CampaignDistributionPackageReviewStatus,
  copy: Copy,
): string {
  if (status === 'draft') return copy.reviewStatusLabels.draft;
  if (status === 'needs_review') return copy.reviewStatusLabels.needsReview;
  if (status === 'approved') return copy.reviewStatusLabels.approved;
  if (status === 'ready_to_distribute') return copy.reviewStatusLabels.readyToDistribute;
  return copy.reviewStatusLabels.rejected;
}
