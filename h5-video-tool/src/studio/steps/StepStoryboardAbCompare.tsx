import { useEffect, useRef, useState } from 'react';

import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatDateTime, formatMessage } from '../../i18n/locale.ts';
import { getVideoFileUrl } from '../../utils/videoHistory';
import type { ProductionShotVideoVersion } from '../productionTypes';

export function StepStoryboardAbCompare({
  versions,
  onClose,
}: {
  versions: ProductionShotVideoVersion[];
  onClose: () => void;
}) {
  const { uiLocale, t } = useLocale();
  const text = (path: string, values?: Record<string, string | number>) =>
    formatMessage(t(path), values);

  const [versionA, setVersionA] = useState<string>(versions[0]?.id ?? '');
  const [versionB, setVersionB] = useState<string>(versions[1]?.id ?? '');
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [errA, setErrA] = useState<string | null>(null);
  const [errB, setErrB] = useState<string | null>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);

  const srcA = versions.find((version) => version.id === versionA);
  const srcB = versions.find((version) => version.id === versionB);

  const resolveUrl = (version?: ProductionShotVideoVersion) => {
    if (!version) return '';
    const path = version.videoPath?.trim();
    if (path) return getVideoFileUrl(path);
    return version.videoUrl?.trim() ?? '';
  };

  const buildVersionOptionLabel = (version: ProductionShotVideoVersion, index: number) =>
    text('productionWizard.abCompare.versionOption', {
      versionNumber: versions.length - index,
      time: formatDateTime(version.createdAt, uiLocale),
    });

  const handleSyncPlay = () => {
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (videoA && videoB) {
      videoA.currentTime = 0;
      videoB.currentTime = 0;
      videoA.play().catch(() => {});
      videoB.play().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (versions.length < 2) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center">
        <p className="text-[11px] text-[var(--color-text-muted)]">
          {t('productionWizard.abCompare.needAtLeastTwoVersions')}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-white/90">
          {t('productionWizard.abCompare.title')}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSyncPlay}
            className="rounded-md bg-white/15 px-3 py-1 text-[11px] text-white hover:bg-white/25"
          >
            {t('productionWizard.abCompare.syncPlay')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1 text-sm text-white/70 hover:bg-white/10"
          >
            {t('productionWizard.abCompare.close')} (Esc)
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center gap-4 overflow-hidden px-6 pb-4">
        <div className="flex flex-1 flex-col items-center gap-2">
          <select
            value={versionA}
            onChange={(event) => setVersionA(event.target.value)}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
          >
            {versions.map((version, index) => (
              <option key={version.id} value={version.id} className="bg-gray-900">
                {buildVersionOptionLabel(version, index)}
              </option>
            ))}
          </select>
          <video
            ref={videoARef}
            src={resolveUrl(srcA)}
            controls
            playsInline
            className="max-h-[55vh] w-full rounded-lg"
            onLoadStart={() => setErrA(null)}
            onError={() => setErrA(t('productionWizard.abCompare.loadFailed'))}
          />
          {errA && <p className="w-full text-[11px] text-red-300">{errA}</p>}
          <input
            type="text"
            placeholder={t('productionWizard.abCompare.labelAPlaceholder')}
            value={labels[versionA] ?? ''}
            onChange={(event) => setLabels((prev) => ({ ...prev, [versionA]: event.target.value }))}
            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white placeholder-white/30"
          />
        </div>

        <div className="flex flex-1 flex-col items-center gap-2">
          <select
            value={versionB}
            onChange={(event) => setVersionB(event.target.value)}
            className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-white"
          >
            {versions.map((version, index) => (
              <option key={version.id} value={version.id} className="bg-gray-900">
                {buildVersionOptionLabel(version, index)}
              </option>
            ))}
          </select>
          <video
            ref={videoBRef}
            src={resolveUrl(srcB)}
            controls
            playsInline
            className="max-h-[55vh] w-full rounded-lg"
            onLoadStart={() => setErrB(null)}
            onError={() => setErrB(t('productionWizard.abCompare.loadFailed'))}
          />
          {errB && <p className="w-full text-[11px] text-red-300">{errB}</p>}
          <input
            type="text"
            placeholder={t('productionWizard.abCompare.labelBPlaceholder')}
            value={labels[versionB] ?? ''}
            onChange={(event) => setLabels((prev) => ({ ...prev, [versionB]: event.target.value }))}
            className="w-full rounded border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-white placeholder-white/30"
          />
        </div>
      </div>
    </div>
  );
}
