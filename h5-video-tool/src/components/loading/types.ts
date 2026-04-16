/** H5 地牢主题 Loading 体验 — 类型定义 */

export type LoadingScene =
  | 'dungeon-entrance'   // 登录/启动
  | 'tavern'             // 匹配/组队
  | 'blacksmith'         // 资源加载/装备
  | 'settlement'         // 局后结算
  | 'reconnect';         // 断线重连

export type Speaker = 'gatekeeper' | 'bartender' | 'blacksmith' | 'narrator' | 'clerk';

export type CopyTone = 'light' | 'medium' | 'heavy';

export type DurationTier = 'instant' | 'light' | 'normal' | 'risky' | 'critical';

export interface LoadingCopy {
  text: string;
  tone: CopyTone;
  speaker: Speaker;
}

export interface ProgressiveChain {
  scene: LoadingScene;
  speaker: Speaker;
  steps: Array<{ delayMs: number; text: string }>;
}

export interface LoadingTask {
  id: string;
  scene: LoadingScene;
  canCancel: boolean;
  startedAt: number;
  phase?: string;
  percent?: number;
  resolved: boolean;
  error?: string;
}

export interface EasterEggDef {
  id: string;
  trigger: string;
  scene: LoadingScene | 'any';
  normalResponse: string;
  rareResponse?: string;
  rareChance?: number;
  superRareResponse?: string;
  superRareChance?: number;
}
