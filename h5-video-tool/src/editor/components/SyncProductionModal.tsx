import { useCallback, useEffect, useState } from 'react';
import {
  syncProductionCheck,
  applySyncReplacements,
  type SyncDiffItem,
  type ApplySyncReplacement,
} from '../../api/editor';
import { toast } from '../../components/Toast';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { pickUiText } from '../../i18n/uiText.ts';

interface SyncProductionModalProps {
  editorProjectId: string;
  onSynced: () => void;
  onClose: () => void;
}

export function SyncProductionModal({ editorProjectId, onSynced, onClose }: SyncProductionModalProps) {
  const { uiLocale } = useLocale();
  const uiText = <T,>(zh: T, en: T) => pickUiText(uiLocale, zh, en);
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
        const updatedShots = new Set(res.diffs.filter((d) => d.hasUpdate).map((d) => d.shotIndex));
        setSelected(updatedShots);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : uiText('同步检查失败', 'Failed to check sync updates'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editorProjectId, uiLocale]);

  const updatedCount = diffs.filter((d) => d.hasUpdate).length;

  const handleApply = useCallback(async () => {
    if (selected.size === 0) {
      onClose();
      return;
    }
    setApplying(true);
    try {
      const replacements: ApplySyncReplacement[] = diffs
        .filter((d) => d.hasUpdate && selected.has(d.shotIndex))
        .map((d) => ({
          shotIndex: d.shotIndex,
          newVersionId: d.latestVersionId,
        }));
      await applySyncReplacements(editorProjectId, replacements);
      toast.success(uiText(`已同步 ${replacements.length} 个分镜`, `Synced ${replacements.length} shots`));
      onSynced();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : uiText('同步失败', 'Sync failed'));
    } finally {
      setApplying(false);
    }
  }, [diffs, selected, editorProjectId, onSynced, onClose, uiLocale]);

  const toggleShot = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(diffs.filter((d) => d.hasUpdate).map((d) => d.shotIndex)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !applying) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-[480px] max-w-[92vw] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl">
        <div className="shrink-0 px-6 pb-3 pt-5">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            {uiText('🔄 同步制片更新', '🔄 Sync production updates')}
          </h3>
          {productionTitle && (
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              {uiText(`来源：「${productionTitle}」`, `Source: “${productionTitle}”`)}
            </p>
          )}
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-[var(--color-text-muted)]">
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)]" />
              {uiText('正在对比版本…', 'Comparing versions…')}
            </div>
          ) : error ? (
            <div className="py-6 text-center text-xs text-red-400">{error}</div>
          ) : updatedCount === 0 ? (
            <div className="py-10 text-center">
              <span className="text-2xl">✅</span>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {uiText('所有分镜已是最新版本', 'All storyboard shots are already up to date')}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {diffs.map((d) => (
                <label
                  key={d.shotIndex}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
                    d.hasUpdate
                      ? 'cursor-pointer hover:bg-[var(--color-surface-hover)]'
                      : 'opacity-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(d.shotIndex)}
                    disabled={!d.hasUpdate}
                    onChange={() => toggleShot(d.shotIndex)}
                    className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                  />
                  <span className="flex-1 text-xs text-[var(--color-text)]">
                    {uiText(`镜 ${d.shotIndex}`, `Shot ${d.shotIndex}`)}
                  </span>
                  {d.hasUpdate ? (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      {uiText('有新版本', 'New version')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {uiText('无变化', 'No change')}
                    </span>
                  )}
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {d.latestDurationSec.toFixed(1)}s
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
                {uiText(`全选 (${updatedCount})`, `Select all (${updatedCount})`)}
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
              {updatedCount === 0 ? uiText('关闭', 'Close') : uiText('跳过', 'Skip')}
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
                    {uiText('替换中…', 'Replacing…')}
                  </>
                ) : (
                  uiText(`替换 ${selected.size} 个分镜`, `Replace ${selected.size} shots`)
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
