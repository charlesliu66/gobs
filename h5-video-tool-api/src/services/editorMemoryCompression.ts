import {
  normalizeEditorProjectMemory,
  normalizeEditorUserCommunicationProfile,
  type AgentMessageEvent,
  type EditorCommunicationDimension,
  type EditorMemorySignal,
  type EditorProjectDecisionRecord,
} from '../types/editorAgentMemory.js';

const DEFAULT_RECENT_TURN_LIMIT = 10;
const MIN_RECENT_TURN_LIMIT = 8;
const MAX_RECENT_TURN_LIMIT = 12;

export interface CompactedConversationWindow {
  recentTurns: AgentMessageEvent[];
  olderTurnCount: number;
}

export interface PromotedProjectMemoryFacts {
  stableFacts: string[];
  preferenceSignals: string[];
  negativePreferenceSignals: string[];
  decisionLog: string[];
  openIssues: string[];
}

export interface MergedUserCommunicationProfile {
  strongDirectives: string[];
  weakHints: string[];
}

function clampRecentTurnLimit(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_RECENT_TURN_LIMIT;
  return Math.min(MAX_RECENT_TURN_LIMIT, Math.max(MIN_RECENT_TURN_LIMIT, Math.round(value)));
}

function squashWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength = 220): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatSignal(signal: EditorMemorySignal): string {
  const note = signal.note ? ` | note=${signal.note}` : '';
  return `${signal.key}=${signal.value}${note}`;
}

function formatDecision(record: EditorProjectDecisionRecord): string {
  const note = record.note ? ` | note=${record.note}` : '';
  return `${record.decision} [${record.outcome}]${note}`;
}

function formatProfileEntry(
  key: string,
  dimension: EditorCommunicationDimension<string>,
): string {
  const reason = dimension.reason ? ` | reason=${dimension.reason}` : '';
  return `${key}=${dimension.value} | confidence=${dimension.confidence.toFixed(2)} | evidence=${dimension.evidenceCount}${reason}`;
}

function appendProfileEntry(
  target: MergedUserCommunicationProfile,
  key: string,
  dimension: EditorCommunicationDimension<string> | undefined,
  strongThreshold: number,
): void {
  if (!dimension) return;
  const formatted = formatProfileEntry(key, dimension);
  if (dimension.confidence >= strongThreshold) {
    target.strongDirectives.push(formatted);
    return;
  }
  target.weakHints.push(formatted);
}

export function compactConversationWindow(
  memoryLike: unknown,
  options?: { recentTurnLimit?: number },
): CompactedConversationWindow {
  const memory = normalizeEditorProjectMemory(memoryLike);
  const recentTurnLimit = clampRecentTurnLimit(options?.recentTurnLimit);
  const recentTurns = memory.rawEvents.slice(-recentTurnLimit);
  return {
    recentTurns,
    olderTurnCount: Math.max(0, memory.rawEvents.length - recentTurns.length),
  };
}

export function promoteProjectMemoryFacts(
  memoryLike: unknown,
  options?: {
    stableFactLimit?: number;
    preferenceLimit?: number;
    negativePreferenceLimit?: number;
    decisionLimit?: number;
    openIssueLimit?: number;
  },
): PromotedProjectMemoryFacts {
  const memory = normalizeEditorProjectMemory(memoryLike);
  return {
    stableFacts: memory.stableFacts.slice(0, Math.max(1, options?.stableFactLimit ?? 6)).map(formatSignal),
    preferenceSignals: memory.preferenceSignals.slice(0, Math.max(1, options?.preferenceLimit ?? 6)).map(formatSignal),
    negativePreferenceSignals: memory.negativePreferenceSignals.slice(0, Math.max(1, options?.negativePreferenceLimit ?? 6)).map(formatSignal),
    decisionLog: memory.decisionLog.slice(0, Math.max(1, options?.decisionLimit ?? 4)).map(formatDecision),
    openIssues: memory.openIssues.slice(0, Math.max(1, options?.openIssueLimit ?? 4)).map((item) => squashWhitespace(item)),
  };
}

