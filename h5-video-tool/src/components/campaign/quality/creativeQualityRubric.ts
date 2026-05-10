import {
  CREATIVE_ISSUE_TAGS,
  CREATIVE_QUALITY_STATUSES,
  type CreativeIssueTag,
  type CreativeQualityDecision,
  type CreativeQualityRule,
  type CreativeQualitySignals,
  type CreativeQualityStatus,
} from './creativeQualityTypes.ts';

export const CREATIVE_QUALITY_RUBRIC: Record<CreativeQualityStatus, CreativeQualityRule[]> = {
  usable: [
    {
      status: 'usable',
      ruleId: 'usable_brief_match',
      label: 'Matches the brief',
      description: 'The output follows the campaign brief and intended platform context.',
    },
    {
      status: 'usable',
      ruleId: 'usable_selling_point_clear',
      label: 'Selling point is clear',
      description: 'The core payoff or selling point is visible enough for review or distribution.',
    },
    {
      status: 'usable',
      ruleId: 'usable_no_blocker',
      label: 'No blocking issue',
      description: 'There is no obvious source-asset, claim, composition, or publish blocker.',
    },
  ],
  needs_fix: [
    {
      status: 'needs_fix',
      ruleId: 'needs_fix_direction_right',
      label: 'Direction is right',
      description: 'The output is aligned enough to keep, but it needs copy, pacing, composition, or asset polish.',
    },
    {
      status: 'needs_fix',
      ruleId: 'needs_fix_non_blocking_tags',
      label: 'Issues are fixable',
      description: 'Issue tags describe fixable problems rather than a fundamental brief or asset mismatch.',
    },
  ],
  unusable: [
    {
      status: 'unusable',
      ruleId: 'unusable_brief_mismatch',
      label: 'Brief mismatch',
      description: 'The output does not satisfy the campaign brief or platform intent.',
    },
    {
      status: 'unusable',
      ruleId: 'unusable_core_asset_wrong',
      label: 'Core asset is wrong',
      description: 'A required character, product, gameplay, logo, or source asset is incorrect.',
    },
    {
      status: 'unusable',
      ruleId: 'unusable_publish_blocker',
      label: 'Cannot publish',
      description: 'The output is missing the selling point or has an obvious blocking publish issue.',
    },
  ],
};

const VALID_ISSUE_TAGS = new Set<CreativeIssueTag>(CREATIVE_ISSUE_TAGS);

function normalizeIssueTags(issueTags: CreativeIssueTag[] | undefined): CreativeIssueTag[] {
  return [...new Set((issueTags ?? []).filter((tag) => VALID_ISSUE_TAGS.has(tag)))];
}

function unusableReasons(input: CreativeQualitySignals): string[] {
  const reasons: string[] = [];
  if (!input.briefAligned) {
    reasons.push('Output does not match the campaign brief.');
  }
  if (!input.sourceAssetsCorrect) {
    reasons.push('Core source asset is missing or incorrect.');
  }
  if (!input.sellingPointClear) {
    reasons.push('Core selling point is missing or unclear.');
  }
  if (input.hasBlockingPublishIssue) {
    reasons.push('Output has a blocking publish issue.');
  }
  return reasons;
}

export function evaluateCreativeQuality(input: CreativeQualitySignals): CreativeQualityDecision {
  const issueTags = normalizeIssueTags(input.issueTags);
  const blockers = unusableReasons(input);

  if (blockers.length > 0) {
    return {
      outputType: input.outputType,
      status: 'unusable',
      reasons: blockers,
      issueTags,
      suggestedNextAction: 'Reject this output for distribution and create a new output from the original brief and approved source assets.',
    };
  }

  if (issueTags.length > 0) {
    return {
      outputType: input.outputType,
      status: 'needs_fix',
      reasons: issueTags.map((tag) => `Fix tagged issue: ${tag}.`),
      issueTags,
      suggestedNextAction: 'Keep the direction, capture feedback, and generate a revised prompt or follow-up task.',
    };
  }

  return {
    outputType: input.outputType,
    status: 'usable',
    reasons: [
      'Output matches the brief.',
      'Core selling point is clear.',
      'No blocking source-asset or publish issue is present.',
    ],
    issueTags,
    suggestedNextAction: 'Approve for package or distribution preparation.',
  };
}

export function assertCreativeQualityStatus(value: string): CreativeQualityStatus {
  if (CREATIVE_QUALITY_STATUSES.includes(value as CreativeQualityStatus)) {
    return value as CreativeQualityStatus;
  }
  throw new Error(`Unsupported creative quality status: ${value}`);
}
