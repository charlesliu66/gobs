import React from 'react';
import {
  buildDistributionPreflightItems,
  type DistributionPreflightItem,
} from './distributeSupport.ts';

void React;

interface DistributePreflightChecklistProps {
  title?: string;
  items: DistributionPreflightItem[];
}

const STATUS_LABELS: Record<DistributionPreflightItem['status'], string> = {
  complete: 'Ready',
  attention: 'Need attention',
  blocked: 'Blocked',
};

const STATUS_TONE: Record<DistributionPreflightItem['status'], string> = {
  complete: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200',
  attention: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
  blocked: 'border-red-500/20 bg-red-500/10 text-red-200',
};

export { buildDistributionPreflightItems };

export function DistributePreflightChecklist({
  title = 'Preflight checklist',
  items,
}: DistributePreflightChecklistProps) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Review the blockers and attention items before handing the payload to publish.
        </p>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[var(--color-text)]">{item.label}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{item.detail}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${STATUS_TONE[item.status]}`}>
                {STATUS_LABELS[item.status]}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
