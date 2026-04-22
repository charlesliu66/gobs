export const EDITOR_AGENT_MEMORY_VERSION = 1 as const;

export type AgentMessageRole = 'user' | 'assistant' | 'system';
export type AgentMessageKind = 'chat' | 'apply_request' | 'apply_result' | 'feedback';
export type AgentMessageRoute = 'chat' | 'apply' | 'apply_stream' | 'system';

export type MemoryEvidenceSource =
  | 'explicit_user'
  | 'behavior_inference'
  | 'manual_feedback'
  | 'system_inference';

export interface MemoryEvidenceMetadata {
  source: MemoryEvidenceSource;
  confidence: number;
  evidenceCount: number;
  lastConfirmedAt: string;
}

export interface AgentMessageEvent {
  id: string;
  role: AgentMessageRole;
  kind: AgentMessageKind;
  route: AgentMessageRoute;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface EditorMemorySignal extends MemoryEvidenceMetadata {
  id: string;
  key: string;
  value: string;
  note?: string;
}

export interface EditorProjectDecisionRecord extends MemoryEvidenceMetadata {
  id: string;
  decision: string;
  outcome: 'accepted' | 'rejected' | 'pending';
  note?: string;
}

export interface EditorMemorySummarySnapshot {
  version: typeof EDITOR_AGENT_MEMORY_VERSION;
  generatedAt: string;
  recentTurns: number;
  stableFactCount: number;
  preferenceCount: number;
  negativePreferenceCount: number;
  decisionCount: number;
  openIssueCount: number;
  summaryText: string;
}

export interface EditorProjectMemory {
  version: typeof EDITOR_AGENT_MEMORY_VERSION;
  updatedAt: string;
  rawEvents: AgentMessageEvent[];
  stableFacts: EditorMemorySignal[];
  preferenceSignals: EditorMemorySignal[];
  negativePreferenceSignals: EditorMemorySignal[];
  decisionLog: EditorProjectDecisionRecord[];
  openIssues: string[];
  summary: EditorMemorySummarySnapshot;
}

export type EditorResponseStyle = 'brief_direct' | 'brief_with_reason' | 'detailed_explanatory';
export type EditorCollaborationMode = 'act_then_report' | 'propose_then_confirm' | 'confirm_before_action';
export type EditorControlPreference = 'auto_execute' | 'guided_suggestions' | 'high_control';
export type EditorPacePreference = 'fast_push' | 'steady_iteration';
export type EditorPlatformLanguageStyle = 'business_focused' | 'creative_focused' | 'execution_focused';

export interface EditorCommunicationDimension<T extends string> extends MemoryEvidenceMetadata {
  value: T;
  reason?: string;
}

export interface EditorUserCommunicationProfile {
  version: typeof EDITOR_AGENT_MEMORY_VERSION;
  username: string;
  updatedAt: string;
  responseStyle?: EditorCommunicationDimension<EditorResponseStyle>;
  collaborationMode?: EditorCommunicationDimension<EditorCollaborationMode>;
  controlPreference?: EditorCommunicationDimension<EditorControlPreference>;
  pacePreference?: EditorCommunicationDimension<EditorPacePreference>;
  platformLanguageStyle?: EditorCommunicationDimension<EditorPlatformLanguageStyle>;
  negativePreferences: EditorMemorySignal[];
  summary?: EditorMemorySummarySnapshot;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asIsoString(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : fallback;
}

function clampConfidence(value: unknown, fallback = 0.35): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function normalizeEvidence(
  value: unknown,
  nowIso: string,
  fallbackSource: MemoryEvidenceSource,
): MemoryEvidenceMetadata {
  const raw = isObject(value) ? value : {};
  const source = raw.source;
  return {
    source:
      source === 'explicit_user' ||
      source === 'behavior_inference' ||
      source === 'manual_feedback' ||
      source === 'system_inference'
        ? source
        : fallbackSource,
    confidence: clampConfidence(raw.confidence),
    evidenceCount:
      typeof raw.evidenceCount === 'number' && Number.isFinite(raw.evidenceCount) && raw.evidenceCount > 0
        ? Math.round(raw.evidenceCount)
        : 1,
    lastConfirmedAt: asIsoString(raw.lastConfirmedAt, nowIso),
  };
}

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeAgentMessageEvent(value: unknown, nowIso: string): AgentMessageEvent | null {
  const raw = isObject(value) ? value : {};
  const content = normalizeString(raw.content);
  if (!content) return null;
  return {
    id: normalizeString(raw.id) ?? nextId('evt'),
    role: raw.role === 'assistant' || raw.role === 'system' ? raw.role : 'user',
    kind:
      raw.kind === 'apply_request' || raw.kind === 'apply_result' || raw.kind === 'feedback'
        ? raw.kind
        : 'chat',
    route:
      raw.route === 'apply' || raw.route === 'apply_stream' || raw.route === 'system'
        ? raw.route
        : 'chat',
    content,
    createdAt: asIsoString(raw.createdAt, nowIso),
    metadata: isObject(raw.metadata) ? raw.metadata : undefined,
  };
}

function normalizeEditorMemorySignal(
  value: unknown,
  nowIso: string,
  fallbackSource: MemoryEvidenceSource,
): EditorMemorySignal | null {
  const raw = isObject(value) ? value : {};
  const key = normalizeString(raw.key);
  const signalValue = normalizeString(raw.value);
  if (!key || !signalValue) return null;
  return {
    id: normalizeString(raw.id) ?? nextId('mem'),
    key,
    value: signalValue,
    note: normalizeString(raw.note),
    ...normalizeEvidence(raw, nowIso, fallbackSource),
  };
}

function normalizeDecisionRecord(value: unknown, nowIso: string): EditorProjectDecisionRecord | null {
  const raw = isObject(value) ? value : {};
  const decision = normalizeString(raw.decision);
  if (!decision) return null;
  return {
    id: normalizeString(raw.id) ?? nextId('decision'),
    decision,
    outcome: raw.outcome === 'accepted' || raw.outcome === 'rejected' ? raw.outcome : 'pending',
    note: normalizeString(raw.note),
    ...normalizeEvidence(raw, nowIso, 'system_inference'),
  };
}

function normalizeDimension<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  nowIso: string,
): EditorCommunicationDimension<T> | undefined {
  const raw = isObject(value) ? value : {};
  const dimensionValue = normalizeString(raw.value);
  if (!dimensionValue || !allowedValues.includes(dimensionValue as T)) return undefined;
  return {
    value: dimensionValue as T,
    reason: normalizeString(raw.reason),
    ...normalizeEvidence(raw, nowIso, 'behavior_inference'),
  };
}

function summaryList(items: EditorMemorySignal[], prefix: string): string | null {
  if (items.length === 0) return null;
  return `${prefix}: ${items.map((item) => `${item.key}=${item.value}`).join(', ')}`;
}

export function buildEditorProjectMemorySummary(
  memory: Omit<EditorProjectMemory, 'summary'> | EditorProjectMemory,
  nowIso = new Date().toISOString(),
): EditorMemorySummarySnapshot {
  const parts = [
    summaryList(memory.stableFacts, 'facts'),
    summaryList(memory.preferenceSignals, 'preferences'),
    summaryList(memory.negativePreferenceSignals, 'avoid'),
    memory.openIssues.length > 0 ? `open_issues: ${memory.openIssues.join(', ')}` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    version: EDITOR_AGENT_MEMORY_VERSION,
    generatedAt: nowIso,
    recentTurns: memory.rawEvents.length,
    stableFactCount: memory.stableFacts.length,
    preferenceCount: memory.preferenceSignals.length,
    negativePreferenceCount: memory.negativePreferenceSignals.length,
    decisionCount: memory.decisionLog.length,
    openIssueCount: memory.openIssues.length,
    summaryText: parts.join(' | '),
  };
}

export function normalizeEditorProjectMemory(
  value: unknown,
  nowIso = new Date().toISOString(),
): EditorProjectMemory {
  const raw = isObject(value) ? value : {};
  const rawEvents = Array.isArray(raw.rawEvents)
    ? raw.rawEvents
        .map((item) => normalizeAgentMessageEvent(item, nowIso))
        .filter((item): item is AgentMessageEvent => Boolean(item))
    : [];
  const stableFacts = Array.isArray(raw.stableFacts)
    ? raw.stableFacts
        .map((item) => normalizeEditorMemorySignal(item, nowIso, 'system_inference'))
        .filter((item): item is EditorMemorySignal => Boolean(item))
    : [];
  const preferenceSignals = Array.isArray(raw.preferenceSignals)
    ? raw.preferenceSignals
        .map((item) => normalizeEditorMemorySignal(item, nowIso, 'explicit_user'))
        .filter((item): item is EditorMemorySignal => Boolean(item))
    : [];
  const negativePreferenceSignals = Array.isArray(raw.negativePreferenceSignals)
    ? raw.negativePreferenceSignals
        .map((item) => normalizeEditorMemorySignal(item, nowIso, 'explicit_user'))
        .filter((item): item is EditorMemorySignal => Boolean(item))
    : [];
  const decisionLog = Array.isArray(raw.decisionLog)
    ? raw.decisionLog
        .map((item) => normalizeDecisionRecord(item, nowIso))
        .filter((item): item is EditorProjectDecisionRecord => Boolean(item))
    : [];
  const openIssues = Array.isArray(raw.openIssues)
    ? raw.openIssues
        .map((item) => normalizeString(item))
        .filter((item): item is string => Boolean(item))
    : [];

  const memoryBase = {
    version: EDITOR_AGENT_MEMORY_VERSION,
    updatedAt: asIsoString(raw.updatedAt, nowIso),
    rawEvents,
    stableFacts,
    preferenceSignals,
    negativePreferenceSignals,
    decisionLog,
    openIssues,
  };

  return {
    ...memoryBase,
    summary: buildEditorProjectMemorySummary(memoryBase, nowIso),
  };
}

export function normalizeEditorUserCommunicationProfile(
  value: unknown,
  username: string,
  nowIso = new Date().toISOString(),
): EditorUserCommunicationProfile {
  const raw = isObject(value) ? value : {};
  const negativePreferences = Array.isArray(raw.negativePreferences)
    ? raw.negativePreferences
        .map((item) => normalizeEditorMemorySignal(item, nowIso, 'explicit_user'))
        .filter((item): item is EditorMemorySignal => Boolean(item))
    : [];

  const summarySource = {
    version: EDITOR_AGENT_MEMORY_VERSION,
    updatedAt: asIsoString(raw.updatedAt, nowIso),
    rawEvents: [],
    stableFacts: [],
    preferenceSignals: [],
    negativePreferenceSignals: negativePreferences,
    decisionLog: [],
    openIssues: [],
  };

  return {
    version: EDITOR_AGENT_MEMORY_VERSION,
    username,
    updatedAt: summarySource.updatedAt,
    responseStyle: normalizeDimension(raw.responseStyle, ['brief_direct', 'brief_with_reason', 'detailed_explanatory'], nowIso),
    collaborationMode: normalizeDimension(raw.collaborationMode, ['act_then_report', 'propose_then_confirm', 'confirm_before_action'], nowIso),
    controlPreference: normalizeDimension(raw.controlPreference, ['auto_execute', 'guided_suggestions', 'high_control'], nowIso),
    pacePreference: normalizeDimension(raw.pacePreference, ['fast_push', 'steady_iteration'], nowIso),
    platformLanguageStyle: normalizeDimension(raw.platformLanguageStyle, ['business_focused', 'creative_focused', 'execution_focused'], nowIso),
    negativePreferences,
    summary: buildEditorProjectMemorySummary(summarySource, nowIso),
  };
}
