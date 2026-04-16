/**
 * H5 地牢主题 Loading 体验 — 彩蛋系统
 *
 * 支持敲门回嘴、火把点亮、今日命签、安抚礼包等交互彩蛋。
 * 所有彩蛋不阻塞主流程，加载完成立即切走。
 */
import type { EasterEggDef, LoadingScene } from './types';

// ─── 彩蛋定义 ─────────────────────────────────────────────

export const EASTER_EGGS: EasterEggDef[] = [
  {
    id: 'knock-door',
    trigger: '连点门环 5 次',
    scene: 'dungeon-entrance',
    normalResponse: '守门人：再敲加收维修费。',
    rareResponse: '你敲醒了 BOSS，它说谢谢提醒。',
    rareChance: 0.05,
    superRareResponse: '门开了个缝，露出一只眼，又关上了。',
    superRareChance: 0.005,
  },
  {
    id: 'torch-light',
    trigger: '左右滑动点亮火把',
    scene: 'any',
    normalResponse: '火把已点亮。',
    rareResponse: '地牢管理员临时通知：今天怪物心情不好，建议你也别太好。',
    rareChance: 0.1,
  },
  {
    id: 'fortune',
    trigger: '等待>8s 点击骰子',
    scene: 'any',
    normalResponse: '',
    rareResponse: '今天适合当肉盾，不适合当主C',
    rareChance: 0.01,
  },
  {
    id: 'comfort-gift',
    trigger: '连续3次等待>8s',
    scene: 'any',
    normalResponse: '地牢觉得对不起你，这是赔偿金。别花完。',
  },
  {
    id: 'super-knock',
    trigger: '连续敲门10次',
    scene: 'dungeon-entrance',
    normalResponse: '守门人：你到底要不要进去？！',
    rareResponse: '门缝里伸出一只手，递给你一张纸条："今天不营业"',
    rareChance: 0.005,
  },
];

// ─── 命签池 ──────────────────────────────────────────────

interface Fortune {
  rank: '上上签' | '上签' | '中签' | '下签' | '隐藏签';
  text: string;
  weight: number;
}

const FORTUNES: Fortune[] = [
  { rank: '上上签', text: '今日撤离概率 +嘴硬值', weight: 15 },
  { rank: '上签', text: '宝箱对你有好感，BOSS 对你没有', weight: 20 },
  { rank: '中签', text: '能捡到宝，带不带得走另说', weight: 30 },
  { rank: '下签', text: '建议把"最后一把"说轻点', weight: 25 },
  { rank: '下签', text: '今天适合观战，不适合冲锋', weight: 8 },
  { rank: '隐藏签', text: '今天适合当肉盾，不适合当主C', weight: 1 },
  { rank: '隐藏签', text: '你的运气已被 BOSS 预定', weight: 1 },
];

export function drawFortune(): Fortune {
  const total = FORTUNES.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * total;
  for (const f of FORTUNES) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return FORTUNES[2]; // fallback 中签
}

// ─── 彩蛋触发逻辑 ────────────────────────────────────────

interface EasterEggState {
  knockCount: number;
  torchLit: { left: boolean; right: boolean };
  longWaitCount: number;
  triggeredIds: Set<string>;
}

let state: EasterEggState = {
  knockCount: 0,
  torchLit: { left: false, right: false },
  longWaitCount: 0,
  triggeredIds: new Set(),
};

export function resetEasterEggState() {
  state = {
    knockCount: 0,
    torchLit: { left: false, right: false },
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
  giftType?: 'stamina' | 'fragment';
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

/** 门环敲击 */
export function onKnock(scene: LoadingScene): EasterEggResult | null {
  if (scene !== 'dungeon-entrance') return null;
  state.knockCount++;

  if (state.knockCount === 10) {
    const egg = EASTER_EGGS.find((e) => e.id === 'super-knock')!;
    const resp = rollResponse(egg);
    return { id: 'super-knock', ...resp };
  }
  if (state.knockCount >= 5 && !state.triggeredIds.has('knock-door')) {
    state.triggeredIds.add('knock-door');
    const egg = EASTER_EGGS.find((e) => e.id === 'knock-door')!;
    const resp = rollResponse(egg);
    return { id: 'knock-door', ...resp };
  }
  return null;
}

/** 火把点亮 */
export function onTorchSwipe(direction: 'left' | 'right'): EasterEggResult | null {
  state.torchLit[direction] = true;
  if (state.torchLit.left && state.torchLit.right && !state.triggeredIds.has('torch-light')) {
    state.triggeredIds.add('torch-light');
    const egg = EASTER_EGGS.find((e) => e.id === 'torch-light')!;
    const resp = rollResponse(egg);
    return { id: 'torch-light', ...resp };
  }
  return null;
}

/** 命签抽取 */
export function onFortuneClick(): EasterEggResult | null {
  if (state.triggeredIds.has('fortune-today')) return null;
  state.triggeredIds.add('fortune-today');
  const fortune = drawFortune();
  return {
    id: 'fortune',
    text: `【${fortune.rank}】${fortune.text}`,
    isRare: fortune.rank === '隐藏签',
    isSuperRare: false,
    fortune,
  };
}

/** 长等待计数（8s+ 触发后调用） */
export function onLongWait(): EasterEggResult | null {
  state.longWaitCount++;
  if (state.longWaitCount >= 3 && !state.triggeredIds.has('comfort-gift')) {
    state.triggeredIds.add('comfort-gift');
    const egg = EASTER_EGGS.find((e) => e.id === 'comfort-gift')!;
    const giftType = Math.random() > 0.5 ? 'stamina' : 'fragment';
    return {
      id: 'comfort-gift',
      text: egg.normalResponse,
      isRare: false,
      isSuperRare: false,
      giftType: giftType as 'stamina' | 'fragment',
    };
  }
  return null;
}
