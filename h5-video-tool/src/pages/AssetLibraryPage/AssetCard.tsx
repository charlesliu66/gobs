import { useState, useRef, useEffect } from 'react';
import type { LibraryAsset } from '../../api/assetLibraryApi';
import { buildAssetFileUrl, addFavorite, removeFavorite } from '../../api/assetLibraryApi';

const CATEGORY_COLORS: Record<string, string> = {
  '角色': 'bg-blue-500/80',
  '武器道具': 'bg-orange-500/80',
  '场景': 'bg-green-500/80',
  'UI素材': 'bg-purple-500/80',
  '宣传图': 'bg-pink-500/80',
  '视频片段': 'bg-cyan-500/80',
  '未分类': 'bg-gray-500/60',
};

interface Props {
  asset: LibraryAsset;
  selected: boolean;
  onSelect: (id: string) => void;
  onClick: (asset: LibraryAsset) => void;
  onUseForGenerate: (asset: LibraryAsset) => void;
  onFavoriteChange?: (assetId: string, isFav: boolean) => void;
  draggable?: boolean;
}

export function AssetCard({ asset, selected, onSelect, onClick, onUseForGenerate, onFavoriteChange, draggable = true }: Props) {
  const [imgError, setImgError] = useState(false);
  const [isFav, setIsFav] = useState(asset.is_favorite ?? false);
  const [hovering, setHovering] = useState(false);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mime = asset.mime_type ?? asset.mimetype ?? '';
  const isVideo = mime.startsWith('video/');
  const isImage = !isVideo && !imgError;
  const fileUrl = asset.file_url ?? buildAssetFileUrl(asset.id);
  const category = asset.ai_category ?? '未分类';
  const catColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['未分类'];

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !isFav;
    setIsFav(next);
    (next ? addFavorite(asset.id) : removeFavorite(asset.id)).catch(() => setIsFav(!next));
    onFavoriteChange?.(asset.id, next);
  }

  function handleMouseEnter(_e: React.MouseEvent) {
    setHovering(true);
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
    if (isImage && !imgError) {
      hoverTimer.current = setTimeout(() => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (rect) {
          const x = rect.right + 12;
          const y = Math.max(8, rect.top);
          setPreviewPos({ x, y });
        }
      }, 400);
    }
  }

  function handleMouseLeave() {
    setHovering(false);
    setPreviewPos(null);
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    if (isVideo && videoRef.current) {
      videoRef.current.pause();
    }
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/x-asset-ids', JSON.stringify([asset.id]));
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <>
      <div
        ref={cardRef}
        draggable={draggable}
        onDragStart={handleDragStart}
        className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-150 ${
          selected
            ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface)]'
            : 'hover:ring-2 hover:ring-[var(--color-primary)]/40 hover:ring-offset-1 hover:ring-offset-[var(--color-surface)]'
        }`}
        onClick={() => onClick(asset)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Thumbnail */}
        <div className="aspect-square bg-[var(--color-surface-hover)] relative overflow-hidden">
          {!visible ? (
            <div className="w-full h-full bg-[var(--color-surface-hover)]" />
          ) : imgError ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-40">{isVideo ? '🎬' : '🖼'}</span>
            </div>
          ) : isVideo ? (
            <video
              ref={videoRef}
              src={fileUrl}
              className="w-full h-full object-cover"
              preload="metadata"
              muted
              playsInline
              loop
              onError={() => setImgError(true)}
            />
          ) : (
            <img
              src={fileUrl}
              alt={asset.filename}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )}

          {/* Video play badge (hidden when hovering/playing) */}
          {isVideo && !imgError && !hovering && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 bg-black/55 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-xs ml-0.5">▶</span>
              </div>
            </div>
          )}

          {/* Category badge top-right */}
          {category !== '未分类' && (
            <div className="absolute top-2 right-2 z-10">
              <span className={`text-[10px] text-white px-1.5 py-0.5 rounded-md ${catColor} backdrop-blur-sm`}>
                {category}
              </span>
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

          {/* Favorite star bottom-left */}
          <div
            className={`absolute bottom-2 left-2 z-10 transition-opacity ${
              isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={handleFavorite}
          >
            <span className={`text-lg drop-shadow-md cursor-pointer transition-transform hover:scale-125 ${
              isFav ? 'text-yellow-400' : 'text-white/70'
            }`}>
              {isFav ? '★' : '☆'}
            </span>
          </div>

          {/* "用于生成" bottom overlay on hover */}
          <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUseForGenerate(asset); }}
              className="w-full py-2 bg-gradient-to-t from-black/85 via-black/60 to-transparent text-white text-xs font-semibold text-center hover:from-black/95 transition-colors pt-6"
            >
              用于生成
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
          {asset.ai_description && (
            <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5 leading-snug truncate" title={asset.ai_description}>
              {asset.ai_description}
            </p>
          )}
        </div>
      </div>

      {/* Hover preview popover for images */}
      {previewPos && isImage && !imgError && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: previewPos.x, top: previewPos.y }}
        >
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden p-1.5">
            <img
              src={fileUrl}
              alt={asset.filename}
              className="max-w-[360px] max-h-[360px] object-contain rounded-xl"
            />
            {asset.ai_description && (
              <p className="text-[11px] text-[var(--color-text-muted)] text-center py-1.5 px-2 truncate max-w-[360px]">
                {asset.ai_description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
