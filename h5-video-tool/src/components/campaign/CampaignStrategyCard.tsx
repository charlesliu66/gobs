import type {
  CampaignCreativeBrief,
  CampaignCreativeCtaType,
  CampaignCreativeHookApproach,
  CampaignCreativeStrategy,
  CampaignCreativeVariantEmphasis,
  CampaignCreativeVariantPack,
} from './model';

type Copy = {
  emptyTitle: string;
  emptyBody: string;
  title: string;
  badge: string;
  angle: string;
  objective: string;
  audience: string;
  tone: string;
  hookApproach: string;
  recommendedHook: string;
  hookOptions: string;
  sellingPointFocus: string;
  cta: string;
  ctaType: string;
  rationale: string;
  assetNeeds: string;
  riskNotes: string;
  knowledgeSectionTitle: string;
  marketTruth: string;
  audienceTension: string;
  toneRules: string;
  forbiddenClaims: string;
  visualCues: string;
  approvedAngles: string;
  hookCandidates: string;
  variantPackTitle: string;
  variantPackSubtitle: string;
  variantHook: string;
  variantOpeningBeat: string;
  variantEditingDirection: string;
  variantAssetSuggestion: string;
  variantDifferenceSummary: string;
  variantSelect: string;
  selectedVariant: string;
  nextStepTitle: string;
  nextStepBody: string;
  launchEditor: string;
  ctaTypeLabels: {
    directResponse: string;
    softConversion: string;
    brandFollow: string;
  };
  hookApproachLabels: {
    benefitFirst: string;
    conflictFirst: string;
    storyFirst: string;
  };
  variantEmphasisLabels: {
    hookFocus: string;
    sellingPointFocus: string;
    ctaFocus: string;
  };
};

interface CampaignStrategyCardProps {
  brief: CampaignCreativeBrief | null;
  strategy: CampaignCreativeStrategy | null;
  variantPack: CampaignCreativeVariantPack | null;
  selectedVariantId: string | null;
  copy: Copy;
  onSelectVariant: (variantId: string) => void;
  onLaunchEditor: () => void;
}

