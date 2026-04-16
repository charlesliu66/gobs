import { useState, useEffect, useRef, useCallback } from 'react';
import {
  listAssets, searchAssets, listFavorites, listRecent, getCategories,
  listFolders, createFolder, renameFolder, deleteFolder, moveAssetsToFolder,
} from '../../api/assetLibraryApi';
import type { LibraryAsset, CategoryCount, AssetFolder } from '../../api/assetLibraryApi';
import { AssetCard } from './AssetCard';
import { DriveBrowser } from './DriveBrowser';
import { toast } from '../../components/Toast';

const PAGE_SIZE = 24;

type ViewTab = 'recent' | 'favorites' | 'all' | 'drive';

const TAB_LABELS: Record<ViewTab, string> = {
  recent: '最近使用',
  favorites: '收藏',
  all: '全部素材',
  drive: '☁️ Google Drive',
};

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
  const [tab, setTab] = useState<ViewTab>('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<Record<FilterKey, string>>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const queryRef = useRef(query);
  const filtersRef = useRef(filters);
  const tabRef = useRef(tab);
  const categoryRef = useRef(activeCategory);
  const folderRef = useRef(activeFolder);
  const foldersRef = useRef(folders);
  useEffect(() => { queryRef.current = query; }, [query]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { categoryRef.current = activeCategory; }, [activeCategory]);
  useEffect(() => { folderRef.current = activeFolder; }, [activeFolder]);
  useEffect(() => { foldersRef.current = folders; }, [folders]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getCategories();
      setCategories(res.categories);
      setCategoryTotal(res.total);
    } catch { /* supplementary */ }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const res = await listFolders();
      setFolders(res.folders);
      foldersRef.current = res.folders;
      if (res.folders.length > 0 && tabRef.current === 'all' && !folderRef.current && !categoryRef.current && !queryRef.current) {
        void fetchPage(1, true);
      }
    } catch { /* supplementary */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setCreatingFolder(false);
      void loadFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败');
    }
  }

  async function handleRenameFolder(id: string) {
    if (!editingName.trim()) return;
    try {
      await renameFolder(id, editingName.trim());
      setEditingFolderId(null);
      setEditingName('');
      void loadFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '重命名失败');
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolder(id);
      if (activeFolder === id) setActiveFolder(null);
      void loadFolders();
      toast.success('文件夹已删除');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  }

  async function handleDropOnFolder(folderId: string, assetIds: string[]) {
    if (assetIds.length === 0) return;
    try {
      await moveAssetsToFolder(folderId, assetIds);
      toast.success(`已移动 ${assetIds.length} 个素材`);
      setSelectedIds(new Set());
      void fetchPage(1, true);
      void loadFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '移动失败');
    }
  }

  function handleFolderDragOver(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetFolder(folderId);
  }

  function handleFolderDragLeave() {
    setDropTargetFolder(null);
  }

  function handleFolderDrop(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    setDropTargetFolder(null);
    const raw = e.dataTransfer.getData('application/x-asset-ids');
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      const allIds = new Set([...ids, ...selectedIds]);
      void handleDropOnFolder(folderId, Array.from(allIds));
    } catch { /* ignore */ }
  }

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    const currentTab = tabRef.current;
    const q = queryRef.current;
    const f = filtersRef.current;
    const cat = categoryRef.current;
    const fld = folderRef.current;

    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      let result: { assets: LibraryAsset[]; total: number };

      if (currentTab === 'recent') {
        result = await listRecent(50);
      } else if (currentTab === 'favorites') {
        result = await listFavorites({ page: pageNum, pageSize: PAGE_SIZE });
      } else {
        const isSearch = !!q || Object.values(f).some(Boolean);
        const params: Record<string, string> = {
          pageSize: String(PAGE_SIZE),
          page: String(pageNum),
        };
        if (q) params.q = q;
        if (cat) params.ai_category = cat;
        if (fld) {
          params.folder_id = fld;
        } else if (currentTab === 'all' && !q && !cat && !Object.values(f).some(Boolean) && foldersRef.current.length > 0) {
          params.folder_id = '__none__';
        }
        for (const [k, v] of Object.entries(f)) {
          if (v) params[k] = v;
        }

        const res = isSearch || cat
          ? await searchAssets({
              q, page: pageNum, pageSize: PAGE_SIZE,
              ai_category: cat || undefined,
              ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Partial<Record<FilterKey, string>>,
            })
          : await listAssets(params);
        result = { assets: res.assets, total: res.total };
      }

      if (reset) {
        setAssets(result.assets);
        setPage(2);
      } else {
        setAssets((prev) => [...prev, ...result.assets]);
        setPage(pageNum + 1);
      }
      setTotal(result.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void fetchPage(1, true);
    void loadCategories();
    void loadFolders();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  useEffect(() => {
    if (tab !== 'drive') void fetchPage(1, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeCategory, activeFolder]);

  function handleSearch() {
    void fetchPage(1, true);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    queryRef.current = value;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchPage(1, true), 300);
  }

  function handleFilterChange(key: FilterKey, value: string) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      filtersRef.current = next;
      return next;
    });
    setTimeout(() => fetchPage(1, true), 0);
  }

  function handleCategoryClick(cat: string | null) {
    setActiveCategory(cat);
  }

  function handleTabChange(newTab: ViewTab) {
    setTab(newTab);
    setActiveCategory(null);
    setQuery('');
    queryRef.current = '';
    setFilters({});
    filtersRef.current = {};
  }

  function handleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasMore = tab !== 'recent' && assets.length < total;
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex gap-5">
      {/* Sidebar (only in "all" tab) */}
      {tab === 'all' && (
        <div className="w-48 shrink-0 space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          {/* AI 分类 */}
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2 px-2">
              AI 分类
            </p>
            <button
              type="button"
              onClick={() => { handleCategoryClick(null); setActiveFolder(null); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                !activeCategory && !activeFolder
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              全部 <span className="text-xs opacity-60">({categoryTotal})</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => { handleCategoryClick(cat.category); setActiveFolder(null); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeCategory === cat.category
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {cat.category} <span className="text-xs opacity-60">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* 自定义文件夹 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                文件夹
              </p>
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] transition"
                title="新建文件夹"
              >
                +
              </button>
            </div>

            {creatingFolder && (
              <div className="flex gap-1 px-1 mb-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateFolder(); if (e.key === 'Escape') setCreatingFolder(false); }}
                  placeholder="文件夹名"
                  className="flex-1 min-w-0 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateFolder()}
                  className="text-xs text-[var(--color-primary)] px-1"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}
                  className="text-xs text-[var(--color-text-muted)] px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {folders.map((folder) => (
              <div
                key={folder.id}
                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onDragLeave={handleFolderDragLeave}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                className={`group/folder relative rounded-lg transition ${
                  dropTargetFolder === folder.id
                    ? 'ring-2 ring-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : ''
                }`}
              >
                {editingFolderId === folder.id ? (
                  <div className="flex gap-1 px-1 py-1">
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleRenameFolder(folder.id);
                        if (e.key === 'Escape') { setEditingFolderId(null); setEditingName(''); }
                      }}
                      className="flex-1 min-w-0 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <button type="button" onClick={() => void handleRenameFolder(folder.id)} className="text-xs text-[var(--color-primary)] px-1">✓</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setActiveFolder(folder.id); setActiveCategory(null); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${
                      activeFolder === folder.id
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    <span className="truncate flex-1">📁 {folder.name}</span>
                    <span className="text-xs opacity-60 shrink-0">{folder.asset_count ?? 0}</span>
                    {/* Context menu on hover */}
                    <span
                      className="opacity-0 group-hover/folder:opacity-100 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        const action = window.prompt(`文件夹「${folder.name}」\n输入新名称重命名，或输入 delete 删除：`);
                        if (action === 'delete') void handleDeleteFolder(folder.id);
                        else if (action && action.trim()) { setEditingFolderId(folder.id); setEditingName(action.trim()); setTimeout(() => void handleRenameFolder(folder.id), 0); }
                      }}
                    >
                      ···
                    </span>
                  </button>
                )}
              </div>
            ))}

            {folders.length === 0 && !creatingFolder && (
              <p className="text-xs text-[var(--color-text-subtle)] px-3 py-2">
                拖拽素材到文件夹整理
              </p>
            )}
          </div>

          {/* 选中素材操作栏 */}
          {selectedIds.size > 0 && folders.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-3 space-y-1">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 px-2">
                移动已选 ({selectedIds.size})
              </p>
              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => void handleDropOnFolder(f.id, Array.from(selectedIds))}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] transition truncate"
                >
                  → 📁 {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--color-border)] pb-px">
          {(Object.keys(TAB_LABELS) as ViewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTabChange(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                tab === t
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {TAB_LABELS[t]}
              {tab === t && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-primary)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Drive tab renders its own browser */}
        {tab === 'drive' && <DriveBrowser />}

        {/* Search + Filters (only for "all" tab) */}
        {tab === 'all' && (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="搜索文件名、AI 描述…"
                className="flex-1 min-w-0 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-primary)] transition"
              />
            </div>

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

              {(activeFilters > 0 || activeCategory) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters({});
                    filtersRef.current = {};
                    setActiveCategory(null);
                    setTimeout(() => fetchPage(1, true), 0);
                  }}
                  className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition px-1"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats (not for drive tab) */}
        {tab !== 'drive' && !loading && total > 0 && (
          <p className="text-xs text-[var(--color-text-subtle)]">
            共 <strong className="text-[var(--color-text)]">{total}</strong> 个素材
            {assets.length < total && tab !== 'recent' && `，已显示 ${assets.length} 个`}
            {selectedIds.size > 0 && (
              <span className="ml-2 text-[var(--color-primary)]">· 已选 {selectedIds.size} 个</span>
            )}
          </p>
        )}

        {/* Loading skeleton (not for drive tab) */}
        {tab !== 'drive' && loading ? (
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
        ) : tab !== 'drive' && assets.length === 0 && folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="text-7xl mb-5 opacity-50">
              {tab === 'recent' ? '🕒' : tab === 'favorites' ? '⭐' : '📂'}
            </div>
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              {tab === 'recent' ? '暂无使用记录'
                : tab === 'favorites' ? '还没有收藏的素材'
                : query || activeFilters > 0 || activeCategory ? '没有找到匹配的素材'
                : '素材库还是空的'}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {tab === 'recent' ? '在制片或剪辑中使用素材后，这里会显示最近使用'
                : tab === 'favorites' ? '点击素材上的星标来收藏'
                : query || activeFilters > 0 || activeCategory ? '尝试修改搜索关键词或清除筛选条件'
                : '点击右上角「上传素材」开始导入'}
            </p>
          </div>
        ) : tab !== 'drive' ? (
          <>
            {/* Folder grid view: when on "all" tab with no active filter/folder/search, show folders first */}
            {tab === 'all' && !activeFolder && !activeCategory && !query && activeFilters === 0 && folders.length > 0 && (
              <div className="space-y-3 mb-6">
                <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
                  文件夹
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => { setActiveFolder(folder.id); setActiveCategory(null); }}
                      onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                      onDragLeave={handleFolderDragLeave}
                      onDrop={(e) => handleFolderDrop(e, folder.id)}
                      className={`group cursor-pointer rounded-xl border transition-all ${
                        dropTargetFolder === folder.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/40 hover:shadow-md'
                      }`}
                    >
                      <div className="aspect-square flex flex-col items-center justify-center p-4">
                        <span className="text-5xl mb-3 opacity-80 group-hover:scale-110 transition-transform">📁</span>
                        <p className="text-sm font-medium text-[var(--color-text)] text-center truncate w-full px-1">
                          {folder.name}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
                          {folder.asset_count ?? 0} 个素材
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {assets.length > 0 && (
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider pt-4">
                    未整理素材
                  </p>
                )}
              </div>
            )}

            {/* Back button when inside a folder */}
            {activeFolder && (
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setActiveFolder(null)}
                  className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                >
                  ← 返回全部
                </button>
                <span className="text-xs text-[var(--color-text-muted)]">
                  / {folders.find(f => f.id === activeFolder)?.name}
                </span>
              </div>
            )}

            {assets.length > 0 && (
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
            )}

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
        ) : null}
      </div>
    </div>
  );
}
