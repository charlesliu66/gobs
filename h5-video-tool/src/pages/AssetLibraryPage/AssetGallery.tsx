import { useState, useEffect, useRef, useCallback } from 'react';
import {
  listAssets,
  searchAssets,
  listFavorites,
  listRecent,
  getCategories,
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  moveAssetsToFolder,
  batchDeleteAssets,
} from '../../api/assetLibraryApi';
import type { LibraryAsset, CategoryCount, AssetFolder } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { AssetCard } from './AssetCard';
import { DriveBrowser } from './DriveBrowser';
import {
  localizeAssetCategory,
  localizeFilterOption,
  localizeGalleryTab,
  type GalleryFilterKey,
  type GalleryTab,
} from './localize.ts';
import { toast } from '../../components/Toast';

const PAGE_SIZE = 24;

const FILTER_DEFS: Array<{ key: GalleryFilterKey; options: string[] }> = [
  { key: 'ratio', options: ['', '16:9', '9:16', '1:1', 'other'] },
  { key: 'type', options: ['', 'image', 'video'] },
  { key: 'orientation', options: ['', 'landscape', 'portrait', 'square'] },
  { key: 'quality', options: ['', 'hd', 'sd'] },
];

interface Props {
  refreshKey?: number;
  onAssetClick: (asset: LibraryAsset) => void;
  onUseForGenerate: (asset: LibraryAsset) => void;
}

