import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { resolvePath } from '../infra/storage/resolver.js';
import {
  EDITOR_AGENT_MEMORY_VERSION,
  type EditorCommunicationDimension,
  type EditorControlPreference,
  type EditorMemorySignal,
  type EditorMemorySummarySnapshot,
  type EditorPacePreference,
  type EditorPlatformLanguageStyle,
  type EditorResponseStyle,
  type EditorCollaborationMode,
  type EditorUserCommunicationProfile,
} from '../types/editorAgentMemory.js';
import { sanitizeUsername } from '../utils/safeUsername.js';

interface UserProfileUpdateInput {
  username: string;
  userMessage?: string;
}

interface ExtractedSignals {
  responseStyle?: EditorResponseStyle;
  collaborationMode?: EditorCollaborationMode;
  controlPreference?: EditorControlPreference;
  pacePreference?: EditorPacePreference;
  platformLanguageStyle?: EditorPlatformLanguageStyle;
  negativePreferences: Array<{ key: string; value: string }>;
}

function profilePath(username: string, rootDir = resolvePath('.data')): string {
  return path.join(rootDir, 'editor-agent-profiles', `${sanitizeUsername(username)}.json`);
}

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function createSummary(profile: EditorUserCommunicationProfile, nowIso: string): EditorMemorySummarySnapshot {
  const parts: string[] = [];
  if (profile.responseStyle) parts.push(`response_style=${profile.responseStyle.value}`);
  if (profile.collaborationMode) parts.push(`collaboration=${profile.collaborationMode.value}`);
  if (profile.controlPreference) parts.push(`control=${profile.controlPreference.value}`);
  if (profile.pacePreference) parts.push(`pace=${profile.pacePreference.value}`);
  if (profile.platformLanguageStyle) parts.push(`language=${profile.platformLanguageStyle.value}`);
  if (profile.negativePreferences.length > 0) {
    parts.push(`avoid=${profile.negativePreferences.map((item) => item.key).join(', ')}`);
  }
  return {
    version: EDITOR_AGENT_MEMORY_VERSION,
    generatedAt: nowIso,
    recentTurns: 0,
    stableFactCount: 0,
    preferenceCount:
      Number(Boolean(profile.responseStyle)) +
      Number(Boolean(profile.collaborationMode)) +
      Number(Boolean(profile.controlPreference)) +
      Number(Boolean(profile.pacePreference)) +
      Number(Boolean(profile.platformLanguageStyle)),
    negativePreferenceCount: profile.negativePreferences.length,
    decisionCount: 0,
    openIssueCount: 0,
    summaryText: parts.join(' | '),
  };
}

function createEmptyProfile(username: string, nowIso: string): EditorUserCommunicationProfile {
  return {
    version: EDITOR_AGENT_MEMORY_VERSION,
    username,
    updatedAt: nowIso,
    negativePreferences: [],
    summary: {
      version: EDITOR_AGENT_MEMORY_VERSION,
      generatedAt: nowIso,
      recentTurns: 0,
      stableFactCount: 0,
      preferenceCount: 0,
      negativePreferenceCount: 0,
      decisionCount: 0,
      openIssueCount: 0,
      summaryText: '',
    },
  };
}

function mergeDimension<T extends string>(
  existing: EditorCommunicationDimension<T> | undefined,
  nextValue: T | undefined,
  nowIso: string,
): EditorCommunicationDimension<T> | undefined {
  if (!nextValue) return existing;
  if (!existing) {
    return {
      value: nextValue,
      source: 'explicit_user',
      confidence: 0.72,
      evidenceCount: 1,
      lastConfirmedAt: nowIso,
    };
  }
  if (existing.value === nextValue) {
    return {
      ...existing,
      source: 'explicit_user',
      confidence: clampConfidence(existing.confidence + 0.12),
      evidenceCount: existing.evidenceCount + 1,
      lastConfirmedAt: nowIso,
    };
  }
  return {
    value: nextValue,
    source: 'explicit_user',
    confidence: clampConfidence(existing.confidence - 0.24),
    evidenceCount: 1,
    lastConfirmedAt: nowIso,
  };
}

function mergeNegativePreferences(
  existing: EditorMemorySignal[],
  nextItems: Array<{ key: string; value: string }>,
  nowIso: string,
): EditorMemorySignal[] {
  if (nextItems.length === 0) return existing;
  const merged = [...existing];
  for (const item of nextItems) {
    const idx = merged.findIndex((entry) => entry.key === item.key);
    if (idx >= 0) {
      const prev = merged[idx]!;
      merged[idx] = {
        ...prev,
        value: item.value,
        confidence: clampConfidence(prev.confidence + 0.1),
        evidenceCount: prev.evidenceCount + 1,
        lastConfirmedAt: nowIso,
      };
      continue;
    }
    merged.push({
      id: nextId('neg'),
      key: item.key,
      value: item.value,
      source: 'explicit_user',
      confidence: 0.7,
      evidenceCount: 1,
      lastConfirmedAt: nowIso,
    });
  }
  return merged;
}

