/**
 * 百老汇筑梦师 Loading 体验 — 彩蛋系统
 *
 * 支持聚光灯拖动、幕布拉开、掌声触发、灵感骰子等剧院交互彩蛋。
 * 所有彩蛋不阻塞主流程，加载完成立即切走。
 */
import type { EasterEggDef, LoadingScene } from './types';

// ─── 彩蛋定义 ─────────────────────────────────────────────

export const EASTER_EGGS: EasterEggDef[] = [
  {
    id: 'spotlight-drag',
    trigger: '拖动聚光灯照亮舞台',
    scene: 'any',
    normalResponse: '聚光灯已就位——全场目光聚焦。',
    rareResponse: '聚光灯照到了藏在幕布后面的彩排花絮！',
    rareChance: 0.1,
    superRareResponse: '聚光灯引来了一只误入剧院的猫——它抢了 C 位。',
    superRareChance: 0.005,
  },
  {
    id: 'curtain-pull',
    trigger: '上滑拉开幕布',
    scene: 'premiere',
    normalResponse: '幕布缓缓升起，舞台渐渐显露。',
    rareResponse: '幕布拉开的瞬间，全场起立鼓掌——虽然还没开始。',
    rareChance: 0.08,
  },
  {
    id: 'applause',
    trigger: '等待>8s 连击 3 次',
    scene: 'any',
    normalResponse: '掌声响起——后台所有人加快了脚步。',
    rareResponse: '雷鸣般的掌声！制片人激动地落泪了。',
    rareChance: 0.05,
  },
  {
    id: 'inspiration-dice',
    trigger: '等待>8s 点击灵感骰子',
    scene: 'any',
    normalResponse: '',
    rareResponse: '编剧的灵感骰掷出了"天才"——好作品正在路上。',
    rareChance: 0.01,
  },
  {
    id: 'patience-reward',
    trigger: '连续3次等待>8s',
    scene: 'any',
    normalResponse: '剧院感谢你的耐心——这是今日特别通行证。',
  },
];

// ─── 灵感签池 ──────────────────────────────────────────────

interface Fortune {
  rank: '天选之作' | '佳作预兆' | '稳步推进' | '需要彩排' | '隐藏剧情';
  text: string;
  weight: number;
}

const FORTUNES: Fortune[] = [
  { rank: '天选之作', text: '今日创作运势爆棚，每一帧都是经典', weight: 10 },
  { rank: '佳作预兆', text: '灵感女神正在赶来的路上', weight: 20 },
  { rank: '佳作预兆', text: '你的作品自带聚光灯气质', weight: 15 },
  { rank: '稳步推进', text: '稳扎稳打，好戏在后头', weight: 30 },
  { rank: '稳步推进', text: '台上一分钟，台下十分钟——正常的', weight: 20 },
  { rank: '需要彩排', text: '建议先来一杯后台咖啡，再看成品', weight: 3 },
  { rank: '隐藏剧情', text: '今天适合当导演，不适合当观众', weight: 1 },
  { rank: '隐藏剧情', text: '你的才华已被百老汇经纪人关注', weight: 1 },
];

export function drawFortune(): Fortune {
  const total = FORTUNES.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FORTUNES) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FORTUNES[3]; // fallback
}

// ─── 彩蛋触发逻辑 ────────────────────────────────────────

interface EasterEggState {
  spotlightDragged: boolean;
  curtainPulled: boolean;
  applauseCount: number;
  longWaitCount: number;
  triggeredIds: Set<string>;
}

let state: EasterEggState = {
  spotlightDragged: false,
  curtainPulled: false,
  applauseCount: 0,
  longWaitCount: 0,
  triggeredIds: new Set(),
};

export function resetEasterEggState() {
  state = {
    spotlightDragged: false,
    curtainPulled: false,
    applauseCount: 0,
    longWaitCount: 0,
    triggeredIds: new Set(),
  };
}

export interface EasterEggResult {
  id: string;
  text: string;
  isRare: boolean;
  isSuperRare: boolean;
  fortune?: Fortune;
}

function rollResponse(egg: EasterEggDef): { text: string; isRare: boolean; isSuperRare: boolean } {
  const superRoll = Math.random();
  if (egg.superRareResponse && egg.superRareChance && superRoll < egg.superRareChance) {
    return { text: egg.superRareResponse, isRare: true, isSuperRare: true };
  }
  const rareRoll = Math.random();
  if (egg.rareResponse && egg.rareChance && rareRoll < egg.rareChance) {
    return { text: egg.rareResponse, isRare: true, isSuperRare: false };
  }
  return { text: egg.normalResponse, isRare: false, isSuperRare: false };
}

/** 聚光灯拖动 */
export function onSpotlightDrag(): EasterEggResult | null {
  if (state.triggeredIds.has('spotlight-drag')) return null;
  state.spotlightDragged = true;
  state.triggeredIds.add('spotlight-drag');
  const egg = EASTER_EGGS.find((e) => e.id === 'spotlight-drag')!;
  return { id: 'spotlight-drag', ...rollResponse(egg) };
}

/** 幕布拉开（仅首演场景） */
export function onCurtainPull(scene: LoadingScene): EasterEggResult | null {
  if (scene !== 'premiere') return null;
  if (state.triggeredIds.has('curtain-pull')) return null;
  state.curtainPulled = true;
  state.triggeredIds.add('curtain-pull');
  const egg = EASTER_EGGS.find((e) => e.id === 'curtain-pull')!;
  return { id: 'curtain-pull', ...rollResponse(egg) };
}

/** 掌声触发（连击） */
export function onApplause(): EasterEggResult | null {
  state.applauseCount++;
  if (state.applauseCount >= 3 && !state.triggeredIds.has('applause')) {
    state.triggeredIds.add('applause');
    const egg = EASTER_EGGS.find((e) => e.id === 'applause')!;
    return { id: 'applause', ...rollResponse(egg) };
  }
  return null;
}

/** 灵感签抽取 */
export function onInspirationDice(): EasterEggResult | null {
  if (state.triggeredIds.has('inspiration-today')) return null;
  state.triggeredIds.add('inspiration-today');
  const fortune = drawFortune();
  return {
    id: 'inspiration-dice',
    text: `【${fortune.rank}】${fortune.text}`,
    isRare: fortune.rank === '隐藏剧情',
    isSuperRare: false,
    fortune,
  };
}

/** 长等待计数（8s+ 触发后调用） */
export function onLongWait(): EasterEggResult | null {
  state.longWaitCount++;
  if (state.longWaitCount >= 3 && !state.triggeredIds.has('patience-reward')) {
    state.triggeredIds.add('patience-reward');
    const egg = EASTER_EGGS.find((e) => e.id === 'patience-reward')!;
    return {
      id: 'patience-reward',
      text: egg.normalResponse,
      isRare: false,
      isSuperRare: false,
    };
  }
  return null;
}