export function mergeUserCommunicationProfile(
  profileLike: unknown,
  options?: { username?: string; strongConfidenceThreshold?: number },
): MergedUserCommunicationProfile {
  const profile = normalizeEditorUserCommunicationProfile(
    profileLike,
    options?.username ?? 'default',
  );
  const strongThreshold = Math.min(0.95, Math.max(0.4, options?.strongConfidenceThreshold ?? 0.68));
  const merged: MergedUserCommunicationProfile = {
    strongDirectives: [],
    weakHints: [],
  };

  appendProfileEntry(merged, 'responseStyle', profile.responseStyle, strongThreshold);
  appendProfileEntry(merged, 'collaborationMode', profile.collaborationMode, strongThreshold);
  appendProfileEntry(merged, 'controlPreference', profile.controlPreference, strongThreshold);
  appendProfileEntry(merged, 'pacePreference', profile.pacePreference, strongThreshold);
  appendProfileEntry(merged, 'platformLanguageStyle', profile.platformLanguageStyle, strongThreshold);

  for (const signal of profile.negativePreferences) {
    const formatted = formatSignal(signal);
    if (signal.confidence >= strongThreshold) {
      merged.strongDirectives.push(formatted);
      continue;
    }
    merged.weakHints.push(formatted);
  }

  return merged;
}

export function buildAgentMemoryContextBlock(input: {
  projectMemory?: unknown;
  userCommunicationProfile?: unknown;
  username?: string;
  recentTurnLimit?: number;
}): string {
  const projectMemory = normalizeEditorProjectMemory(input.projectMemory);
  const memoryFacts = promoteProjectMemoryFacts(projectMemory);
  const profile = mergeUserCommunicationProfile(input.userCommunicationProfile, {
    username: input.username,
  });
  const compacted = compactConversationWindow(projectMemory, {
    recentTurnLimit: input.recentTurnLimit,
  });

  const lines: string[] = [];
  lines.push('## Editor Memory Context');
  lines.push('- Current user request and latest explicit instructions override remembered preferences.');
  lines.push('- Low-confidence user communication profile items are weak hints only.');

  if (memoryFacts.stableFacts.length > 0) {
    lines.push('### Project Memory - Stable Facts');
    memoryFacts.stableFacts.forEach((item) => lines.push(`- ${item}`));
  }
  if (memoryFacts.preferenceSignals.length > 0) {
    lines.push('### Project Memory - Preferences');
    memoryFacts.preferenceSignals.forEach((item) => lines.push(`- ${item}`));
  }
  if (memoryFacts.negativePreferenceSignals.length > 0) {
    lines.push('### Project Memory - Avoid');
    memoryFacts.negativePreferenceSignals.forEach((item) => lines.push(`- ${item}`));
  }
  if (memoryFacts.decisionLog.length > 0) {
    lines.push('### Project Decisions');
    memoryFacts.decisionLog.forEach((item) => lines.push(`- ${item}`));
  }
  if (memoryFacts.openIssues.length > 0) {
    lines.push('### Project Memory - Open Issues');
    memoryFacts.openIssues.forEach((item) => lines.push(`- ${item}`));
  }
  if (profile.strongDirectives.length > 0) {
    lines.push('### User Communication Profile - Strong Directives');
    profile.strongDirectives.forEach((item) => lines.push(`- ${item}`));
  }
  if (profile.weakHints.length > 0) {
    lines.push('### User Communication Profile - Weak Hints');
    profile.weakHints.forEach((item) => lines.push(`- ${item}`));
  }
  if (compacted.recentTurns.length > 0) {
    lines.push(`### Recent Raw Turns (last ${compacted.recentTurns.length})`);
    compacted.recentTurns.forEach((turn) => {
      lines.push(`- ${turn.role}: ${truncate(squashWhitespace(turn.content))}`);
    });
    if (compacted.olderTurnCount > 0) {
      lines.push(`- ${compacted.olderTurnCount} older turns were compressed into the structured memory sections above.`);
    }
  }

  return lines.length > 3 ? lines.join('\n') : '';
}
