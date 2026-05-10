import type { ReviewContract } from '../contracts/campaignOutputContracts.ts';
import type {
  CreativeIssueTag,
  CreativeQualityStatus,
} from './creativeQualityTypes.ts';

const STORAGE_KEY_PREFIX = 'gobs-story-video-reviews';
const MAX_REVIEW_RECORDS = 200;

export const STORY_VIDEO_REVIEW_TAGS = [
  'weak_opening',
  'slow_pacing',
  'unclear_selling_point',
  'weak_ending',
  'inaccurate_character',
] as const satisfies readonly CreativeIssueTag[];

export type StoryVideoReviewTag = typeof STORY_VIDEO_REVIEW_TAGS[number];

export interface StoryVideoReviewRecord extends ReviewContract {
  outputType: 'story_video';
  campaignId?: string;
  resultTaskId?: string;
  resultUrl?: string;
  title?: string;
}

export interface CreateStoryVideoReviewInput {
  outputId: string;
  status: CreativeQualityStatus;
  issueTags: StoryVideoReviewTag[];
  note?: string;
  parentOutputId?: string;
  reviewerId?: string;
  campaignId?: string;
  resultTaskId?: string | null;
  resultUrl?: string | null;
  title?: string | null;
}

export interface StoryVideoReviewStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function safeSegment(value: string): string {
  return value
    .trim()
    .replace(/[^\w-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 96) || 'story_video_output';
}

function getDefaultStorage(): StoryVideoReviewStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function getCurrentUsername(storage: StoryVideoReviewStorage | null = getDefaultStorage()): string {
  if (!storage) return 'default';
  try {
    const raw = storage.getItem('gobs_user');
    if (!raw) return 'default';
    const user = JSON.parse(raw) as { username?: string };
    return user.username?.trim() || 'default';
  } catch {
    return 'default';
  }
}

export function getStoryVideoReviewStorageKey(username = getCurrentUsername()): string {
  return `${STORAGE_KEY_PREFIX}-${safeSegment(username)}`;
}

export function buildStoryVideoOutputId(input: {
  campaignOutputId?: string | null;
  taskId?: string | null;
  resultUrl?: string | null;
}): string {
  const campaignOutputId = input.campaignOutputId?.trim();
  if (campaignOutputId) return campaignOutputId;
  const taskId = input.taskId?.trim();
  if (taskId) return `story_video_${safeSegment(taskId)}`;
  const resultUrl = input.resultUrl?.trim();
  if (resultUrl) return `story_video_${safeSegment(resultUrl)}`;
  return `story_video_${Date.now()}`;
}

export function createStoryVideoReview(
  input: CreateStoryVideoReviewInput,
  now = new Date(),
): StoryVideoReviewRecord {
  const outputId = input.outputId.trim();
  const createdAt = now.toISOString();
  const reviewId = `review_${safeSegment(outputId)}_${safeSegment(createdAt)}`;
  const uniqueTags = STORY_VIDEO_REVIEW_TAGS.filter((tag) => input.issueTags.includes(tag));
  const note = input.note?.trim();
  const resultTaskId = input.resultTaskId?.trim();
  const resultUrl = input.resultUrl?.trim();
  const title = input.title?.trim();

  return {
    reviewId,
    outputId,
    status: input.status,
    issueTags: uniqueTags,
    ...(note ? { note } : {}),
    ...(input.parentOutputId?.trim() ? { parentOutputId: input.parentOutputId.trim() } : {}),
    reviewerId: input.reviewerId?.trim() || getCurrentUsername(),
    createdAt,
    outputType: 'story_video',
    ...(input.campaignId?.trim() ? { campaignId: input.campaignId.trim() } : {}),
    ...(resultTaskId ? { resultTaskId } : {}),
    ...(resultUrl ? { resultUrl } : {}),
    ...(title ? { title } : {}),
  };
}

function parseReviews(raw: string | null): StoryVideoReviewRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoryVideoReviewRecord);
  } catch {
    return [];
  }
}

function isStoryVideoReviewRecord(value: unknown): value is StoryVideoReviewRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<StoryVideoReviewRecord>;
  return (
    typeof record.reviewId === 'string' &&
    typeof record.outputId === 'string' &&
    record.outputType === 'story_video' &&
    (record.status === 'usable' || record.status === 'needs_fix' || record.status === 'unusable') &&
    Array.isArray(record.issueTags) &&
    typeof record.createdAt === 'string'
  );
}

export function loadStoryVideoReviews(
  storage: StoryVideoReviewStorage | null = getDefaultStorage(),
  username = getCurrentUsername(storage),
): StoryVideoReviewRecord[] {
  if (!storage) return [];
  return parseReviews(storage.getItem(getStoryVideoReviewStorageKey(username)));
}

export function saveStoryVideoReview(
  review: StoryVideoReviewRecord,
  storage: StoryVideoReviewStorage | null = getDefaultStorage(),
  username = getCurrentUsername(storage),
): StoryVideoReviewRecord[] {
  if (!storage) return [review];
  const existing = loadStoryVideoReviews(storage, username)
    .filter((item) => item.reviewId !== review.reviewId);
  const next = [review, ...existing]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_REVIEW_RECORDS);
  storage.setItem(getStoryVideoReviewStorageKey(username), JSON.stringify(next));
  return next;
}

export function listStoryVideoReviewsForOutput(
  outputId: string,
  storage: StoryVideoReviewStorage | null = getDefaultStorage(),
  username = getCurrentUsername(storage),
): StoryVideoReviewRecord[] {
  const normalizedOutputId = outputId.trim();
  if (!normalizedOutputId) return [];
  return loadStoryVideoReviews(storage, username)
    .filter((review) => review.outputId === normalizedOutputId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
