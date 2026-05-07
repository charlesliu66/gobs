import type { CampaignKnowledgePack } from '../../api/campaignKnowledge';

type Copy = {
  title: string;
  subtitle: string;
  unsupportedTitle: string;
  unsupportedBody: string;
  emptyTitle: string;
  emptyBody: string;
  selectAll: string;
  clearSelection: string;
  refresh: string;
  packFacts: string;
  packHooks: string;
  packVisuals: string;
  selected: string;
  optional: string;
};

interface CampaignKnowledgeSelectorProps {
  brainName: string;
  supported: boolean;
  loading: boolean;
  error: string | null;
  selectedCountLabel: string;
  packs: CampaignKnowledgePack[];
  selectedPackIds: string[];
  copy: Copy;
  onTogglePack: (packId: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
}

export function CampaignKnowledgeSelector({
  brainName,
  supported,
  loading,
  error,
  selectedCountLabel,
  packs,
  selectedPackIds,
  copy,
  onTogglePack,
  onSelectAll,
  onClearSelection,
  onRefresh,
}: CampaignKnowledgeSelectorProps) {
  const selectedSet = new Set(selectedPackIds);

  return (
    <section className="rounded-3xl border border-[var(--color-border)]/55 bg-[var(--color-surface-elevated)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-[var(--color-text)]">{copy.title}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.subtitle}</p>
          <div className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
            {brainName}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
            {selectedCountLabel}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-full border border-[var(--color-border)]/70 px-3 py-1 text-xs text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]"
          >
            {copy.refresh}
          </button>
        </div>
      </div>

      {!supported ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)]/70 bg-[var(--color-surface)]/70 p-4">
          <div className="text-sm font-semibold text-[var(--color-text)]">{copy.unsupportedTitle}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.unsupportedBody}</p>
        </div>
      ) : null}

      {supported && packs.length === 0 && !loading ? (
        <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)]/70 bg-[var(--color-surface)]/70 p-4">
          <div className="text-sm font-semibold text-[var(--color-text)]">{copy.emptyTitle}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{copy.emptyBody}</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-4 text-sm text-[var(--color-text)]">
          {error}
        </div>
      ) : null}

      {supported && packs.length > 0 ? (
        <>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={onSelectAll} className="btn-secondary text-sm">
              {copy.selectAll}
            </button>
            <button type="button" onClick={onClearSelection} className="btn-secondary text-sm">
              {copy.clearSelection}
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {packs.map((pack) => {
              const isSelected = selectedSet.has(pack.packId);
              return (
                <button
                  key={pack.packId}
                  type="button"
                  onClick={() => onTogglePack(pack.packId)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_16px_40px_rgba(124,141,255,0.10)]'
                      : 'border-[var(--color-border)]/60 bg-[var(--color-surface)] hover:border-[var(--color-primary)]/35'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="chip">{formatPackType(pack.type)}</span>
                        <span className="text-base font-semibold text-[var(--color-text)]">{pack.title}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{pack.summary}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        isSelected
                          ? 'border-[var(--color-primary)]/35 bg-[var(--color-primary)]/12 text-[var(--color-primary)]'
                          : 'border-[var(--color-border)]/60 text-[var(--color-text-muted)]'
                      }`}
                    >
                      {isSelected ? copy.selected : copy.optional}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <SelectorMetric label={copy.packFacts} value={pack.facts.length} />
                    <SelectorMetric label={copy.packHooks} value={pack.hookSeeds.length} />
                    <SelectorMetric label={copy.packVisuals} value={pack.visualCues.length} />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

function SelectorMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)]/50 bg-[var(--color-surface-elevated)]/80 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-[var(--color-text)]">{value}</div>
    </div>
  );
}

function formatPackType(type: CampaignKnowledgePack['type']): string {
  return type.replace(/_/g, ' ');
}
