import { apiPost, apiGet, apiDelete } from './client';

export interface QuickFilmStartInput {
  story: string;
  protagonist: string;
  protagonistDesc?: string;
  style: string;
  styleImageBase64?: string;
  assetFiles?: Array<{ name: string; base64: string }>;
}

export interface JobStep {
  name: string;
  done: boolean;
  error?: string;
}

export interface MatchedAsset {
  id: string;
  name: string;
  type: string;
  tags: string[];
  description: string;
  thumbnailBase64?: string;
  localPath?: string;
}

export interface MatchedAssets {
  characterRefs: MatchedAsset[];
  sceneRef?: MatchedAsset;
  propRefs: MatchedAsset[];
  styleRef?: MatchedAsset;
}

export interface ShotWithAssets {
  shotIndex: number;
  durationSec: number;
  sceneRef: string;
  shotScale: string;
  cameraMove: string;
  subject: string;
  action: string;
  emotion: string;
  dialogue: string;
  notes: string;
  structuredStill: {
    sp_subject: string;
    sp_environment: string;
    sp_style: string;
    sp_lighting: string;
    sp_camera: string;
    sp_composition: string;
    sp_continuity: string;
    sp_negative: string;
  };
  structuredMotion: {
    mp_motion: string;
    mp_camera: string;
    mp_tempo: string;
    mp_transition: string;
    mp_audio: string;
  };
  matchedAssets?: MatchedAssets;
  userMatchedAssets?: { characterRef?: string; sceneRef?: string };
}

export interface JobStatus {
  status: 'pending' | 'running' | 'done' | 'error';
  progress: number;
  steps: JobStep[];
  storyboard?: ShotWithAssets[];
  error?: string;
  logline?: string;
  title?: string;
}

export async function startQuickFilm(input: QuickFilmStartInput): Promise<{ jobId: string }> {
  return apiPost('/api/quickfilm/start', input);
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return apiGet(`/api/quickfilm/${jobId}/status`);
}

export async function confirmStoryboard(
  jobId: string,
  storyboard: ShotWithAssets[],
): Promise<{ batchJobId: string }> {
  return apiPost(`/api/quickfilm/${jobId}/confirm`, { storyboard });
}

// ─── Draft API ────────────────────────────────────────────────────────────────

export interface DraftMeta {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

export interface DraftData {
  id: string;
  name: string;
  story: string;
  protagonist: string;
  protagonistDesc: string;
  style: string;
  customStyle: string;
  styleImageBase64?: string;
  assetFiles: Array<{ name: string; base64: string }>;
  updatedAt: string;
  createdAt: string;
}

export async function saveDraft(data: Partial<DraftData>): Promise<{ success: boolean; id: string }> {
  return apiPost('/api/quickfilm/drafts', data);
}

export async function listDrafts(): Promise<DraftMeta[]> {
  const res = await apiGet<{ drafts: DraftMeta[] }>('/api/quickfilm/drafts');
  return res.drafts;
}

export async function loadDraft(id: string): Promise<DraftData> {
  return apiGet(`/api/quickfilm/drafts/${encodeURIComponent(id)}`);
}

export async function deleteDraft(id: string): Promise<{ success: boolean }> {
  return apiDelete(`/api/quickfilm/drafts/${encodeURIComponent(id)}`);
}
