import { useState, useRef, useCallback } from 'react';
import { fetchAssets, uploadAsset, updateAsset, deleteAsset, scanAssets, autoTagAsset, getAssetImage } from '../api/assets';
import type { Asset, AssetIndex, AssetType, AutoTagResult } from '../api/assets';
import { saveCharacterToLibrary } from '../api/characterLibrary';
import { toast } from '../components/Toast';
import { useEffect } from 'react';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  character: '👤 角色',
  scene: '🏞 场景',
  prop: '🗡 道具',
  style: '🎨 风格',
};

const VERSION_OPTIONS = ['all', 'v1', 'v2', 'v3', '通用'];

function AssetCard({
  asset,
  onEdit,
  onDelete,
  onImportToLibrary,
}: {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onImportToLibrary: (asset: Asset) => void;
}) {
  const hasThumbnail = Boolean(asset.thumbnailBase64);

  return (
    <div
      className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:border-[var(--color-border-focus)]/60 transition-all group cursor-pointer"
      onClick={() => onEdit(asset)}
    >
      {/* 缩略图 */}
      <div className="aspect-square bg-[var(--color-surface-hover)] flex items-center justify-center relative overflow-hidden">
        {hasThumbnail ? (
          <img
            src={`data:image/png;base64,${asset.thumbnailBase64}`}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-3xl">
            {asset.type === 'character' ? '👤' : asset.type === 'scene' ? '🏞' : asset.type === 'style' ? '🎨' : '🗡'}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1">
          {asset.type === 'character' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onImportToLibrary(asset); }}
              className="w-6 h-6 bg-blue-500/80 text-white rounded-md text-xs flex items-center justify-center hover:bg-blue-600 transition"
              title="导入形象库"
            >
              ⬆
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(asset); }}
            className="w-6 h-6 bg-red-500/80 text-white rounded-md text-xs flex items-center justify-center hover:bg-red-600 transition"
          >
            ×
          </button>
        </div>
      </div>
      {/* 信息 */}
      <div className="p-3">
        <div className="text-xs font-semibold text-[var(--color-text)] truncate mb-1">{asset.name}</div>
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] bg-[var(--color-primary)]/15 text-[var(--color-primary)] rounded px-1.5 py-0.5">
            {ASSET_TYPE_LABELS[asset.type] ?? asset.type}
          </span>
          {asset.gameVersion !== 'all' && (
            <span className="text-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-subtle)]">
              {asset.gameVersion}
            </span>
          )}
        </div>
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {asset.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] text-[var(--color-text-subtle)]">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface EditDrawerProps {
  asset: Asset;
  onClose: () => void;
  onSave: (updated: Partial<Asset>) => Promise<void>;
}

