/**
 * Frontend mirror of the unified backend job status model.
 */

export type UnifiedJobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timeout'
  | 'canceled';

export type JobErrorCode =
  | 'ARK_AUTH_INVALID'
  | 'ARK_CONTENT_POLICY'
  | 'ARK_COPYRIGHT_RISK'
  | 'ARK_INPUT_INVALID'
  | 'ARK_ASSET_UNAVAILABLE'
  | 'ARK_RATE_LIMIT'
  | 'ARK_TIMEOUT'
  | 'ARK_TASK_FAILED'
  | 'DREAMINA_NOT_LOGGED_IN'
  | 'DREAMINA_CONCURRENCY'
  | 'DREAMINA_UPLOAD_FAILED'
  | 'DREAMINA_CONTENT_RISK'
  | 'DREAMINA_TASK_FAILED'
  | 'COMPASS_RATE_LIMIT'
  | 'COMPASS_UNAVAILABLE'
  | 'COMPASS_QUOTA_EXCEEDED'
  | 'KLING_UNAUTHORIZED'
  | 'KLING_RATE_LIMIT'
  | 'KLING_TASK_FAILED'
  | 'PERSIST_FAILED'
  | 'TIMEOUT'
  | 'INPUT_INVALID'
  | 'UNKNOWN';

export interface UnifiedJobResult<T = unknown> {
  status: UnifiedJobStatus;
  data?: T;
  errorCode?: JobErrorCode;
  errorMessage?: string;
  startedAt?: string;
  endedAt?: string;
}

export function isTerminalStatus(s: UnifiedJobStatus): boolean {
  return s === 'succeeded' || s === 'failed' || s === 'timeout' || s === 'canceled';
}

export function toUnifiedStatus(raw: string): UnifiedJobStatus {
  switch (raw) {
    case 'queued':
    case 'pending':
    case 'awaiting_submit':
      return 'queued';
    case 'running':
    case 'processing':
    case 'queuing':
    case 'querying':
    case 'rendering':
      return 'running';
    case 'done':
    case 'completed':
    case 'succeeded':
    case 'success':
      return 'succeeded';
    case 'failed':
    case 'error':
      return 'failed';
    case 'timeout':
      return 'timeout';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    default:
      return 'running';
  }
}
