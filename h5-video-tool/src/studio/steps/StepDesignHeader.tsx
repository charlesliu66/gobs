import { RunningStatus } from '../../components/RunningStatus';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage } from '../../i18n/locale.ts';
import { StoryAssetFieldsFromOutline } from '../components/StoryAssetFieldsFromOutline';
import type { DesignAssetStatusCounts } from '../designAssetStatus';
import type { StoryArcLayer } from '../productionTypes';

type L2Tab = 'characters' | 'scenes' | 'props' | 'checklist';

type BatchAssetGenState = {
  current: number;
  total: number;
  success: number;
  failed: number;
  startedAt: number;
  currentLabel?: string;
};

type BatchAssetSummary = {
  total: number;
  success: number;
  failed: number;
  cancelled?: boolean;
};

type ReadinessSummary = {
  characters: DesignAssetStatusCounts;
  scenes: DesignAssetStatusCounts;
  props: DesignAssetStatusCounts;
  missingTotal: number;
};

function estimateBatchMinutes(total: number): number {
  return Math.max(1, Math.round((total * 25) / 60));
}

function readinessTone(counts: DesignAssetStatusCounts): string {
  if (counts.missing > 0 || counts.failed > 0) return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  if (counts.review > 0 || counts.generating > 0) return 'border-sky-500/30 bg-sky-500/10 text-sky-100';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
}

function readinessDetail(
  counts: DesignAssetStatusCounts,
  readyLabel: string,
  attentionLabel: string,
  progressLabel: string,
): string {
  if (counts.total === 0) return `0/0 ${readyLabel}`;
  if (counts.missing > 0 || counts.failed > 0) {
    const pending = counts.missing + counts.failed;
    return `${counts.ready}/${counts.total} ${readyLabel} · ${pending} ${attentionLabel}`;
  }
  if (counts.review > 0 || counts.generating > 0) {
    const inFlight = counts.review + counts.generating;
    return `${counts.ready}/${counts.total} ${readyLabel} · ${inFlight} ${progressLabel}`;
  }
  return `${counts.ready}/${counts.total} ${readyLabel}`;
}

