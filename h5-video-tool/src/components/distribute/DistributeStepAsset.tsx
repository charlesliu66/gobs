import React, { type ReactNode } from 'react';

void React;

export type DistributeStepAssetSource = 'package' | 'current' | 'local' | 'output';

export interface DistributeStepAssetOption {
  id: string;
  source: DistributeStepAssetSource;
  title: string;
  subtitle?: string;
  prompt?: string;
  videoUrl?: string;
  taskId?: string | null;
}

interface DistributeStepAssetLabels {
  step: string;
  title: string;
  subtitle: string;
  loading: string;
  noVideo: string;
  selected: string;
  previewTitle: string;
  previewUnavailable: string;
  promptSeed: string;
}

interface DistributeStepAssetProps {
  assets: DistributeStepAssetOption[];
  selectedAsset: DistributeStepAssetOption | null;
  selectedAssetId: string | null;
  loading: boolean;
  error: string | null;
  emptyAction: ReactNode;
  labels: DistributeStepAssetLabels;
  getAssetSourceLabel: (source: DistributeStepAssetSource) => string;
  onSelectAsset: (assetId: string) => void;
}

export function DistributeStepAsset({
  assets,
  selectedAsset,
  selectedAssetId,
  loading,
  error,
  emptyAction,
  labels,
  getAssetSourceLabel,
  onSelectAsset,
}: DistributeStepAssetProps) {
  return (
    <section className="mb-6 space-y-4 border-b border-[var(--color-border)] pb-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
          {labels.step}
        </span>
        <div>
          <h2 className="section-title">{labels.title}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">{labels.subtitle}</p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-[var(--color-text-muted)]">{labels.loading}</p>
      )}
      {error && (
        <p className="text-sm text-[var(--color-error)]">{error}</p>
      )}

      {assets.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="mb-4 text-[var(--color-text-muted)]">{labels.noVideo}</p>
          {emptyAction}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="space-y-2">
              {assets.map((asset) => {
                const isActive = selectedAssetId === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => onSelectAsset(asset.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? 'border-[var(--color-primary)] bg-[var(--color-surface-elevated)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[var(--color-surface)] px-2 py-0.5 text-[10px] uppercase text-[var(--color-text-muted)]">
                            {getAssetSourceLabel(asset.source)}
                          </span>
                          {asset.taskId && (
                            <span className="text-[10px] text-[var(--color-text-subtle)]">#{asset.taskId}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-[var(--color-text)]">{asset.title}</p>
                        {asset.subtitle && (
                          <p className="text-xs text-[var(--color-text-muted)]">{asset.subtitle}</p>
                        )}
                      </div>
                      {isActive && (
                        <span className="text-xs font-medium text-[var(--color-primary)]">{labels.selected}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <h3 className="text-sm font-medium text-[var(--color-text)]">{labels.previewTitle}</h3>
            {selectedAsset?.videoUrl ? (
              <div className="aspect-video overflow-hidden rounded-lg border border-[var(--color-border)] bg-black">
                <video src={selectedAsset.videoUrl} controls className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                {labels.previewUnavailable}
              </div>
            )}
            {selectedAsset?.prompt && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                  {labels.promptSeed}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{selectedAsset.prompt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
