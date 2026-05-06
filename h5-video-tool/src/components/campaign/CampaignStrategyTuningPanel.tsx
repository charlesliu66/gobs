import type { ReactNode } from 'react';
import type {
  CampaignCreativeBrief,
  CampaignCreativeCtaType,
  CampaignCreativeHookApproach,
  CampaignCreativeStrategyTuning,
} from './model';

type OptionLabels = {
  benefitFirst: string;
  conflictFirst: string;
  storyFirst: string;
  directResponse: string;
  softConversion: string;
  brandFollow: string;
};

type Copy = {
  title: string;
  subtitle: string;
  hookApproach: string;
  sellingPointFocus: string;
  ctaType: string;
  reset: string;
  emptySellingPoints: string;
  optionLabels: OptionLabels;
};

interface CampaignStrategyTuningPanelProps {
  brief: CampaignCreativeBrief | null;
  tuning: CampaignCreativeStrategyTuning | null;
  copy: Copy;
  onChange: (patch: Partial<CampaignCreativeStrategyTuning>) => void;
  onReset: () => void;
}

const HOOK_APPROACH_OPTIONS: CampaignCreativeHookApproach[] = [
  'benefit_first',
  'conflict_first',
  'story_first',
];

const CTA_TYPE_OPTIONS: CampaignCreativeCtaType[] = [
  'direct_response',
  'soft_conversion',
  'brand_follow',
];

export function CampaignStrategyTuningPanel({
  brief,
  tuning,
  copy,
  onChange,
  onReset,
}: CampaignStrategyTuningPanelProps) {
  if (!brief || !tuning) {
    return null;
  }

  const sellingPointOptions =
    brief.sellingPoints.length > 0 ? brief.sellingPoints : [tuning.sellingPointFocus];

  return (
    <section className="rounded-3xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-[var(--color-text)]">{copy.title}</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {copy.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]"
        >
          {copy.reset}
        </button>
      </div>

      <div className="mt-5 grid gap-5">
        <OptionGroup label={copy.hookApproach}>
          {HOOK_APPROACH_OPTIONS.map((option) => (
            <ChoiceButton
              key={option}
              active={tuning.hookApproach === option}
              onClick={() => onChange({ hookApproach: option })}
            >
              {hookApproachLabel(option, copy.optionLabels)}
            </ChoiceButton>
          ))}
        </OptionGroup>

        <OptionGroup label={copy.sellingPointFocus}>
          {sellingPointOptions.map((option) => (
            <ChoiceButton
              key={option}
              active={tuning.sellingPointFocus === option}
              onClick={() => onChange({ sellingPointFocus: option })}
            >
              {option}
            </ChoiceButton>
          ))}
          {brief.sellingPoints.length === 0 ? (
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">{copy.emptySellingPoints}</p>
          ) : null}
        </OptionGroup>

        <OptionGroup label={copy.ctaType}>
          {CTA_TYPE_OPTIONS.map((option) => (
            <ChoiceButton
              key={option}
              active={tuning.ctaType === option}
              onClick={() => onChange({ ctaType: option })}
            >
              {ctaTypeLabel(option, copy.optionLabels)}
            </ChoiceButton>
          ))}
        </OptionGroup>
      </div>
    </section>
  );
}

function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-2 text-left text-sm transition ${
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/12 text-[var(--color-text)] shadow-[0_8px_25px_rgba(124,141,255,0.12)]'
          : 'border-[var(--color-border)]/60 bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/25 hover:text-[var(--color-text)]'
      }`}
    >
      {children}
    </button>
  );
}

function hookApproachLabel(
  value: CampaignCreativeHookApproach,
  labels: OptionLabels,
): string {
  if (value === 'benefit_first') return labels.benefitFirst;
  if (value === 'conflict_first') return labels.conflictFirst;
  return labels.storyFirst;
}

function ctaTypeLabel(value: CampaignCreativeCtaType, labels: OptionLabels): string {
  if (value === 'direct_response') return labels.directResponse;
  if (value === 'soft_conversion') return labels.softConversion;
  return labels.brandFollow;
}
