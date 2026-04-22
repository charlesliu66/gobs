export const EDITOR_AGENT_MEMORY_VERSION = 1 as const;

export type AgentMessageRole = 'user' | 'assistant' | 'system';
export type AgentMessageKind = 'chat' | 'apply_request' | 'apply_result' | 'feedback';
export type AgentMessageRoute = 'chat' | 'apply' | 'apply_stream' | 'system';

export interface MemoryEvidenceMetadata {
  source: 'explicit_user' | 'behavior_inference' | 'manual_feedback' | 'system_inference';
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

export interface EditorAgentChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface EditorUserCommunicationProfile {
  version: typeof EDITOR_AGENT_MEMORY_VERSION;
  username: string;
  updatedAt: string;
  responseStyle?: MemoryEvidenceMetadata & { value: 'brief_direct' | 'brief_with_reason' | 'detailed_explanatory'; reason?: string };
  collaborationMode?: MemoryEvidenceMetadata & { value: 'act_then_report' | 'propose_then_confirm' | 'confirm_before_action'; reason?: string };
  controlPreference?: MemoryEvidenceMetadata & { value: 'auto_execute' | 'guided_suggestions' | 'high_control'; reason?: string };
  pacePreference?: MemoryEvidenceMetadata & { value: 'fast_push' | 'steady_iteration'; reason?: string };
  platformLanguageStyle?: MemoryEvidenceMetadata & { value: 'business_focused' | 'creative_focused' | 'execution_focused'; reason?: string };
  negativePreferences: EditorMemorySignal[];
  summary?: EditorMemorySummarySnapshot;
}

export function createEmptyEditorProjectMemory(nowIso = new Date().toISOString()): EditorProjectMemory {
  return {
    version: EDITOR_AGENT_MEMORY_VERSION,
    updatedAt: nowIso,
    rawEvents: [],
    stableFacts: [],
    preferenceSignals: [],
    negativePreferenceSignals: [],
    decisionLog: [],
    openIssues: [],
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

export function projectMemoryToChatTurns(
  memory: EditorProjectMemory | null | undefined,
  limit = 10,
): EditorAgentChatTurn[] {
  if (!memory) return [];
  return memory.rawEvents
    .filter((event) => (event.role === 'user' || event.role === 'assistant') && event.content.trim().length > 0)
    .slice(-limit)
    .map((event) => ({ role: event.role as 'user' | 'assistant', content: event.content }));
}
