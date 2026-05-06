import { useCallback, useEffect, useState } from 'react';
import {
  applySyncReplacements,
  syncProductionCheck,
  type ApplySyncReplacement,
  type SyncDiffItem,
} from '../../api/editor';
import { toast } from '../../components/Toast';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage } from '../../i18n/locale.ts';

interface SyncProductionModalProps {
  editorProjectId: string;
  onSynced: () => void;
  onClose: () => void;
}

export function SyncProductionModal({ editorProjectId, onSynced, onClose }: SyncProductionModalProps) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<SyncDiffItem[]>([]);
  const [productionTitle, setProductionTitle] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await syncProductionCheck(editorProjectId);
        if (cancelled) return;
        setDiffs(res.diffs);
        setProductionTitle(res.productionTitle);
        setSelected(new Set(res.diffs.filter((diff) => diff.hasUpdate).map((diff) => diff.shotIndex)));
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('syncProductionModal.syncCheckFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editorProjectId, t]);

  const updatedCount = diffs.filter((diff) => diff.hasUpdate).length;

  const handleApply = useCallback(async () => {
    if (selected.size === 0) {
      onClose();
      return;
    }
    setApplying(true);
    try {
      const replacements: ApplySyncReplacement[] = diffs
        .filter((diff) => diff.hasUpdate && selected.has(diff.shotIndex))
        .map((diff) => ({
          shotIndex: diff.shotIndex,
          newVersionId: diff.latestVersionId,
        }));
      await applySyncReplacements(editorProjectId, replacements);
      toast.success(formatMessage(t('syncProductionModal.syncedShots'), { count: replacements.length }));
      onSynced();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('syncProductionModal.syncFailed'));
    } finally {
      setApplying(false);
    }
  }, [diffs, editorProjectId, onClose, onSynced, selected, t]);

  const toggleShot = (shotIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(shotIndex)) next.delete(shotIndex);
      else next.add(shotIndex);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(diffs.filter((diff) => diff.hasUpdate).map((diff) => diff.shotIndex)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget && !applying) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-[480px] max-w-[92vw] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl">
        <div className="shrink-0 px-6 pb-3 pt-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {t('syncProductionModal.title')}
          </h3>
          {productionTitle && (
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {formatMessage(t('syncProductionModal.source'), { title: productionTitle })}
            </p>
          )}
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-[var(--color-text-muted)]">
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
              {t('syncProductionModal.comparing')}
            </div>
          ) : error ? (
            <div className="py-6 text-center text-xs text-red-400">{error}</div>
          ) : updatedCount === 0 ? (
            <div className="py-10 text-center">
              <span className="text-2xl">OK</span>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {t('syncProductionModal.allUpToDate')}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {diffs.map((diff) => (
                <label
                  key={diff.shotIndex}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                    diff.hasUpdate
                      ? 'cursor-pointer hover:bg-[var(--color-surface-hover)]'
                      : 'opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(diff.shotIndex)}
                    disabled={!diff.hasUpdate}
                    onChange={() => toggleShot(diff.shotIndex)}
                    className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                  />
                  <span className="flex-1 text-xs text-[var(--color-text)]">
                    {formatMessage(t('syncProductionModal.shotLabel'), { shotIndex: diff.shotIndex })}
                  </span>
                  {diff.hasUpdate ? (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      {t('syncProductionModal.newVersion')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {t('syncProductionModal.noChange')}
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {diff.latestDurationSec.toFixed(1)}s
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="flex shrink-0 items-center justify-between px-6 py-3">
          <div className="text-[10px] text-[var(--color-text-muted)]">
            {updatedCount > 0 && !loading && (
              <button
                type="button"
                onClick={selectAll}
                className="underline hover:text-[var(--color-text)]"
              >
                {formatMessage(t('syncProductionModal.selectAll'), { count: updatedCount })}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="rounded-lg border border-[var(--color-border)] px-4 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-40"
            >
              {updatedCount === 0 ? t('common.close') : t('syncProductionModal.skip')}
            </button>
            {updatedCount > 0 && !loading && (
              <button
                type="button"
                onClick={() => void handleApply()}
                disabled={applying || selected.size === 0}
                className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40"
              >
                {applying ? (
                  <>
                    <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t('syncProductionModal.replacing')}
                  </>
                ) : (
                  formatMessage(t('syncProductionModal.replaceShots'), { count: selected.size })
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
