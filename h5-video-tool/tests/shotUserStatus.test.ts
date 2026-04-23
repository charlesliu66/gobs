import test from 'node:test';
import assert from 'node:assert/strict';

import { getShotUserStatus, getShotUserStatusLabelKey } from '../src/studio/shotUserStatus.ts';

test('getShotUserStatus returns completed when shot has preview media', () => {
  assert.equal(
    getShotUserStatus({
      hasVideo: true,
      jobStatus: 'failed',
      hasPendingSubmitId: true,
    }).status,
    'completed',
  );
});

test('getShotUserStatus maps awaiting submit to waiting submit', () => {
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'awaiting_submit',
      hasPendingSubmitId: false,
    }).status,
    'waiting_submit',
  );
});

test('getShotUserStatus maps platform queue and provider queue states', () => {
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'queuing',
      hasPendingSubmitId: false,
    }).status,
    'platform_queueing',
  );
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'pending',
      hasPendingSubmitId: false,
    }).status,
    'platform_queueing',
  );
});

test('getShotUserStatus maps processing and pending submit id to generating', () => {
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'processing',
      hasPendingSubmitId: false,
    }).status,
    'generating',
  );
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      hasPendingSubmitId: true,
    }).status,
    'generating',
  );
});

test('getShotUserStatus lets active job queue states override stale pending submit ids', () => {
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'awaiting_submit',
      hasPendingSubmitId: true,
    }).status,
    'waiting_submit',
  );
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'queuing',
      hasPendingSubmitId: true,
    }).status,
    'platform_queueing',
  );
});

test('getShotUserStatus maps terminal states without video', () => {
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'failed',
      hasPendingSubmitId: false,
    }).status,
    'failed',
  );
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      jobStatus: 'cancelled',
      hasPendingSubmitId: false,
    }).status,
    'cancelled',
  );
});

test('getShotUserStatus returns not started when no media or job exists', () => {
  assert.equal(
    getShotUserStatus({
      hasVideo: false,
      hasPendingSubmitId: false,
    }).status,
    'not_started',
  );
});

test('getShotUserStatus exposes stable i18n label keys', () => {
  const result = getShotUserStatus({
    hasVideo: false,
    jobStatus: 'queuing',
  });

  assert.equal(result.labelKey, 'productionWizard.status.platformQueueing');
  assert.equal(getShotUserStatusLabelKey(result.status), result.labelKey);
});