function extractSignals(userMessage: string | undefined): ExtractedSignals {
  const text = String(userMessage ?? '').trim();
  if (!text) {
    return { negativePreferences: [] };
  }

  const signals: ExtractedSignals = { negativePreferences: [] };

  if (/直接给我结果|先给我结果|简短点|简洁点|不用讲太多原因/u.test(text)) {
    signals.responseStyle = 'brief_direct';
  } else if (/详细解释|讲清楚原因|展开说说/u.test(text)) {
    signals.responseStyle = 'detailed_explanatory';
  } else if (/简单说一下原因|顺便说下原因|结果和原因都给我/u.test(text)) {
    signals.responseStyle = 'brief_with_reason';
  }

  if (/先给我方案|先别动|先确认|先告诉我怎么改/u.test(text)) {
    signals.collaborationMode = 'propose_then_confirm';
  } else if (/每一步都确认|确认后再执行/u.test(text)) {
    signals.collaborationMode = 'confirm_before_action';
  } else if (/直接做|先做了再说|做好给我看/u.test(text)) {
    signals.collaborationMode = 'act_then_report';
  }

  if (/先别自动|我来决定|每一步我确认/u.test(text)) {
    signals.controlPreference = 'high_control';
  } else if (/给我几个方案|给我建议/u.test(text)) {
    signals.controlPreference = 'guided_suggestions';
  } else if (/你来处理|自动执行|直接做/u.test(text)) {
    signals.controlPreference = 'auto_execute';
  }

  if (/快一点|尽快|直接推进/u.test(text)) {
    signals.pacePreference = 'fast_push';
  } else if (/慢慢来|一步一步|先稳一点/u.test(text)) {
    signals.pacePreference = 'steady_iteration';
  }

  if (/投放|转化|CTR|CVR|安装|ROI/i.test(text)) {
    signals.platformLanguageStyle = 'business_focused';
  } else if (/创意|hook|氛围|审美|角色感/i.test(text)) {
    signals.platformLanguageStyle = 'creative_focused';
  } else if (/时间轴|镜头|字幕|节奏|卡点/u.test(text)) {
    signals.platformLanguageStyle = 'execution_focused';
  }

  if (/不要再给我太长解释|不要太长解释|别讲太多原因|不用讲太多原因/u.test(text)) {
    signals.negativePreferences.push({
      key: 'avoid_long_explanations',
      value: 'long explanations',
    });
  }
  if (/不要慢节奏开头|不要太慢开头|别慢节奏开头/u.test(text)) {
    signals.negativePreferences.push({
      key: 'avoid_slow_intro',
      value: 'slow intro',
    });
  }

  return signals;
}

export function updateEditorUserCommunicationProfile(
  profileLike: unknown,
  input: UserProfileUpdateInput,
  options?: { nowIso?: string },
): EditorUserCommunicationProfile {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const username = sanitizeUsername(input.username);
  const base = (() => {
    try {
      const raw = profileLike as EditorUserCommunicationProfile | null | undefined;
      if (raw && typeof raw === 'object' && raw.username) {
        return {
          ...createEmptyProfile(username, nowIso),
          ...raw,
          username,
          updatedAt: nowIso,
          negativePreferences: Array.isArray(raw.negativePreferences) ? raw.negativePreferences : [],
        } satisfies EditorUserCommunicationProfile;
      }
    } catch {
      // fall through
    }
    return createEmptyProfile(username, nowIso);
  })();

  const signals = extractSignals(input.userMessage);
  const next: EditorUserCommunicationProfile = {
    ...base,
    username,
    updatedAt: nowIso,
    responseStyle: mergeDimension(base.responseStyle, signals.responseStyle, nowIso),
    collaborationMode: mergeDimension(base.collaborationMode, signals.collaborationMode, nowIso),
    controlPreference: mergeDimension(base.controlPreference, signals.controlPreference, nowIso),
    pacePreference: mergeDimension(base.pacePreference, signals.pacePreference, nowIso),
    platformLanguageStyle: mergeDimension(base.platformLanguageStyle, signals.platformLanguageStyle, nowIso),
    negativePreferences: mergeNegativePreferences(base.negativePreferences, signals.negativePreferences, nowIso),
  };
  return {
    ...next,
    summary: createSummary(next, nowIso),
  };
}

export async function loadEditorUserCommunicationProfile(username: string): Promise<EditorUserCommunicationProfile | null> {
  try {
    const raw = await readFile(profilePath(username), 'utf-8');
    return updateEditorUserCommunicationProfile(JSON.parse(raw) as unknown, { username });
  } catch {
    return null;
  }
}

export async function saveEditorUserCommunicationProfile(profile: EditorUserCommunicationProfile): Promise<void> {
  const target = profilePath(profile.username);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(profile, null, 2), 'utf-8');
}

export async function updateEditorUserCommunicationProfileForUser(
  username: string,
  input: Omit<UserProfileUpdateInput, 'username'>,
): Promise<EditorUserCommunicationProfile> {
  const existing = await loadEditorUserCommunicationProfile(username);
  const next = updateEditorUserCommunicationProfile(existing, {
    username,
    ...input,
  });
  await saveEditorUserCommunicationProfile(next);
  return next;
}
