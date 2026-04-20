/**
 * AI 审片 + 分镜间一致性检查 hook
 * 从 ProductionWizard.tsx 提取，减少主组件体积。
 */
import { useCallback, useEffect, useState } from 'react';
import {
  postShotReview,
  postContinuityCheck,
  type ShotReviewResult,
  type ShotReviewSuggestion,
  type ContinuityIssue,
} from '../api/shotReview';
import type { ProductionProject, ProductionShot } from './productionTypes';
import { toast } from '../components/Toast';

interface UseProductionShotReviewParams {
  project: ProductionProject;
  selectedShotIdx: number;
  patchShot: (idx: number, patch: Partial<ProductionShot>) => void;
  generateVideoForShotIdx: (idx: number) => Promise<void>;
}

export function useProductionShotReview({
  project,
  selectedShotIdx,
  patchShot,
  generateVideoForShotIdx,
}: UseProductionShotReviewParams) {
  const [aiReviewResult, setAiReviewResult] = useState<ShotReviewResult | null>(null);
  const [aiReviewing, setAiReviewing] = useState(false);
  // Shot index that aiReviewResult was produced for; guards apply-after-switch.
  const [reviewedShotIdx, setReviewedShotIdx] = useState<number | null>(null);
  const [continuityIssues, setContinuityIssues] = useState<ContinuityIssue[] | null>(null);
  const [continuityChecking, setContinuityChecking] = useState(false);

  // Switching shots must clear stale review so suggestions never apply to wrong shot.
  useEffect(() => {
    setAiReviewResult(null);
    setReviewedShotIdx(null);
  }, [selectedShotIdx]);

  const handleAiReview = useCallback(async () => {
    const s = project.shots[selectedShotIdx];
    if (!s) return;
    const startedIdx = selectedShotIdx;
    setAiReviewing(true);
    setAiReviewResult(null);
    setReviewedShotIdx(null);
    try {
      const result = await postShotReview(
        s as unknown as Record<string, unknown>,
        project.meta.styleRefSummary,
        project.meta.title,
      );
      setAiReviewResult(result);
      setReviewedShotIdx(startedIdx);
    } catch (e) {
      toast.error(`AI 审片失败：${e instanceof Error ? e.message : '网络异常'}`);
    } finally {
      setAiReviewing(false);
    }
  }, [project.shots, selectedShotIdx, project.meta.styleRefSummary, project.meta.title]);

  const handleApplySuggestion = useCallback((suggestion: ShotReviewSuggestion) => {
    if (reviewedShotIdx !== null && reviewedShotIdx !== selectedShotIdx) {
      toast.error('评审结果属于其他镜头，已忽略本次采纳');
      return;
    }
    const path = suggestion.field.split('.');
    let patched = false;
    if (path.length === 2) {
      const [group, key] = path;
      if (group === 'structuredStill') {
        patchShot(selectedShotIdx, {
          structuredStill: {
            ...(project.shots[selectedShotIdx]?.structuredStill ?? ({} as Record<string, string>)),
            [key]: suggestion.suggestedValue,
          },
        });
        patched = true;
      } else if (group === 'structuredMotion') {
        patchShot(selectedShotIdx, {
          structuredMotion: {
            ...(project.shots[selectedShotIdx]?.structuredMotion ?? ({} as Record<string, string>)),
            [key]: suggestion.suggestedValue,
          },
        });
        patched = true;
      }
    } else if (path.length === 1 && path[0]) {
      patchShot(selectedShotIdx, { [path[0]]: suggestion.suggestedValue } as Partial<ProductionShot>);
      patched = true;
    }
    if (patched) {
      toast.success(`已应用建议：${suggestion.field}`);
    } else {
      toast.error(`暂不支持的字段路径：${suggestion.field}`);
    }
  }, [selectedShotIdx, reviewedShotIdx, project.shots, patchShot]);

  const handleApplyAllAndRegenerate = useCallback(() => {
    void generateVideoForShotIdx(selectedShotIdx);
  }, [generateVideoForShotIdx, selectedShotIdx]);

  const handleContinuityCheck = useCallback(async () => {
    if (project.shots.length < 2) {
      toast.info('至少需要 2 个分镜才能进行一致性检查');
      return;
    }
    setContinuityChecking(true);
    setContinuityIssues(null);
    try {
      const result = await postContinuityCheck(
        project.shots as unknown as Record<string, unknown>[],
        project.meta.styleRefSummary,
      );
      setContinuityIssues(result.issues);
      if (result.issues.length === 0) {
        toast.success('分镜间一致性检查通过');
      } else {
        toast.info(`发现 ${result.issues.length} 个连续性问题`);
      }
    } catch (e) {
      toast.error(`一致性检查失败：${e instanceof Error ? e.message : '网络异常'}`);
    } finally {
      setContinuityChecking(false);
    }
  }, [project.shots, project.meta.styleRefSummary]);

  return {
    aiReviewResult,
    aiReviewing,
    reviewedShotIdx,
    handleAiReview,
    handleApplySuggestion,
    handleApplyAllAndRegenerate,
    continuityIssues,
    continuityChecking,
    handleContinuityCheck,
  };
}
