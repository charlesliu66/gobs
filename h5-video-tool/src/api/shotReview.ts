import { apiPost } from './client';

export interface ShotReviewSuggestion {
  field: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
}

export interface ShotReviewResult {
  overallScore: number;
  suggestions: ShotReviewSuggestion[];
}

export interface ContinuityIssue {
  shotIndexA: number;
  shotIndexB: number;
  category: string;
  description: string;
  severity: 'warning' | 'error';
}

export interface ContinuityCheckResult {
  issues: ContinuityIssue[];
}

export async function postShotReview(
  shot: Record<string, unknown>,
  globalStyleRef?: string,
  projectTitle?: string,
): Promise<ShotReviewResult> {
  return apiPost('/api/studio/shot-review', { shot, globalStyleRef, projectTitle });
}

export async function postContinuityCheck(
  shots: Record<string, unknown>[],
  globalStyleRef?: string,
): Promise<ContinuityCheckResult> {
  return apiPost('/api/studio/continuity-check', { shots, globalStyleRef });
}
