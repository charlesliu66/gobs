import type { GeelarkAccount } from '../../api/geelark.ts';
import type { CaptionByPlatformResult, CaptionCampaignContext } from '../../api/promptPolish.ts';
import type { PendingDistributionDraft } from '../distribution/packageToDistributeDraft.ts';
import type { DistributeStepPreflightItem } from './DistributeStepPublish.tsx';
import type { DistributeStepReadinessItem, DistributeStepReadinessStatus } from './DistributeStepReadinessNav.tsx';

export interface CaptionDraftView {
  caption: string;
  hashtags: string;
}

export const DEFAULT_DISTRIBUTE_STEP_SECTION_IDS = {
  asset: 'distribute-step-asset',
  copy: 'distribute-step-copy',
  accounts: 'distribute-step-accounts',
  publish: 'distribute-step-publish',
  history: 'distribute-step-history',
} as const;

export type DistributeStepSectionIds = typeof DEFAULT_DISTRIBUTE_STEP_SECTION_IDS;

export interface BuildDistributeStepViewModelArgs {
  selectedAsset: { title?: string | null } | null;
  selectedAccountCount: number;
  hasAnyCopy: boolean;
  pushing: boolean;
  pushError: string | null;
  sectionIds?: DistributeStepSectionIds;
  labels: {
    none: string;
    assetTitle: string;
    videoAndCaption: string;
    targetAccounts: string;
    preflightAsset: string;
    preflightAccounts: string;
    preflightCopy: string;
    selectedCountValue: string;
    preflightReady: string;
    preflightOptional: string;
    stepReadinessCopyAttention: string;
    stepReadinessPublish: string;
    stepReadinessPublishError: string;
    stepReadinessPublishBlocked: string;
    stepReadinessPublishReady: string;
  };
}

export interface DistributeStepViewModel {
  preflightItems: DistributeStepPreflightItem[];
  publishDisabled: boolean;
  readinessItems: DistributeStepReadinessItem[];
}

export interface PublishFailureGuidanceLabels {
  noAsset: string;
  noAccount: string;
  auth: string;
  provider: string;
  generic: string;
}

export function normalizePlatformKey(platform?: string | null, defaultDraftKey = 'default'): string {
  return platform?.trim().toLowerCase() || defaultDraftKey;
}

export function buildCaptionGenerationSeed(promptSeed: string, captionHint: string): string {
  const hint = captionHint.trim();
  return [
    promptSeed.trim(),
    hint ? `Operator hint: ${hint}` : '',
  ].filter(Boolean).join('\n\n');
}

