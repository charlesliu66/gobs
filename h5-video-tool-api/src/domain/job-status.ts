/**
 * Unified job status and error code helpers shared across providers.
 */

export type JobStatus =
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

export interface JobResult<T = unknown> {
  status: JobStatus;
  data?: T;
  errorCode?: JobErrorCode;
  errorMessage?: string;
  startedAt?: string;
  endedAt?: string;
}

export function classifyError(err: unknown): { errorCode: JobErrorCode; errorMessage: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // Ark / Seedance
  if (/ark.*api.*key|invalid api key|authorization|bearer/i.test(msg)) {
    return { errorCode: 'ARK_AUTH_INVALID', errorMessage: msg };
  }
  if (/copyright|trademark|brand|lyrics|ip restriction|受保护作品/i.test(msg)) {
    return { errorCode: 'ARK_COPYRIGHT_RISK', errorMessage: msg };
  }
  if (/policy|safety|moderation|content.*restricted|内容安全|审核拦截/i.test(msg)) {
    return { errorCode: 'ARK_CONTENT_POLICY', errorMessage: msg };
  }
  if (/invalid.*input|bad request|missing required|参数.*错误|格式.*错误/i.test(msg)) {
    return { errorCode: 'ARK_INPUT_INVALID', errorMessage: msg };
  }
  if (/asset.*unavailable|download.*failed|image.*unreachable|video.*unreachable|audio.*unreachable/i.test(msg)) {
    return { errorCode: 'ARK_ASSET_UNAVAILABLE', errorMessage: msg };
  }
  if (/429|rate.?limit|too many request/i.test(msg) && /(ark|seedance)/i.test(msg)) {
    return { errorCode: 'ARK_RATE_LIMIT', errorMessage: msg };
  }
  if (/timeout|timed.?out/i.test(lower) && /(ark|seedance)/i.test(lower)) {
    return { errorCode: 'ARK_TIMEOUT', errorMessage: msg };
  }
  if (/(ark|seedance)/i.test(lower) && /(fail|error)/i.test(lower)) {
    return { errorCode: 'ARK_TASK_FAILED', errorMessage: msg };
  }

  // Dreamina
  if (/not logged in|login.*required|dreamina.*login|cli.*login|未登录/i.test(msg)) {
    return { errorCode: 'DREAMINA_NOT_LOGGED_IN', errorMessage: msg };
  }
  if (/ret=1310|exceed.*concurrency|concurrency.*limit/i.test(msg)) {
    return { errorCode: 'DREAMINA_CONCURRENCY', errorMessage: msg };
  }
  if (/upload phase.*no file|tos.*upload|upload resource.*image/i.test(msg)) {
    return { errorCode: 'DREAMINA_UPLOAD_FAILED', errorMessage: msg };
  }
  if (/content.*risk|risk.*content|审核|违规/i.test(msg)) {
    return { errorCode: 'DREAMINA_CONTENT_RISK', errorMessage: msg };
  }
  if (/dreamina/i.test(msg) && /(fail|error|err)/i.test(msg)) {
    return { errorCode: 'DREAMINA_TASK_FAILED', errorMessage: msg };
  }

  // Compass
  if (/429|rate.?limit|too many request/i.test(msg)) {
    return { errorCode: 'COMPASS_RATE_LIMIT', errorMessage: msg };
  }
  if (/quota.*exceeded|exceeded.*quota/i.test(msg)) {
    return { errorCode: 'COMPASS_QUOTA_EXCEEDED', errorMessage: msg };
  }
  if (/econnrefused|enotfound|etimedout|compass.*unavail|compass.*connect/i.test(msg)) {
    return { errorCode: 'COMPASS_UNAVAILABLE', errorMessage: msg };
  }

  // Kling
  if (/401|unauthorized|kling.*key|api.*key.*invalid/i.test(lower)) {
    return { errorCode: 'KLING_UNAUTHORIZED', errorMessage: msg };
  }
  if (/kling.*rate|rate.*kling/i.test(lower)) {
    return { errorCode: 'KLING_RATE_LIMIT', errorMessage: msg };
  }
  if (/kling/i.test(lower) && /(fail|error)/i.test(lower)) {
    return { errorCode: 'KLING_TASK_FAILED', errorMessage: msg };
  }

  if (/persist.*failed|落盘失败/i.test(msg)) {
    return { errorCode: 'PERSIST_FAILED', errorMessage: msg };
  }
  if (/timeout|timed.?out/i.test(lower)) {
    return { errorCode: 'TIMEOUT', errorMessage: msg };
  }
  if (/input.*invalid|参数.*错误|格式.*错误/i.test(msg)) {
    return { errorCode: 'INPUT_INVALID', errorMessage: msg };
  }

  return { errorCode: 'UNKNOWN', errorMessage: msg };
}

