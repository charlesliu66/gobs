import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAssets, autoOrganize } from '../../api/assetLibraryApi';
import type { LibraryAsset, AutoOrganizeResult } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { AssetGallery } from './AssetGallery';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import { AssetUploadSheet } from './AssetUploadSheet';
import { AssetReviewQueue } from './AssetReviewQueue';
import { toast } from '../../components/Toast';

export function AssetLibraryPage() {
  const navigate = useNavigate();
  const { uiLocale } = useLocale();
  const isEnglish = uiLocale === 'en';
  const text = isEnglish
    ? {
        title: 'Asset Library',
        count: (value: number) => `${value} assets`,
        pendingCount: (value: number) => `${value} pending tags`,
        autoOrganize: 'AI Organize',
        autoOrganizing: 'Organizing...',
        uploadAssets: 'Upload Assets',
        pendingBanner: (value: number) =>
          `${value} AI tags still need review so search and reuse stay accurate.`,
        reviewNow: 'Review Now',
        reviewTitle: 'Pending AI Tags',
        close: 'Close',
        autoResultCreated: (value: number) => `${value} folders created`,
        autoResultMoved: (value: number) => `${value} assets organized`,
        autoResultTagged: (value: number) => `${value} assets tagged`,
        autoResultUncategorized: (value: number) => `${value} still uncategorized`,
        autoResultDone: 'Everything is already organized',
        autoOrganizeFailed: 'Organizing failed',
      }
    : {
        title: '素材中台',
        count: (value: number) => `${value} 个素材`,
        pendingCount: (value: number) => `${value} 个待确认标签`,
        autoOrganize: 'AI 一键整理',
        autoOrganizing: '整理中...',
        uploadAssets: '上传素材',
        pendingBanner: (value: number) => `还有 ${value} 个 AI 标签待确认，确认后检索和复用会更准确。`,
        reviewNow: '立即处理',
        reviewTitle: '待确认 AI 标签',
        close: '关闭',
        autoResultCreated: (value: number) => `新建 ${value} 个文件夹`,
        autoResultMoved: (value: number) => `整理 ${value} 个素材`,
        autoResultTagged: (value: number) => `标注 ${value} 个素材`,
        autoResultUncategorized: (value: number) => `${value} 个仍未分类`,
        autoResultDone: '所有素材已整理完成',
        autoOrganizeFailed: '整理失败',
      };

  const [galleryKey, setGalleryKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState<LibraryAsset | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [organizing, setOrganizing] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const [allRes, pendingRes] = await Promise.all([
        listAssets({ pageSize: '1' }),
        listAssets({ pageSize: '200' }),
      ]);
      let pendingCount = 0;
      for (const asset of pendingRes.assets) {
        pendingCount += (asset.tags ?? []).filter((tag) => tag.status === 'pending').length;
      }
      setStats({ total: allRes.total, pending: pendingCount });
    } catch {
      // stats are supplementary
    }
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats, galleryKey]);

  function handleImportComplete() {
    setUploadOpen(false);
    setGalleryKey((value) => value + 1);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function handleReviewClose() {
    setReviewOpen(false);
    setGalleryKey((value) => value + 1);
  }

  function handleUseForGenerate(asset: LibraryAsset) {
    navigate(`/studio?assetId=${encodeURIComponent(asset.id)}`);
  }

  async function handleAutoOrganize() {
    setOrganizing(true);
    try {
      const result: AutoOrganizeResult = await autoOrganize();
      const parts: string[] = [];
      if (result.created_folders.length > 0) parts.push(text.autoResultCreated(result.created_folders.length));
      if (result.moved_count > 0) parts.push(text.autoResultMoved(result.moved_count));
      if (result.tagged_count > 0) parts.push(text.autoResultTagged(result.tagged_count));
      if (result.still_uncategorized > 0) parts.push(text.autoResultUncategorized(result.still_uncategorized));
      toast.success(parts.length > 0 ? parts.join(isEnglish ? ', ' : '，') : text.autoResultDone);
      setGalleryKey((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.autoOrganizeFailed);
    } finally {
      setOrganizing(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{text.title}</h1>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>{text.count(stats.total)}</span>
            {stats.pending > 0 && (
              <>
                <span className="opacity-30">/</span>
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="text-orange-500 transition hover:text-orange-400 hover:underline underline-offset-2"
                >
                  {text.pendingCount(stats.pending)}
                </button>
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={organizing}
            onClick={() => void handleAutoOrganize()}
            className="rounded-xl border-2 border-[var(--color-primary)] px-4 py-2.5 font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)]/10 disabled:opacity-60"
          >
            {organizing ? text.autoOrganizing : text.autoOrganize}
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-hover)]"
          >
            {text.uploadAssets}
          </button>
        </div>
      </div>

      {stats.pending > 0 && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-orange-500/20 bg-orange-500/8 px-5 py-3">
          <p className="text-sm text-orange-400">{text.pendingBanner(stats.pending)}</p>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="ml-4 whitespace-nowrap text-sm font-medium text-orange-500 transition hover:text-orange-400"
          >
            {text.reviewNow}
          </button>
        </div>
      )}

      <AssetGallery
        refreshKey={galleryKey}
        onAssetClick={setActiveAsset}
        onUseForGenerate={handleUseForGenerate}
      />

      <AssetDetailDrawer asset={activeAsset} onClose={() => setActiveAsset(null)} />

      <AssetUploadSheet open={uploadOpen} onClose={() => setUploadOpen(false)} onComplete={handleImportComplete} />

      {reviewOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={handleReviewClose} />
          <div className="fixed bottom-0 right-0 top-0 z-50 flex w-[600px] max-w-[95vw] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <h3 className="font-bold text-[var(--color-text)]">{text.reviewTitle}</h3>
              <button
                type="button"
                onClick={handleReviewClose}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-xl leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)]"
                aria-label={text.close}
              >
                x
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
