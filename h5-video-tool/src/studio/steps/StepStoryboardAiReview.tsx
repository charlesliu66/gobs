import { useState } from 'react';
import type { ShotReviewSuggestion, ShotReviewResult } from '../../api/shotReview';
import type { ProductionShot } from '../productionTypes';

export function StepStoryboardAiReview({
  shot,
  reviewResult,
  reviewing,
  onReview,
  onApplySuggestion,
  onApplyAllAndRegenerate,
}: {
  shot: ProductionShot;
  reviewResult: ShotReviewResult | null;
  reviewing: boolean;
  onReview: () => void;
  onApplySuggestion: (suggestion: ShotReviewSuggestion) => void;
  onApplyAllAndRegenerate: () => void;
}) {
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set());

  const handleApply = (s: ShotReviewSuggestion) => {
    onApplySuggestion(s);
    setAppliedFields((prev) => new Set(prev).add(s.field));
  };

  const scoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 5) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text)]">AI 审片助手</span>
        <button
          type="button"
          disabled={reviewing}
          onClick={onReview}
          className="rounded-md bg-violet-600 px-3 py-1 text-[11px] font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
        >
          {reviewing ? '分析中…' : 'AI 审片'}
        </button>
      </div>

      {reviewing && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
          正在分析分镜 #{shot.shotIndex} 的提示词质量…
        </div>
      )}

      {reviewResult && !reviewing && (
        <div className="mt-3 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] text-[var(--color-text-muted)]">综合评分</span>
            <span className={`text-lg font-bold ${scoreColor(reviewResult.overallScore)}`}>
              {reviewResult.overallScore}/10
            </span>
          </div>

          {reviewResult.suggestions.length === 0 ? (
            <p className="text-[11px] text-green-400">提示词质量优秀，暂无改进建议。</p>
          ) : (
            <>
              <div className="space-y-2">
                {reviewResult.suggestions.map((s, i) => {
                  const applied = appliedFields.has(s.field);
                  return (
                    <div
                      key={`${s.field}-${i}`}
                      className={`rounded-md border p-2.5 text-[11px] ${
                        applied
                          ? 'border-green-500/30 bg-green-950/20'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-[10px] text-violet-300">{s.field}</span>
                          <p className="mt-0.5 text-[var(--color-text-muted)]">{s.reason}</p>
                          {s.currentValue && (
                            <p className="mt-1">
                              <span className="text-[var(--color-text-muted)]">当前：</span>
                              <span className="text-red-300/80 line-through">{s.currentValue}</span>
                            </p>
                          )}
                          <p className="mt-0.5">
                            <span className="text-[var(--color-text-muted)]">建议：</span>
                            <span className="text-green-300">{s.suggestedValue}</span>
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={applied}
                          onClick={() => handleApply(s)}
                          className="shrink-0 rounded border border-[var(--color-border)] px-2 py-0.5 text-[10px] text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:opacity-40"
                        >
                          {applied ? '已采纳' : '采纳'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  reviewResult.suggestions.forEach((s) => {
                    if (!appliedFields.has(s.field)) handleApply(s);
                  });
                  onApplyAllAndRegenerate();
                }}
                className="w-full rounded-md bg-violet-600 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-violet-500"
              >
                全部采纳并重新生成
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
