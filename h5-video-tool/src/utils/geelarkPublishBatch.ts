export interface PublishBatchResponseItem {
  accountId: string;
  username: string;
  envId?: string;
  region?: string;
  platform?: string;
  remark?: string;
  taskId?: string;
  submitError?: string;
}

export interface PublishBatchResponse {
  planName?: string;
  items?: PublishBatchResponseItem[];
}

export interface PublishResultLike {
  planName?: string;
  batch?: PublishBatchResponse;
}

export interface TaskDetailLike {
  id: string;
  status?: number;
  statusText?: string;
  failDesc?: string;
  resultImages?: string[];
  shareLink?: string;
  logs?: string[];
}

export interface LatestPublishBatchItem extends PublishBatchResponseItem {
  statusText: string;
  detailLoading: boolean;
  detail?: TaskDetailLike;
  detailError?: string;
}

export interface LatestPublishBatch {
  planName?: string;
  createdAt: number;
  items: LatestPublishBatchItem[];
}

const TERMINAL_STATUSES = new Set([3, 4, 7]);

export function buildLatestPublishBatch(result: PublishResultLike, createdAt = Date.now()): LatestPublishBatch | null {
  const items = result.batch?.items;
  if (!Array.isArray(items) || items.length === 0) return null;

  return {
    planName: result.batch?.planName ?? result.planName,
    createdAt,
    items: items.map((item) => {
      if (item.submitError) {
        return {
          ...item,
          statusText: 'submit_failed',
          detailLoading: false,
          detailError: item.submitError,
        };
      }
      return {
        ...item,
        statusText: 'submitted',
        detailLoading: !!item.taskId,
      };
    }),
  };
}

export function mergeTaskDetailIntoBatch(
  batch: LatestPublishBatch,
  taskId: string,
  detail: TaskDetailLike,
): LatestPublishBatch {
  return {
    ...batch,
    items: batch.items.map((item) => {
      if (item.taskId !== taskId) return item;
      return {
        ...item,
        statusText: detail.statusText ?? item.statusText,
        detailLoading: false,
        detail,
        detailError: undefined,
      };
    }),
  };
}

export function mergeTaskDetailError(
  batch: LatestPublishBatch,
  taskId: string,
  errorMessage: string,
): LatestPublishBatch {
  return {
    ...batch,
    items: batch.items.map((item) => {
      if (item.taskId !== taskId) return item;
      return {
        ...item,
        detailLoading: false,
        detailError: errorMessage,
      };
    }),
  };
}

export function getPendingTaskIds(batch: LatestPublishBatch | null): string[] {
  if (!batch) return [];
  return batch.items
    .filter((item) => item.taskId)
    .filter((item) => !item.detail || !TERMINAL_STATUSES.has(Number(item.detail.status ?? 0)))
    .map((item) => item.taskId as string);
}

export function isBatchComplete(batch: LatestPublishBatch | null): boolean {
  return getPendingTaskIds(batch).length === 0;
}
