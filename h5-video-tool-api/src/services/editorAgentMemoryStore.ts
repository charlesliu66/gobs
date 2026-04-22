import {
  buildEditorProjectMemorySummary,
  normalizeEditorProjectMemory,
  type AgentMessageEvent,
  type EditorMemorySignal,
  type EditorProjectDecisionRecord,
  type EditorProjectMemory,
  type MemoryEvidenceSource,
} from '../types/editorAgentMemory.js';

export const DEFAULT_PROJECT_MEMORY_EVENT_LIMIT = 24;

type SignalInput = Partial<EditorMemorySignal> & {
  key: string;
  value: string;
};

type DecisionInput = Partial<EditorProjectDecisionRecord> & {
  decision: string;
};

export interface ProjectMemoryPromotionInput {
  stableFacts?: SignalInput[];
  preferenceSignals?: SignalInput[];
  negativePreferenceSignals?: SignalInput[];
  decisions?: DecisionInput[];
  openIssues?: string[];
}

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function clampConfidence(value: unknown, fallback = 0.6): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function buildSignal(
  value: SignalInput,
  nowIso: string,
  fallbackSource: MemoryEvidenceSource,
): EditorMemorySignal {
  return {
    id: asTrimmedString(value.id) ?? nextId('mem'),
    key: value.key.trim(),
    value: value.value.trim(),
    note: asTrimmedString(value.note),
    source: value.source ?? fallbackSource,
    confidence: clampConfidence(value.confidence),
    evidenceCount:
      typeof value.evidenceCount === 'number' && Number.isFinite(value.evidenceCount) && value.evidenceCount > 0
        ? Math.round(value.evidenceCount)
        : 1,
    lastConfirmedAt: asTrimmedString(value.lastConfirmedAt) ?? nowIso,
  };
}

function buildDecision(value: DecisionInput, nowIso: string): EditorProjectDecisionRecord {
  return {
    id: asTrimmedString(value.id) ?? nextId('decision'),
    decision: value.decision.trim(),
    outcome: value.outcome === 'accepted' || value.outcome === 'rejected' ? value.outcome : 'pending',
    note: asTrimmedString(value.note),
    source: value.source ?? 'system_inference',
    confidence: clampConfidence(value.confidence),
    evidenceCount:
      typeof value.evidenceCount === 'number' && Number.isFinite(value.evidenceCount) && value.evidenceCount > 0
        ? Math.round(value.evidenceCount)
        : 1,
    lastConfirmedAt: asTrimmedString(value.lastConfirmedAt) ?? nowIso,
  };
}

function mergeSignals(
  existing: EditorMemorySignal[],
  incoming: SignalInput[] | undefined,
  nowIso: string,
  fallbackSource: MemoryEvidenceSource,
): EditorMemorySignal[] {
  if (!incoming?.length) return existing;
  const next = [...existing];
  for (const item of incoming) {
    const key = item.key.trim();
    const value = item.value.trim();
    if (!key || !value) continue;
    const idx = next.findIndex((entry) => entry.key === key);
    if (idx >= 0) {
      const prev = next[idx]!;
      const sameValue = prev.value === value;
      next[idx] = {
        ...prev,
        value,
        note: asTrimmedString(item.note) ?? prev.note,
        source: item.source ?? prev.source,
        confidence: sameValue ? Math.min(1, prev.confidence + 0.12) : clampConfidence(item.confidence, Math.max(0.35, prev.confidence - 0.18)),
        evidenceCount: sameValue ? prev.evidenceCount + 1 : Math.max(1, Math.round(item.evidenceCount ?? 1)),
        lastConfirmedAt: asTrimmedString(item.lastConfirmedAt) ?? nowIso,
      };
      continue;
    }
    next.unshift(buildSignal(item, nowIso, fallbackSource));
  }
  return next;
}