export function classifyDreaminaFailReason(failReason: string | undefined): JobErrorCode {
  if (!failReason) return 'DREAMINA_TASK_FAILED';
  const lower = failReason.toLowerCase();

  if (lower.includes('ark_auth_invalid')) return 'ARK_AUTH_INVALID';
  if (lower.includes('ark_content_policy')) return 'ARK_CONTENT_POLICY';
  if (lower.includes('ark_copyright_risk')) return 'ARK_COPYRIGHT_RISK';
  if (lower.includes('ark_input_invalid')) return 'ARK_INPUT_INVALID';
  if (lower.includes('ark_asset_unavailable')) return 'ARK_ASSET_UNAVAILABLE';
  if (lower.includes('ark_rate_limit')) return 'ARK_RATE_LIMIT';
  if (lower.includes('ark_timeout')) return 'ARK_TIMEOUT';
  if (lower.includes('ark_task_failed')) return 'ARK_TASK_FAILED';

  if (/content.*risk|risk.*content|审核|违规/.test(lower)) return 'DREAMINA_CONTENT_RISK';
  if (/upload|tos/.test(lower)) return 'DREAMINA_UPLOAD_FAILED';
  if (/concurren|1310/.test(lower)) return 'DREAMINA_CONCURRENCY';
  return 'DREAMINA_TASK_FAILED';
}

export function fromBatchJobStatus(
  s: 'pending' | 'queuing' | 'processing' | 'done' | 'failed' | 'cancelled' | 'awaiting_submit',
): JobStatus {
  switch (s) {
    case 'pending':
    case 'awaiting_submit':
      return 'queued';
    case 'queuing':
    case 'processing':
      return 'running';
    case 'done':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'canceled';
  }
}

export function fromDreaminaPhase(phase: 'querying' | 'success' | 'failed'): JobStatus {
  switch (phase) {
    case 'querying':
      return 'running';
    case 'success':
      return 'succeeded';
    case 'failed':
      return 'failed';
  }
}

export function fromKlingPhase(
  phase: 'pending' | 'processing' | 'succeeded' | 'failed',
): JobStatus {
  switch (phase) {
    case 'pending':
      return 'queued';
    case 'processing':
      return 'running';
    case 'succeeded':
      return 'succeeded';
    case 'failed':
      return 'failed';
  }
}

export function fromQuickFilmStatus(s: 'pending' | 'running' | 'done' | 'error'): JobStatus {
  switch (s) {
    case 'pending':
      return 'queued';
    case 'running':
      return 'running';
    case 'done':
      return 'succeeded';
    case 'error':
      return 'failed';
  }
}

export function fromDreaminaHttpStatus(s: 'pending' | 'completed' | 'failed'): JobStatus {
  switch (s) {
    case 'pending':
      return 'running';
    case 'completed':
      return 'succeeded';
    case 'failed':
      return 'failed';
  }
}

export function fromEditorExportStatus(s: 'queued' | 'processing' | 'done' | 'error'): JobStatus {
  switch (s) {
    case 'queued':
      return 'queued';
    case 'processing':
      return 'running';
    case 'done':
      return 'succeeded';
    case 'error':
      return 'failed';
  }
}

export function fromRemixStatus(s: 'pending' | 'rendering' | 'done' | 'failed'): JobStatus {
  switch (s) {
    case 'pending':
      return 'queued';
    case 'rendering':
      return 'running';
    case 'done':
      return 'succeeded';
    case 'failed':
      return 'failed';
  }
}

export function isTerminalStatus(s: JobStatus): boolean {
  return s === 'succeeded' || s === 'failed' || s === 'timeout' || s === 'canceled';
}
