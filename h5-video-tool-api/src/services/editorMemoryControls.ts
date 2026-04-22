import {
  buildEditorProjectMemorySummary,
  normalizeEditorProjectMemory,
  normalizeEditorUserCommunicationProfile,
  type EditorProjectMemory,
  type EditorUserCommunicationProfile,
} from '../types/editorAgentMemory.js';

export type ProjectMemoryBucket =
  | 'stableFacts'
  | 'preferenceSignals'
  | 'negativePreferenceSignals'
  | 'decisionLog'
  | 'openIssues';

export type UserProfileDimensionKey =
  | 'responseStyle'
  | 'collaborationMode'
  | 'controlPreference'
  | 'pacePreference'
  | 'platformLanguageStyle';

function slugifyFeedback(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return slug || 'feedback';
}

function withProjectMemorySummary(memory: EditorProjectMemory, nowIso: string): EditorProjectMemory {
  return {
    ...memory,
    updatedAt: nowIso,
    summary: buildEditorProjectMemorySummary(
      {
        ...memory,
        updatedAt: nowIso,
      },
      nowIso,
    ),
  };
}

export function rememberProjectFeedback(
  memoryLike: unknown,
  input: { mode: 'remember' | 'avoid'; text: string },
  options?: { nowIso?: string },
): EditorProjectMemory {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const memory = normalizeEditorProjectMemory(memoryLike, nowIso);
  const text = input.text.trim();
  if (!text) return memory;

  const keyBase = slugifyFeedback(text);
  const signal = {
    id: `${input.mode === 'remember' ? 'pref' : 'neg'}_${Math.random().toString(36).slice(2, 10)}`,
    key: `${input.mode === 'remember' ? 'manual_preference' : 'manual_avoid'}_${keyBase}`,
    value: text,
    note: 'manual feedback',
    source: 'manual_feedback' as const,
    confidence: 0.86,
    evidenceCount: 1,
    lastConfirmedAt: nowIso,
  };

  if (input.mode === 'remember') {
    return withProjectMemorySummary(
      {
        ...memory,
        preferenceSignals: [signal, ...memory.preferenceSignals.filter((item) => item.key !== signal.key)],
      },
      nowIso,
    );
  }

  return withProjectMemorySummary(
    {
      ...memory,
      negativePreferenceSignals: [signal, ...memory.negativePreferenceSignals.filter((item) => item.key !== signal.key)],
    },
    nowIso,
  );
}

export function removeProjectMemoryItem(
  memoryLike: unknown,
  target: { bucket: ProjectMemoryBucket; id?: string; value?: string },
  options?: { nowIso?: string },
): EditorProjectMemory {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const memory = normalizeEditorProjectMemory(memoryLike, nowIso);

  const matches = (item: { id?: string; value?: string }, openIssue?: string) => {
    if (target.id && item.id === target.id) return true;
    if (target.value && item.value === target.value) return true;
    if (target.value && openIssue === target.value) return true;
    return false;
  };

  const next: EditorProjectMemory = {
    ...memory,
    stableFacts:
      target.bucket === 'stableFacts'
        ? memory.stableFacts.filter((item) => !matches(item))
        : memory.stableFacts,
    preferenceSignals:
      target.bucket === 'preferenceSignals'
        ? memory.preferenceSignals.filter((item) => !matches(item))
        : memory.preferenceSignals,
    negativePreferenceSignals:
      target.bucket === 'negativePreferenceSignals'
        ? memory.negativePreferenceSignals.filter((item) => !matches(item))
        : memory.negativePreferenceSignals,
    decisionLog:
      target.bucket === 'decisionLog'
        ? memory.decisionLog.filter((item) => !matches(item))
        : memory.decisionLog,
    openIssues:
      target.bucket === 'openIssues'
        ? memory.openIssues.filter((item) => !matches({}, item))
        : memory.openIssues,
  };

  return withProjectMemorySummary(next, nowIso);
}

export function weakenUserProfileDimension(
  profileLike: unknown,
  dimension: UserProfileDimensionKey,
  options?: { username?: string; nowIso?: string },
): EditorUserCommunicationProfile {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const profile = normalizeEditorUserCommunicationProfile(
    profileLike,
    options?.username ?? 'default',
    nowIso,
  );
  const current = profile[dimension];
  if (!current) return profile;

  const weakened = {
    ...current,
    confidence: Math.max(0.18, Number((current.confidence - 0.25).toFixed(2))),
    evidenceCount: Math.max(1, current.evidenceCount - 1),
    lastConfirmedAt: nowIso,
  };

  return normalizeEditorUserCommunicationProfile(
    {
      ...profile,
      [dimension]: weakened,
      updatedAt: nowIso,
    },
    profile.username,
    nowIso,
  );
}
