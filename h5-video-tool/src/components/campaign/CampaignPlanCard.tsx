import type { CampaignPlan, CampaignProfile } from './model';

type Copy = {
  emptyTitle: string;
  emptyBody: string;
  title: string;
  summary: string;
  automation: string;
  knowledge: string;
  production: string;
  distribution: string;
};

interface CampaignPlanCardProps {
  plan: CampaignPlan | null;
  profile: CampaignProfile | null;
  automationSummary: string;
  copy: Copy;
}

export function CampaignPlanCard({
  plan,
  profile,
  automationSummary,
  copy,
}: CampaignPlanCardProps) {
  if (!plan) {
    return (
      <section className="rounded-3xl border border-dashed border-[var(--color-border)]/65 bg-[var(--color-surface-elevated)]/70 p-6">
        <div className="text-lg font-semibold text-[var(--color-text)]">{copy.emptyTitle}</div>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{copy.emptyBody}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-[var(--color-primary)]/25 bg-[var(--color-surface-elevated)] p-6 shadow-[0_18px_50px_rgba(124,141,255,0.08)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip">{copy.title}</span>
        <div className="text-sm text-[var(--color-text-muted)]">
          {profile?.selectedKnowledgePackIds.length ?? 0} packs
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <InfoBlock label={copy.summary} value={plan.summary} />
        <InfoBlock label={copy.automation} value={automationSummary} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ListBlock
          label={copy.production}
          items={plan.productionDecisions}
        />
        <ListBlock
          label={copy.distribution}
          items={[
            `${copy.knowledge}: ${profile?.selectedKnowledgePackIds.length ?? 0}`,
            ...plan.distributionDecisions,
          ]}
        />
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
