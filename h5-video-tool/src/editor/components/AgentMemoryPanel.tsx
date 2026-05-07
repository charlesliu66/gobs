import React from 'react';

import type {
  EditorProjectMemoryBucket,
  EditorUserProfileDimensionKey,
} from '../../api/editorMemory';
import { useLocale } from '../../i18n/LocaleContext.tsx';
import { formatMessage } from '../../i18n/locale.ts';
import type {
  EditorProjectMemory,
  EditorUserCommunicationProfile,
} from '../types/agentMemory';

interface AgentMemoryPanelProps {
  projectMemory?: EditorProjectMemory | null;
  userCommunicationProfile?: EditorUserCommunicationProfile | null;
  draftInput: string;
  busy: boolean;
  onRememberDraft: (text: string) => void | Promise<void>;
  onAvoidDraft: (text: string) => void | Promise<void>;
  onDeleteProjectItem: (
    bucket: EditorProjectMemoryBucket,
    target: { id?: string; value?: string },
  ) => void | Promise<void>;
  onWeakenProfileDimension: (dimension: EditorUserProfileDimensionKey) => void | Promise<void>;
}

void React;

type ProfileRow = {
  key: EditorUserProfileDimensionKey;
  label: string;
  value?: string;
  confidence?: number;
};

function confidenceLabel(
  confidence: number | undefined,
  t: (path: string) => string,
): string {
  if ((confidence ?? 0) >= 0.75) return t('agentMemoryPanel.confidenceStrong');
  if ((confidence ?? 0) >= 0.55) return t('agentMemoryPanel.confidenceNormal');
  return t('agentMemoryPanel.confidenceHint');
}

function signalClass(confidence: number | undefined): string {
  return (confidence ?? 0) >= 0.75
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : (confidence ?? 0) >= 0.55
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';
}

