/** 百老汇筑梦师 Loading 体验 — 公开导出 */

export { default as TheaterLoadingScreen } from './TheaterLoadingScreen';
export { useLoadingOrchestrator, nonLinearPercent } from './useLoadingOrchestrator';
export type { LoadingState } from './useLoadingOrchestrator';

export { pickCopy, getProgressiveChain, getFallbackCopy, SPEAKER_NAMES, getSceneSpeaker } from './copyPool';

export {
  onSpotlightDrag,
  onCurtainPull,
  onApplause,
  onInspirationDice,
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
