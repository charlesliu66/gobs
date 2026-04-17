/** 百老汇筑梦师 Loading 体验 — 类型定义 */

export type LoadingScene =
  | 'writers-room'   // 编剧室：剧本/Prompt/脚本生成
  | 'rehearsal'      // 排练厅：视频生成/分镜首帧/批量任务
  | 'fine-cut'       // 精修室：BGM/剪辑/合并
  | 'premiere'       // 首演台：导出/审片
  | 'on-tour'        // 巡演厅：分发/文案翻译
  | 'lobby'          // 大厅：项目加载/页面初始化
  | 'props-room';    // 道具间：素材导入/处理

export type Speaker =
  | 'co-writer'       // 联合编剧
  | 'cinematographer'  // 摄影师
  | 'lighting'         // 灯光师
  | 'stage-manager'    // 舞台监督
  | 'producer'         // 制片人
  | 'editor'           // 剪辑师
  | 'composer'         // 作曲家
  | 'makeup'           // 化妆师
  | 'props-master'     // 道具师
  | 'agent'            // 经纪人
  | 'usher';           // 引座员

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
