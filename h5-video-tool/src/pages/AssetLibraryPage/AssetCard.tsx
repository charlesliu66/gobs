import { useState } from 'react';
import type { LibraryAsset } from '../../api/assetLibraryApi';
import { buildAssetFileUrl } from '../../api/assetLibraryApi';

interface Props {
  asset: LibraryAsset;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (asset: LibraryAsset) => void;
  onUseForGenerate: (asset: LibraryAsset) => void;
}

function getPrimaryInfo(asset: LibraryAsset): string {
  const tags = asset.tags ?? [];
  const confirmed = tags.filter((t) => t.status === 'confirmed');
  const ratio = confirmed.find((t) => t.key === 'ratio')?.value;
  const quality = confirmed.find((t) => t.key === 'quality')?.value?.toUpperCase();
  // 从宽高推导（兜底）
  const w = (asset as unknown as Record<string, unknown>).width as number | undefined;
  const h = (asset as unknown as Record<string, unknown>).height as number | undefined;
  const derivedRatio = (!ratio && w && h)
    ? (w / h > 1.5 ? '16:9' : w / h < 0.7 ? '9:16' : '1:1')
    : null;
  const parts = [ratio ?? derivedRatio, quality].filter(Boolean);
  return parts.join(' · ');
}

export function AssetCard({ asset, selected, onSelect, onClick, onUseForGenerate }: Props) {
  const [imgError, setImgError] = useState(false);
  const mime = asset.mime_type ?? asset.mimetype ?? '';
  const isVideo = mime.startsWith('video/');
  const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
  const info = getPrimaryInfo(asset);

  return (
    <div
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${
        selected
          ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface)]'
          : 'hover:ring-2 hover:ring-[var(--color-primary)]/40 hover:ring-offset-1 hover:ring-offset-[var(--color-surface)]'
      }`}
      onClick={() => onClick(asset)}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-[var(--color-surface-hover)] relative overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-40">{isVideo ? '🎬' : '🖼'}</span>
          </div>
        ) : isVideo ? (
          <video
            src={fileUrl}
            className="w-full h-full object-cover"
            preload="metadata"
            muted
            playsInline
            onError={() => setImgError(true)}
          />
        ) : (
          <img
            src={fileUrl}
            alt={asset.filename}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Video badge */}
        {isVideo && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-9 h-9 bg-black/55 rounded-full flex items-center justify-center backdrop-blur-sm">
              <span className="text-white text-xs ml-0.5">▶</span>
            </div>
          </div>
        )}

        {/* Checkbox top-left (hover or selected) */}
        <div
          className={`absolute top-2 left-2 z-10 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => { e.stopPropagation(); onSelect(asset.id); }}
        >
          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
              : 'bg-black/50 border-white/70 backdrop-blur-sm'
          }`}>
            {selected && <span className="text-white text-[10px] font-bold">✓</span>}
          </div>
        </div>

        {/* "用于生成" bottom overlay on hover */}
        <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUseForGenerate(asset); }}
            className="w-full py-2 bg-gradient-to-t from-black/85 via-black/60 to-transparent text-white text-xs font-semibold text-center hover:from-black/95 transition-colors pt-6"
          >
            🚀 用于生成
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="px-2 py-2 bg-[var(--color-surface-elevated)]">
        <p
          className="text-xs font-medium text-[var(--color-text)] truncate leading-snug"
          title={asset.filename}
        >
          {asset.filename}
        </p>
        {info && (
          <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5 leading-snug">{info}</p>
        )}
      </div>
    </div>
  );
}
