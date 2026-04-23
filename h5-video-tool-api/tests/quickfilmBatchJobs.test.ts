import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuickfilmBatchJob } from '../src/routes/quickfilm.ts';
import { isSameOwnedQuickfilmQueueJob, type BatchJob } from '../src/services/batchJobsQueue.ts';

test('buildQuickfilmBatchJob preserves username for immediately submitted jobs', () => {
  const job = buildQuickfilmBatchJob({
    id: 'bj_1',
    submitId: 'submit_1',
    taskId: 'dreamina-submit_1',
    projectId: 'quickfilm-demo',
    username: 'alice',
    shotIndex: 0,
    shotDescription: '第一镜',
    model: 'dreamina-text2video',
    status: 'pending',
  });

  assert.equal(job.username, 'alice');
  assert.equal(job.source, 'quickfilm');
  assert.equal(job.status, 'pending');
});

test('buildQuickfilmBatchJob preserves username for awaiting_submit jobs', () => {
  const job = buildQuickfilmBatchJob({
    id: 'bj_2',
    submitId: '',
    taskId: '',
    projectId: 'quickfilm-demo',
    username: 'alice',
    shotIndex: 1,
    shotDescription: '第二镜',
    model: 'dreamina-image2video',
    status: 'awaiting_submit',
    submitParams: {
      prompt: 'test prompt',
      aspectRatio: '9:16',
      duration: 5,
      model: 'dreamina-image2video',
      imageBase64: 'abc',
      imageMimeType: 'image/png',
    },
  });

  assert.equal(job.username, 'alice');
  assert.equal(job.source, 'quickfilm');
  assert.equal(job.status, 'awaiting_submit');
  assert.equal(job.submitParams?.model, 'dreamina-image2video');
});

test('quickfilm chained submit only accepts the same account and project queue', () => {
  const completed: BatchJob = {
    id: 'bj_done',
    submitId: 'submit_done',
    taskId: 'dreamina-submit_done',
    projectId: 'shared-project-id',
    username: 'alice',
    shotIndex: 0,
    shotDescription: 'done',
    model: 'dreamina-text2video',
    source: 'quickfilm',
    status: 'done',
    createdAt: '2026-04-23T00:00:00.000Z',
    updatedAt: '2026-04-23T00:05:00.000Z',
  };
  const candidate: BatchJob = {
    ...completed,
    id: 'bj_next',
    submitId: '',
    taskId: '',
    shotIndex: 1,
    status: 'awaiting_submit',
    submitParams: {
      prompt: 'next',
      aspectRatio: '9:16',
      duration: 5,
      model: 'dreamina-text2video',
    },
  };

  assert.equal(isSameOwnedQuickfilmQueueJob(candidate, completed), true);
  assert.equal(isSameOwnedQuickfilmQueueJob({ ...candidate, username: 'bob' }, completed), false);
  assert.equal(isSameOwnedQuickfilmQueueJob({ ...candidate, projectId: 'other-project' }, completed), false);
  assert.equal(isSameOwnedQuickfilmQueueJob(candidate, { ...completed, username: undefined }), false);
});
