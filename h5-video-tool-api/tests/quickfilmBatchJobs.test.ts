import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuickfilmBatchJob } from '../src/routes/quickfilm.ts';

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
