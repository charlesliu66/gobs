import React from 'react';
import type { DistributionAsset } from './distributeSupport.ts';

void React;

interface DistributeAssetPickerLabels {
  selected: string;
  refresh: string;
  emptyTitle: string;
  emptyHint: string;
}

interface DistributeAssetPickerProps {
  title?: string;
  hint?: string;
  assets: DistributionAsset[];
  selectedAssetId?: string | null;
  loading?: boolean;
  onSelectAsset?: (asset: DistributionAsset) => void;
  onRefresh?: () => void;
  formatTime?: (timestamp: number) => string;
  labels?: Partial<DistributeAssetPickerLabels>;
}

const DEFAULT_LABELS: DistributeAssetPickerLabels = {
  selected: 'Selected',
  refresh: 'Refresh',
  emptyTitle: 'No publish-ready assets yet',
  emptyHint: 'Use a fresh Studio output, history asset, or recent server output to start distribution.',
};

function formatAssetTimestamp(timestamp: number, formatTime?: (timestamp: number) => string): string {
  if (!timestamp) return '';
  if (formatTime) return formatTime(timestamp);
  return new Date(timestamp).toLocaleString();
}

export function DistributeAssetPicker({
  title = 'Publish asset',
  hint,
  assets,
  selectedAssetId,
  loading = false,
  onSelectAsset,
  onRefresh,
  formatTime,
  labels,
}: DistributeAssetPickerProps) {
  const copy = { ...DEFAULT_LABELS, ...labels };

  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          {hint ? <p className="text-xs text-[var(--color-text-muted)]">{hint}</p> : null}
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
          >
            {copy.refresh}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading assets…</p>
      ) : assets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">{copy.emptyTitle}</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">{copy.emptyHint}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => {
            const isSelected = asset.id === selectedAssetId;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onSelectAsset?.(asset)}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface)] ring-2 ring-[var(--color-primary)]/20'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border-focus)]'
                }`}
              >
                <div className="aspect-video bg-black/80">
                  {asset.previewUrl ? (
                    <video
                      src={asset.previewUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-white/60">
                      Preview unavailable
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {asset.sourceLabel ? (
                      <span className="rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">
                        {asset.sourceLabel}
                      </span>
                    ) : null}
                    {isSelected ? (
                      <span className="rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-[10px] font-medium text-white">
                        {copy.selected}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{asset.title}</p>
                    {asset.subtitle ? (
                      <p className="mt-1 break-all text-xs text-[var(--color-text-muted)]">{asset.subtitle}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--color-text-subtle)]">
                    {asset.taskId ? <p>Task: {asset.taskId}</p> : null}
                    {asset.createdAt ? <p>{formatAssetTimestamp(asset.createdAt, formatTime)}</p> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