function mergeDecisions(
  existing: EditorProjectDecisionRecord[],
  incoming: DecisionInput[] | undefined,
  nowIso: string,
): EditorProjectDecisionRecord[] {
  if (!incoming?.length) return existing;
  const next = [...existing];
  for (const item of incoming) {
    const decision = item.decision.trim();
    if (!decision) continue;
    const idx = next.findIndex((entry) => entry.decision === decision);
    if (idx >= 0) {
      const prev = next[idx]!;
      next[idx] = {
        ...prev,
        outcome: item.outcome === 'accepted' || item.outcome === 'rejected' ? item.outcome : prev.outcome,
        note: asTrimmedString(item.note) ?? prev.note,
        confidence: Math.min(1, prev.confidence + 0.08),
        evidenceCount: prev.evidenceCount + 1,
        lastConfirmedAt: asTrimmedString(item.lastConfirmedAt) ?? nowIso,
      };
      continue;
    }
    next.unshift(buildDecision(item, nowIso));
  }
  return next;
}

function mergeOpenIssues(existing: string[], incoming: string[] | undefined): string[] {
  if (!incoming?.length) return existing;
  const next = [...existing];
  for (const item of incoming) {
    const issue = item.trim();
    if (!issue || next.includes(issue)) continue;
    next.push(issue);
  }
  return next;
}

function rebuildMemory(
  memory: EditorProjectMemory,
  nowIso: string,
): EditorProjectMemory {
  const next = {
    ...memory,
    updatedAt: nowIso,
  };
  return {
    ...next,
    summary: buildEditorProjectMemorySummary(next, nowIso),
  };
}

export function appendAgentMessageEvent(
  memoryLike: unknown,
  event: Partial<AgentMessageEvent> & Pick<AgentMessageEvent, 'content'>,
  options?: { maxRawEvents?: number; nowIso?: string },
): EditorProjectMemory {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const memory = normalizeEditorProjectMemory(memoryLike, nowIso);
  const nextEvent: AgentMessageEvent = {
    id: asTrimmedString(event.id) ?? nextId('evt'),
    role: event.role === 'assistant' || event.role === 'system' ? event.role : 'user',
    kind:
      event.kind === 'apply_request' || event.kind === 'apply_result' || event.kind === 'feedback'
        ? event.kind
        : 'chat',
    route:
      event.route === 'apply' || event.route === 'apply_stream' || event.route === 'system'
        ? event.route
        : 'chat',
    content: event.content.trim(),
    createdAt: asTrimmedString(event.createdAt) ?? nowIso,
    metadata: event.metadata,
  };
  const maxRawEvents = Math.max(1, options?.maxRawEvents ?? DEFAULT_PROJECT_MEMORY_EVENT_LIMIT);
  const rawEvents = [...memory.rawEvents, nextEvent].slice(-maxRawEvents);
  return rebuildMemory(
    {
      ...memory,
      rawEvents,
    },
    nowIso,
  );
}

export function promoteProjectMemory(
  memoryLike: unknown,
  promotion: ProjectMemoryPromotionInput,
  options?: { nowIso?: string },
): EditorProjectMemory {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const memory = normalizeEditorProjectMemory(memoryLike, nowIso);
  return rebuildMemory(
    {
      ...memory,
      stableFacts: mergeSignals(memory.stableFacts, promotion.stableFacts, nowIso, 'system_inference'),
      preferenceSignals: mergeSignals(memory.preferenceSignals, promotion.preferenceSignals, nowIso, 'explicit_user'),
      negativePreferenceSignals: mergeSignals(memory.negativePreferenceSignals, promotion.negativePreferenceSignals, nowIso, 'explicit_user'),
      decisionLog: mergeDecisions(memory.decisionLog, promotion.decisions, nowIso),
      openIssues: mergeOpenIssues(memory.openIssues, promotion.openIssues),
    },
    nowIso,
  );
}

export function readProjectMemoryFromProjectDoc(doc: { memory?: unknown } | null | undefined): EditorProjectMemory {
  return normalizeEditorProjectMemory(doc?.memory);
}

export function writeProjectMemoryToProjectDoc<T extends { memory?: unknown; updatedAt?: string }>(
  doc: T,
  memoryLike: unknown,
  options?: { nowIso?: string },
): T & { memory: EditorProjectMemory; updatedAt: string } {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  return {
    ...doc,
    updatedAt: nowIso,
    memory: normalizeEditorProjectMemory(memoryLike, nowIso),
  };
}
