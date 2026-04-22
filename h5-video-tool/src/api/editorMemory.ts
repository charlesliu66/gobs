import { apiGet, apiPost } from './client';
import type { EditorProjectMemory, EditorUserCommunicationProfile } from '../editor/types/agentMemory';

export type EditorProjectMemoryBucket =
  | 'stableFacts'
  | 'preferenceSignals'
  | 'negativePreferenceSignals'
  | 'decisionLog'
  | 'openIssues';

export type EditorUserProfileDimensionKey =
  | 'responseStyle'
  | 'collaborationMode'
  | 'controlPreference'
  | 'pacePreference'
  | 'platformLanguageStyle';

export async function fetchEditorAgentMemory(projectId: string): Promise<{
  projectMemory?: EditorProjectMemory;
  userCommunicationProfile?: EditorUserCommunicationProfile | null;
}> {
  return apiGet(`/api/editor/agent/memory?projectId=${encodeURIComponent(projectId)}`);
}

export async function rememberEditorProjectFeedback(
  projectId: string,
  mode: 'remember' | 'avoid',
  text: string,
): Promise<{ projectMemory: EditorProjectMemory }> {
  return apiPost('/api/editor/agent/memory/project-feedback', {
    projectId,
    mode,
    text,
  });
}

export async function deleteEditorProjectMemoryItem(
  projectId: string,
  bucket: EditorProjectMemoryBucket,
  target: { id?: string; value?: string },
): Promise<{ projectMemory: EditorProjectMemory }> {
  return apiPost('/api/editor/agent/memory/project-delete', {
    projectId,
    bucket,
    ...target,
  });
}

export async function weakenEditorUserProfileDimension(
  dimension: EditorUserProfileDimensionKey,
): Promise<{ userCommunicationProfile: EditorUserCommunicationProfile }> {
  return apiPost('/api/editor/agent/memory/profile-weaken', {
    dimension,
  });
}