export function CampaignStrategyCard({
  brief,
  strategy,
  variantPack,
  selectedVariantId,
  copy,
  onSelectVariant,
  onLaunchEditor,
}: CampaignStrategyCardProps) {
  if (!strategy || !brief) {
    return (
      <section className="rounded-3xl border border-dashed border-[var(--color-border)]/65 bg-[var(--color-surface-elevated)]/70 p-6">
        <div className="text-lg font-semibold text-[var(--color-text)]">{copy.emptyTitle}</div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.emptyBody}</p>
      </section>
    );
  }

  const selectedVariant =
    variantPack?.variants.find((variant) => variant.variantId === selectedVariantId) ??
    variantPack?.variants[0] ??
    null;
  const knowledgeBlocks = [
    { label: copy.marketTruth, items: strategy.marketTruth },
    { label: copy.audienceTension, items: strategy.audienceTension },
    { label: copy.toneRules, items: strategy.toneRules },
    { label: copy.forbiddenClaims, items: strategy.forbiddenClaims },
    { label: copy.approvedAngles, items: strategy.approvedAngles },
    { label: copy.hookCandidates, items: strategy.hookCandidates },
    { label: copy.visualCues, items: strategy.visualCues },
  ].filter((block) => block.items.length > 0);

  return (
    <section className="rounded-3xl border border-[var(--color-primary)]/25 bg-[var(--color-surface-elevated)] p-6 shadow-[0_20px_70px_rgba(124,141,255,0.12)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip">{copy.badge}</span>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InfoBlock label={copy.objective} value={strategy.objective} />
        <InfoBlock label={copy.angle} value={strategy.angle} />
        <InfoBlock label={copy.audience} value={strategy.targetAudience || brief.audience || 'General'} />
        <InfoBlock label={copy.tone} value={strategy.tone || '-'} />
        <InfoBlock
          label={copy.hookApproach}
          value={resolveHookApproachLabel(strategy.hookApproach, copy.hookApproachLabels)}
        />
        <InfoBlock label={copy.sellingPointFocus} value={strategy.sellingPointFocus || brief.sellingPoints[0] || '-'} />
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
          {copy.recommendedHook}
        </div>
        <p className="mt-2 text-base font-medium leading-7 text-[var(--color-text)]">{strategy.recommendedHook}</p>
      </div>

      <div className="mt-6 grid gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--color-text)]">{copy.hookOptions}</div>
          <div className="mt-3 grid gap-3">
            {strategy.hookOptions.map((option) => (
              <div
                key={option}
                className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]"
              >
                {option}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoBlock label={copy.cta} value={strategy.cta} />
          <InfoBlock label={copy.ctaType} value={resolveCtaTypeLabel(strategy.ctaType, copy.ctaTypeLabels)} />
        </div>
        <InfoBlock label={copy.rationale} value={strategy.rationale} />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium text-[var(--color-text)]">{copy.assetNeeds}</div>
            <ul className="mt-3 grid gap-3">
              {strategy.assetNeeds.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-sm font-medium text-[var(--color-text)]">{copy.riskNotes}</div>
            <ul className="mt-3 grid gap-3">
              {strategy.riskNotes.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {knowledgeBlocks.length > 0 ? (
          <div className="rounded-3xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] p-4">
            <div className="text-sm font-semibold text-[var(--color-text)]">{copy.knowledgeSectionTitle}</div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {knowledgeBlocks.map((block) => (
                <ListBlock key={block.label} label={block.label} items={block.items} />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {variantPack ? (
        <div className="mt-6 rounded-3xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--color-text)]">{copy.variantPackTitle}</div>
              <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                {variantPack.summary || copy.variantPackSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {variantPack.comparisonAxes.map((axis) => (
                <span
                  key={axis}
                  className="rounded-full border border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)] px-3 py-1 text-xs text-[var(--color-text-muted)]"
                >
                  {axis}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {variantPack.variants.map((variant) => {
              const isSelected = variant.variantId === selectedVariant?.variantId;
              return (
                <button
                  key={variant.variantId}
                  type="button"
                  onClick={() => onSelectVariant(variant.variantId)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_16px_40px_rgba(124,141,255,0.12)]'
                      : 'border-[var(--color-border)]/60 bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip">{resolveVariantEmphasisLabel(variant.emphasis, copy.variantEmphasisLabels)}</span>
                        <span className="text-base font-semibold text-[var(--color-text)]">{variant.title}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
                        {variant.differenceSummary}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        isSelected
                          ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)]/60 text-[var(--color-text-muted)]'
                      }`}
                    >
                      {isSelected ? copy.selectedVariant : copy.variantSelect}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <InfoBlock label={copy.variantHook} value={variant.hook} />
                    <InfoBlock label={copy.variantOpeningBeat} value={variant.openingBeat || '-'} />
                    <InfoBlock label={copy.sellingPointFocus} value={variant.sellingPointFocus || '-'} />
                    <InfoBlock label={copy.cta} value={variant.cta} />
                    <InfoBlock label={copy.variantEditingDirection} value={variant.editingDirection || '-'} />
                    <InfoBlock label={copy.variantAssetSuggestion} value={variant.assetSuggestion || '-'} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/70 p-4">
        <div className="text-sm font-semibold text-[var(--color-text)]">{copy.nextStepTitle}</div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          {selectedVariant ? `${copy.nextStepBody} ${copy.selectedVariant}: ${selectedVariant.title}` : copy.nextStepBody}
        </p>
        <button type="button" onClick={onLaunchEditor} className="btn-secondary mt-4">
          {copy.launchEditor}
        </button>
      </div>
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

function resolveCtaTypeLabel(
  value: CampaignCreativeCtaType | undefined,
  labels: Copy['ctaTypeLabels'],
): string {
  if (value === 'direct_response') return labels.directResponse;
  if (value === 'soft_conversion') return labels.softConversion;
  if (value === 'brand_follow') return labels.brandFollow;
  return '-';
}

function resolveHookApproachLabel(
  value: CampaignCreativeHookApproach | undefined,
  labels: Copy['hookApproachLabels'],
): string {
  if (value === 'benefit_first') return labels.benefitFirst;
  if (value === 'conflict_first') return labels.conflictFirst;
  if (value === 'story_first') return labels.storyFirst;
  return '-';
}

function resolveVariantEmphasisLabel(
  value: CampaignCreativeVariantEmphasis,
  labels: Copy['variantEmphasisLabels'],
): string {
  if (value === 'hook_focus') return labels.hookFocus;
  if (value === 'selling_point_focus') return labels.sellingPointFocus;
  return labels.ctaFocus;
}
