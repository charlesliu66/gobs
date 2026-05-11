import type {
  CampaignOutputPlan,
  ProducedOutputDraft,
  ProducedOutputKind,
  ProductionItem,
  ProductionItemType,
} from '../outputPlan.ts';
import type { CreativeIssueTag, CreativeOutputType } from '../quality/creativeQualityTypes.ts';
import {
  CREATIVE_FEEDBACK_TAGS,
  type CreativeFeedbackInput,
  type CreativeFeedbackTag,
  type CreativeFeedbackTagDefinition,
  type CreativeQualityPanelSummary,
} from './creativeFeedbackTypes.ts';

export const CREATIVE_FEEDBACK_TAG_DEFINITIONS: Record<CreativeFeedbackTag, CreativeFeedbackTagDefinition> = {
  selling_point_not_prominent: {
    id: 'selling_point_not_prominent',
    issueTag: 'unclear_selling_point',
    appliesTo: ['banner', 'platform_copy', 'story_video'],
    defaultLabel: 'Selling point not prominent',
    nextVersionInstruction: 'Make the core selling point visible in the first reading moment.',
  },
  first_three_seconds_weak: {
    id: 'first_three_seconds_weak',
    issueTag: 'weak_opening',
    appliesTo: ['story_video', 'motion_transfer_video', 'character_showcase_video'],
    defaultLabel: 'First 3 seconds are weak',
    nextVersionInstruction: 'Start with a stronger first beat before adding supporting context.',
  },
  slow_pacing: {
    id: 'slow_pacing',
    issueTag: 'slow_pacing',
    appliesTo: ['story_video', 'motion_transfer_video', 'character_showcase_video'],
    defaultLabel: 'Pacing is slow',
    nextVersionInstruction: 'Tighten the sequence and remove slow setup before the payoff.',
  },
  inaccurate_character: {
    id: 'inaccurate_character',
    issueTag: 'inaccurate_character',
    appliesTo: ['banner', 'story_video', 'motion_transfer_video', 'character_showcase_video'],
    defaultLabel: 'Character is inaccurate',
    nextVersionInstruction: 'Preserve the approved character identity and avoid off-model details.',
  },
  reference_motion_mismatch: {
    id: 'reference_motion_mismatch',
    issueTag: 'reference_motion_mismatch',
    appliesTo: ['motion_transfer_video', 'character_showcase_video', 'story_video'],
    defaultLabel: 'Action does not match reference',
    nextVersionInstruction: 'Follow the reference action more closely and reduce unrelated movement.',
  },
  copy_not_strong_enough: {
    id: 'copy_not_strong_enough',
    issueTag: 'copy_not_strong_enough',
    appliesTo: ['banner', 'platform_copy'],
    defaultLabel: 'Copy is not strong enough',
    nextVersionInstruction: 'Rewrite the copy with a sharper hook, clearer benefit, and stronger CTA.',
  },
  better_for_tiktok: {
    id: 'better_for_tiktok',
    issueTag: 'platform_fit_issue',
    appliesTo: ['banner', 'platform_copy', 'story_video'],
    defaultLabel: 'Better suited for TikTok',
    nextVersionInstruction: 'Bias the next version toward TikTok pacing, hook language, and mobile-first framing.',
  },
  better_for_facebook: {
    id: 'better_for_facebook',
    issueTag: 'platform_fit_issue',
    appliesTo: ['banner', 'platform_copy', 'story_video'],
    defaultLabel: 'Better suited for Facebook',
    nextVersionInstruction: 'Bias the next version toward Facebook feed readability and broader-context copy.',
  },
};

const VALID_FEEDBACK_TAGS = new Set<CreativeFeedbackTag>(CREATIVE_FEEDBACK_TAGS);
const COPY_OUTPUT_KINDS = new Set<ProducedOutputKind>(['caption', 'headline', 'hashtag', 'post_copy']);

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map((value) => value?.trim() ?? '').filter(Boolean))];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 88) || 'output';
}

function outputTypeFromItemAndOutput(item: ProductionItem, output: ProducedOutputDraft): CreativeOutputType {
  if (output.kind === 'banner_prompt' || item.type === 'banner') return 'banner';
  if (COPY_OUTPUT_KINDS.has(output.kind)) return 'platform_copy';
  if (item.type === 'tiktok_video' || item.type === 'short_video') return 'story_video';
  return 'platform_copy';
}

