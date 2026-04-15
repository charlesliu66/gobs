import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LibraryAsset, AssetTag } from '../../api/assetLibraryApi';
import { buildAssetFileUrl } from '../../api/assetLibraryApi';

interface Props {
  asset: LibraryAsset | null;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const TAG_LABEL: Record<string, string> = {
  type: '类型', ratio: '比例', orientation: '方向', quality: '质量',
  platform: '平台', ai_type: '内容类型', ai_scene: '场景', ai_purpose: '用途', ai_platform: '推荐平台',
};

function TagChip({ tag, variant }: { tag: AssetTag; variant: 'rule' | 'ai' }) {
  const label = TAG_LABEL[tag.key] ?? tag.key;
  return (
    <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border ${
      variant === 'ai'
        ? 'bg-[var(--color-primary)]/8 text-[var(--color-primary)] border-[var(--color-primary)]/20'
        : 'bg-[var(--color-surface-hover)] text-[var(--color-text)] border-[var(--color-border)]'
    }`}>
      <span className="opacity-60 text-[10px]">{label}</span>
      <span className="font-medium">{tag.value}</span>
    </span>
  );
}

export function AssetDetailDrawer({ asset, onClose }: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!asset) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [asset, onClose]);

  if (!asset) return null;

  const mime = asset.mime_type ?? asset.mimetype ?? '';
  const isVideo = mime.startsWith('video/');
  const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
  const size = asset.filesize ?? asset.size ?? 0;
  const assetRaw = asset as unknown as Record<string, unknown>;
  const width = assetRaw.width as number | undefined;
  const height = assetRaw.height as number | undefined;
  const duration = asset.duration;

  const tags = asset.tags ?? [];
  const ruleTags = tags.filter((t) => t.status === 'confirmed' && (t.source as string) !== 'ai');
  const aiTags = tags.filter((t) => t.status === 'confirmed' && t.source === 'ai');
  const pendingTags = tags.filter((t) => t.status === 'pending');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[400px] max-w-[95vw] bg-[var(--color-surface)] border-l border-[var(--color-border)] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <h3 className="flex-1 text-sm font-semibold text-[var(--color-text)] truncate" title={asset.filename}>
            {asset.filename}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition text-xl leading-none"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          <div className="bg-[var(--color-surface-hover)] flex items-center justify-center p-5">
            {isVideo ? (
              <video
                src={fileUrl}
                className="max-h-60 max-w-full rounded-xl object-contain shadow-md"
                controls
                preload="metadata"
              />
            ) : (
              <img
                src={fileUrl}
                alt={asset.filename}
                className="max-h-60 max-w-full rounded-xl object-contain shadow-md"
              />
            )}
          </div>

          {/* Metadata */}
          <div className="px-5 py-4 border-b border-[var(--color-border)] space-y-2">
            <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">文件信息</p>
            <MetaRow label="大小" value={formatBytes(size)} />
            {width && height && (
              <MetaRow label="尺寸" value={`${width} × ${height}`} />
            )}
            {duration != null && (
              <MetaRow label="时长" value={`${duration.toFixed(1)}s`} />
            )}
            <MetaRow label="上传时间" value={formatDate(asset.created_at)} />
          </div>

          {/* Tags */}
          <div className="px-5 py-4 space-y-4">
            {ruleTags.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">基础属性</p>
                <div className="flex flex-wrap gap-1.5">
                  {ruleTags.map((t, i) => (
                    <TagChip key={i} tag={t} variant="rule" />
                  ))}
                </div>
              </div>
            )}

            {aiTags.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">AI 标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiTags.map((t, i) => (
                    <TagChip key={i} tag={t} variant="ai" />
                  ))}
                </div>
              </div>
            )}

            {pendingTags.length > 0 && (
              <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-3">
                <p className="text-xs text-orange-500 font-medium mb-1.5">
                  ⚠ {pendingTags.length} 个 AI 标签待确认
                </p>
                <div className="flex flex-wrap gap-1">
                  {pendingTags.map((t, i) => (
                    <span key={i} className="text-[10px] bg-orange-500/10 text-orange-400 rounded px-1.5 py-0.5">
                      {t.key}: {t.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ruleTags.length === 0 && aiTags.length === 0 && pendingTags.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] text-center py-4">暂无标签</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[var(--color-border)] space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate(`/studio?assetId=${encodeURIComponent(asset.id)}`)}
            className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition flex items-center justify-center gap-2"
          >
            <span>🚀</span> 用于生成
          </button>
        </div>
      </div>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="text-xs text-[var(--color-text)] font-medium">{value}</span>
    </div>
  );
}
