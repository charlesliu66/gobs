/**
 * 统一任务状态机 & 错误码
 *
 * 所有视频生成（Dreamina / Compass / Kling）使用同一套状态/错误码体系，
 * 前端根据 errorCode 精确展示提示，不再猜测错误原因。
 */

// ── 任务状态 ──────────────────────────────────────────────────────────────────

export type JobStatus =
  | 'queued'     // 已入队，等待执行
  | 'running'    // 执行中
  | 'succeeded'  // 成功完成
  | 'failed'     // 失败（可重试或需用户介入）
  | 'timeout'    // 超时（未在期望时间内完成）
  | 'canceled'   // 已取消

// ── 错误码枚举 ────────────────────────────────────────────────────────────────

export type JobErrorCode =
  // Dreamina（即梦）相关
  | 'DREAMINA_NOT_LOGGED_IN'   // CLI 未登录
  | 'DREAMINA_CONCURRENCY'     // 超出并发限制（ret=1310）
  | 'DREAMINA_UPLOAD_FAILED'   // TOS 上传失败（素材上传阶段）
  | 'DREAMINA_CONTENT_RISK'    // 内容审核拦截
  | 'DREAMINA_TASK_FAILED'     // 任务通用失败（即梦侧报错）
  // Compass（罗盘）相关
  | 'COMPASS_RATE_LIMIT'       // 请求频率超限（429）
  | 'COMPASS_UNAVAILABLE'      // 服务不可达（网络 / 内网不通）
  | 'COMPASS_QUOTA_EXCEEDED'   // 配额耗尽
  // Kling（可灵）相关
  | 'KLING_UNAUTHORIZED'       // API Key 无效或未配置
  | 'KLING_RATE_LIMIT'         // 可灵频率限制
  | 'KLING_TASK_FAILED'        // 可灵任务失败
  // 通用
  | 'TIMEOUT'                  // 轮询超时
  | 'INPUT_INVALID'            // 参数校验失败
  | 'UNKNOWN'                  // 未知/未分类错误

// ── 统一结果载体 ──────────────────────────────────────────────────────────────

export interface JobResult<T = unknown> {
  status: JobStatus
  data?: T
  errorCode?: JobErrorCode
  errorMessage?: string
  startedAt?: string
  endedAt?: string
}

// ── 错误分类工具 ──────────────────────────────────────────────────────────────

/**
 * 将任意错误对象映射到 errorCode + errorMessage。
 * 用于 catch 块中标准化错误响应，保留原始错误信息供调试。
 */
export function classifyError(err: unknown): { errorCode: JobErrorCode; errorMessage: string } {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // ── Dreamina ──
  if (/未登录|not logged in|login.*required|dreamina.*login|cli.*login/i.test(msg)) {
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
  if (/dreamina/i.test(msg) && /fail|error|err/i.test(msg)) {
    return { errorCode: 'DREAMINA_TASK_FAILED', errorMessage: msg };
  }

  // ── Compass ──
  if (/429|rate.?limit|too many request/i.test(msg)) {
    return { errorCode: 'COMPASS_RATE_LIMIT', errorMessage: msg };
  }
  if (/quota.*exceeded|exceeded.*quota/i.test(msg)) {
    return { errorCode: 'COMPASS_QUOTA_EXCEEDED', errorMessage: msg };
  }
  if (/econnrefused|enotfound|etimedout|compass.*unavail|compass.*connect/i.test(msg)) {
    return { errorCode: 'COMPASS_UNAVAILABLE', errorMessage: msg };
  }

  // ── Kling ──
  if (/401|unauthorized|kling.*key|api.*key.*invalid/i.test(lower)) {
    return { errorCode: 'KLING_UNAUTHORIZED', errorMessage: msg };
  }
  if (/kling.*rate|rate.*kling/i.test(lower)) {
    return { errorCode: 'KLING_RATE_LIMIT', errorMessage: msg };
  }
  if (/kling/i.test(lower) && /fail|error/i.test(lower)) {
    return { errorCode: 'KLING_TASK_FAILED', errorMessage: msg };
  }

  // ── 通用 ──
  if (/timeout|timed.?out/i.test(lower)) {
    return { errorCode: 'TIMEOUT', errorMessage: msg };
  }

  return { errorCode: 'UNKNOWN', errorMessage: msg };
}

/**
 * 从即梦 failReason 字符串提取 errorCode（用于 pollDreaminaTask 返回后分类）
 */
export function classifyDreaminaFailReason(failReason: string | undefined): JobErrorCode {
  if (!failReason) return 'DREAMINA_TASK_FAILED';
  const lower = failReason.toLowerCase();
  if (/content.*risk|risk.*content|审核|违规/.test(lower)) return 'DREAMINA_CONTENT_RISK';
  if (/upload|tos/.test(lower)) return 'DREAMINA_UPLOAD_FAILED';
  if (/concurren|1310/.test(lower)) return 'DREAMINA_CONCURRENCY';
  return 'DREAMINA_TASK_FAILED';
}
