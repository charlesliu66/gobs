import { useMemo, useState } from 'react';

import { useLocale } from '../../i18n/LocaleContext.tsx';
import {
  formatDate,
  formatMessage,
  formatRelativeTime,
  formatTime,
} from '../../i18n/locale.ts';
import type { ProductionShotVideoVersion } from '../productionTypes';

interface VersionTimelineProps {
  versions: ProductionShotVideoVersion[];
  selectedVersionId?: string;
  onSelect: (id: string) => void;
  onKeepOnly: (id: string) => void;
}

function getVersionSourceLabel(
  version: ProductionShotVideoVersion,
  t: (path: string) => string,
): string {
  if (version.id.startsWith('batch-')) return t('productionWizard.versionTimeline.sourceBatch');
  if (version.taskId?.startsWith('dreamina-')) {
    return t('productionWizard.versionTimeline.sourceDreamina');
  }
  return t('productionWizard.versionTimeline.sourceManual');
}

export function VersionTimeline({
  versions,
  selectedVersionId,
  onSelect,
  onKeepOnly,
}: VersionTimelineProps) {
  const [expanded, setExpanded] = useState(true);
  const { uiLocale, t } = useLocale();
  const text = (path: string, values?: Record<string, string | number>) =>
    formatMessage(t(path), values);

  const sorted = useMemo(
    () => [...versions].sort((left, right) => right.createdAt - left.createdAt),
    [versions],
  );

  if (sorted.length === 0) return null;

  const selectedId = selectedVersionId ?? sorted[0]?.id;

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {text('productionWizard.versionTimeline.title', { count: sorted.length })}
        </span>
        <span className="flex items-center gap-2">
          {selectedId && sorted.length > 1 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onKeepOnly(selectedId);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.stopPropagation();
                  onKeepOnly(selectedId);
                }
              }}
              className="cursor-pointer rounded border border-[var(--color-border)] px-1.5 py-0.5 hover:bg-[var(--color-surface-hover)]"
            >
              {t('productionWizard.versionTimeline.keepOnlyCurrent')}
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-200 ${expanded ? 'rotate-0' : '-rotate-90'}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="max-h-52 overflow-y-auto px-3 pb-2">
          {sorted.length >= 5 && (
            <div className="mb-2 rounded border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-[9px] text-amber-200/90">
              {text('productionWizard.versionTimeline.storageHint', { count: sorted.length })}
            </div>
          )}

          <div className="relative">
            <div className="absolute bottom-3 left-[7px] top-3 w-px bg-[var(--color-border)]" />

            {sorted.map((version, index) => {
              const active = selectedId === version.id;
              const isFirst = index === 0;
              const versionNumber = sorted.length - index;
              const sourceLabel = getVersionSourceLabel(version, t);
              const timestamp = version.createdAt || Date.now();

              return (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => onSelect(version.id)}
                  className={`group relative flex w-full items-start gap-3 rounded-lg py-1.5 pl-5 pr-2 text-left transition-all ${
                    active ? 'bg-[var(--color-primary)]/8' : 'hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <div
                    className={`absolute left-0 top-[10px] z-10 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 transition-all ${
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] shadow-[0_0_8px_rgba(124,141,255,0.4)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] group-hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-semibold ${
                          active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                        }`}
                      >
                        V{versionNumber}
                      </span>
                      {isFirst && (
                        <span className="rounded-sm bg-emerald-500/20 px-1 py-px text-[8px] font-medium text-emerald-400">
                          {t('productionWizard.versionTimeline.latest')}
                        </span>
                      )}
                      {active && !isFirst && (
                        <span className="rounded-sm bg-[var(--color-primary)]/20 px-1 py-px text-[8px] font-medium text-[var(--color-primary)]">
                          {t('productionWizard.versionTimeline.current')}
                        </span>
                      )}
                      <span
                        className={`ml-auto text-[9px] ${
                          active ? 'text-[var(--color-primary)]/70' : 'text-[var(--color-text-muted)]'
                        }`}
                      >
                        {formatRelativeTime(timestamp, uiLocale)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
                      <span>{sourceLabel}</span>
                      <span>/</span>
                      <span>
                        {version.videoPath
                          ? t('productionWizard.versionTimeline.persisted')
                          : t('productionWizard.versionTimeline.temporaryUrl')}
                      </span>
                      <span>/</span>
                      <span>
                        {formatDate(timestamp, uiLocale, { month: 'short', day: 'numeric' })}{' '}
                        {formatTime(timestamp, uiLocale, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