function EditDrawer({ asset, onClose, onSave }: EditDrawerProps) {
  const [form, setForm] = useState({
    name: asset.name,
    type: asset.type,
    tags: asset.tags.join(', '),
    gameVersion: asset.gameVersion,
    description: asset.description,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name: form.name,
        type: form.type as AssetType,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        gameVersion: form.gameVersion,
        description: form.description,
      });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-sm h-full bg-[var(--color-surface-elevated)] border-l border-[var(--color-border)] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text)]">编辑素材</h3>
          <button type="button" onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">名称</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">类型</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as AssetType })}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
            >
              <option value="character">👤 角色</option>
              <option value="scene">🏞 场景</option>
              <option value="prop">🗡 道具</option>
              <option value="style">🎨 风格</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">版本</label>
            <input
              value={form.gameVersion}
              onChange={(e) => setForm({ ...form, gameVersion: e.target.value })}
              list="version-options"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
            />
            <datalist id="version-options">
              {VERSION_OPTIONS.map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">标签（逗号分隔）</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="标签1, 标签2, 标签3"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">描述</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] resize-none focus:outline-none focus:border-[var(--color-primary)] transition"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[var(--color-border)] flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition">
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssetLibrary() {
  const [index, setIndex] = useState<AssetIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterVersion, setFilterVersion] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{ imageBase64: string; filename: string; autoTag: AutoTagResult } | null>(null);
  const [importTarget, setImportTarget] = useState<Asset | null>(null);
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAssets();
      setIndex(data);
    } catch (err) {
      toast.error('加载素材库失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleScan() {
    setScanning(true);
    try {
      const result = await scanAssets();
      toast.success(`扫描完成，共 ${result.count} 个素材`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '扫描失败');
    } finally {
      setScanning(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (ev) => {
          const result = (ev.target?.result as string).split(',')[1] ?? '';
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // 先自动打标签
      const autoTag = await autoTagAsset({ imageBase64: base64, filename: file.name });
      setPendingUpload({ imageBase64: base64, filename: file.name, autoTag });
    } catch (err) {
      toast.error('文件处理失败');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleConfirmUpload() {
    if (!pendingUpload) return;
    setUploading(true);
    try {
      await uploadAsset({
        imageBase64: pendingUpload.imageBase64,
        filename: pendingUpload.filename,
      });
      toast.success('素材已添加');
      setPendingUpload(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveAsset(id: string, updates: Partial<Asset>) {
    await updateAsset(id, updates);
    toast.success('已保存');
    await load();
  }

  async function handleDelete(asset: Asset) {
    if (!confirm(`确定删除素材"${asset.name}"？`)) return;
    try {
      await deleteAsset(asset.id);
      toast.success('已删除');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '删除失败');
    }
  }

  function handleImportToLibrary(asset: Asset) {
    setImportTarget(asset);
    setImportName(asset.name);
  }

  async function handleConfirmImport() {
    if (!importTarget || !importName.trim()) return;
    setImporting(true);
    try {
      const { imageDataUrl } = await getAssetImage(importTarget.id);
      await saveCharacterToLibrary({
        name: importName.trim(),
        baseImageDataUrl: imageDataUrl,
        states: [],
        tags: importTarget.tags,
      });
      toast.success('已导入形象库');
      setImportTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '导入失败');
    } finally {
      setImporting(false);
    }
  }

  const allAssets = index?.assets ?? [];
  const versions = ['all', ...Array.from(new Set(allAssets.map((a) => a.gameVersion).filter((v) => v && v !== 'all')))];

  const filtered = allAssets.filter((a) => {
    if (filterVersion !== 'all' && a.gameVersion !== filterVersion && a.gameVersion !== 'all') return false;
    if (filterType !== 'all' && a.type !== filterType) return false;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* 顶部操作栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">📁 素材库</h1>
          <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">管理角色、场景、道具等参考素材</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <select
            value={filterVersion}
            onChange={(e) => setFilterVersion(e.target.value)}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
          >
            <option value="all">全部版本</option>
            {versions.filter((v) => v !== 'all').map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
          >
            <option value="all">全部类型</option>
            <option value="character">👤 角色</option>
            <option value="scene">🏞 场景</option>
            <option value="prop">🗡 道具</option>
            <option value="style">🎨 风格</option>
          </select>
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-muted)] transition flex items-center gap-2 disabled:opacity-60"
          >
            {scanning ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : '🔍'}
            自动扫描打标签
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition flex items-center gap-2"
          >
            {uploading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '＋'}
            上传素材
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* 统计 */}
      <div className="flex gap-4 mb-4 text-sm text-[var(--color-text-subtle)]">
        <span>共 <strong className="text-[var(--color-text)]">{filtered.length}</strong> 个素材</span>
        {filterVersion !== 'all' && <span>版本：{filterVersion}</span>}
        {filterType !== 'all' && <span>类型：{ASSET_TYPE_LABELS[filterType as AssetType]}</span>}
      </div>

      {/* 素材网格 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-square bg-[var(--color-surface-hover)]" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-[var(--color-surface-hover)] rounded" />
                <div className="h-2 bg-[var(--color-surface-hover)] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
            {allAssets.length === 0 ? '素材库为空' : '没有符合条件的素材'}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            {allAssets.length === 0
              ? '点击「上传素材」添加图片，或「自动扫描打标签」扫描本地文件'
              : '调整筛选条件试试'}
          </p>
          {allAssets.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition"
            >
              ＋ 上传第一个素材
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={setEditingAsset}
              onDelete={handleDelete}
              onImportToLibrary={handleImportToLibrary}
            />
          ))}
        </div>
      )}

      {/* 上传预览弹窗 */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-[var(--color-text)] mb-4">🤖 AI 已识别素材信息</h3>
            <div className="space-y-2 text-sm mb-6">
              <div className="flex gap-2">
                <span className="text-[var(--color-text-subtle)] w-12 flex-shrink-0">类型</span>
                <span className="text-[var(--color-text)]">{ASSET_TYPE_LABELS[pendingUpload.autoTag.type]}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--color-text-subtle)] w-12 flex-shrink-0">名称</span>
                <span className="text-[var(--color-text)]">{pendingUpload.autoTag.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--color-text-subtle)] w-12 flex-shrink-0">描述</span>
                <span className="text-[var(--color-text)]">{pendingUpload.autoTag.description}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="text-[var(--color-text-subtle)] w-12 flex-shrink-0">标签</span>
                <div className="flex flex-wrap gap-1">
                  {pendingUpload.autoTag.tags.map((t) => (
                    <span key={t} className="text-xs bg-[var(--color-primary)]/15 text-[var(--color-primary)] rounded px-1.5 py-0.5">#{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingUpload(null)}
                className="flex-1 py-2.5 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition"
              >
                {uploading ? '添加中...' : '确认添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入形象库弹窗 */}
      {importTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-[var(--color-text)] mb-4">👤 导入到形象库</h3>
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">角色名称</label>
                <input
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  placeholder="输入角色名称"
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setImportTarget(null)}
                className="flex-1 py-2.5 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || !importName.trim()}
                className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition"
              >
                {importing ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑侧边抽屉 */}
      {editingAsset && (
        <EditDrawer
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={(updates) => handleSaveAsset(editingAsset.id, updates)}
        />
      )}
    </div>
  );
}

export default AssetLibrary;
