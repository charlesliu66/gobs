import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductionShot, SceneSheet } from '../productionTypes';

interface ShotMedia {
  shot: ProductionShot;
  vSrc: string | null;
  thumb: string | null;
  storyLine: string;
}

export function ScreeningRoomPlayer({
  shots,
  scSheets,
  resolveVideoSrc,
  buildStoryLine,
}: {
  shots: ProductionShot[];
  scSheets: SceneSheet[];
  resolveVideoSrc: (shot: ProductionShot) => string | null;
  buildStoryLine: (shot: ProductionShot) => string;
}) {
  const media: ShotMedia[] = shots.map((shot) => {
    const scImg = scSheets.find((sc) => sc.sceneRef === shot.sceneRef)?.variants[0]?.imageDataUrl;
    const thumb = shot.previewStillDataUrl || scImg || null;
    return { shot, vSrc: resolveVideoSrc(shot), thumb, storyLine: buildStoryLine(shot) };
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = media[currentIdx] ?? null;

  const goTo = useCallback(
    (idx: number) => {
      setCurrentIdx(Math.max(0, Math.min(idx, media.length - 1)));
    },
    [media.length],
  );

  const goNext = useCallback(() => {
    setCurrentIdx((prev) => (prev < media.length - 1 ? prev + 1 : prev));
  }, [media.length]);

  const goPrev = useCallback(() => {
    setCurrentIdx((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // 无视频镜头停留 2 秒后自动跳下一镜
  useEffect(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (!current?.vSrc && currentIdx < media.length - 1) {
      autoAdvanceTimer.current = setTimeout(goNext, 2000);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [currentIdx, current?.vSrc, media.length, goNext]);

  // 切镜后胶片条滚动到当前帧居中
  useEffect(() => {
    const strip = filmstripRef.current;
    if (!strip) return;
    const item = strip.children[currentIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentIdx]);

  // 切镜后尝试自动播放（用户已交互则生效）
  useEffect(() => {
    if (current?.vSrc) {
      videoRef.current?.play().catch(() => {
        // 浏览器阻止 autoplay，用户手动点播放即可，忽略错误
      });
    }
  }, [currentIdx, current?.vSrc]);

  if (media.length === 0) return null;

  const hasVideo = !!current?.vSrc;
  const generatedCount = media.filter((m) => m.vSrc).length;

  return (
    <div className="space-y-2">
      {/* 主播放区 */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        {hasVideo ? (
          <video
            key={currentIdx}
            ref={videoRef}
            src={current.vSrc!}
            poster={current.thumb || undefined}
            controls
            playsInline
            className="h-full w-full object-contain"
            onEnded={goNext}
          />
        ) : current?.thumb ? (
          <img src={current.thumb} alt="" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/40">
            无预览内容
          </div>
        )}

        {/* 顶部信息栏 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-3 py-2">
          <span className="text-xs font-medium text-white/90">
            镜{current?.shot.shotIndex}
            <span className="ml-1.5 font-normal text-white/50">/ 共{media.length}镜</span>
            {!hasVideo && (
              <span className="ml-2 text-[10px] text-yellow-400/80">（静帧占位，2s后自动跳下一镜）</span>
            )}
          </span>
          <div className="pointer-events-auto flex gap-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIdx === media.length - 1}
              className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/80 hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ▶
            </button>
          </div>
        </div>

        {/* 底部描述栏 */}
        {current?.storyLine && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6">
            <p className="line-clamp-2 text-[11px] leading-relaxed text-white/75">
              {current.storyLine.slice(0, 120)}
              {current.storyLine.length > 120 ? '…' : ''}
            </p>
          </div>
        )}
      </div>

      {/* 胶片条 */}
      <div
        ref={filmstripRef}
        className="flex gap-1.5 overflow-x-auto py-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {media.map((m, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => goTo(idx)}
            className={`relative flex-none overflow-hidden rounded transition-all focus:outline-none ${
              idx === currentIdx
                ? 'ring-2 ring-[var(--color-primary)] ring-offset-1 ring-offset-[var(--color-surface-elevated)]'
                : 'opacity-55 hover:opacity-85'
            }`}
            style={{ width: 72, height: 42 }}
          >
            {m.thumb ? (
              <img src={m.thumb} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/60 text-[9px] text-white/40">
                无图
              </div>
            )}
            {/* 视频状态指示点 */}
            <span
              className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${
                m.vSrc ? 'bg-green-400' : 'bg-gray-500/80'
              }`}
            />
            {/* 镜号标签 */}
            <span className="absolute inset-x-0 bottom-0 bg-black/65 py-px text-center text-[9px] leading-3 text-white/80">
              镜{m.shot.shotIndex}
            </span>
          </button>
        ))}
      </div>

      {/* 图例 + 进度统计 */}
      <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-muted)]">
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-400 align-middle" />
          已生成视频（{generatedCount}/{media.length}）
        </span>
        <span>
          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-gray-500/80 align-middle" />
          尚未生成
        </span>
      </div>
    </div>
  );
}
