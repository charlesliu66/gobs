type Copy = {
  title: string;
  subtitle: string;
  empty: string;
};

interface CampaignPendingActionsCardProps {
  items: string[];
  notice?: string | null;
  copy: Copy;
}

export function CampaignPendingActionsCard({
  items,
  notice,
  copy,
}: CampaignPendingActionsCardProps) {
  return (
    <section className="rounded-3xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] p-6">
      <div className="text-lg font-semibold text-[var(--color-text)]">{copy.title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.subtitle}</p>

      {notice ? (
        <div className="mt-4 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 px-4 py-3 text-sm leading-6 text-[var(--color-text)]">
          {notice}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-[var(--color-border)]/55 bg-[var(--color-surface)] px-4 py-3 text-sm leading-6 text-[var(--color-text)]"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-border)]/60 bg-[var(--color-surface)]/70 px-4 py-3 text-sm leading-6 text-[var(--color-text-muted)]">
          {copy.empty}
        </div>
      )}
    </section>
  );
}
