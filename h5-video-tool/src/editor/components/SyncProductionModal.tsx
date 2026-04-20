import { useCallback, useEffect, useState } from 'react';
import {
  syncProductionCheck,
  applySyncReplacements,
  type SyncDiffItem,
  type ApplySyncReplacement,
} from '../../api/editor';
import { toast } from '../../components/Toast';

interface SyncProductionModalProps {
  editorProjectId: string;
  onSynced: () => void;
  onClose: () => void;
}

export function SyncProductionModal({ editorProjectId, onSynced, onClose }: SyncProductionModalProps) {
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
        setError(e instanceof Error ? e.message : '同步检查失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editorProjectId]);

  const updatedCount = diffs.filter((d) => d.hasUpdate).length;

  const handleApply = useCallback(async () => {
    if (selected.size === 0) { onClose(); return; }
    setApplying(true);
    try {
      const replacements: ApplySyncReplacement[] = diffs
        .filter((d) => d.hasUpdate && selected.has(d.shotIndex))
        .map((d) => ({
          shotIndex: d.shotIndex,
          newVersionId: d.latestVersionId,
        }));
      await applySyncReplacements(editorProjectId, replacements);
      toast.success(`已同步 ${replacements.length} 个分镜`);
      onSynced();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '同步失败');
    } finally {
      setApplying(false);
    }
  }, [diffs, selected, editorProjectId, onSynced, onClose]);

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
      onClick={(e) => { if (e.target === e.currentTarget && !applying) onClose(); }}
    >
      <div className="w-[480px] max-w-[92vw] max-h-[80vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-2xl">
        {/* Header */}
        <div className="shrink-0 px-6 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            🔄 同步制片更新
          </h3>
          {productionTitle && (
            <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
              来源：「{productionTitle}」
            </p>
          )}
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-xs text-[var(--color-text-muted)]">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] mr-2" />
              正在对比版本…
            </div>
          ) : error ? (
            <div className="py-6 text-center text-xs text-red-400">{error}</div>
          ) : updatedCount === 0 ? (
            <div className="py-10 text-center">
              <span className="text-2xl">✅</span>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">所有分镜已是最新版本</p>
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
                    className="accent-[var(--color-primary)] h-3.5 w-3.5"
                  />
                  <span className="flex-1 text-xs text-[var(--color-text)]">
                    镜 {d.shotIndex}
                  </span>
                  {d.hasUpdate ? (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      有新版本
                    </span>
                  ) : (
                    <span className="text-[10px] text-[var(--color-text-muted)]">无变化</span>
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

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3">
          <div className="text-[10px] text-[var(--color-text-muted)]">
            {updatedCount > 0 && !loading && (
              <button type="button" onClick={selectAll} className="underline hover:text-[var(--color-text)]">
                全选 ({updatedCount})
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
              {updatedCount === 0 ? '关闭' : '跳过'}
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
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white mr-1" />
                    替换中…
                  </>
                ) : (
                  `替换 ${selected.size} 个分镜`
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
