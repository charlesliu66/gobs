import type { CampaignCreativeBrief, CampaignCreativeStrategy } from './model';

type Copy = {
  emptyTitle: string;
  emptyBody: string;
  title: string;
  badge: string;
  angle: string;
  audience: string;
  tone: string;
  recommendedHook: string;
  hookOptions: string;
  primarySellingPoint: string;
  cta: string;
  rationale: string;
  assetNeeds: string;
  nextStepTitle: string;
  nextStepBody: string;
  launchEditor: string;
};

interface CampaignStrategyCardProps {
  brief: CampaignCreativeBrief | null;
  strategy: CampaignCreativeStrategy | null;
  copy: Copy;
  onLaunchEditor: () => void;
}

export function CampaignStrategyCard({
  brief,
  strategy,
  copy,
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

  return (
    <section className="rounded-3xl border border-[var(--color-primary)]/25 bg-[var(--color-surface-elevated)] p-6 shadow-[0_20px_70px_rgba(124,141,255,0.12)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip">{copy.badge}</span>
        <h2 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <InfoBlock label={copy.angle} value={strategy.angle} />
        <InfoBlock label={copy.audience} value={strategy.audience || brief.audience || 'General'} />
        <InfoBlock label={copy.tone} value={strategy.tone} />
        <InfoBlock label={copy.primarySellingPoint} value={strategy.primarySellingPoint || brief.sellingPoints[0] || '-'} />
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

        <InfoBlock label={copy.cta} value={strategy.cta} />
        <InfoBlock label={copy.rationale} value={strategy.rationale} />

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
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface)] p-4">
        <div className="text-sm font-semibold text-[var(--color-text)]">{copy.nextStepTitle}</div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.nextStepBody}</p>
        <button type="button" onClick={onLaunchEditor} className="btn-primary mt-4">
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