function titleForNextDraft(output: ProducedOutputDraft): string {
  if (output.kind === 'banner_prompt') return `Next version banner prompt: ${output.title}`;
  if (output.kind === 'headline') return `Next version headline prompt: ${output.title}`;
  if (output.kind === 'hashtag') return `Next version hashtag prompt: ${output.title}`;
  if (output.kind === 'caption') return `Next version caption prompt: ${output.title}`;
  return `Next version copy prompt: ${output.title}`;
}

function nextDraftBody(args: {
  plan: CampaignOutputPlan;
  item: ProductionItem;
  output: ProducedOutputDraft;
  feedbackTags: CreativeFeedbackTag[];
  feedbackNote?: string;
  sourceAssetIds: string[];
}): string {
  const { plan, item, output, feedbackTags, feedbackNote, sourceAssetIds } = args;
  const instructions = feedbackTags
    .map((tag) => CREATIVE_FEEDBACK_TAG_DEFINITIONS[tag]?.nextVersionInstruction)
    .filter(Boolean);
  const issueLines = instructions.length > 0
    ? instructions.map((instruction) => `- ${instruction}`).join('\n')
    : '- Keep the usable parts of the previous draft and strengthen the weakest review signal.';
  const traceLines = [
    `Parent output: ${output.id}`,
    `Campaign: ${plan.campaignId ?? 'not_set'}`,
    `Brief: ${plan.briefId}`,
    `Production item: ${item.id}`,
    `Source assets: ${sourceAssetIds.length > 0 ? sourceAssetIds.join(', ') : 'not_set'}`,
  ].join('\n');
  const noteLine = feedbackNote?.trim() ? `\nReviewer note: ${feedbackNote.trim()}` : '';

  if (output.kind === 'banner_prompt') {
    const formats = output.bannerSpecIds?.length ? output.bannerSpecIds.join(', ') : 'inherit previous Banner specs';
    return [
      'Create the next version of this campaign Banner prompt.',
      traceLines,
      `Formats: ${formats}`,
      'Feedback to fix:',
      issueLines,
      noteLine.trim(),
      'Keep approved source assets, preserve the original campaign brief, and make the revised visual/copy direction explicit.',
    ].filter(Boolean).join('\n');
  }

  return [
    'Create the next version of this campaign copy draft.',
    traceLines,
    `Platform: ${output.platform}`,
    'Previous draft:',
    output.body,
    'Feedback to fix:',
    issueLines,
    noteLine.trim(),
    'Keep the original campaign brief and make the revised hook/CTA ready for human review.',
  ].filter(Boolean).join('\n');
}

function nextDraftId(outputs: ProducedOutputDraft[], parentOutputId: string): string {
  const sequence = outputs.filter((output) => output.parentOutputId === parentOutputId).length + 1;
  return `${slugify(parentOutputId)}_next_${sequence}`;
}

function feedbackTagsToIssueTags(feedbackTags: CreativeFeedbackTag[]): CreativeIssueTag[] {
  return uniqueStrings(
    feedbackTags.map((tag) => CREATIVE_FEEDBACK_TAG_DEFINITIONS[tag]?.issueTag),
  ) as CreativeIssueTag[];
}

export function normalizeCreativeFeedbackTags(tags: CreativeFeedbackTag[]): CreativeFeedbackTag[] {
  return uniqueStrings(tags).filter((tag): tag is CreativeFeedbackTag =>
    VALID_FEEDBACK_TAGS.has(tag as CreativeFeedbackTag),
  );
}

export function creativeFeedbackTagsForOutput(
  item: ProductionItem,
  output: ProducedOutputDraft,
): CreativeFeedbackTagDefinition[] {
  const outputType = outputTypeFromItemAndOutput(item, output);
  return CREATIVE_FEEDBACK_TAGS
    .map((tag) => CREATIVE_FEEDBACK_TAG_DEFINITIONS[tag])
    .filter((definition) => definition.appliesTo.includes(outputType));
}

