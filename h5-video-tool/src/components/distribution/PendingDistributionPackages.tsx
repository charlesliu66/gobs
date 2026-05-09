import type { CampaignDistributionPackage, CampaignDistributionPackageAssetReadinessState, CampaignDistributionPackageReviewStatus } from '../campaign/distributionPackage.ts';
import type { PendingDistributionDraft } from './packageToDistributeDraft.ts';

type Copy = {
  title: string;
  subtitle: string;
  empty: string;
  loading: string;
  error: string;
  usePackage: string;
  active: string;
  accountHint: string;
  nextActionsTitle: string;
  openAssetLibrary: string;
  openQuickFilm: string;
  assetState: string;
  reviewStatus: string;
  packageAngle: string;
  packageHook: string;
  packageTargets: string;
  publishableBadge: string;
  needsAssetBadge: string;
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

interface PendingDistributionPackagesProps {
  packages: CampaignDistributionPackage[];
  loading: boolean;
  errorMessage: string | null;
  activePackageId: string | null;
  activeDraft: PendingDistributionDraft | null;
  copy: Copy;
  onUsePackage: (pkg: CampaignDistributionPackage) => void;
  onOpenAssetLibrary: () => void;
  onOpenQuickFilm: () => void;
}

export function PendingDistributionPackages({
  packages,
  loading,
  errorMessage,
  activePackageId,
  activeDraft,
  copy,
  onUsePackage,
  onOpenAssetLibrary,
  onOpenQuickFilm,
}: PendingDistributionPackagesProps) {
  return (
    <section className="mb-6 space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div>
        <h2 className="section-title">{copy.title}</h2>
        <p className="text-xs text-[var(--color-text-muted)]">{copy.subtitle}</p>
      </div>

      <p className="text-xs text-[var(--color-text-subtle)]">{copy.accountHint}</p>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">{copy.loading}</p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-[var(--color-error)]">
          {copy.error}: {errorMessage}
        </p>
      ) : null}

      {!loading && !errorMessage && packages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          {copy.empty}
        </div>
      ) : null}

      {packages.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {packages.map((pkg) => {
            const isActive = pkg.id === activePackageId;
            const isPublishable = pkg.assetReadiness.state === 'publishable';
            const needsAsset = pkg.assetReadiness.state === 'needs_asset';
            return (
              <article
                key={pkg.id}
                className={`rounded-2xl border p-4 ${
                  isActive
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--color-text)]">{pkg.title}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isPublishable
                          ? 'bg-emerald-500/15 text-emerald-200'
                          : needsAsset
                            ? 'bg-amber-500/15 text-amber-100'
                            : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'
                      }`}
                      >
                        {isPublishable ? copy.publishableBadge : needsAsset ? copy.needsAssetBadge : resolveAssetStateLabel(pkg.assetReadiness.state, copy)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                      {pkg.campaign.mission || pkg.variant.hook}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUsePackage(pkg)}
                    className={isActive ? 'btn-secondary' : 'btn-primary'}
                  >
                    {isActive ? copy.active : copy.usePackage}
                  </button>
                </div>

                <div className="mt-4 space-y-2 rounded-xl border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)]/70 p-3">
                  <InfoLine label={copy.packageAngle} value={pkg.variant.angle} />
                  <InfoLine label={copy.packageHook} value={pkg.variant.hook} />
                  <InfoLine
                    label={copy.packageTargets}
                    value={[pkg.publishIntent.platforms.join(', '), pkg.publishIntent.markets.join(', ')]
                      .filter(Boolean)
                      .join(' · ') || '-'}
                  />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InfoBlock
                    label={copy.assetState}
                    value={resolveAssetStateLabel(pkg.assetReadiness.state, copy)}
                  />
                  <InfoBlock
                    label={copy.reviewStatus}
                    value={resolveReviewStatusLabel(pkg.review.status, copy)}
                  />
                </div>

                {isActive && activeDraft && !activeDraft.publishSafety.canPublishDirectly ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 p-4">
                    <div className="text-sm font-semibold text-[var(--color-text)]">{copy.nextActionsTitle}</div>
                    {activeDraft.publishSafety.reason ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                        {activeDraft.publishSafety.reason}
                      </p>
                    ) : null}
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
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)] px-3 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">{label}</div>
      <p className="mt-2 text-sm text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 md:grid-cols-[7rem_minmax(0,1fr)]">
      <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">{label}</span>
      <span className="break-words text-xs leading-5 text-[var(--color-text-muted)]">{value || '-'}</span>
    </div>
  );
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
