import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProductionShot } from '../productionTypes';

export function StepStoryboardContinuousPlay({
  shots,
  resolveVideoSrc,
  onClose,
  onSelectShot,
}: {
  shots: ProductionShot[];
  resolveVideoSrc: (shot: ProductionShot) => string | null;
  onClose: () => void;
  onSelectShot: (idx: number) => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playError, setPlayError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const playableShots = shots
    .map((s, i) => ({ shot: s, idx: i, src: resolveVideoSrc(s) }))
    .filter((x): x is typeof x & { src: string } => !!x.src);

  const totalDuration = playableShots.reduce((sum, x) => sum + (x.shot.durationSec || 6), 0);
  const current = playableShots[currentIdx];

  const goNext = useCallback(() => {
    if (currentIdx < playableShots.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentIdx, playableShots.length]);

  const goPrev = useCallback(() => {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !current) return;
    v.src = current.src;
    setPlayError(null);
    if (isPlaying) {
      // P1-4：当浏览器 autoplay 策略 / 404 / decode 失败时把错误展示出来，
      // 避免静默卡住（旧实现是 catch(() => {})）。
      v.play().catch((err: unknown) => {
        console.warn('[continuous-play] play rejected', err);
        setPlayError(err instanceof Error ? err.message : '播放失败');
        setIsPlaying(false);
      });
    }
  }, [currentIdx, current?.src, isPlaying]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, onClose]);

  if (playableShots.length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="rounded-xl bg-[var(--color-surface-elevated)] p-8 text-center">
          <p className="text-sm text-[var(--color-text)]">暂无可播放的分镜视频</p>
          <button type="button" onClick={onClose} className="mt-4 rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm text-white">
            关闭
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="text-sm text-white/80">
          连续播放 — 镜头 {currentIdx + 1}/{playableShots.length}
          <span className="ml-3 text-[11px] text-white/50">
            #{current?.shot.shotIndex} · 共 {Math.round(totalDuration)}s · {shots.length - playableShots.length} 个缺失
          </span>
        </div>
        <button type="button" onClick={onClose} className="rounded-md px-3 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white">
          关闭 (Esc)
        </button>
      </div>

      {/* Video */}
      <div className="flex flex-1 items-center justify-center px-8">
        <video
          ref={videoRef}
          controls
          playsInline
          autoPlay={isPlaying}
          onEnded={goNext}
          onPause={() => setIsPlaying(false)}
          onPlay={() => { setIsPlaying(true); setPlayError(null); }}
          onError={() => {
            const v = videoRef.current;
            const code = v?.error?.code;
            const detail = code ? `code ${code}` : '未知错误';
            setPlayError(`当前分镜加载失败（${detail}），可点击下一镜跳过`);
            setIsPlaying(false);
          }}
          className="max-h-[70vh] max-w-full rounded-lg"
        />
      </div>
      {playError ? (
        <div className="mx-auto mb-2 max-w-xl rounded-md bg-red-500/15 px-3 py-2 text-center text-xs text-red-300">
          {playError}
        </div>
      ) : null}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 pb-4">
        <button type="button" onClick={goPrev} disabled={currentIdx === 0} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-30">
          上一镜
        </button>
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="rounded-md bg-white/20 px-4 py-1.5 text-sm font-medium text-white"
        >
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button type="button" onClick={goNext} disabled={currentIdx >= playableShots.length - 1} className="rounded-md bg-white/10 px-3 py-1.5 text-sm text-white disabled:opacity-30">
          下一镜
        </button>
        <button
          type="button"
          onClick={() => {
            if (current) onSelectShot(current.idx);
            onClose();
          }}
          className="ml-4 rounded-md border border-white/20 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/10"
        >
          跳转编辑此镜
        </button>
      </div>

      {/* Thumbnail strip */}
      <div className="flex justify-center gap-1 overflow-x-auto px-4 pb-4">
        {playableShots.map((p, i) => (
          <button
            key={p.shot.shotIndex}
            type="button"
            onClick={() => setCurrentIdx(i)}
            className={`h-10 w-16 shrink-0 overflow-hidden rounded border transition-all ${
              i === currentIdx ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : 'border-white/15 opacity-60 hover:opacity-100'
            }`}
          >
            {p.shot.previewStillDataUrl ? (
              <img src={p.shot.previewStillDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[8px] text-white/50">#{p.shot.shotIndex}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
