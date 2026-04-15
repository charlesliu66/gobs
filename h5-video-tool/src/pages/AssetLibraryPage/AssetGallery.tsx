import { useState, useEffect, useRef, useCallback } from 'react';
import { listAssets, searchAssets } from '../../api/assetLibraryApi';
import type { LibraryAsset } from '../../api/assetLibraryApi';
import { AssetCard } from './AssetCard';
import { toast } from '../../components/Toast';

const PAGE_SIZE = 24;

const FILTER_DEFS = [
  { key: 'ratio', label: '比例', options: ['', '16:9', '9:16', '1:1', 'other'], placeholder: '全部比例' },
  { key: 'type', label: '类型', options: ['', 'image', 'video'], placeholder: '全部类型' },
  { key: 'orientation', label: '方向', options: ['', 'landscape', 'portrait', 'square'], placeholder: '全部方向' },
  { key: 'quality', label: '质量', options: ['', 'hd', 'sd'], placeholder: '全部质量' },
] as const;

type FilterKey = typeof FILTER_DEFS[number]['key'];

interface Props {
  refreshKey?: number;
  onAssetClick: (asset: LibraryAsset) => void;
  onUseForGenerate: (asset: LibraryAsset) => void;
}

export function AssetGallery({ refreshKey, onAssetClick, onUseForGenerate }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Refs to hold latest query/filter values for use inside callbacks without stale closure
  const queryRef = useRef(query);
  const filtersRef = useRef(filters);
  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    const q = queryRef.current;
    const f = filtersRef.current;
    const isSearch = !!q || Object.values(f).some(Boolean);

    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: Record<string, string> = {
        pageSize: String(PAGE_SIZE),
        page: String(pageNum),
      };
      if (q) params.q = q;
      for (const [k, v] of Object.entries(f)) {
        if (v) params[k] = v;
      }

      const res = isSearch
        ? await searchAssets({ q, page: pageNum, pageSize: PAGE_SIZE, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Partial<Record<FilterKey, string>> })
        : await listAssets(params);

      if (reset) {
        setAssets(res.assets);
        setPage(2);
      } else {
        setAssets((prev) => [...prev, ...res.assets]);
        setPage(pageNum + 1);
      }
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load and refresh
  useEffect(() => {
    void fetchPage(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function handleSearch() {
    void fetchPage(1, true);
  }

  function handleFilterChange(key: FilterKey, value: string) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      filtersRef.current = next;
      return next;
    });
    // Auto-trigger search when filter changes
    setTimeout(() => fetchPage(1, true), 0);
  }

  function handleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasMore = assets.length < total;
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search + Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search input */}
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="搜索文件名或标签…"
            className="flex-1 min-w-0 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition"
          >
            搜索
          </button>
        </div>

        {/* Filter dropdowns */}
        <div className="flex gap-2 flex-wrap items-center">
          {FILTER_DEFS.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] ?? ''}
              onChange={(e) => handleFilterChange(f.key, e.target.value)}
              className={`bg-[var(--color-surface-elevated)] border rounded-lg px-3 py-2 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition cursor-pointer ${
                filters[f.key]
                  ? 'border-[var(--color-primary)]/60 bg-[var(--color-primary)]/5'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? f.placeholder : opt}
                </option>
              ))}
            </select>
          ))}

          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => {
                setFilters({});
                filtersRef.current = {};
                setTimeout(() => fetchPage(1, true), 0);
              }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition px-1"
            >
              清除 ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* Stats line */}
      {!loading && total > 0 && (
        <p className="text-xs text-[var(--color-text-subtle)]">
          共 <strong className="text-[var(--color-text)]">{total}</strong> 个素材
          {assets.length < total && `，已显示 ${assets.length} 个`}
          {selectedIds.size > 0 && (
            <span className="ml-2 text-[var(--color-primary)]">· 已选 {selectedIds.size} 个</span>
          )}
        </p>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-[var(--color-surface-hover)]" />
              <div className="p-2 space-y-1.5 bg-[var(--color-surface-elevated)]">
                <div className="h-2.5 bg-[var(--color-surface-hover)] rounded w-full" />
                <div className="h-2 bg-[var(--color-surface-hover)] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="text-7xl mb-5 opacity-50">📂</div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
            {query || activeFilters > 0 ? '没有找到匹配的素材' : '素材库还是空的'}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            {query || activeFilters > 0
              ? '尝试修改搜索关键词或清除筛选条件'
              : '点击右上角「上传素材」开始导入'}
          </p>
        </div>
      ) : (
        <>
          {/* Card grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedIds.has(asset.id)}
                onSelect={handleSelect}
                onClick={onAssetClick}
                onUseForGenerate={onUseForGenerate}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-6 pb-2">
              <button
                type="button"
                onClick={() => void fetchPage(page, false)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-8 py-2.5 border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] rounded-xl hover:text-[var(--color-text)] hover:border-[var(--color-border-focus)]/60 disabled:opacity-60 transition"
              >
                {loadingMore && (
                  <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                加载更多（还有 {total - assets.length} 个）
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
