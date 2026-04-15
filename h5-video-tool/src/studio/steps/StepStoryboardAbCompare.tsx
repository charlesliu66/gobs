import { useEffect, useRef, useState } from 'react';
import type { ProductionShotVideoVersion } from '../productionTypes';

export function StepStoryboardAbCompare({
  versions,
  onClose,
}: {
  versions: ProductionShotVideoVersion[];
  onClose: () => void;
}) {
  const [versionA, setVersionA] = useState<string>(versions[0]?.id ?? '');
  const [versionB, setVersionB] = useState<string>(versions[1]?.id ?? '');
  const [labels, setLabels] = useState<Record<string, string>>({});
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  const srcA = versions.find((v) => v.id === versionA);
  const srcB = versions.find((v) => v.id === versionB);

  const resolveUrl = (v?: ProductionShotVideoVersion) => {
    if (!v) return '';
    if (v.videoPath) return `/api/batch-jobs/video/${encodeURIComponent(v.id)}`;
    return v.videoUrl ?? '';
  };

  const handleSyncPlay = () => {
    const a = videoARef.current;
    const b = videoBRef.current;
    if (a && b) {
      a.currentTime = 0;
      b.currentTime = 0;
      a.play().catch(() => {});
      b.play().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (versions.length < 2) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
        <p className="text-[11px] text-[var(--color-text-muted)]">需要至少 2 个版本才能进行 A/B 对比</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-white/90">版本 A/B 对比</span>
        <div className="flex gap-2">
          <button type="button" onClick={handleSyncPlay} className="rounded-md bg-white/15 px-3 py-1 text-[11px] text-white hover:bg-white/25">
            同步播放
          </button>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1 text-sm text-white/70 hover:bg-white/10">
            关闭 (Esc)
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center gap-4 overflow-hidden px-6 pb-4">
        {/* Side A */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <select
            value={versionA}
            onChange={(e) => setVersionA(e.target.value)}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
          >
            {versions.map((v, i) => (
              <option key={v.id} value={v.id} className="bg-gray-900">
                V{versions.length - i} — {new Date(v.createdAt).toLocaleString('zh-CN')}
              </option>
            ))}
          </select>
          <video ref={videoARef} src={resolveUrl(srcA)} controls playsInline className="max-h-[55vh] w-full rounded-lg" />
          <input
            type="text"
            placeholder="版本 A 备注标签…"
            value={labels[versionA] ?? ''}
            onChange={(e) => setLabels((p) => ({ ...p, [versionA]: e.target.value }))}
            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white placeholder-white/30"
          />
        </div>

        {/* Side B */}
        <div className="flex flex-1 flex-col items-center gap-2">
          <select
            value={versionB}
            onChange={(e) => setVersionB(e.target.value)}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
          >
            {versions.map((v, i) => (
              <option key={v.id} value={v.id} className="bg-gray-900">
                V{versions.length - i} — {new Date(v.createdAt).toLocaleString('zh-CN')}
              </option>
            ))}
          </select>
          <video ref={videoBRef} src={resolveUrl(srcB)} controls playsInline className="max-h-[55vh] w-full rounded-lg" />
          <input
            type="text"
            placeholder="版本 B 备注标签…"
            value={labels[versionB] ?? ''}
            onChange={(e) => setLabels((p) => ({ ...p, [versionB]: e.target.value }))}
            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white placeholder-white/30"
          />
        </div>
      </div>
    </div>
  );
}
