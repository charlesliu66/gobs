export const CREATIVE_OUTPUT_TYPES = [
  'story_video',
  'motion_transfer_video',
  'character_showcase_video',
  'banner',
  'platform_copy',
] as const;

export type CreativeOutputType = typeof CREATIVE_OUTPUT_TYPES[number];

export const CREATIVE_QUALITY_STATUSES = [
  'usable',
  'needs_fix',
  'unusable',
] as const;

export type CreativeQualityStatus = typeof CREATIVE_QUALITY_STATUSES[number];

export const CREATIVE_ISSUE_TAGS = [
  'weak_opening',
  'slow_pacing',
  'unclear_selling_point',
  'weak_ending',
  'inaccurate_character',
  'reference_motion_mismatch',
  'copy_not_strong_enough',
  'composition_issue',
  'source_asset_issue',
  'platform_fit_issue',
] as const;

export type CreativeIssueTag = typeof CREATIVE_ISSUE_TAGS[number];

export interface CreativeQualitySignals {
  outputType: CreativeOutputType;
  briefAligned: boolean;
  sellingPointClear: boolean;
  sourceAssetsCorrect: boolean;
  hasBlockingPublishIssue: boolean;
  issueTags?: CreativeIssueTag[];
  operatorNote?: string;
}

export interface CreativeQualityRule {
  status: CreativeQualityStatus;
  ruleId: string;
  label: string;
  description: string;
}

export interface CreativeQualityDecision {
  outputType: CreativeOutputType;
  status: CreativeQualityStatus;
  reasons: string[];
  issueTags: CreativeIssueTag[];
  suggestedNextAction: string;
}
