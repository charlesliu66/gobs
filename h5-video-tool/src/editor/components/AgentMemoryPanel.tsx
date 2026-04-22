import React from 'react';
import type {
  EditorProjectMemory,
  EditorUserCommunicationProfile,
} from '../types/agentMemory';
import type {
  EditorProjectMemoryBucket,
  EditorUserProfileDimensionKey,
} from '../../api/editorMemory';

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

function confidenceLabel(confidence: number | undefined): string {
  if ((confidence ?? 0) >= 0.75) return '强记忆';
  if ((confidence ?? 0) >= 0.55) return '普通';
  return '弱提示';
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
                {confidenceLabel(item.confidence)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void onDeleteProjectItem(bucket, { id: item.id })}
              className="shrink-0 rounded border border-red-500/35 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
            >
              删除
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
            <div className="text-[11px] font-semibold text-[var(--color-text)]">Agent 记忆</div>
            <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
              这里展示当前项目已记住的偏好，以及跨项目的沟通画像。
            </div>
          </div>
          <div className="text-right text-[10px] text-[var(--color-text-muted)]">
            <div>项目记忆 {projectMemory?.summary.preferenceCount ?? 0}</div>
            <div>负向偏好 {projectMemory?.summary.negativePreferenceCount ?? 0}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !draft}
            onClick={() => void onRememberDraft(draft)}
            className="rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[10px] text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
          >
            记住这个偏好
          </button>
          <button
            type="button"
            disabled={busy || !draft}
            onClick={() => void onAvoidDraft(draft)}
            className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-[10px] text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
          >
            不要再这样做
          </button>
        </div>

        {hasAnyMemory ? (
          <div className="mt-3 space-y-3">
            {renderSignalList(
              'Project Preferences',
              'preferenceSignals',
              preferenceSignals.map((item) => ({
                id: item.id,
                value: item.value,
                confidence: item.confidence,
              })),
              onDeleteProjectItem,
            )}
            {renderSignalList(
              'Project Avoid',
              'negativePreferenceSignals',
              negativePreferenceSignals.map((item) => ({
                id: item.id,
                value: item.value,
                confidence: item.confidence,
              })),
              onDeleteProjectItem,
            )}
            {renderSignalList(
              'Project Facts',
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
                  Open Issues
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
                      删除
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {profileRows.length > 0 ? (
              <div className="space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  User Communication Profile
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
                        {confidenceLabel(item.confidence)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onWeakenProfileDimension(item.key)}
                      className="shrink-0 rounded border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200 hover:bg-amber-500/20"
                    >
                      减弱
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-4 text-[10px] text-[var(--color-text-muted)]">
            当前还没有沉淀出可见记忆。先多对话几轮，或直接用上面的反馈按钮告诉 Agent 你想记住什么。
          </div>
        )}
      </div>
    </div>
  );
}
