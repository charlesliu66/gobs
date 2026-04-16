/** H5 地牢主题 Loading 体验 — 公开导出 */

export { default as DungeonLoadingScreen } from './DungeonLoadingScreen';
export { useLoadingOrchestrator, nonLinearPercent } from './useLoadingOrchestrator';
export type { LoadingState } from './useLoadingOrchestrator';

export { pickCopy, getProgressiveChain, getFallbackCopy, SPEAKER_NAMES, getSceneSpeaker } from './copyPool';

export {
  onKnock,
  onTorchSwipe,
  onFortuneClick,
  onLongWait,
  drawFortune,
  resetEasterEggState,
  EASTER_EGGS,
} from './easterEggs';

export type {
  LoadingScene,
  Speaker,
  CopyTone,
  DurationTier,
  LoadingCopy,
  ProgressiveChain,
  LoadingTask,
  EasterEggDef,
} from './types';
