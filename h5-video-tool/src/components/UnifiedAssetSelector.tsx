import { useMemo, useState } from 'react';
import { AssetPicker } from './AssetPicker';
import { buildAssetFileUrl, type LibraryAsset } from '../api/assetLibraryApi';

export interface UnifiedAssetSlot {
  id: string;
  title: string;
  description: string;
  mediaType: 'image' | 'video';
  semanticRole?: 'role' | 'scene';
  initialQuery?: string;
  required?: boolean;
}

interface UnifiedAssetSelectorProps {
  slots: UnifiedAssetSlot[];
  selectedAssets: Record<string, LibraryAsset | null>;
  locale?: 'zh' | 'en';
  onSelectAsset: (slot: UnifiedAssetSlot, asset: LibraryAsset | null) => void;
}

function assetMime(asset: LibraryAsset): string {
  return asset.mimetype ?? asset.mime_type ?? '';
}

function assetPreviewUrl(asset: LibraryAsset): string {
  return asset.thumbnail_url ?? asset.file_url ?? buildAssetFileUrl(asset.id);
}

export function UnifiedAssetSelector({
  slots,
  selectedAssets,
  locale = 'zh',
  onSelectAsset,
}: UnifiedAssetSelectorProps) {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const activeSlot = useMemo(
    () => slots.find((slot) => slot.id === activeSlotId) ?? null,
    [activeSlotId, slots],
  );
  const copy = locale === 'en'
    ? {
        choose: 'Choose from Asset Library',
        replace: 'Replace asset',
        clear: 'Clear',
        selected: 'Selected',
        required: 'Required',
        optional: 'Optional',
        pickerTitle: 'Choose Studio source asset',
        confirm: 'Use asset',
      }
    : {
        choose: '从资产库选择',
        replace: '替换素材',
        clear: '清除',
        selected: '已选择',
        required: '必选',
        optional: '可选',
        pickerTitle: '选择 Studio 源素材',
        confirm: '使用素材',
      };

  return (
    <div className="grid gap-3 md:grid-cols-3" data-component="UnifiedAssetSelector">
      {slots.map((slot) => {
        const selected = selectedAssets[slot.id] ?? null;
        const previewUrl = selected ? assetPreviewUrl(selected) : '';
        const isVideo = selected ? assetMime(selected).startsWith('video/') : slot.mediaType === 'video';
        return (
          <article
            key={slot.id}
            data-slot-id={slot.id}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{slot.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{slot.description}</p>
              </div>
              <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
                {slot.required ? copy.required : copy.optional}
              </span>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/10">
              <div className="aspect-video bg-[var(--color-surface-elevated)]">
                {selected && previewUrl ? (
                  isVideo ? (
                    <video src={previewUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={previewUrl} alt={selected.filename} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                    {slot.mediaType === 'video' ? '@video' : '@image'}
                  </div>
                )}
              </div>
              {selected ? (
                <div className="border-t border-[var(--color-border)] px-3 py-2">
                  <p className="text-[11px] font-medium text-[var(--color-text)]" title={selected.filename}>
                    {copy.selected}: {selected.filename}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveSlotId(slot.id)}
                className="btn-secondary text-xs"
              >
                {selected ? copy.replace : copy.choose}
              </button>
              {selected ? (
                <button
                  type="button"
                  onClick={() => onSelectAsset(slot, null)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                >
                  {copy.clear}
                </button>
              ) : null}
            </div>
          </article>
        );
      })}

      {activeSlot ? (
        <AssetPicker
          filterType={activeSlot.mediaType}
          initialQuery={activeSlot.initialQuery}
          initialSelectedIds={selectedAssets[activeSlot.id]?.id ? [selectedAssets[activeSlot.id]!.id] : []}
          title={copy.pickerTitle}
          subtitle={activeSlot.title}
          confirmLabel={copy.confirm}
          onSelect={(assets) => {
            onSelectAsset(activeSlot, assets[0] ?? null);
          }}
          onClose={() => setActiveSlotId(null)}
        />
      ) : null}
    </div>
  );
}
