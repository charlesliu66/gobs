import { useState, useRef, useEffect } from 'react';
import type { LibraryAsset } from '../../api/assetLibraryApi';
import { addFavorite, buildAssetFileUrl, deleteAsset, removeFavorite } from '../../api/assetLibraryApi';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { localizeAssetCategory } from './localize.ts';

const CATEGORY_COLORS: Record<string, string> = {
  角色: 'bg-blue-500/80',
  character: 'bg-blue-500/80',
  场景: 'bg-green-500/80',
  scene: 'bg-green-500/80',
  道具: 'bg-orange-500/80',
  武器道具: 'bg-orange-500/80',
  prop: 'bg-orange-500/80',
  物体: 'bg-teal-500/80',
  object: 'bg-teal-500/80',
  风格素材: 'bg-purple-500/80',
  UI素材: 'bg-purple-500/80',
  style: 'bg-purple-500/80',
  宣传图: 'bg-pink-500/80',
  poster: 'bg-pink-500/80',
  视频片段: 'bg-cyan-500/80',
  video: 'bg-cyan-500/80',
  未分类: 'bg-gray-500/60',
  uncategorized: 'bg-gray-500/60',
};

interface Props {
  asset: LibraryAsset;
  selected: boolean;
  highlighted?: boolean;
  onSelect: (id: string) => void;
  onClick: (asset: LibraryAsset) => void;
  onUseForGenerate: (asset: LibraryAsset) => void;
  onFavoriteChange?: (assetId: string, isFav: boolean) => void;
  onDelete?: (assetId: string) => void;
  draggable?: boolean;
}

export function AssetCard({
  asset,
  selected,
  highlighted,
  onSelect,
  onClick,
  onUseForGenerate,
  onFavoriteChange,
  onDelete,
  draggable = true,
}: Props) {
  const { uiLocale } = useLocale();
  const isEnglish = uiLocale === 'en';
  const text = isEnglish
    ? {
        useForGenerate: 'Use In Generate',
        delete: 'Delete',
        deleteConfirm: (name: string) => `Delete "${name}"?`,
      }
    : {
        useForGenerate: '用于生成',
        delete: '删除',
        deleteConfirm: (name: string) => `确认删除“${name}”？`,
      };

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
  const thumbUrl = asset.thumbnail_url ?? fileUrl;
  const category = asset.ai_category ?? '未分类';
  const catColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.未分类;

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function handleFavorite(event: React.MouseEvent) {
    event.stopPropagation();
    const next = !isFav;
    setIsFav(next);
    (next ? addFavorite(asset.id) : removeFavorite(asset.id)).catch(() => setIsFav(!next));
    onFavoriteChange?.(asset.id, next);
  }

  function handleMouseEnter() {
    setHovering(true);
    if (isVideo && videoRef.current) {
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch(() => {});
    }
    if (isImage && !imgError) {
      hoverTimer.current = setTimeout(() => {
        const rect = cardRef.current?.getBoundingClientRect();
        if (!rect) return;
        setPreviewPos({ x: rect.right + 12, y: Math.max(8, rect.top) });
      }, 400);
    }
  }

  function handleMouseLeave() {
    setHovering(false);
    setPreviewPos(null);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    if (isVideo && videoRef.current) videoRef.current.pause();
  }

  function handleDragStart(event: React.DragEvent) {
    event.dataTransfer.setData('application/x-asset-ids', JSON.stringify([asset.id]));
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <>
      <div
        ref={cardRef}
        draggable={draggable}
        onDragStart={handleDragStart}
        className={`group relative cursor-pointer overflow-hidden rounded-xl transition-all duration-150 ${
          highlighted
            ? 'animate-pulse ring-2 ring-green-400 ring-offset-1 ring-offset-[var(--color-surface)]'
            : selected
              ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface)]'
              : 'hover:ring-2 hover:ring-[var(--color-primary)]/40 hover:ring-offset-1 hover:ring-offset-[var(--color-surface)]'
        }`}
        onClick={() => onClick(asset)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative aspect-square overflow-hidden bg-[var(--color-surface-hover)]">
          {!visible ? (
            <div className="h-full w-full bg-[var(--color-surface-hover)]" />
          ) : imgError ? (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-sm text-[var(--color-text-muted)]">{isVideo ? 'VIDEO' : 'IMAGE'}</span>
            </div>
          ) : isVideo ? (
            hovering ? (
              <video
                ref={videoRef}
                src={fileUrl}
                className="h-full w-full object-cover"
                preload="metadata"
                muted
                playsInline
                loop
                autoPlay
                onError={() => setImgError(true)}
              />
            ) : (
              <img
                src={thumbUrl}
                alt={asset.filename}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            )
          ) : (
            <img
              src={thumbUrl}
              alt={asset.filename}
              className="h-full w-full object-cover"
              onError={() => setImgError(true)}
            />
          )}

          {isVideo && !imgError && !hovering && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                <span className="text-[11px] text-white">PLAY</span>
              </div>
            </div>
          )}

          {category !== '未分类' && category !== 'uncategorized' && (
            <div className="absolute right-2 top-2 z-10">
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm ${catColor}`}>
                {localizeAssetCategory(uiLocale, category)}
              </span>
            </div>
          )}

          <div
            className={`absolute left-2 top-2 z-10 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(asset.id);
            }}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                  : 'border-white/70 bg-black/50 backdrop-blur-sm'
              }`}
            >
              {selected && <span className="text-[10px] font-bold text-white">OK</span>}
            </div>
          </div>

          <div
            className={`absolute bottom-2 left-2 z-10 transition-opacity ${isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={handleFavorite}
          >
            <span
              className={`cursor-pointer text-base font-bold transition-transform hover:scale-125 ${
                isFav ? 'text-yellow-400' : 'text-white/70'
              }`}
            >
              {isFav ? '*' : '+'}
            </span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex bg-gradient-to-t from-black/85 via-black/60 to-transparent pt-6">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onUseForGenerate(asset);
                }}
                className="flex-1 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-white/10"
              >
                {text.useForGenerate}
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!window.confirm(text.deleteConfirm(asset.filename))) return;
                    void deleteAsset(asset.id).then(() => onDelete(asset.id)).catch(() => {});
                  }}
                  className="px-3 py-2 text-center text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
                  title={text.delete}
                >
                  DEL
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface-elevated)] px-2 py-2">
          <p className="truncate text-xs font-medium leading-snug text-[var(--color-text)]" title={asset.filename}>
            {asset.filename}
          </p>
          {asset.ai_description && (
            <p
              className="mt-0.5 truncate text-[10px] leading-snug text-[var(--color-text-subtle)]"
              title={asset.ai_description}
            >
              {asset.ai_description}
            </p>
          )}
        </div>
      </div>

      {previewPos && isImage && !imgError && (
        <div className="pointer-events-none fixed z-[9999]" style={{ left: previewPos.x, top: previewPos.y }}>
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-2xl">
            <img src={fileUrl} alt={asset.filename} className="max-h-[360px] max-w-[360px] rounded-xl object-contain" />
            {asset.ai_description && (
              <p className="max-w-[360px] truncate px-2 py-1.5 text-center text-[11px] text-[var(--color-text-muted)]">
                {asset.ai_description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
