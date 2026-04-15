import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAssets } from '../../api/assetLibraryApi';
import type { LibraryAsset } from '../../api/assetLibraryApi';
import { AssetGallery } from './AssetGallery';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { AssetUploadSheet } from './AssetUploadSheet';
import { AssetReviewQueue } from './AssetReviewQueue';

export function AssetLibraryPage() {
  const navigate = useNavigate();
  const [galleryKey, setGalleryKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState<LibraryAsset | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0 });

  const refreshStats = useCallback(async () => {
    try {
      const [allRes, pendingRes] = await Promise.all([
        listAssets({ pageSize: '1' }),
        listAssets({ pageSize: '200' }),
      ]);
      let pendingCount = 0;
      for (const asset of pendingRes.assets) {
        pendingCount += (asset.tags ?? []).filter((t) => t.status === 'pending').length;
      }
      setStats({ total: allRes.total, pending: pendingCount });
    } catch { /* ignore — stats are supplementary */ }
  }, []);

  // Load stats on mount and after gallery refresh
  useEffect(() => { void refreshStats(); }, [refreshStats, galleryKey]);

  function handleImportComplete() {
    setUploadOpen(false);
    setGalleryKey((k) => k + 1);
  }

  function handleReviewClose() {
    setReviewOpen(false);
    setGalleryKey((k) => k + 1);
  }

  function handleUseForGenerate(asset: LibraryAsset) {
    navigate(`/studio?assetId=${encodeURIComponent(asset.id)}`);
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">素材中台</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5 flex items-center gap-2">
            <span>{stats.total} 个素材</span>
            {stats.pending > 0 && (
              <>
                <span className="opacity-30">·</span>
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="text-orange-500 hover:text-orange-400 transition underline-offset-2 hover:underline"
                >
                  ⚠ {stats.pending} 个待确认标签
                </button>
              </>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition shadow-sm shrink-0"
        >
          <span>📤</span>
          <span>上传素材</span>
        </button>
      </div>

      {/* ── Pending review banner ── */}
      {stats.pending > 0 && (
        <div className="flex items-center justify-between bg-orange-500/8 border border-orange-500/20 rounded-xl px-5 py-3 mb-5">
          <p className="text-sm text-orange-400">
            ⚠ 有 <strong>{stats.pending}</strong> 个 AI 标签需要确认，确认后可以更准确地检索素材
          </p>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="text-sm font-medium text-orange-500 hover:text-orange-400 transition whitespace-nowrap ml-4"
          >
            立即处理 →
          </button>
        </div>
      )}

      {/* ── Gallery ── */}
      <AssetGallery
        refreshKey={galleryKey}
        onAssetClick={setActiveAsset}
        onUseForGenerate={handleUseForGenerate}
      />

      {/* ── Detail drawer (right slide-in) ── */}
      <AssetDetailDrawer
        asset={activeAsset}
        onClose={() => setActiveAsset(null)}
      />

      {/* ── Upload sheet (bottom slide-up) ── */}
      <AssetUploadSheet
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onComplete={handleImportComplete}
      />

      {/* ── Review queue drawer (right slide-in) ── */}
      {reviewOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={handleReviewClose}
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-[600px] max-w-[95vw] bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <h3 className="font-bold text-[var(--color-text)] flex items-center gap-2">
                <span className="text-orange-500">⚠</span> 待确认 AI 标签
              </h3>
              <button
                type="button"
                onClick={handleReviewClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition text-xl leading-none"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <AssetReviewQueue />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AssetLibraryPage;
