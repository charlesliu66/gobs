import { useMemo, useRef, useState } from 'react';
import { AssetPicker } from './AssetPicker';
import type { LibraryAsset } from '../api/assetLibraryApi';
import { getSeedanceAcceptString, type SeedanceMediaKind } from '../config/seedanceSourceConstraints';

export interface UnifiedAssetSlot {
  id: string;
  title: string;
  description: string;
  mediaType: Extract<SeedanceMediaKind, 'image' | 'video'>;
  semanticRole?: 'role' | 'scene';
  initialQuery?: string;
  required?: boolean;
}

export interface UnifiedAssetSourceSelection {
  id: string;
  source: 'library' | 'local';
  kind: SeedanceMediaKind;
  filename: string;
  mimeType?: string;
  previewUrl?: string;
  assetId?: string;
}

interface UnifiedAssetSelectorProps {
  slots: UnifiedAssetSlot[];
  selectedSources: Record<string, UnifiedAssetSourceSelection | null>;
  locale?: 'zh' | 'en';
  onSelectAsset: (slot: UnifiedAssetSlot, asset: LibraryAsset | null) => void;
  onSelectLocalFile: (slot: UnifiedAssetSlot, file: File) => void;
  onClearSource: (slot: UnifiedAssetSlot) => void;
}

export function UnifiedAssetSelector({
  slots,
  selectedSources,
  locale = 'zh',
  onSelectAsset,
  onSelectLocalFile,
  onClearSource,
}: UnifiedAssetSelectorProps) {
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const activeSlot = useMemo(
    () => slots.find((slot) => slot.id === activeSlotId) ?? null,
    [activeSlotId, slots],
  );
  const copy = locale === 'en'
    ? {
        chooseLibrary: 'Asset Library',
        uploadLocal: 'Upload',
        replaceLibrary: 'Library',
        replaceLocal: 'Upload',
        clear: 'Clear',
        selected: 'Selected',
        local: 'Local',
        library: 'Library',
        required: 'Required',
        optional: 'Optional',
        pickerTitle: 'Choose reference asset',
        confirm: 'Use asset',
      }
    : {
        chooseLibrary: '资产库',
        uploadLocal: '本地上传',
        replaceLibrary: '资产库',
        replaceLocal: '本地上传',
        clear: '清除',
        selected: '已选',
        local: '本地',
        library: '资产库',
        required: '必选',
        optional: '可选',
        pickerTitle: '选择参考素材',
        confirm: '使用素材',
      };

  return (
    <div className="grid gap-3 md:grid-cols-3" data-component="UnifiedAssetSelector">
      {slots.map((slot) => {
        const selected = selectedSources[slot.id] ?? null;
        const isVideo = selected ? selected.kind === 'video' : slot.mediaType === 'video';
        return (
          <article
            key={slot.id}
            data-slot-id={slot.id}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">{slot.title}</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{slot.description}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text-subtle)]">
                {slot.required ? copy.required : copy.optional}
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-lg border border-[var(--color-border)] bg-black/10">
              <div className="aspect-video bg-[var(--color-surface-elevated)]">
                {selected?.previewUrl ? (
                  isVideo ? (
                    <video src={selected.previewUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={selected.previewUrl} alt={selected.filename} className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--color-text-muted)]">
                    {slot.mediaType === 'video' ? '@video' : '@image'}
                  </div>
                )}
              </div>
              {selected ? (
                <div className="border-t border-[var(--color-border)] px-3 py-2">
                  <p className="truncate text-[11px] font-medium text-[var(--color-text)]" title={selected.filename}>
                    {copy.selected}: {selected.filename}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                    {selected.source === 'local' ? copy.local : copy.library}
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
                {selected ? copy.replaceLibrary : copy.chooseLibrary}
              </button>
              <button
                type="button"
                data-source-action="upload-local"
                onClick={() => fileInputRefs.current[slot.id]?.click()}
                className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              >
                {selected ? copy.replaceLocal : copy.uploadLocal}
              </button>
              {selected ? (
                <button
                  type="button"
                  onClick={() => onClearSource(slot)}
                  className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                >
                  {copy.clear}
                </button>
              ) : null}
              <input
                ref={(node) => {
                  fileInputRefs.current[slot.id] = node;
                }}
                type="file"
                accept={getSeedanceAcceptString(slot.mediaType)}
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) onSelectLocalFile(slot, file);
                  event.currentTarget.value = '';
                }}
              />
            </div>
          </article>
        );
      })}

      {activeSlot ? (
        <AssetPicker
          filterType={activeSlot.mediaType}
          initialQuery={activeSlot.initialQuery}
          initialSelectedIds={selectedSources[activeSlot.id]?.assetId ? [selectedSources[activeSlot.id]!.assetId!] : []}
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
