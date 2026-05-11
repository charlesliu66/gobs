import { useEffect, useMemo, useState } from 'react';
import type {
  ProducedOutputDraft,
  ProductionItem,
} from './outputPlan.ts';
import {
  buildCreativeQualityPanelSummary,
  canCreateNextVersionDraft,
  creativeFeedbackTagsForOutput,
  normalizeCreativeFeedbackTags,
} from './feedback/creativeFeedbackActions.ts';
import type {
  CreativeFeedbackInput,
  CreativeFeedbackTag,
} from './feedback/creativeFeedbackTypes.ts';
import { CreativeFeedbackBar } from './CreativeFeedbackBar.tsx';

type FeedbackTagCopy = Record<CreativeFeedbackTag, string>;

interface CreativeQualityPanelCopy {
  qualityPanelTitle: string;
  qualityPanelSubtitle: string;
  currentQuality: string;
  feedbackSignals: string;
  issueTags: string;
  recommendation: string;
  feedbackTags: string;
  nextVersionNote: string;
  nextVersionNotePlaceholder: string;
  createNextVersion: string;
  nextVersionUnsupported: string;
  statusNotReviewed: string;
  statusUsable: string;
  statusNeedsFix: string;
  statusUnusable: string;
  feedbackTagLabels: FeedbackTagCopy;
}

interface CreativeQualityPanelProps {
  item: ProductionItem;
  output: ProducedOutputDraft;
  copy: CreativeQualityPanelCopy;
  onCreateNextVersion?: (
    item: ProductionItem,
    output: ProducedOutputDraft,
    feedback: CreativeFeedbackInput,
  ) => void;
}

function statusLabel(status: string, copy: CreativeQualityPanelCopy): string {
  if (status === 'usable') return copy.statusUsable;
  if (status === 'needs_fix') return copy.statusNeedsFix;
  if (status === 'unusable') return copy.statusUnusable;
  return copy.statusNotReviewed;
}

export function CreativeQualityPanel({
  item,
  output,
  copy,
  onCreateNextVersion,
}: CreativeQualityPanelProps) {
  const definitions = useMemo(() => creativeFeedbackTagsForOutput(item, output), [item, output]);
  const [selectedTagIds, setSelectedTagIds] = useState<CreativeFeedbackTag[]>(() =>
    normalizeCreativeFeedbackTags(output.feedbackTagIds ?? []),
  );
  const [note, setNote] = useState(output.feedbackNote ?? '');
  const summary = buildCreativeQualityPanelSummary(item, output);
  const canCreateNext = canCreateNextVersionDraft(output);

  useEffect(() => {
    setSelectedTagIds(normalizeCreativeFeedbackTags(output.feedbackTagIds ?? []));
    setNote(output.feedbackNote ?? '');
  }, [output.id, output.feedbackTagIds, output.feedbackNote]);

  const toggleTag = (tag: CreativeFeedbackTag) => {
    setSelectedTagIds((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  };

  return (
    <div
      className="mt-3 rounded-xl border border-[var(--color-border)]/35 bg-black/10 p-3"
      data-section="creativeQualityPanel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#e6c66e]">
            {copy.qualityPanelTitle}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">
            {copy.qualityPanelSubtitle}
          </p>
        </div>
        <span className="rounded-full border border-[var(--color-border)]/50 px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
          {copy.currentQuality}: {statusLabel(summary.statusLabel, copy)}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <QualityInfo label={copy.feedbackSignals} value={summary.sourceSummary} />
        <QualityInfo label={copy.issueTags} value={summary.issueSummary} />
        <QualityInfo label={copy.recommendation} value={summary.recommendation} />
      </div>

      <div className="mt-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
          {copy.feedbackTags}
        </div>
        <CreativeFeedbackBar
          definitions={definitions}
          selectedTagIds={selectedTagIds}
          copy={copy.feedbackTagLabels}
          onToggleTag={toggleTag}
        />
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-text-subtle)]">
          {copy.nextVersionNote}
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl border border-[var(--color-border)]/55 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[#d5b56a]/70"
          placeholder={copy.nextVersionNotePlaceholder}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={!canCreateNext || !onCreateNextVersion}
          onClick={() => {
            if (!canCreateNext || !onCreateNextVersion) return;
            onCreateNextVersion?.(item, output, {
              feedbackTagIds: selectedTagIds,
              feedbackNote: note,
            });
          }}
        >
          {copy.createNextVersion}
        </button>
        {!canCreateNext ? (
          <span className="text-xs leading-5 text-[var(--color-text-subtle)]">
            {copy.nextVersionUnsupported}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function QualityInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
        {label}
      </div>
      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{value}</p>
    </div>
  );
}