export function AssetGallery({ refreshKey, onAssetClick, onUseForGenerate }: Props) {
  const { uiLocale } = useLocale();
  const isEnglish = uiLocale === 'en';
  const text = isEnglish
    ? {
        aiCategories: 'AI Categories',
        folders: 'Folders',
        allCategories: 'All',
        newFolderName: 'Folder name',
        createFailed: 'Create failed',
        renameFailed: 'Rename failed',
        deleteFailed: 'Delete failed',
        folderDeleted: 'Folder deleted',
        moveFailed: 'Move failed',
        movedAssets: (count: number) => `Moved ${count} assets`,
        loadFailed: 'Load failed',
        newFolder: 'New Folder',
        folderActionPrompt: (name: string) =>
          `Folder "${name}"\nEnter a new name to rename it, or type delete to remove it.`,
        dragHint: 'Create folders to organize assets by project or type.',
        moveSelected: (count: number) => `Move selected (${count})`,
        tabsAll: 'All Assets',
        searchPlaceholder: 'Search filename or AI description...',
        allRatio: 'All Ratios',
        allType: 'All Types',
        allOrientation: 'All Orientations',
        allQuality: 'All Quality',
        ratio: 'Ratio',
        type: 'Type',
        orientation: 'Orientation',
        quality: 'Quality',
        clearFilters: 'Clear Filters',
        totalAssets: (count: number) => `${count} assets`,
        showingAssets: (shown: number) => `showing ${shown}`,
        selectedAssets: (count: number) => `${count} selected`,
        emptyRecentTitle: 'No recent usage yet',
        emptyFavoritesTitle: 'No favorite assets yet',
        emptySearchTitle: 'No matching assets found',
        emptyLibraryTitle: 'Your asset library is empty',
        emptyRecentHint: 'Assets used in production or editing will appear here.',
        emptyFavoritesHint: 'Click the star on an asset card to keep it here.',
        emptySearchHint: 'Try another keyword or clear some filters.',
        emptyLibraryHint: 'Use the upload button in the top-right corner to get started.',
        folderSection: 'Folders',
        uncategorizedSection: 'Unsorted Assets',
        assetCount: (count: number) => `${count} assets`,
        backToAll: 'Back to all',
        loadMore: (count: number) => `Load More (${count} left)`,
        selectedSummary: (count: number) => `${count} assets selected`,
        moveToFolder: 'Move to folder',
        deleteSelected: 'Delete',
        clearSelection: 'Clear',
        deleteConfirm: (count: number) => `Delete ${count} selected assets? This cannot be undone.`,
        deletedSuccess: (count: number) => `Deleted ${count} assets`,
        folderIcon: 'Folder',
        assetDeleted: 'Asset deleted',
      }
    : {
        aiCategories: 'AI 分类',
        folders: '文件夹',
        allCategories: '全部',
        newFolderName: '文件夹名称',
        createFailed: '创建失败',
        renameFailed: '重命名失败',
        deleteFailed: '删除失败',
        folderDeleted: '文件夹已删除',
        moveFailed: '移动失败',
        movedAssets: (count: number) => `已移动 ${count} 个素材`,
        loadFailed: '加载失败',
        newFolder: '新建文件夹',
        folderActionPrompt: (name: string) => `文件夹“${name}”\n输入新名称可重命名，输入 delete 可删除。`,
        dragHint: '创建文件夹后，可以按项目或类型整理素材。',
        moveSelected: (count: number) => `移动已选 (${count})`,
        tabsAll: '全部素材',
        searchPlaceholder: '搜索文件名或 AI 描述...',
        allRatio: '全部比例',
        allType: '全部类型',
        allOrientation: '全部方向',
        allQuality: '全部质量',
        ratio: '比例',
        type: '类型',
        orientation: '方向',
        quality: '质量',
        clearFilters: '清除筛选',
        totalAssets: (count: number) => `共 ${count} 个素材`,
        showingAssets: (shown: number) => `已显示 ${shown} 个`,
        selectedAssets: (count: number) => `已选 ${count} 个`,
        emptyRecentTitle: '暂无最近使用记录',
        emptyFavoritesTitle: '还没有收藏素材',
        emptySearchTitle: '没有找到匹配素材',
        emptyLibraryTitle: '素材库还是空的',
        emptyRecentHint: '在制片或剪辑中使用过的素材会显示在这里。',
        emptyFavoritesHint: '点击素材卡片上的星标即可收藏。',
        emptySearchHint: '试试更换关键词，或减少筛选条件。',
        emptyLibraryHint: '点击右上角“上传素材”开始导入。',
        folderSection: '文件夹',
        uncategorizedSection: '未整理素材',
        assetCount: (count: number) => `${count} 个素材`,
        backToAll: '返回全部',
        loadMore: (count: number) => `加载更多（剩余 ${count} 个）`,
        selectedSummary: (count: number) => `已选 ${count} 个素材`,
        moveToFolder: '移动到文件夹',
        deleteSelected: '删除',
        clearSelection: '取消选择',
        deleteConfirm: (count: number) => `确认删除 ${count} 个素材？此操作不可恢复。`,
        deletedSuccess: (count: number) => `已删除 ${count} 个素材`,
        folderIcon: '文件夹',
        assetDeleted: '素材已删除',
      };

  const filterLabels: Record<GalleryFilterKey, string> = {
    ratio: text.ratio,
    type: text.type,
    orientation: text.orientation,
    quality: text.quality,
    duration_range: '',
    purpose: '',
  };

  const filterPlaceholders: Record<GalleryFilterKey, string> = {
    ratio: text.allRatio,
    type: text.allType,
    orientation: text.allOrientation,
    quality: text.allQuality,
    duration_range: '',
    purpose: '',
  };

  const [tab, setTab] = useState<GalleryTab>('all');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<Record<GalleryFilterKey, string>>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const prevAssetIdsRef = useRef<Set<string>>(new Set());

  const queryRef = useRef(query);
  const filtersRef = useRef(filters);
  const tabRef = useRef(tab);
  const categoryRef = useRef(activeCategory);
  const folderRef = useRef(activeFolder);
  const foldersRef = useRef(folders);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    categoryRef.current = activeCategory;
  }, [activeCategory]);
  useEffect(() => {
    folderRef.current = activeFolder;
  }, [activeFolder]);
  useEffect(() => {
    foldersRef.current = folders;
  }, [folders]);

  const fetchPage = useCallback(
    async (pageNum: number, reset: boolean) => {
      const currentTab = tabRef.current;
      const currentQuery = queryRef.current;
      const currentFilters = filtersRef.current;
      const currentCategory = categoryRef.current;
      const currentFolder = folderRef.current;

      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        let result: { assets: LibraryAsset[]; total: number };

        if (currentTab === 'recent') {
          result = await listRecent(50);
        } else if (currentTab === 'favorites') {
          result = await listFavorites({ page: pageNum, pageSize: PAGE_SIZE });
        } else {
          const hasFilters = Object.values(currentFilters).some(Boolean);
          const isSearch = !!currentQuery || hasFilters;
          const params: Record<string, string> = {
            pageSize: String(PAGE_SIZE),
            page: String(pageNum),
          };

          if (currentQuery) params.q = currentQuery;
          if (currentCategory) params.ai_category = currentCategory;
          if (currentFolder) params.folder_id = currentFolder;
          else if (currentTab === 'all' && !currentQuery && !currentCategory && !hasFilters && foldersRef.current.length > 0) {
            params.folder_id = '__none__';
          }

          for (const [key, value] of Object.entries(currentFilters)) {
            if (value) params[key] = value;
          }

          const response =
            isSearch || currentCategory
              ? await searchAssets({
                  q: currentQuery,
                  page: pageNum,
                  pageSize: PAGE_SIZE,
                  ai_category: currentCategory || undefined,
                  ...(Object.fromEntries(
                    Object.entries(currentFilters).filter(([, value]) => value),
                  ) as Partial<Record<GalleryFilterKey, string>>),
                })
              : await listAssets(params);
          result = { assets: response.assets, total: response.total };
        }

        if (reset) {
          const nextIds = new Set(result.assets.map((asset) => asset.id));
          const newIds = new Set(
            result.assets.filter((asset) => !prevAssetIdsRef.current.has(asset.id)).map((asset) => asset.id),
          );
          if (newIds.size > 0 && prevAssetIdsRef.current.size > 0) {
            setHighlightIds(newIds);
            window.setTimeout(() => setHighlightIds(new Set()), 3000);
          }
          prevAssetIdsRef.current = nextIds;
          setAssets(result.assets);
          setPage(2);
        } else {
          setAssets((previous) => [...previous, ...result.assets]);
          setPage(pageNum + 1);
        }

        setTotal(result.total);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : text.loadFailed);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [text.loadFailed],
  );

  const loadCategories = useCallback(async () => {
    try {
      const response = await getCategories();
      setCategories(response.categories);
      setCategoryTotal(response.total);
    } catch {
      // supplementary
    }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const response = await listFolders();
      setFolders(response.folders);
      foldersRef.current = response.folders;
      if (
        response.folders.length > 0 &&
        tabRef.current === 'all' &&
        !folderRef.current &&
        !categoryRef.current &&
        !queryRef.current
      ) {
        void fetchPage(1, true);
      }
    } catch {
      // supplementary
    }
  }, [fetchPage]);

  useEffect(() => {
    void fetchPage(1, true);
    void loadCategories();
    void loadFolders();
  }, [refreshKey, fetchPage, loadCategories, loadFolders]);

  useEffect(() => {
    if (tab !== 'drive') void fetchPage(1, true);
  }, [tab, activeCategory, activeFolder, fetchPage]);

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      await createFolder(name);
      setNewFolderName('');
      setCreatingFolder(false);
      void loadFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.createFailed);
    }
  }

  async function renameFolderFromPrompt(folder: AssetFolder, input: string) {
    const name = input.trim();
    if (!name) return;
    try {
      await renameFolder(folder.id, name);
      void loadFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.renameFailed);
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolder(id);
      if (activeFolder === id) setActiveFolder(null);
      void loadFolders();
      toast.success(text.folderDeleted);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.deleteFailed);
    }
  }

  async function handleDropOnFolder(folderId: string, assetIds: string[]) {
    if (assetIds.length === 0) return;
    try {
      await moveAssetsToFolder(folderId, assetIds);
      toast.success(text.movedAssets(assetIds.length));
      setSelectedIds(new Set());
      void fetchPage(1, true);
      void loadFolders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : text.moveFailed);
    }
  }

  function handleFolderDragOver(event: React.DragEvent, folderId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropTargetFolder(folderId);
  }

  function handleFolderDrop(event: React.DragEvent, folderId: string) {
    event.preventDefault();
    setDropTargetFolder(null);
    const raw = event.dataTransfer.getData('application/x-asset-ids');
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      const allIds = new Set([...ids, ...selectedIds]);
      void handleDropOnFolder(folderId, Array.from(allIds));
    } catch {
      // ignore
    }
  }

  function handleSearch() {
    void fetchPage(1, true);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    queryRef.current = value;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void fetchPage(1, true);
    }, 300);
  }

  function handleFilterChange(key: GalleryFilterKey, value: string) {
    setFilters((previous) => {
      const next = { ...previous, [key]: value };
      filtersRef.current = next;
      return next;
    });
    window.setTimeout(() => {
      void fetchPage(1, true);
    }, 0);
  }

  function handleTabChange(nextTab: GalleryTab) {
    setTab(nextTab);
    setActiveCategory(null);
    setActiveFolder(null);
    setQuery('');
    queryRef.current = '';
    setFilters({});
    filtersRef.current = {};
  }

  function handleSelect(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasMore = tab !== 'recent' && assets.length < total;
  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex gap-5">
      {tab === 'all' && (
        <div className="max-h-[calc(100vh-180px)] w-48 shrink-0 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {text.aiCategories}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory(null);
                setActiveFolder(null);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                !activeCategory && !activeFolder
                  ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              {text.allCategories} <span className="text-xs opacity-60">({categoryTotal})</span>
            </button>
            {categories.map((category) => (
              <button
                key={category.category}
                type="button"
                onClick={() => {
                  setActiveCategory(category.category);
                  setActiveFolder(null);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeCategory === category.category
                    ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {localizeAssetCategory(uiLocale, category.category)}{' '}
                <span className="text-xs opacity-60">({category.count})</span>
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {text.folders}
              </p>
              <button
                type="button"
                onClick={() => setCreatingFolder(true)}
                className="text-xs text-[var(--color-primary)] transition hover:text-[var(--color-primary-hover)]"
                title={text.newFolder}
              >
                +
              </button>
            </div>

            {creatingFolder && (
              <div className="mb-1 flex gap-1 px-1">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleCreateFolder();
                    if (event.key === 'Escape') {
                      setCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  placeholder={text.newFolderName}
                  className="min-w-0 flex-1 rounded border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2 py-1 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                />
                <button type="button" onClick={() => void handleCreateFolder()} className="px-1 text-xs text-[var(--color-primary)]">
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-1 text-xs text-[var(--color-text-muted)]"
                >
                  x
                </button>
              </div>
            )}

            {folders.map((folder) => (
              <div
                key={folder.id}
                onDragOver={(event) => handleFolderDragOver(event, folder.id)}
                onDragLeave={() => setDropTargetFolder(null)}
                onDrop={(event) => handleFolderDrop(event, folder.id)}
                className={`group/folder relative rounded-lg transition ${
                  dropTargetFolder === folder.id ? 'bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setActiveCategory(null);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeFolder === folder.id
                      ? 'bg-[var(--color-primary)]/10 font-medium text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <span className="flex-1 truncate">{folder.name}</span>
                  <span className="shrink-0 text-xs opacity-60">{folder.asset_count ?? 0}</span>
                  <span
                    className="shrink-0 opacity-0 transition-opacity group-hover/folder:opacity-100 hover:text-[var(--color-text)]"
                    onClick={(event) => {
                      event.stopPropagation();
                      const action = window.prompt(text.folderActionPrompt(folder.name));
                      if (!action) return;
                      if (action.toLowerCase() === 'delete') {
                        void handleDeleteFolder(folder.id);
                        return;
                      }
                      void renameFolderFromPrompt(folder, action);
                    }}
                  >
                    ...
                  </span>
                </button>
              </div>
            ))}

            {folders.length === 0 && !creatingFolder && (
              <p className="px-3 py-2 text-xs text-[var(--color-text-subtle)]">{text.dragHint}</p>
            )}
          </div>

          {selectedIds.size > 0 && folders.length > 0 && (
            <div className="space-y-1 border-t border-[var(--color-border)] pt-3">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {text.moveSelected(selectedIds.size)}
              </p>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => void handleDropOnFolder(folder.id, Array.from(selectedIds))}
                  className="w-full truncate rounded-lg px-3 py-1.5 text-left text-xs text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center gap-1 border-b border-[var(--color-border)] pb-px">
          {(['recent', 'favorites', 'all', 'drive'] as GalleryTab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleTabChange(item)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === item ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {item === 'all' ? text.tabsAll : localizeGalleryTab(uiLocale, item)}
              {tab === item && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--color-primary)]" />}
            </button>
          ))}
        </div>

        {tab === 'drive' && <DriveBrowser />}

        {tab === 'all' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-[200px] flex-1 gap-2">
              <input
                type="text"
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
                placeholder={text.searchPlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm text-[var(--color-text)] transition placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {FILTER_DEFS.map((filter) => (
                <select
                  key={filter.key}
                  value={filters[filter.key] ?? ''}
                  onChange={(event) => handleFilterChange(filter.key, event.target.value)}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs text-[var(--color-text)] transition focus:border-[var(--color-primary)] focus:outline-none ${
                    filters[filter.key]
                      ? 'border-[var(--color-primary)]/60 bg-[var(--color-primary)]/5'
                      : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
                  }`}
                  aria-label={filterLabels[filter.key]}
                >
                  {filter.options.map((option) => (
                    <option key={option} value={option}>
                      {option === '' ? filterPlaceholders[filter.key] : localizeFilterOption(uiLocale, filter.key, option)}
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
                    window.setTimeout(() => {
                      void fetchPage(1, true);
                    }, 0);
                  }}
                  className="px-1 text-xs text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]"
                >
                  {text.clearFilters}
                </button>
              )}
            </div>
          </div>
        )}

        {tab !== 'drive' && !loading && total > 0 && (
          <p className="text-xs text-[var(--color-text-subtle)]">
            {text.totalAssets(total)}
            {assets.length < total && tab !== 'recent' ? `, ${text.showingAssets(assets.length)}` : ''}
            {selectedIds.size > 0 && <span className="ml-2 text-[var(--color-primary)]">/ {text.selectedAssets(selectedIds.size)}</span>}
          </p>
        )}

        {tab !== 'drive' && loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <div key={index} className="animate-pulse overflow-hidden rounded-xl">
                <div className="aspect-square bg-[var(--color-surface-hover)]" />
                <div className="space-y-1.5 bg-[var(--color-surface-elevated)] p-2">
                  <div className="h-2.5 w-full rounded bg-[var(--color-surface-hover)]" />
                  <div className="h-2 w-2/3 rounded bg-[var(--color-surface-hover)]" />
                </div>
              </div>
            ))}
          </div>
        ) : tab !== 'drive' && assets.length === 0 && folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
              {tab === 'recent'
                ? text.emptyRecentTitle
                : tab === 'favorites'
                  ? text.emptyFavoritesTitle
                  : query || activeFilters > 0 || activeCategory
                    ? text.emptySearchTitle
                    : text.emptyLibraryTitle}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {tab === 'recent'
                ? text.emptyRecentHint
                : tab === 'favorites'
                  ? text.emptyFavoritesHint
                  : query || activeFilters > 0 || activeCategory
                    ? text.emptySearchHint
                    : text.emptyLibraryHint}
            </p>
          </div>
        ) : tab !== 'drive' ? (
          <>
            {tab === 'all' && !activeFolder && !activeCategory && !query && activeFilters === 0 && folders.length > 0 && (
              <div className="mb-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {text.folderSection}
                </p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => {
                        setActiveFolder(folder.id);
                        setActiveCategory(null);
                      }}
                      onDragOver={(event) => handleFolderDragOver(event, folder.id)}
                      onDragLeave={() => setDropTargetFolder(null)}
                      onDrop={(event) => handleFolderDrop(event, folder.id)}
                      className={`group cursor-pointer rounded-xl border transition-all ${
                        dropTargetFolder === folder.id
                          ? 'bg-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-primary)]/40 hover:shadow-md'
                      }`}
                    >
                      <div className="flex aspect-square flex-col items-center justify-center p-4">
                        <p className="w-full truncate px-1 text-center text-sm font-medium text-[var(--color-text)]">{folder.name}</p>
                        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">{text.assetCount(folder.asset_count ?? 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {assets.length > 0 && (
                  <p className="pt-4 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {text.uncategorizedSection}
                  </p>
                )}
              </div>
            )}

            {activeFolder && (
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFolder(null)}
                  className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                >
                  {text.backToAll}
                </button>
                <span className="text-xs text-[var(--color-text-muted)]">/ {folders.find((folder) => folder.id === activeFolder)?.name}</span>
              </div>
            )}

            {assets.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {assets.map((asset) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={selectedIds.has(asset.id)}
                    highlighted={highlightIds.has(asset.id)}
                    onSelect={handleSelect}
                    onClick={onAssetClick}
                    onUseForGenerate={onUseForGenerate}
                    onDelete={(id) => {
                      setAssets((previous) => previous.filter((assetItem) => assetItem.id !== id));
                      setTotal((previous) => Math.max(0, previous - 1));
                      setSelectedIds((previous) => {
                        const next = new Set(previous);
                        next.delete(id);
                        return next;
                      });
                      toast.success(text.assetDeleted);
                      void loadCategories();
                    }}
                  />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center pb-2 pt-6">
                <button
                  type="button"
                  onClick={() => void fetchPage(page, false)}
                  disabled={loadingMore}
                  className="rounded-xl border border-[var(--color-border)] px-8 py-2.5 text-sm text-[var(--color-text-muted)] transition hover:border-[var(--color-border-focus)]/60 hover:text-[var(--color-text)] disabled:opacity-60"
                >
                  {loadingMore ? `${text.loadMore(total - assets.length)}...` : text.loadMore(total - assets.length)}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-5 py-3 shadow-2xl">
          <span className="text-sm font-medium text-[var(--color-text)]">{text.selectedSummary(selectedIds.size)}</span>
          <div className="h-5 w-px bg-[var(--color-border)]" />
          {folders.length > 0 && (
            <div className="group relative">
              <button
                type="button"
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
              >
                {text.moveToFolder}
              </button>
              <div className="absolute bottom-full left-0 mb-2 hidden min-w-[160px] space-y-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 shadow-xl group-hover:block">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => void handleDropOnFolder(folder.id, Array.from(selectedIds))}
                    className="w-full truncate rounded-lg px-3 py-1.5 text-left text-xs text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  >
                    {folder.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              const ids = Array.from(selectedIds);
              if (!window.confirm(text.deleteConfirm(ids.length))) return;
              try {
                const result = await batchDeleteAssets(ids);
                toast.success(text.deletedSuccess(result.deleted));
                setSelectedIds(new Set());
                setAssets((previous) => previous.filter((asset) => !ids.includes(asset.id)));
                setTotal((previous) => Math.max(0, previous - result.deleted));
                void loadCategories();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : text.deleteFailed);
              }
            }}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
          >
            {text.deleteSelected}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          >
            {text.clearSelection}
          </button>
        </div>
      )}
    </div>
  );
}
