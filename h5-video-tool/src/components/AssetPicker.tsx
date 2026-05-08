/**
 * TASK-D: AssetPicker — 资产库弹窗选择器
 * 支持搜索、筛选、单选或多选资产，通过回调返回选中结果
 */
import { useState, useCallback, useEffect } from 'react';
import { listAssets, searchAssets } from '../api/assetLibraryApi';
import type { LibraryAsset } from '../api/assetLibraryApi';

interface AssetPickerProps {
  /** 是否允许多选（默认单选） */
  multi?: boolean;
  /** 只显示特定类型：'image' | 'video' | 'all'（默认 all） */
  filterType?: 'image' | 'video' | 'all';
  /** 初始搜索关键词 */
  initialQuery?: string;
  /** 初始选中的资产 ID */
  initialSelectedIds?: string[];
  /** 弹窗标题 */
  title?: string;
  /** 弹窗副标题 */
  subtitle?: string;
  /** 搜索框占位文案 */
  searchPlaceholder?: string;
  /** 确认按钮文案 */
  confirmLabel?: string;
  /** 选中完成回调 */
  onSelect: (assets: LibraryAsset[]) => void;
  /** 关闭弹窗 */
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function AssetPicker({
  multi = false,
  filterType = 'all',
  initialQuery = '',
  initialSelectedIds = [],
  title = '从资产库选择',
  subtitle,
  searchPlaceholder = '搜索关键词…',
  confirmLabel,
  onSelect,
  onClose,
}: AssetPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds));

  const loadAssets = useCallback(async (q: string) => {
    setLoading(true);
    try {
      let result;
      if (q.trim()) {
        result = await searchAssets({ q, pageSize: 50 });
      } else {
        result = await listAssets({ pageSize: '50' });
      }
      // 根据 filterType 过滤
      let items = result.assets as LibraryAsset[];
      if (filterType !== 'all') {
        items = items.filter((a) => {
          const mime = a.mimetype ?? a.mime_type ?? '';
          if (filterType === 'image') return mime.startsWith('image/');
          if (filterType === 'video') return mime.startsWith('video/');
          return true;
        });
      }
      setAssets(items);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    setQuery(initialQuery);
    void loadAssets(initialQuery);
  }, [initialQuery, loadAssets]);

  const handleSearch = useCallback(() => {
    void loadAssets(query);
  }, [query, loadAssets]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      if (!multi) {
        // 单选：若已选则取消，否则替换
        return prev.has(id) ? new Set() : new Set([id]);
      }
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [multi]);

  const handleConfirm = useCallback(() => {
    const selectedAssets = assets.filter((a) => selected.has(a.id));
    onSelect(selectedAssets);
    onClose();
  }, [assets, selected, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {subtitle ?? `${filterType === 'image' ? '仅显示图片' : filterType === 'video' ? '仅显示视频' : '全部类型'}${multi ? ' · 可多选' : ' · 单选'}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 搜索栏 */}
        <div className="flex gap-2 px-5 py-3 border-b border-[var(--color-border)] flex-shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder={searchPlaceholder}
            className="flex-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition"
          >
            搜索
          </button>
        </div>

        {/* 素材网格 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--color-text-muted)]">暂无素材，请先在「素材中台」导入</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {assets.map((asset) => {
                const isSelected = selected.has(asset.id);
                const mime = asset.mimetype ?? asset.mime_type ?? '';
                const isVideo = mime.startsWith('video/');
                const fileUrl = asset.file_url ?? '';
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggleSelect(asset.id)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                      isSelected
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30'
                        : 'border-[var(--color-border)] hover:border-[var(--color-border-focus)]/50'
                    }`}
                  >
                    {/* 缩略图 */}
                    <div className="aspect-video bg-[var(--color-surface-hover)] flex items-center justify-center relative">
                      {fileUrl ? (
                        isVideo ? (
                          <video
                            src={fileUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={fileUrl}
                            alt={asset.filename}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <span className="text-2xl">{isVideo ? '🎬' : '🖼'}</span>
                      )}
                      {/* 选中勾选标记 */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">✓</span>
                        </div>
                      )}
                    </div>
                    {/* 文件名 */}
                    <div className="p-2">
                      <p className="text-[11px] font-medium text-[var(--color-text)] truncate" title={asset.filename}>
                        {asset.filename}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)]">
                        {formatSize(asset.filesize ?? asset.size ?? 0)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--color-border)] flex-shrink-0">
          <p className="text-sm text-[var(--color-text-muted)]">
            已选 <span className="font-semibold text-[var(--color-primary)]">{selected.size}</span> 个
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg text-sm hover:text-[var(--color-text)] transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition"
            >
              {confirmLabel ?? `确认选择（${selected.size}）`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
