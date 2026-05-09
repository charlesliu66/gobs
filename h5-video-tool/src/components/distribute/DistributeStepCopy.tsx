import React, { type ReactNode } from 'react';

import { PlatformCopyCards, type PlatformCopyDraft } from './PlatformCopyCards.tsx';
import type { PendingDistributionDraft } from '../distribution/packageToDistributeDraft.ts';

void React;

interface CampaignContextSummaryLabels {
  title: string;
  subtitle: string;
  objective: string;
  audience: string;
  cta: string;
  market: string;
  tone: string;
  sellingPoints: string;
  avoidTerms: string;
  empty: string;
}

interface PlatformCopyLabels {
  defaultDraft: string;
  activeDraft: string;
  accountCount: string;
  noAccounts: string;
  caption: string;
  captionPlaceholder: string;
  hashtags: string;
  hashtagsPlaceholder: string;
  inheritedFallback: string;
}

interface DistributeStepCopyLabels<TCaptionLanguage extends string> {
  step: string;
  title: string;
  noVideo: string;
  captionHintInput: string;
  captionHintPlaceholder: string;
  captionByPlatform: string;
  captionHint: string;
  generatingCaption: string;
  polishCaption: string;
  generateCaption: string;
  campaignContext: CampaignContextSummaryLabels;
  platformCopy: PlatformCopyLabels;
  captionLanguageLabel: (language: TCaptionLanguage) => string;
}

interface DistributeStepCopyProps<TCaptionLanguage extends string> {
  hasSelectedAsset: boolean;
  captionHintValue: string;
  captionLanguages: readonly TCaptionLanguage[];
  activeCaptionLanguage: TCaptionLanguage;
  captionGenLoading: boolean;
  captionGenError: string | null;
  hasAnyCopy: boolean;
  canGenerateCaption: boolean;
  pendingPackageDraft: PendingDistributionDraft | null;
  draftKeys: string[];
  defaultDraftKey: string;
  drafts: Record<string, PlatformCopyDraft>;
  activeDraftKey: string;
  accountCounts: Record<string, number>;
  noVideoAction: ReactNode;
  statusIndicator: ReactNode;
  labels: DistributeStepCopyLabels<TCaptionLanguage>;
  onCaptionHintChange: (value: string) => void;
  onLanguageChange: (language: TCaptionLanguage) => void;
  onGenerateCaption: () => void;
  onSetActiveDraft: (draftKey: string) => void;
  onUpdateDraft: (draftKey: string, next: Partial<PlatformCopyDraft>) => void;
}

export function DistributeStepCopy<TCaptionLanguage extends string>({
  hasSelectedAsset,
  captionHintValue,
  captionLanguages,
  activeCaptionLanguage,
  captionGenLoading,
  captionGenError,
  hasAnyCopy,
  canGenerateCaption,
  pendingPackageDraft,
  draftKeys,
  defaultDraftKey,
  drafts,
  activeDraftKey,
  accountCounts,
  noVideoAction,
  statusIndicator,
  labels,
  onCaptionHintChange,
  onLanguageChange,
  onGenerateCaption,
  onSetActiveDraft,
  onUpdateDraft,
}: DistributeStepCopyProps<TCaptionLanguage>) {
  return (
    <section className="mb-6 space-y-4 border-b border-[var(--color-border)] pb-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="rounded-full bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
          {labels.step}
        </span>
        <h2 className="section-title">{labels.title}</h2>
      </div>

      {hasSelectedAsset ? (
        <div className="space-y-4">
          {pendingPackageDraft ? (
            <CampaignContextSummary
              draft={pendingPackageDraft}
              labels={labels.campaignContext}
            />
          ) : (
            <label className="space-y-1">
              <span className="text-xs text-[var(--color-text-muted)]">{labels.captionHintInput}</span>
              <input
                type="text"
                value={captionHintValue}
                onChange={(event) => onCaptionHintChange(event.target.value)}
                placeholder={labels.captionHintPlaceholder}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-border-focus)] focus:outline-none"
              />
            </label>
          )}

          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text)]">{labels.captionByPlatform}</h3>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{labels.captionHint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {captionLanguages.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => onLanguageChange(language)}
                  disabled={captionGenLoading}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    activeCaptionLanguage === language
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {labels.captionLanguageLabel(language)}
                </button>
              ))}

              <button
                type="button"
                onClick={onGenerateCaption}
                disabled={captionGenLoading || !canGenerateCaption}
                className="text-xs text-[var(--color-primary)] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                {captionGenLoading
                  ? labels.generatingCaption
                  : hasAnyCopy
                    ? labels.polishCaption
                    : labels.generateCaption}
              </button>

              {statusIndicator}
            </div>
          </div>

          {captionGenError && (
            <p className="mt-1 text-xs text-[var(--color-error)]">{captionGenError}</p>
          )}

          <PlatformCopyCards
            draftKeys={draftKeys}
            defaultDraftKey={defaultDraftKey}
            drafts={drafts}
            activeDraftKey={activeDraftKey}
            accountCounts={accountCounts}
            onSetActiveDraft={onSetActiveDraft}
            onUpdateDraft={onUpdateDraft}
            labels={labels.platformCopy}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <p className="mb-4 text-[var(--color-text-muted)]">{labels.noVideo}</p>
          {noVideoAction}
        </div>
      )}
    </section>
  );
}

function CampaignContextSummary({
  draft,
  labels,
}: {
  draft: PendingDistributionDraft;
  labels: CampaignContextSummaryLabels;
}) {
  const context = draft.captionContext;
  const items = [
    { key: 'objective', label: labels.objective, value: context.campaignObjective },
    { key: 'audience', label: labels.audience, value: context.targetAudience },
    { key: 'cta', label: labels.cta, value: context.callToAction },
    { key: 'market', label: labels.market, value: context.targetMarket },
    { key: 'tone', label: labels.tone, value: context.toneRules },
    { key: 'sellingPoints', label: labels.sellingPoints, value: context.sellingPoints },
    { key: 'avoidTerms', label: labels.avoidTerms, value: context.avoidTerms },
  ].filter((item) => item.value.trim());

  return (
    <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-text)]">{labels.title}</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{labels.subtitle}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)]">{labels.empty}</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-text-subtle)]">{item.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[var(--color-text-muted)]">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
