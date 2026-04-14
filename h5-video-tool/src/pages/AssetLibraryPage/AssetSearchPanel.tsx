/**
 * TASK-C: AssetSearchPanel — 搜索 + 6 维筛选 + 卡片网格
 * AC-C2: 6 维筛选（ratio / type / orientation / duration_range / quality / purpose）
 * AC-C3: "用于生成"按钮跳转 /studio?assetId=xxx
 */
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAssets } from '../../api/assetLibraryApi';
import type { LibraryAsset, SearchParams } from '../../api/assetLibraryApi';
import { toast } from '../../components/Toast';

// 6 个筛选维度
const FILTER_DEFS = [
  {
    key: 'ratio',
    label: '比例',
    options: ['', '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    placeholder: '全部比例',
  },
  {
    key: 'type',
    label: '类型',
    options: ['', 'image', 'video', 'gif'],
    placeholder: '全部类型',
  },
  {
    key: 'orientation',
    label: '方向',
    options: ['', 'landscape', 'portrait', 'square'],
    placeholder: '全部方向',
  },
  {
    key: 'duration_range',
    label: '时长',
    options: ['', '0-5s', '5-15s', '15-30s', '30s+'],
    placeholder: '全部时长',
  },
  {
    key: 'quality',
    label: '质量',
    options: ['', 'high', 'medium', 'low'],
    placeholder: '全部质量',
  },
  {
    key: 'purpose',
    label: '用途',
    options: ['', 'ad', 'organic', 'training', 'background'],
    placeholder: '全部用途',
  },
] as const;

type FilterKey = (typeof FILTER_DEFS)[number]['key'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function AssetCard({
  asset,
  onUseForGenerate,
}: {
  asset: LibraryAsset;
  onUseForGenerate: (asset: LibraryAsset) => void;
}) {
  const isVideo = asset.mime_type?.startsWith('video/');
  const confirmedTags = asset.tags.filter((t) => t.status === 'confirmed');

  return (
    <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:border-[var(--color-border-focus)]/60 transition-all group">
      {/* 缩略图占位 */}
      <div className="aspect-video bg-[var(--color-surface-hover)] flex items-center justify-center relative">
        <div className="text-3xl">{isVideo ? '🎬' : '🖼'}</div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
        {/* "用于生成"按钮 */}
        <button
          type="button"
          onClick={() => onUseForGenerate(asset)}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all px-2.5 py-1 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--color-primary-hover)] shadow-md"
        >
          用于生成
        </button>
      </div>

      {/* 信息 */}
      <div className="p-3 space-y-2">
        <div className="text-xs font-semibold text-[var(--color-text)] truncate" title={asset.filename}>
          {asset.filename}
        </div>
        <div className="text-[11px] text-[var(--color-text-subtle)]">{formatBytes(asset.size)}</div>

        {/* 标签 chips */}
        {confirmedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {confirmedTags.slice(0, 4).map((t, i) => (
              <span
                key={i}
                className="text-[10px] bg-[var(--color-primary)]/12 text-[var(--color-primary)] rounded px-1.5 py-0.5"
              >
                {t.key}: {t.value}
              </span>
            ))}
            {confirmedTags.length > 4 && (
              <span className="text-[10px] text-[var(--color-text-subtle)]">+{confirmedTags.length - 4}</span>
            )}
          </div>
        )}

        {/* "用于生成"按钮（始终可见，方便移动端） */}
        <button
          type="button"
          onClick={() => onUseForGenerate(asset)}
          className="w-full py-1.5 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-xs font-medium hover:bg-[var(--color-primary)]/10 transition"
        >
          用于生成
        </button>
      </div>
    </div>
  );
}

export function AssetSearchPanel() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [results, setResults] = useState<LibraryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params: SearchParams = { q: query, pageSize: 40 };
      for (const [k, v] of Object.entries(filters)) {
        if (v) (params as Record<string, unknown>)[k] = v;
      }
      const res = await searchAssets(params);
      setResults(res.assets);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  function handleFilterChange(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleUseForGenerate(asset: LibraryAsset) {
    navigate(`/studio?assetId=${encodeURIComponent(asset.id)}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-1">素材检索</h2>
        <p className="text-sm text-[var(--color-text-muted)]">搜索关键词 + 多维筛选快速定位素材</p>
      </div>

      {/* 搜索框 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch(); }}
          placeholder="搜索关键词（文件名、标签…）"
          className="flex-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
        />
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={loading}
          className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition flex items-center gap-2"
        >
          {loading && (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          搜索
        </button>
      </div>

      {/* 6 维筛选器（AC-C2） */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {FILTER_DEFS.map((f) => (
          <div key={f.key}>
            <label className="block text-[10px] font-medium text-[var(--color-text-muted)] mb-1">{f.label}</label>
            <select
              value={filters[f.key] ?? ''}
              onChange={(e) => handleFilterChange(f.key, e.target.value)}
              className="w-full bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
            >
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === '' ? f.placeholder : opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* 结果统计 */}
      {searched && !loading && (
        <p className="text-sm text-[var(--color-text-muted)]">
          共 <strong className="text-[var(--color-text)]">{total}</strong> 个结果
          {query && <span>（关键词：{query}）</span>}
        </p>
      )}

      {/* 结果网格 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-[var(--color-surface-hover)]" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-[var(--color-surface-hover)] rounded" />
                <div className="h-2 bg-[var(--color-surface-hover)] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 && searched ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">没有找到素材</h3>
          <p className="text-sm text-[var(--color-text-muted)]">尝试修改关键词或筛选条件</p>
        </div>
      ) : !searched ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔎</div>
          <p className="text-sm text-[var(--color-text-muted)]">输入关键词或选择筛选条件后点击「搜索」</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUseForGenerate={handleUseForGenerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
