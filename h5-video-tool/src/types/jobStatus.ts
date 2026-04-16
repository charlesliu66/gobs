/**
 * 统一任务状态机（前端）
 * 与后端 domain/job-status.ts 保持对齐。
 * 前端只依据这套状态枚举渲染 UI，不做客户端猜测。
 */

export type UnifiedJobStatus =
  | 'queued'     // 已入队，等待执行
  | 'running'    // 执行中
  | 'succeeded'  // 成功完成
  | 'failed'     // 失败
  | 'timeout'    // 超时
  | 'canceled';  // 已取消

export type JobErrorCode =
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

/** 判断是否为终态 */
export function isTerminalStatus(s: UnifiedJobStatus): boolean {
  return s === 'succeeded' || s === 'failed' || s === 'timeout' || s === 'canceled';
}

/**
 * 适配各服务原生状态到统一状态。
 * 在前端适配层调用，用于统一 UI 渲染逻辑。
 */
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
