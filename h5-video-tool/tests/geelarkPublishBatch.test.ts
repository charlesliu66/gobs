import test from 'node:test';
import assert from 'node:assert/strict';
import * as geelarkBatch from '../src/utils/geelarkPublishBatch.ts';

test('buildLatestPublishBatch keeps all returned publish items for the current batch card', () => {
  const buildLatestPublishBatch = (geelarkBatch as Record<string, unknown>).buildLatestPublishBatch as
    | ((result: unknown, createdAt?: number) => unknown)
    | undefined;

  assert.equal(typeof buildLatestPublishBatch, 'function');
  assert.deepEqual(
    buildLatestPublishBatch?.(
      {
        taskIds: ['task-1'],
        planName: 'plan-1',
        batch: {
          planName: 'plan-1',
          items: [
            { accountId: 'acc-1', username: 'web TH tt', taskId: 'task-1' },
            { accountId: 'acc-2', username: 'ID test3', submitError: 'GeeLark did not return a task id for this account' },
          ],
        },
      },
      123,
    ),
    {
      planName: 'plan-1',
      createdAt: 123,
      items: [
        {
          accountId: 'acc-1',
          username: 'web TH tt',
          taskId: 'task-1',
          statusText: 'submitted',
          detailLoading: true,
        },
        {
          accountId: 'acc-2',
          username: 'ID test3',
          submitError: 'GeeLark did not return a task id for this account',
          statusText: 'submit_failed',
          detailLoading: false,
          detailError: 'GeeLark did not return a task id for this account',
        },
      ],
    },
  );
});

test('mergeTaskDetailIntoBatch updates the matching task row and keeps other rows untouched', () => {
  const mergeTaskDetailIntoBatch = (geelarkBatch as Record<string, unknown>).mergeTaskDetailIntoBatch as
    | ((batch: unknown, taskId: string, detail: unknown) => unknown)
    | undefined;

  assert.equal(typeof mergeTaskDetailIntoBatch, 'function');
  assert.deepEqual(
    mergeTaskDetailIntoBatch?.(
      {
        planName: 'plan-1',
        createdAt: 123,
        items: [
          { accountId: 'acc-1', username: 'web TH tt', taskId: 'task-1', statusText: 'submitted', detailLoading: true },
          { accountId: 'acc-2', username: 'ID test3', taskId: 'task-2', statusText: 'submitted', detailLoading: true },
        ],
      },
      'task-2',
      {
        id: 'task-2',
        status: 4,
        statusText: 'failed',
        failDesc: 'The account is not logged in',
        resultImages: [],
        logs: ['Run failed'],
      },
    ),
    {
      planName: 'plan-1',
      createdAt: 123,
      items: [
        { accountId: 'acc-1', username: 'web TH tt', taskId: 'task-1', statusText: 'submitted', detailLoading: true },
        {
          accountId: 'acc-2',
          username: 'ID test3',
          taskId: 'task-2',
          statusText: 'failed',
          detailLoading: false,
          detail: {
            id: 'task-2',
            status: 4,
            statusText: 'failed',
            failDesc: 'The account is not logged in',
            resultImages: [],
            logs: ['Run failed'],
          },
          detailError: undefined,
        },
      ],
    },
  );
});

test('getPendingTaskIds returns only task ids that still need polling', () => {
  const getPendingTaskIds = (geelarkBatch as Record<string, unknown>).getPendingTaskIds as
    | ((batch: unknown) => string[])
    | undefined;

  assert.equal(typeof getPendingTaskIds, 'function');
  assert.deepEqual(
    getPendingTaskIds?.({
      planName: 'plan-1',
      createdAt: 123,
      items: [
        { accountId: 'acc-1', username: 'web TH tt', taskId: 'task-1', detail: { id: 'task-1', status: 2 } },
        { accountId: 'acc-2', username: 'ID test3', taskId: 'task-2', detail: { id: 'task-2', status: 3 } },
        { accountId: 'acc-3', username: 'TH test2', submitError: 'no task' },
      ],
    }),
    ['task-1'],
  );
});
