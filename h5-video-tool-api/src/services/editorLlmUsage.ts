/**
 * 剪辑链路 LLM 用量汇总（依赖 Compass 返回 OpenAI 风格 usage 字段；若无则为 undefined）
 */
import type { CompassChatUsage } from './promptPolish.js';

export interface LlmUsageCallRecord {
  stage: string;
  usage?: CompassChatUsage;
}

export function sumCompassUsage(records: LlmUsageCallRecord[]): CompassChatUsage {
  const out: CompassChatUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  let any = false;
  for (const r of records) {
    const u = r.usage;
    if (!u) continue;
    any = true;
    out.prompt_tokens = (out.prompt_tokens ?? 0) + (u.prompt_tokens ?? 0);
    out.completion_tokens = (out.completion_tokens ?? 0) + (u.completion_tokens ?? 0);
    out.total_tokens = (out.total_tokens ?? 0) + (u.total_tokens ?? 0);
  }
  return any ? out : {};
}

export type LlmUsageSink = (stage: string, usage: CompassChatUsage | undefined) => void;
