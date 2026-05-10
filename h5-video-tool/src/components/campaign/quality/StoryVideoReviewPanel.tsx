import { useEffect, useMemo, useState } from 'react';
import type { CreativeQualityStatus } from './creativeQualityTypes.ts';
import {
  STORY_VIDEO_REVIEW_TAGS,
  createStoryVideoReview,
  listStoryVideoReviewsForOutput,
  saveStoryVideoReview,
  type StoryVideoReviewRecord,
  type StoryVideoReviewTag,
} from './storyVideoReviewStore.ts';

interface StoryVideoReviewPanelProps {
  outputId: string;
  campaignId?: string;
  resultTaskId?: string | null;
  resultUrl?: string | null;
  title?: string;
}

const STATUS_COPY: Record<CreativeQualityStatus, { label: string; helper: string }> = {
  usable: {
    label: '可用',
    helper: '符合 Brief，卖点清楚，没有明显发布阻断。',
  },
  needs_fix: {
    label: '需修',
    helper: '方向正确，但开头、节奏、构图或素材准确性还需要一版。',
  },
  unusable: {
    label: '不可用',
    helper: '不符合 Brief、素材错误、卖点缺失或无法发布。',
  },
};

const TAG_COPY: Record<StoryVideoReviewTag, string> = {
  weak_opening: '开头弱',
  slow_pacing: '节奏慢',
  unclear_selling_point: '卖点不清楚',
  weak_ending: '结尾弱',
  inaccurate_character: '角色不准确',
};

function formatReviewTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function latestReviewLabel(reviews: StoryVideoReviewRecord[]): string {
  const latest = reviews[0];
  if (!latest) return '尚未记录';
  return STATUS_COPY[latest.status].label;
}

export function StoryVideoReviewPanel({
  outputId,
  campaignId,
  resultTaskId,
  resultUrl,
  title,
}: StoryVideoReviewPanelProps) {
  const [status, setStatus] = useState<CreativeQualityStatus>('needs_fix');
  const [selectedTags, setSelectedTags] = useState<StoryVideoReviewTag[]>(['weak_opening']);
  const [note, setNote] = useState('');
  const [reviews, setReviews] = useState<StoryVideoReviewRecord[]>([]);

  useEffect(() => {
    setReviews(listStoryVideoReviewsForOutput(outputId));
  }, [outputId]);

  const selectedTagSet = useMemo(() => new Set(selectedTags), [selectedTags]);

  const toggleTag = (tag: StoryVideoReviewTag) => {
    setSelectedTags((prev) => (
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : [...prev, tag]
    ));
  };

  const handleSave = () => {
    const review = createStoryVideoReview({
      outputId,
      status,
      issueTags: selectedTags,
      note,
      campaignId,
      resultTaskId,
      resultUrl,
      title,
    });
    const next = saveStoryVideoReview(review);
    setReviews(next.filter((item) => item.outputId === outputId));
    setNote('');
  };

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">
            Story video review
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--color-text)]">人工质量记录</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            这里记录人工判断，不代表系统已经自动看懂视频内容。
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
          <span className="text-[var(--color-text-muted)]">最新状态：</span>
          <span className="font-semibold text-[var(--color-text)]">{latestReviewLabel(reviews)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {(['usable', 'needs_fix', 'unusable'] as const).map((item) => {
          const active = status === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setStatus(item)}
              className={[
                'rounded-xl border p-3 text-left transition-colors',
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]',
              ].join(' ')}
            >
              <span className="block text-sm font-semibold text-[var(--color-text)]">
                {STATUS_COPY[item].label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--color-text-muted)]">
                {STATUS_COPY[item].helper}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-[var(--color-text)]">问题标签</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STORY_VIDEO_REVIEW_TAGS.map((tag) => {
            const active = selectedTagSet.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={[
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]',
                ].join(' ')}
              >
                {TAG_COPY[tag]}
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-medium text-[var(--color-text)]">下一版建议或备注</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          placeholder="例如：前三秒直接展示奖励；结尾 CTA 再明确一些。"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          保存评价
        </button>
        <p className="text-xs text-[var(--color-text-subtle)]">Output ID: {outputId}</p>
      </div>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <p className="text-sm font-medium text-[var(--color-text)]">评价记录</p>
        {reviews.length > 0 ? (
          <div className="mt-3 space-y-3">
            {reviews.map((review) => (
              <article
                key={review.reviewId}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--color-text)]">
                    {STATUS_COPY[review.status].label}
                  </span>
                  <span className="text-xs text-[var(--color-text-subtle)]">
                    {formatReviewTime(review.createdAt)}
                  </span>
                </div>
                {review.issueTags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {review.issueTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--color-surface-hover)] px-2 py-1 text-xs text-[var(--color-text-muted)]"
                      >
                        {TAG_COPY[tag as StoryVideoReviewTag] ?? tag}
                      </span>
                    ))}
                  </div>
                )}
                {review.note && (
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{review.note}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            暂无评价。保存后会在当前浏览器中保留，后续可迁移到后端 Review 存储。
          </p>
        )}
      </div>
    </section>
  );
}
