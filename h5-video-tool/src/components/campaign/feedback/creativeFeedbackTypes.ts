import type {
  CreativeIssueTag,
  CreativeOutputType,
} from '../quality/creativeQualityTypes.ts';

export const CREATIVE_FEEDBACK_TAGS = [
  'selling_point_not_prominent',
  'first_three_seconds_weak',
  'slow_pacing',
  'inaccurate_character',
  'reference_motion_mismatch',
  'copy_not_strong_enough',
  'better_for_tiktok',
  'better_for_facebook',
] as const;

export type CreativeFeedbackTag = typeof CREATIVE_FEEDBACK_TAGS[number];

export interface CreativeFeedbackTagDefinition {
  id: CreativeFeedbackTag;
  issueTag?: CreativeIssueTag;
  appliesTo: CreativeOutputType[];
  defaultLabel: string;
  nextVersionInstruction: string;
}

export interface CreativeFeedbackInput {
  feedbackTagIds: CreativeFeedbackTag[];
  feedbackNote?: string;
  reviewerId?: string;
  createdAt?: string;
}

export interface CreativeQualityPanelSummary {
  statusLabel: string;
  sourceSummary: string;
  issueSummary: string;
  recommendation: string;
}