export function canCreateNextVersionDraft(output: ProducedOutputDraft): boolean {
  return output.kind === 'banner_prompt' || COPY_OUTPUT_KINDS.has(output.kind);
}

export function buildCreativeQualityPanelSummary(
  item: ProductionItem,
  output: ProducedOutputDraft,
): CreativeQualityPanelSummary {
  const outputType = outputTypeFromItemAndOutput(item, output);
  const statusLabel = output.qualityStatus ?? 'not_reviewed';
  const feedbackTags = normalizeCreativeFeedbackTags(output.feedbackTagIds ?? []);
  const issueSummary = feedbackTags.length > 0
    ? feedbackTags.map((tag) => CREATIVE_FEEDBACK_TAG_DEFINITIONS[tag].defaultLabel).join(', ')
    : 'No feedback tags recorded yet.';
  const sourceSummary = 'Signals: human marks, selected feedback tags, and static rules only.';
  const recommendation = output.qualityStatus === 'usable'
    ? 'Keep this output for package preparation, then only create a next version when the operator wants a new angle.'
    : output.qualityStatus === 'unusable'
      ? 'Create a new version from the original brief and approved assets before distribution.'
      : output.qualityStatus === 'needs_fix' || feedbackTags.length > 0
        ? 'Create a next-version draft that keeps the parent context and fixes the selected feedback.'
        : outputType === 'story_video'
          ? 'Capture human feedback first; video next-version work is a follow-up task, not automatic local regeneration.'
          : 'Add a human mark or feedback tag before creating a next-version draft.';

  return {
    statusLabel,
    sourceSummary,
    issueSummary,
    recommendation,
  };
}

export function buildNextVersionDraft(
  plan: CampaignOutputPlan,
  item: ProductionItem,
  output: ProducedOutputDraft,
  input: CreativeFeedbackInput,
): ProducedOutputDraft {
  const feedbackTagIds = normalizeCreativeFeedbackTags(input.feedbackTagIds);
  const feedbackIssueTags = feedbackTagsToIssueTags(feedbackTagIds);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const existingOutputs = item.producedOutputs ?? [];
  const sourceAssetIds = uniqueStrings([
    ...(output.sourceAssetIds ?? []),
    ...item.requiredSourceAssetIds,
  ]);
  const draftId = nextDraftId(existingOutputs, output.id);

  return {
    id: draftId,
    kind: output.kind,
    title: titleForNextDraft(output),
    body: nextDraftBody({
      plan,
      item,
      output,
      feedbackTags: feedbackTagIds,
      feedbackNote: input.feedbackNote,
      sourceAssetIds,
    }),
    variants: [],
    platform: output.platform,
    status: 'draft',
    parentOutputId: output.id,
    bannerSpecIds: output.bannerSpecIds,
    sourceAssetIds,
    feedbackTagIds,
    feedbackIssueTags,
    feedbackNote: input.feedbackNote?.trim() || undefined,
    reviewerId: input.reviewerId,
    campaignId: plan.campaignId,
    briefId: plan.briefId,
    createdAt,
  };
}

export function appendNextVersionDraftToPlan(
  plan: CampaignOutputPlan,
  itemId: string,
  outputId: string,
  input: CreativeFeedbackInput,
): CampaignOutputPlan {
  const nowIso = input.createdAt ?? new Date().toISOString();
  return {
    ...plan,
    items: plan.items.map((item) => {
      if (item.id !== itemId) return item;
      const parentOutput = item.producedOutputs?.find((output) => output.id === outputId);
      if (!parentOutput || !canCreateNextVersionDraft(parentOutput)) return item;
      const nextDraft = buildNextVersionDraft(plan, item, parentOutput, input);
      return {
        ...item,
        outputAssetIds: uniqueStrings([...item.outputAssetIds, nextDraft.id]),
        producedOutputs: [
          ...(item.producedOutputs ?? []),
          nextDraft,
        ],
      };
    }),
    updatedAt: nowIso,
  };
}

export function outputTypeFromProductionItem(type: ProductionItemType): CreativeOutputType {
  if (type === 'banner') return 'banner';
  if (type === 'tiktok_video' || type === 'short_video') return 'story_video';
  return 'platform_copy';
}