export function StepDesignHeader({
  story,
  patchStory,
  onSyncAssetsFromStory,
  l2Tab,
  onL2TabChange,
  characterCount,
  sceneCount,
  propCount,
  readinessSummary,
  batchAssetGen,
  batchAssetSummary,
  onGenerateMissingAssets,
  onCancelBatch,
  failedTaskCount,
  onRetryFailed,
  onDismissBatchSummary,
  onAddManualCharacter,
  onToggleLibraryImport,
  styleRefSummary,
  styleRefImageDataUrl,
}: {
  story: StoryArcLayer | null;
  patchStory: (fn: (s: StoryArcLayer) => StoryArcLayer) => void;
  onSyncAssetsFromStory: () => void;
  l2Tab: L2Tab;
  onL2TabChange: (tab: L2Tab) => void;
  characterCount: number;
  sceneCount: number;
  propCount: number;
  readinessSummary: ReadinessSummary;
  batchAssetGen: BatchAssetGenState | null;
  batchAssetSummary: BatchAssetSummary | null;
  onGenerateMissingAssets: () => void | Promise<void>;
  onCancelBatch: () => void;
  failedTaskCount: number;
  onRetryFailed: () => void;
  onDismissBatchSummary: () => void;
  onAddManualCharacter: () => void;
  onToggleLibraryImport: () => void;
  styleRefSummary: string;
  styleRefImageDataUrl?: string;
}) {
  const { t } = useLocale();
  const tx = (path: string, values?: Record<string, string | number>) => formatMessage(t(path), values);
  const styleHint = styleRefSummary.trim();

  return (
    <>
      <details className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="text-[var(--color-text-muted)]">+</span>
            {t('productionWizard.designHeader.storyElementChecklist')}
          </span>
        </summary>
        <div className="space-y-4 border-t border-[var(--color-border)] px-4 py-4">
          <div className="rounded-xl border border-[var(--color-border)]/80 bg-[var(--color-surface)] p-4">
            <h4 className="text-xs font-semibold text-[var(--color-text)]">{t('productionWizard.designHeader.keyAssets')}</h4>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {t('productionWizard.designHeader.keyAssetsHint')}
            </p>
            <button
              type="button"
              onClick={onSyncAssetsFromStory}
              className="mt-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            >
              {t('productionWizard.designHeader.syncAssetsFromOutline')}
            </button>
            <p className="mt-2 text-[10px] text-[var(--color-text-muted)]">
              {t('productionWizard.designHeader.syncAssetsHint')}
            </p>
          </div>
          {story ? <StoryAssetFieldsFromOutline story={story} patchStory={patchStory} /> : null}
        </div>
      </details>

      <div className="border-b border-[var(--color-border)] px-4 pt-2 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 gap-6 sm:gap-10">
            {(
              [
                { id: 'characters' as const, label: tx('productionWizard.designHeader.allCharacters', { count: characterCount }) },
                { id: 'scenes' as const, label: tx('productionWizard.designHeader.allScenes', { count: sceneCount }) },
                { id: 'props' as const, label: tx('productionWizard.designHeader.allProps', { count: propCount }) },
                { id: 'checklist' as const, label: t('productionWizard.designHeader.productionChecklist') },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => onL2TabChange(id)}
                className={`relative pb-3 text-sm font-semibold transition-colors ${
                  l2Tab === id
                    ? 'text-[var(--color-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:rounded-t after:bg-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-2">
            {l2Tab === 'characters' ? (
              <>
                <button
                  type="button"
                  onClick={onAddManualCharacter}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  {t('productionWizard.designHeader.addCharacter')}
                </button>
                <button
                  type="button"
                  onClick={onToggleLibraryImport}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  {t('productionWizard.designHeader.importFromCharacterLibrary')}
                </button>
              </>
            ) : null}

            {batchAssetGen ? (
              <>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {tx('productionWizard.designHeader.batchSuccessFailed', {
                    success: batchAssetGen.success,
                    failed: batchAssetGen.failed,
                  })}
                  {batchAssetGen.currentLabel ? ` · ${batchAssetGen.currentLabel}` : ''}
                </span>
                <RunningStatus
                  active={true}
                  label={tx('productionWizard.designHeader.generatingMissingImagesInline', {
                    current: batchAssetGen.current,
                    total: batchAssetGen.total,
                  })}
                  stallAfterSec={30}
                  scene="props-room"
                />
                <button
                  type="button"
                  onClick={onCancelBatch}
                  className="text-xs text-red-400 transition-colors hover:text-red-300"
                >
                  {t('common.cancel')}
                </button>
              </>
            ) : batchAssetSummary?.failed ? (
              <button
                type="button"
                onClick={onRetryFailed}
                className="text-xs text-yellow-400 transition-colors hover:text-yellow-300"
              >
                {tx('productionWizard.designHeader.retryFailedItemsWithCount', { count: batchAssetSummary.failed })}
              </button>
            ) : batchAssetSummary === null && failedTaskCount > 0 ? (
              <button
                type="button"
                onClick={onRetryFailed}
                className="text-xs text-yellow-400 transition-colors hover:text-yellow-300"
              >
                {tx('productionWizard.designHeader.retryFailedItemsWithCount', { count: failedTaskCount })}
              </button>
            ) : null}
          </div>
        </div>

        {(styleHint || styleRefImageDataUrl) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)]/70 py-3">
            <span className="rounded-full border border-[var(--color-border)]/70 px-2 py-1 text-[10px] font-medium text-[var(--color-text-muted)]">
              {t('productionWizard.designHeader.styleAnchor')}
            </span>
            {styleRefImageDataUrl ? (
              <img
                src={styleRefImageDataUrl}
                alt=""
                className="h-8 w-8 rounded-md border border-[var(--color-border)] object-cover"
              />
            ) : null}
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-muted)]">
              {styleHint || t('productionWizard.designHeader.styleReferenceUploaded')}
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border)]/70 py-3">
          {[
            {
              label: t('productionWizard.designHeader.readinessCharacters'),
              counts: readinessSummary.characters,
              readyLabel: t('productionWizard.designHeader.readyPortrait'),
              attentionLabel: t('productionWizard.designHeader.needImages'),
              progressLabel: t('productionWizard.designHeader.inProgress'),
            },
            {
              label: t('productionWizard.designHeader.readinessScenes'),
              counts: readinessSummary.scenes,
              readyLabel: t('productionWizard.designHeader.readyImage'),
              attentionLabel: t('productionWizard.designHeader.needImages'),
              progressLabel: t('productionWizard.designHeader.inProgress'),
            },
            {
              label: t('productionWizard.designHeader.readinessProps'),
              counts: readinessSummary.props,
              readyLabel: t('productionWizard.designHeader.readyImage'),
              attentionLabel: t('productionWizard.designHeader.needImages'),
              progressLabel: t('productionWizard.designHeader.inProgress'),
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${readinessTone(item.counts)}`}
            >
              <span className="font-semibold text-white/95">{item.label}</span>
              <span className="text-white/80">
                {readinessDetail(item.counts, item.readyLabel, item.attentionLabel, item.progressLabel)}
              </span>
            </div>
          ))}

          {l2Tab !== 'checklist' && readinessSummary.missingTotal > 0 ? (
            <button
              type="button"
              disabled={batchAssetGen !== null}
              onClick={() => void onGenerateMissingAssets()}
              className="ml-auto rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/25 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {batchAssetGen
                ? tx('productionWizard.designHeader.generatingButton', {
                  current: batchAssetGen.current,
                  total: batchAssetGen.total,
                })
                : tx('productionWizard.designHeader.generateMissingButton', {
                  count: readinessSummary.missingTotal,
                })}
            </button>
          ) : null}
        </div>

        {batchAssetGen && (
          <div className="pb-3 text-[11px] text-[var(--color-text-muted)]">
            {tx('productionWizard.designHeader.estimatedBatchMinutes', {
              minutes: estimateBatchMinutes(batchAssetGen.total),
              count: batchAssetGen.total,
            })}
          </div>
        )}

        {batchAssetSummary && (
          <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {batchAssetSummary.failed > 0
                    ? t('productionWizard.designHeader.batchFinishedWithFailures')
                    : batchAssetSummary.cancelled
                      ? t('productionWizard.designHeader.batchCancelled')
                      : t('productionWizard.designHeader.batchFinished')}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {tx('productionWizard.designHeader.batchSummary', {
                    total: batchAssetSummary.total,
                    success: batchAssetSummary.success,
                    failed: batchAssetSummary.failed,
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {batchAssetSummary.failed > 0 ? (
                  <button
                    type="button"
                    onClick={onRetryFailed}
                    className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-200 hover:bg-yellow-500/20"
                  >
                    {t('productionWizard.designHeader.retryFailedItems')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onDismissBatchSummary}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                >
                  {t('productionWizard.designHeader.dismiss')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
