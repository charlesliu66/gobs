import type { AovAspectRatio, AovRuleset } from './aovRulesetService.js';

export interface AovDslPlan {
  game: 'aov';
  durationSec: number;
  aspectRatio: AovAspectRatio;
  structure: Array<'hook' | 'buildup' | 'climax' | 'outro'>;
  style: string[];
  mustEvents: string[];
  preferredMode?: string;
  fallbackApplied: boolean;
}

export interface AovPlanResult {
  plan: AovDslPlan;
  trace: string[];
  warnings: string[];
}

function detectDurationSec(text: string): number | undefined {
  const m = text.match(/(\d{1,3})\s*(秒|s|sec)/i);
  if (!m) return undefined;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : undefined;
}

function detectAspectRatio(text: string): AovAspectRatio | undefined {
  if (/9\s*[:：]\s*16/.test(text) || /竖屏/.test(text)) return '9:16';
  if (/16\s*[:：]\s*9/.test(text) || /横屏/.test(text)) return '16:9';
  return undefined;
}

function pickMode(text: string, rules: AovRuleset): string | undefined {
  const lowered = text.toLowerCase();
  for (const m of rules.modes) {
    if (lowered.includes(m.key.toLowerCase()) || text.includes(m.name)) {
      return m.key;
    }
  }
  if (/排位/.test(text)) return 'ranked';
  if (/5v5|匹配/.test(lowered + text)) return '5v5';
  return undefined;
}

function pickStyles(text: string): string[] {
  const pairs: Array<[RegExp, string]> = [
    [/卡点|节拍|beat/i, 'beat_sync'],
    [/慢放|慢镜/i, 'speed_ramp'],
    [/冲击字幕|大字|caption/i, 'impact_caption'],
    [/转场|glitch|闪白/i, 'impact_transition'],
  ];
  const out: string[] = [];
  for (const [re, tag] of pairs) {
    if (re.test(text)) out.push(tag);
  }
  return out.length ? out : ['beat_sync', 'impact_caption'];
}

function pickMustEvents(text: string, rules: AovRuleset): string[] {
  const out = new Set<string>();
  for (const [event, aliases] of Object.entries(rules.taxonomy.terms)) {
    if (aliases.some((a) => text.includes(a))) {
      out.add(event);
    }
  }
  if (/团战/.test(text)) out.add('team_fight');
  if (/推塔|拆塔/.test(text)) out.add('tower_push');
  return [...out];
}

function clampDuration(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function resolveConflict(plan: AovDslPlan, rules: AovRuleset, trace: string[], warnings: string[]): AovDslPlan {
  const min = rules.policy.durationRangeSec.min;
  const max = rules.policy.durationRangeSec.max;
  if (plan.durationSec < min || plan.durationSec > max) {
    const next = clampDuration(plan.durationSec, min, max);
    trace.push(`duration hard-constraint: ${plan.durationSec}s -> ${next}s`);
    warnings.push(`时长超出范围，已调整到 ${next}s`);
    plan.durationSec = next;
  }
  if (!rules.policy.allowedAspectRatios.includes(plan.aspectRatio)) {
    const fallbackAspect = rules.policy.allowedAspectRatios[0] ?? '9:16';
    trace.push(`aspect ratio hard-constraint: ${plan.aspectRatio} -> ${fallbackAspect}`);
    warnings.push(`画幅不在 AOV 规则白名单内，已降级为 ${fallbackAspect}`);
    plan.aspectRatio = fallbackAspect;
  }

  // 软约束：若时长很短，mustEvents 太多会失真，自动保留前 2 个
  if (plan.durationSec <= 12 && plan.mustEvents.length > 2) {
    const dropped = plan.mustEvents.slice(2);
    plan.mustEvents = plan.mustEvents.slice(0, 2);
    plan.fallbackApplied = true;
    trace.push(`soft-constraint: short duration, dropped events=${dropped.join(',')}`);
    warnings.push(`时长较短，已将必须事件收敛为 2 个，避免成片拥挤`);
  }

  if (plan.mustEvents.length === 0) {
    plan.fallbackApplied = true;
    const mode = rules.modes.find((m) => m.key === (plan.preferredMode ?? '')) ?? rules.modes[0];
    const defaults = Object.entries(mode?.eventWeights ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k]) => k);
    plan.mustEvents = defaults.length ? defaults : ['team_fight'];
    trace.push(`fallback: no explicit events, used defaults=${plan.mustEvents.join(',')}`);
    warnings.push('未识别到明确事件目标，已按模式权重自动补齐重点事件');
  }

  return plan;
}

export function looksLikeAovRequest(text: string): boolean {
  return /aov|arena of valor|传说对决|王者荣耀国际版|moba/i.test(text);
}

export function buildAovDslPlan(userMessage: string, rules: AovRuleset): AovPlanResult {
  const trace: string[] = [];
  const warnings: string[] = [];
  const durationRaw = detectDurationSec(userMessage) ?? 15;
  const aspectRaw = detectAspectRatio(userMessage) ?? '9:16';
  const modeRaw = pickMode(userMessage, rules);
  const mustEvents = pickMustEvents(userMessage, rules);
  const styles = pickStyles(userMessage);
  const structure: Array<'hook' | 'buildup' | 'climax' | 'outro'> = ['hook', 'buildup', 'climax', 'outro'];

  trace.push(`duration parsed=${durationRaw}`);
  trace.push(`aspect parsed=${aspectRaw}`);
  trace.push(`mode parsed=${modeRaw ?? 'none'}`);
  trace.push(`mustEvents parsed=${mustEvents.join(',') || 'none'}`);

  const plan: AovDslPlan = {
    game: 'aov',
    durationSec: durationRaw,
    aspectRatio: aspectRaw,
    structure,
    style: styles,
    mustEvents,
    preferredMode: modeRaw,
    fallbackApplied: false,
  };

  const resolved = resolveConflict(plan, rules, trace, warnings);
  return { plan: resolved, trace, warnings };
}