function splitContextList(value: string): string[] {
  return value
    .split(/[\n,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildCaptionCampaignContext(draft: PendingDistributionDraft | null): CaptionCampaignContext | undefined {
  if (!draft) return undefined;
  const context = draft.captionContext;
  const complianceNotes = [
    context.toneRules,
    context.sellingPoints,
    draft.campaignContext.marketTruth.join(' | '),
    draft.campaignContext.visualCues.join(' | '),
  ].map((item) => item.trim()).filter(Boolean).join(' | ');

  return {
    campaignObjective: context.campaignObjective.trim() || undefined,
    targetAudience: context.targetAudience.trim() || undefined,
    callToAction: context.callToAction.trim() || undefined,
    targetMarket: context.targetMarket.trim() || undefined,
    complianceNotes: complianceNotes || undefined,
    bannedPhrases: uniqueStrings([
      ...splitContextList(context.avoidTerms),
      ...draft.campaignContext.forbiddenClaims,
    ]),
  };
}

export function buildCopyCardKeys(
  selectedPlatformKeys: string[],
  draftKeys: string[],
  defaultDraftKey: string,
): string[] {
  const keys = new Set<string>();
  selectedPlatformKeys.forEach((key) => keys.add(key || defaultDraftKey));
  draftKeys.forEach((key) => keys.add(key || defaultDraftKey));
  if (keys.size === 0) keys.add(defaultDraftKey);
  return [...keys];
}

export function buildPlatformAccountCounts(
  accounts: GeelarkAccount[],
  draftKeys: string[],
  defaultDraftKey: string,
): Record<string, number> {
  return Object.fromEntries(
    draftKeys.map((key) => [
      key,
      key === defaultDraftKey
        ? accounts.length
        : accounts.filter((account) => normalizePlatformKey(account.platform, defaultDraftKey) === key).length,
    ]),
  );
}

export function buildDraftsFromPlatformResult(
  byPlatform: CaptionByPlatformResult['byPlatform'],
  defaultDraftKey: string,
  emptyDraft: CaptionDraftView,
): Record<string, CaptionDraftView> {
  const entries = Object.entries(byPlatform ?? {})
    .map(([platform, draft]) => [
      normalizePlatformKey(platform, defaultDraftKey),
      {
        caption: draft.caption || '',
        hashtags: draft.hashtags || '',
      },
    ] as const);
  if (entries.length === 0) {
    return { [defaultDraftKey]: emptyDraft };
  }
  return Object.fromEntries(entries);
}

export function resolveDraftForPlatform(
  platformKey: string,
  drafts: Record<string, CaptionDraftView>,
  defaultDraftKey: string,
  emptyDraft: CaptionDraftView,
): CaptionDraftView {
  return drafts[platformKey] ?? drafts[defaultDraftKey] ?? emptyDraft;
}

export function groupAccountsByPlatform(
  accounts: GeelarkAccount[],
  defaultDraftKey = 'default',
): Map<string, GeelarkAccount[]> {
  const grouped = new Map<string, GeelarkAccount[]>();
  accounts.forEach((account) => {
    const key = normalizePlatformKey(account.platform, defaultDraftKey);
    const current = grouped.get(key) ?? [];
    current.push(account);
    grouped.set(key, current);
  });
  return grouped;
}

function interpolateCount(template: string, count: number): string {
  return template.replace('{count}', String(count));
}

export function buildDistributeStepViewModel(args: BuildDistributeStepViewModelArgs): DistributeStepViewModel {
  const sectionIds = args.sectionIds ?? DEFAULT_DISTRIBUTE_STEP_SECTION_IDS;
  const selectedCountValue = interpolateCount(args.labels.selectedCountValue, args.selectedAccountCount);
  const preflightItems: DistributeStepPreflightItem[] = [
    {
      key: 'asset',
      label: args.labels.preflightAsset,
      ready: !!args.selectedAsset,
      value: args.selectedAsset?.title ?? args.labels.none,
    },
    {
      key: 'accounts',
      label: args.labels.preflightAccounts,
      ready: args.selectedAccountCount > 0,
      value: selectedCountValue,
    },
    {
      key: 'copy',
      label: args.labels.preflightCopy,
      ready: args.hasAnyCopy,
      value: args.hasAnyCopy
        ? args.labels.preflightReady
        : args.labels.preflightOptional,
    },
  ];
  const publishDisabled = args.pushing || args.selectedAccountCount === 0 || !args.selectedAsset;
  const publishReadinessStatus: DistributeStepReadinessStatus = args.pushError
    ? 'attention'
    : publishDisabled
      ? 'blocked'
      : 'ready';

  return {
    preflightItems,
    publishDisabled,
    readinessItems: [
      {
        id: 'asset',
        href: `#${sectionIds.asset}`,
        step: '01',
        title: args.labels.assetTitle,
        detail: preflightItems[0]?.value ?? args.labels.none,
        status: preflightItems[0]?.ready ? 'ready' : 'blocked',
      },
      {
        id: 'copy',
        href: `#${sectionIds.copy}`,
        step: '02',
        title: args.labels.videoAndCaption,
        detail: args.hasAnyCopy ? args.labels.preflightReady : args.labels.stepReadinessCopyAttention,
        status: args.hasAnyCopy ? 'ready' : 'attention',
      },
      {
        id: 'accounts',
        href: `#${sectionIds.accounts}`,
        step: '03',
        title: args.labels.targetAccounts,
        detail: preflightItems[1]?.value ?? selectedCountValue,
        status: preflightItems[1]?.ready ? 'ready' : 'blocked',
      },
      {
        id: 'publish',
        href: `#${sectionIds.publish}`,
        step: '04',
        title: args.labels.stepReadinessPublish,
        detail: args.pushError
          ? args.labels.stepReadinessPublishError
          : publishDisabled
            ? args.labels.stepReadinessPublishBlocked
            : args.labels.stepReadinessPublishReady,
        status: publishReadinessStatus,
      },
    ],
  };
}

export function buildPublishFailureGuidance(input: {
  message: string | null;
  hasSelectedAsset: boolean;
  selectedAccountCount: number;
  labels: PublishFailureGuidanceLabels;
}): string | null {
  if (!input.message) return null;
  if (!input.hasSelectedAsset) return input.labels.noAsset;
  if (input.selectedAccountCount === 0) return input.labels.noAccount;

  const normalized = input.message.toLowerCase();
  if (/(auth|token|session|login|401|403)/.test(normalized)) {
    return input.labels.auth;
  }
  if (/(timeout|network|gee|provider|api|5\d\d)/.test(normalized)) {
    return input.labels.provider;
  }
  return input.labels.generic;
}
