import type { ChangeEvent } from 'react';
import type { CampaignCreativeFormState } from './model';

interface GeneratedBriefReviewProps {
  value: CampaignCreativeFormState;
  sourceLabel: string;
  warnings: string[];
  routedPackCount: number;
  copy: {
    title: string;
    subtitle: string;
    source: string;
    routedBrain: string;
    objective: string;
    objectivePlaceholder: string;
    sellingPoints: string;
    sellingPointsPlaceholder: string;
    cta: string;
    ctaPlaceholder: string;
    confirm: string;
    advanced: string;
    audience: string;
    audiencePlaceholder: string;
    referenceStyle: string;
    referenceStylePlaceholder: string;
    region: string;
    regionPlaceholder: string;
    forbiddenClaims: string;
    forbiddenClaimsPlaceholder: string;
  };
  onChange: (patch: Partial<CampaignCreativeFormState>) => void;
  onConfirm: () => void;
}

export function GeneratedBriefReview({
  value,
  sourceLabel,
  warnings,
  routedPackCount,
  copy,
  onChange,
  onConfirm,
}: GeneratedBriefReviewProps) {
  const handleInput =
    (field: keyof CampaignCreativeFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: event.target.value });
    };

  return (
    <section className="rounded-[2rem] border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
            {copy.source}: {sourceLabel}
          </span>
          <span className="rounded-full border border-[#d5b56a]/30 bg-[#d5b56a]/10 px-3 py-1 text-xs font-medium text-[#d5b56a]">
            {copy.routedBrain}: {routedPackCount}
          </span>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-4 text-sm leading-6 text-[var(--color-text)]">
          {warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">{copy.objective}</span>
          <textarea
            value={value.objective}
            onChange={handleInput('objective')}
            rows={3}
            placeholder={copy.objectivePlaceholder}
            className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">{copy.sellingPoints}</span>
          <textarea
            value={value.sellingPointsText}
            onChange={handleInput('sellingPointsText')}
            rows={4}
            placeholder={copy.sellingPointsPlaceholder}
            className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">{copy.cta}</span>
          <input
            value={value.cta}
            onChange={handleInput('cta')}
            placeholder={copy.ctaPlaceholder}
            className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
          />
        </label>
      </div>

      <details className="mt-5 rounded-2xl border border-[var(--color-border)]/55 bg-[var(--color-surface)]/60">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
          {copy.advanced}
        </summary>
        <div className="grid gap-5 px-4 pb-4 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">{copy.audience}</span>
            <input
              value={value.audience}
              onChange={handleInput('audience')}
              placeholder={copy.audiencePlaceholder}
              className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">{copy.region}</span>
            <input
              value={value.region}
              onChange={handleInput('region')}
              placeholder={copy.regionPlaceholder}
              className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-medium text-[var(--color-text)]">{copy.referenceStyle}</span>
            <input
              value={value.referenceStyle}
              onChange={handleInput('referenceStyle')}
              placeholder={copy.referenceStylePlaceholder}
              className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-medium text-[var(--color-text)]">{copy.forbiddenClaims}</span>
            <textarea
              value={value.forbiddenClaimsText}
              onChange={handleInput('forbiddenClaimsText')}
              rows={3}
              placeholder={copy.forbiddenClaimsPlaceholder}
              className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
            />
          </label>
        </div>
      </details>

      <button type="button" onClick={onConfirm} className="btn-primary mt-6 justify-center text-sm">
        {copy.confirm}
      </button>
    </section>
  );
}
