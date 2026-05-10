import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STORY_VIDEO_REVIEW_TAGS,
  buildStoryVideoOutputId,
  createStoryVideoReview,
  getStoryVideoReviewStorageKey,
  listStoryVideoReviewsForOutput,
  loadStoryVideoReviews,
  saveStoryVideoReview,
  type StoryVideoReviewStorage,
} from './storyVideoReviewStore.ts';

class MemoryStorage implements StoryVideoReviewStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test('story video tags stay fixed to the review-capture taxonomy', () => {
  assert.deepEqual([...STORY_VIDEO_REVIEW_TAGS], [
    'weak_opening',
    'slow_pacing',
    'unclear_selling_point',
    'weak_ending',
    'inaccurate_character',
  ]);
});

test('buildStoryVideoOutputId prefers campaign output id then task id', () => {
  assert.equal(
    buildStoryVideoOutputId({ campaignOutputId: 'item_tiktok_video', taskId: 'task-1' }),
    'item_tiktok_video',
  );
  assert.equal(
    buildStoryVideoOutputId({ taskId: 'task:video/1' }),
    'story_video_task_video_1',
  );
});

test('createStoryVideoReview returns a Run 0 ReviewContract-compatible record', () => {
  const review = createStoryVideoReview(
    {
      outputId: 'output_story_video_needs_fix',
      status: 'needs_fix',
      issueTags: ['weak_opening', 'slow_pacing', 'weak_opening'],
      note: ' Needs a stronger first three seconds. ',
      reviewerId: ' operator_a ',
      campaignId: 'campaign_gold_glory_rewards',
      resultTaskId: 'task-123',
      resultUrl: 'https://example.test/video.mp4',
      title: 'Reward reveal story video',
    },
    new Date('2026-05-10T08:00:00.000Z'),
  );

  assert.equal(review.outputId, 'output_story_video_needs_fix');
  assert.equal(review.status, 'needs_fix');
  assert.deepEqual(review.issueTags, ['weak_opening', 'slow_pacing']);
  assert.equal(review.note, 'Needs a stronger first three seconds.');
  assert.equal(review.reviewerId, 'operator_a');
  assert.equal(review.outputType, 'story_video');
  assert.equal(review.campaignId, 'campaign_gold_glory_rewards');
  assert.equal(review.createdAt, '2026-05-10T08:00:00.000Z');
  assert.match(review.reviewId, /^review_output_story_video_needs_fix_/);
});

test('story video review storage filters invalid data and lists by output', () => {
  const storage = new MemoryStorage();
  const username = 'operator_a';
  storage.setItem(getStoryVideoReviewStorageKey(username), JSON.stringify([{ broken: true }]));
  assert.deepEqual(loadStoryVideoReviews(storage, username), []);

  const first = createStoryVideoReview(
    {
      outputId: 'output_story_video',
      status: 'usable',
      issueTags: [],
      reviewerId: username,
    },
    new Date('2026-05-10T08:00:00.000Z'),
  );
  const second = createStoryVideoReview(
    {
      outputId: 'other_output',
      status: 'unusable',
      issueTags: ['unclear_selling_point'],
      reviewerId: username,
    },
    new Date('2026-05-10T08:05:00.000Z'),
  );

  saveStoryVideoReview(first, storage, username);
  saveStoryVideoReview(second, storage, username);

  const reviews = listStoryVideoReviewsForOutput('output_story_video', storage, username);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0]?.reviewId, first.reviewId);
  assert.equal(loadStoryVideoReviews(storage, username).length, 2);
});
