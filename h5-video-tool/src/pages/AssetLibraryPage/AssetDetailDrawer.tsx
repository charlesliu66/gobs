import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AssetTag, LibraryAsset } from '../../api/assetLibraryApi';
import { buildAssetFileUrl } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatDateTime } from '../../i18n/locale.ts';
import { localizeAssetCategory, localizeAssetTagKey } from './localize.ts';

interface Props {
  asset: LibraryAsset | null;
  onClose: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '--';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function TagChip({ tag, ai }: { tag: AssetTag; ai: boolean }) {
  const { uiLocale } = useLocale();
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
        ai
          ? 'border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 text-[var(--color-primary)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text)]'
      }`}
    >
      <span className="text-[10px] opacity-60">{localizeAssetTagKey(uiLocale, tag.key)}</span>
      <span className="font-medium">{tag.value}</span>
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right text-xs font-medium text-[var(--color-text)]">{value}</span>
    </div>
  );
}

export function AssetDetailDrawer({ asset, onClose }: Props) {
  const navigate = useNavigate();
  const { uiLocale } = useLocale();
  const isEnglish = uiLocale === 'en';
  const text = isEnglish
    ? {
        close: 'Close',
        fileInfo: 'File Info',
        size: 'Size',
        dimensions: 'Dimensions',
        duration: 'Duration',
        uploadedAt: 'Uploaded At',
        aiCategory: 'AI Category',
        aiDescription: 'AI Description',
        baseAttrs: 'Base Attributes',
        aiTags: 'AI Tags',
        pendingTags: (count: number) => `${count} AI tags still need review`,
        noTags: 'No tags yet',
        useForProduction: 'Use In Production Wizard',
        useForStudio: 'Use In Generate Video',
      }
    : {
        close: '关闭',
        fileInfo: '文件信息',
        size: '大小',
        dimensions: '尺寸',
        duration: '时长',
        uploadedAt: '上传时间',
        aiCategory: 'AI 分类',
        aiDescription: 'AI 描述',
        baseAttrs: '基础属性',
        aiTags: 'AI 标签',
        pendingTags: (count: number) => `${count} 个 AI 标签待确认`,
        noTags: '暂无标签',
        useForProduction: '用于高级制片',
        useForStudio: '用于视频生成',
      };

  useEffect(() => {
    if (!asset) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [asset, onClose]);

  if (!asset) return null;

  const mime = asset.mime_type ?? asset.mimetype ?? '';
  const isVideo = mime.startsWith('video/');
  const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
  const size = asset.filesize ?? asset.size ?? 0;
  const rawAsset = asset as unknown as Record<string, unknown>;
  const width = rawAsset.width as number | undefined;
  const height = rawAsset.height as number | undefined;
  const duration = asset.duration;
  const tags = asset.tags ?? [];
  const ruleTags = tags.filter((tag) => tag.status === 'confirmed' && tag.source !== 'ai');
  const aiTags = tags.filter((tag) => tag.status === 'confirmed' && tag.source === 'ai');
  const pendingTags = tags.filter((tag) => tag.status === 'pending');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed bottom-0 right-0 top-0 z-50 flex w-[400px] max-w-[95vw] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <h3 className="flex-1 truncate text-sm font-semibold text-[var(--color-text)]" title={asset.filename}>
            {asset.filename}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xl leading-none text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            aria-label={text.close}
          >
            x
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center bg-[var(--color-surface-hover)] p-5">
            {isVideo ? (
              <video src={fileUrl} className="max-h-60 max-w-full rounded-xl object-contain shadow-md" controls preload="metadata" />
            ) : (
              <img src={fileUrl} alt={asset.filename} className="max-h-60 max-w-full rounded-xl object-contain shadow-md" />
            )}
          </div>

          <div className="space-y-2 border-b border-[var(--color-border)] px-5 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {text.fileInfo}
            </p>
            <MetaRow label={text.size} value={formatBytes(size)} />
            {width && height && <MetaRow label={text.dimensions} value={`${width} x ${height}`} />}
            {duration != null && <MetaRow label={text.duration} value={`${duration.toFixed(1)}s`} />}
            <MetaRow label={text.uploadedAt} value={formatDateTime(asset.created_at, uiLocale)} />
            {asset.ai_category && asset.ai_category !== '未分类' && asset.ai_category !== 'uncategorized' && (
              <MetaRow label={text.aiCategory} value={localizeAssetCategory(uiLocale, asset.ai_category)} />
            )}
            {asset.ai_description && <MetaRow label={text.aiDescription} value={asset.ai_description} />}
          </div>

          <div className="space-y-4 px-5 py-4">
            {ruleTags.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {text.baseAttrs}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ruleTags.map((tag) => (
                    <TagChip key={`${tag.key}:${tag.value}`} tag={tag} ai={false} />
                  ))}
                </div>
              </div>
            )}

            {aiTags.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {text.aiTags}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiTags.map((tag) => (
                    <TagChip key={`${tag.key}:${tag.value}`} tag={tag} ai />
                  ))}
                </div>
              </div>
            )}

            {pendingTags.length > 0 && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/8 p-3">
                <p className="mb-1.5 text-xs font-medium text-orange-500">{text.pendingTags(pendingTags.length)}</p>
                <div className="flex flex-wrap gap-1">
                  {pendingTags.map((tag) => (
                    <span key={`${tag.key}:${tag.value}`} className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-400">
                      {localizeAssetTagKey(uiLocale, tag.key)}: {tag.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ruleTags.length === 0 && aiTags.length === 0 && pendingTags.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">{text.noTags}</p>
            )}
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={() => navigate(`/studio/production?assetId=${encodeURIComponent(asset.id)}`)}
            className="w-full rounded-xl bg-[var(--color-primary)] py-3 font-semibold text-white transition hover:bg-[var(--color-primary-hover)]"
          >
            {text.useForProduction}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/studio?assetId=${encodeURIComponent(asset.id)}`)}
            className="w-full rounded-xl border border-[var(--color-border)] py-2.5 font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface-hover)]"
          >
            {text.useForStudio}
          </button>
        </div>
      </div>
    </>
  );
}