function renderSignalList(
  title: string,
  t: (path: string) => string,
  bucket: EditorProjectMemoryBucket,
  items: Array<{ id: string; value: string; confidence?: number }>,
  onDeleteProjectItem: AgentMemoryPanelProps['onDeleteProjectItem'],
) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
          >
            <div className="min-w-0">
              <div className="text-[11px] leading-relaxed text-[var(--color-text)]">{item.value}</div>
              <span
                className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] ${signalClass(item.confidence)}`}
              >
                {confidenceLabel(item.confidence, t)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void onDeleteProjectItem(bucket, { id: item.id })}
              className="shrink-0 rounded border border-red-500/35 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
            >
              {t('common.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentMemoryPanel({
  projectMemory,
  userCommunicationProfile,
  draftInput,
  busy,
  onRememberDraft,
  onAvoidDraft,
  onDeleteProjectItem,
  onWeakenProfileDimension,
}: AgentMemoryPanelProps) {
  const { t } = useLocale();
  const tx = (path: string, values?: Record<string, string | number>) =>
    formatMessage(t(path), values);
  const draft = draftInput.trim();
  const preferenceSignals = projectMemory?.preferenceSignals ?? [];
  const negativePreferenceSignals = projectMemory?.negativePreferenceSignals ?? [];
  const stableFacts = projectMemory?.stableFacts ?? [];
  const openIssues = projectMemory?.openIssues ?? [];

  const profileRows: ProfileRow[] = [
    {
      key: 'responseStyle' as EditorUserProfileDimensionKey,
      label: 'responseStyle',
      value: userCommunicationProfile?.responseStyle?.value,
      confidence: userCommunicationProfile?.responseStyle?.confidence,
    },
    {
      key: 'collaborationMode' as EditorUserProfileDimensionKey,
      label: 'collaborationMode',
      value: userCommunicationProfile?.collaborationMode?.value,
      confidence: userCommunicationProfile?.collaborationMode?.confidence,
    },
    {
      key: 'controlPreference' as EditorUserProfileDimensionKey,
      label: 'controlPreference',
      value: userCommunicationProfile?.controlPreference?.value,
      confidence: userCommunicationProfile?.controlPreference?.confidence,
    },
    {
      key: 'pacePreference' as EditorUserProfileDimensionKey,
      label: 'pacePreference',
      value: userCommunicationProfile?.pacePreference?.value,
      confidence: userCommunicationProfile?.pacePreference?.confidence,
    },
    {
      key: 'platformLanguageStyle' as EditorUserProfileDimensionKey,
      label: 'platformLanguageStyle',
      value: userCommunicationProfile?.platformLanguageStyle?.value,
      confidence: userCommunicationProfile?.platformLanguageStyle?.confidence,
    },
  ].filter((item) => Boolean(item.value));

  const hasAnyMemory =
    preferenceSignals.length > 0 ||
    negativePreferenceSignals.length > 0 ||
    stableFacts.length > 0 ||
    openIssues.length > 0 ||
    profileRows.length > 0;

  return (
    <div className="border-b border-[var(--color-border)] px-3 py-2">
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold text-[var(--color-text)]">{t('agentMemoryPanel.title')}</div>
            <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              {t('agentMemoryPanel.description')}
            </div>
          </div>
          <div className="text-right text-[10px] text-[var(--color-text-muted)]">
            <div>
              {tx('agentMemoryPanel.projectMemoriesCount', {
                count: projectMemory?.summary.preferenceCount ?? 0,
              })}
            </div>
            <div>
              {tx('agentMemoryPanel.avoidSignalsCount', {
                count: projectMemory?.summary.negativePreferenceCount ?? 0,
              })}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !draft}
            onClick={() => void onRememberDraft(draft)}
            className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {t('agentMemoryPanel.rememberPreference')}
          </button>
          <button
            type="button"
            disabled={busy || !draft}
            onClick={() => void onAvoidDraft(draft)}
            className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
          >
            {t('agentMemoryPanel.avoidDoingThis')}
          </button>
        </div>

        {hasAnyMemory ? (
          <div className="mt-3 space-y-3">
            {renderSignalList(
              t('agentMemoryPanel.projectPreferences'),
              t,
              'preferenceSignals',
              preferenceSignals.map((item) => ({
                id: item.id,
                value: item.value,
                confidence: item.confidence,
              })),
              onDeleteProjectItem,
            )}
            {renderSignalList(
              t('agentMemoryPanel.projectAvoid'),
              t,
              'negativePreferenceSignals',
              negativePreferenceSignals.map((item) => ({
                id: item.id,
                value: item.value,
                confidence: item.confidence,
              })),
              onDeleteProjectItem,
            )}
            {renderSignalList(
              t('agentMemoryPanel.projectFacts'),
              t,
              'stableFacts',
              stableFacts.map((item) => ({
                id: item.id,
                value: item.value,
                confidence: item.confidence,
              })),
              onDeleteProjectItem,
            )}

            {openIssues.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  {t('agentMemoryPanel.openIssues')}
                </div>
                {openIssues.map((item) => (
                  <div
                    key={item}
                    className="flex items-start justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
                  >
                    <div className="text-[11px] leading-relaxed text-[var(--color-text)]">{item}</div>
                    <button
                      type="button"
                      onClick={() => void onDeleteProjectItem('openIssues', { value: item })}
                      className="shrink-0 rounded border border-red-500/35 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {profileRows.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  {t('agentMemoryPanel.userCommunicationProfile')}
                </div>
                {profileRows.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] text-[var(--color-text-muted)]">{item.label}</div>
                      <div className="text-[11px] font-medium text-[var(--color-text)]">{item.value}</div>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9px] ${signalClass(item.confidence)}`}
                      >
                        {confidenceLabel(item.confidence, t)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onWeakenProfileDimension(item.key)}
                      className="shrink-0 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/20"
                    >
                      {t('agentMemoryPanel.weaken')}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-4 text-[10px] text-[var(--color-text-muted)]">
            {t('agentMemoryPanel.emptyState')}
          </div>
        )}
      </div>
    </div>
  );
}
