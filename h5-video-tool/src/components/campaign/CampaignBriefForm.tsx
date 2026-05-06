import type { ChangeEvent } from 'react';
import type { CampaignCreativeFormState } from './model';

type Copy = {
  title: string;
  subtitle: string;
  objective: string;
  objectivePlaceholder: string;
  audience: string;
  audiencePlaceholder: string;
  sellingPoints: string;
  sellingPointsPlaceholder: string;
  cta: string;
  ctaPlaceholder: string;
  generateStrategy: string;
  advancedTitle: string;
  referenceStyle: string;
  referenceStylePlaceholder: string;
  region: string;
  regionPlaceholder: string;
  forbiddenClaims: string;
  forbiddenClaimsPlaceholder: string;
};

interface CampaignBriefFormProps {
  value: CampaignCreativeFormState;
  copy: Copy;
  onChange: (patch: Partial<CampaignCreativeFormState>) => void;
  onSubmit: () => void;
}

export function CampaignBriefForm({ value, copy, onChange, onSubmit }: CampaignBriefFormProps) {
  const handleInput =
    (field: keyof CampaignCreativeFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ [field]: event.target.value });
    };

  return (
    <section className="rounded-3xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.subtitle}</p>
      </div>

      <div className="grid gap-5">
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

        <div className="grid gap-5 lg:grid-cols-2">
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
            <span className="text-sm font-medium text-[var(--color-text)]">{copy.cta}</span>
            <input
              value={value.cta}
              onChange={handleInput('cta')}
              placeholder={copy.ctaPlaceholder}
              className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
            />
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">{copy.sellingPoints}</span>
          <textarea
            value={value.sellingPointsText}
            onChange={handleInput('sellingPointsText')}
            rows={5}
            placeholder={copy.sellingPointsPlaceholder}
            className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)]/50"
          />
        </label>

        <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)]/60 p-4">
          <div className="text-sm font-medium text-[var(--color-text)]">{copy.advancedTitle}</div>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[var(--color-text)]">{copy.referenceStyle}</span>
              <input
                value={value.referenceStyle}
                onChange={handleInput('referenceStyle')}
                placeholder={copy.referenceStylePlaceholder}
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
          </div>

          <label className="mt-5 grid gap-2">
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

        <button type="button" onClick={onSubmit} className="btn-primary justify-center text-sm">
          {copy.generateStrategy}
        </button>
      </div>
    </section>
  );
}
