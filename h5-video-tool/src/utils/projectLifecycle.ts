const DEFAULT_EDITOR_PROJECT_NAME = '\u672a\u547d\u540d\u526a\u8f91\u9879\u76ee';
const DEFAULT_PRODUCTION_PROJECT_TITLE = '\u672a\u547d\u540d\u9879\u76ee';
const EDITOR_FALLBACK_PREFIX = '\u526a\u8f91';
const PRODUCTION_FALLBACK_PREFIX = '\u9ad8\u7ea7\u5236\u7247';

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function formatDateStamp(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}${dd}`;
}

function formatTimeStamp(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${hh}${min}`;
}

function stripFileExtension(name: string): string {
  return name.replace(/\.[a-z0-9]+$/i, '').trim();
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return null;
}

export function isUnnamedEditorProjectName(name: string | null | undefined): boolean {
  const normalized = normalizeText(name);
  return !normalized || normalized === DEFAULT_EDITOR_PROJECT_NAME;
}

export function isUnnamedProductionProjectTitle(title: string | null | undefined): boolean {
  const normalized = normalizeText(title);
  return !normalized || normalized === DEFAULT_PRODUCTION_PROJECT_TITLE;
}

export function hasMeaningfulEditorDraft(input: {
  project?: {
    tracks?: Array<{ clips?: unknown[] }>;
    subtitles?: unknown[];
  } | null;
  assets?: Record<string, unknown> | null;
  projectMemory?: {
    rawEvents?: unknown[];
    stableFacts?: unknown[];
    preferenceSignals?: unknown[];
    negativePreferenceSignals?: unknown[];
    decisionLog?: unknown[];
    openIssues?: unknown[];
  } | null;
}): boolean {
  const trackHasClips = (input.project?.tracks ?? []).some((track) => (track.clips?.length ?? 0) > 0);
  const hasSubtitles = (input.project?.subtitles?.length ?? 0) > 0;
  const hasAssets = Object.keys(input.assets ?? {}).length > 0;
  const memory = input.projectMemory;
  const hasMemory =
    (memory?.rawEvents?.length ?? 0) > 0 ||
    (memory?.stableFacts?.length ?? 0) > 0 ||
    (memory?.preferenceSignals?.length ?? 0) > 0 ||
    (memory?.negativePreferenceSignals?.length ?? 0) > 0 ||
    (memory?.decisionLog?.length ?? 0) > 0 ||
    (memory?.openIssues?.length ?? 0) > 0;
  return trackHasClips || hasSubtitles || hasAssets || hasMemory;
}

export function hasMeaningfulProductionDraft(input: {
  project?: {
    story?: unknown;
    productionDesign?: unknown;
    shots?: unknown[];
    characterAssets?: unknown[];
    sceneAssets?: unknown[];
    propAssets?: unknown[];
  } | null;
  characterBible?: string | null;
  synopsis?: string | null;
}): boolean {
  return Boolean(
    input.project?.story ||
      input.project?.productionDesign ||
      (input.project?.shots?.length ?? 0) > 0 ||
      (input.project?.characterAssets?.length ?? 0) > 0 ||
      (input.project?.sceneAssets?.length ?? 0) > 0 ||
      (input.project?.propAssets?.length ?? 0) > 0 ||
      normalizeText(input.characterBible) ||
      normalizeText(input.synopsis),
  );
}

export function suggestEditorProjectName(input: {
  sourceProductionTitle?: string | null;
  assets?: Array<{ originalName?: string | null }> | null;
  fallbackDate?: Date;
}): string {
  const direct = firstNonEmpty([
    input.sourceProductionTitle,
    stripFileExtension(input.assets?.[0]?.originalName ?? ''),
  ]);
  if (direct) return direct;

  const fallback = input.fallbackDate ?? new Date();
  return `${EDITOR_FALLBACK_PREFIX}-${formatDateStamp(fallback)}-${formatTimeStamp(fallback)}`;
}

export function suggestProductionProjectTitle(input: {
  storySummary?: string | null;
  synopsis?: string | null;
  fallbackDate?: Date;
}): string {
  const direct = firstNonEmpty([input.storySummary, input.synopsis]);
  if (direct) return direct;

  const fallback = input.fallbackDate ?? new Date();
  return `${PRODUCTION_FALLBACK_PREFIX}-${formatDateStamp(fallback)}-${formatTimeStamp(fallback)}`;
}

export function shouldRequireEditorProjectNaming(input: {
  projectName?: string | null;
  hasPersistedProject: boolean;
  draftIsMeaningful: boolean;
}): boolean {
  if (input.hasPersistedProject || !input.draftIsMeaningful) {
    return false;
  }
  return isUnnamedEditorProjectName(input.projectName);
}

export function shouldRequireProductionProjectNaming(input: {
  projectTitle?: string | null;
  hasPersistedProject: boolean;
  draftIsMeaningful: boolean;
}): boolean {
  if (input.hasPersistedProject || !input.draftIsMeaningful) {
    return false;
  }
  return isUnnamedProductionProjectTitle(input.projectTitle);
}

export function resolveUnnamedProjectGovernanceAction(input: {
  isUnnamed: boolean;
  draftIsMeaningful: boolean;
}): 'delete' | 'rename' | 'ignore' {
  if (!input.isUnnamed) {
    return 'ignore';
  }
  return input.draftIsMeaningful ? 'rename' : 'delete';
}
